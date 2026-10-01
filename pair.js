// Lazy ESM loader — @whiskeysockets/baileys v6+ is ESM-only, cannot be require()'d
let _baileys = null;
async function loadBaileys() {
    if (!_baileys) {
        _baileys = await import('@whiskeysockets/baileys');
        require('./allfunc/baileys-shim').init(_baileys);
    }
    return _baileys;
}
const NodeCache = require("node-cache");
const _ = require('lodash')
const {
    Boom
} = require('@hapi/boom')
const PhoneNumber = require('awesome-phonenumber')
const pino = require('pino')
const FileType = require('file-type')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { writeExif, imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./allfunc/exif');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch } = require('./allfunc/myfunc')

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// baileys exports needed by functions that live at MODULE scope.
//
// startpairing() destructures proto and getContentType from loadBaileys() inside its own body, so
// those were only visible there. smsg(), defined further down at module scope, uses both -- and
// threw "ReferenceError: proto is not defined" on every single incoming message, at line 665,
// before any command could run. The bot connected fine and then silently ignored everything sent
// to it, which is exactly what "commands are not responding" looks like from outside.
//
// The shim resolves proto through a Proxy, so reading it here -- before baileys has actually been
// imported -- is safe: the lookup happens when smsg runs, long after init() has been called.
const { proto, getContentType, generateWAMessageContent } = require('./allfunc/baileys-shim');

// Global tracking for all rentbots
const rentbotTracker = new Map();
const MAX_RETRIES_440 = 3;
const MAX_RETRIES_405 = 3;
// A session is only abandoned after this long with no write inside it at all.
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENT_CONNECTIONS = 50;
const CONNECTION_DELAY = 100;

// Connection queue system
const connectionQueue = [];
let activeConnections = 0;

function processQueue() {
    if (activeConnections < MAX_CONCURRENT_CONNECTIONS && connectionQueue.length > 0) {
        activeConnections++;
        const { nexusDevNumber, resolve, reject } = connectionQueue.shift();
        
        startpairing(nexusDevNumber)
            .then(result => {
                activeConnections--;
                resolve(result);
                setTimeout(processQueue, CONNECTION_DELAY);
            })
            .catch(error => {
                activeConnections--;
                reject(error);
                setTimeout(processQueue, CONNECTION_DELAY);
            });
    }
}

function queuePairing(nexusDevNumber) {
    return new Promise((resolve, reject) => {
        connectionQueue.push({ nexusDevNumber, resolve, reject });
        processQueue();
    });
}

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(file => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

// Session validation function
async function validateSession(nexusDevNumber) {
    const sessionPath = `./richstore/pairing/${nexusDevNumber}`;
    const credsPath = path.join(sessionPath, 'creds.json');
    
    if (!fs.existsSync(credsPath)) {
        console.log(chalk.yellow(`⚠️ No creds.json for ${nexusDevNumber}`));
        return false;
    }
    
    try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (!creds.me || !creds.me.id) {
            console.log(chalk.yellow(`⚠️ Invalid session for ${nexusDevNumber}, cleaning up...`));
            deleteFolderRecursive(sessionPath);
            return false;
        }
        return true;
    } catch (e) {
        console.log(chalk.red(`❌ Corrupt session for ${nexusDevNumber}: ${e.message}`));
        deleteFolderRecursive(sessionPath);
        return false;
    }
}

// Force cleanup function
function forceCleanupSession(nexusDevNumber) {
    const sessionPath = `./richstore/pairing/${nexusDevNumber}`;
    
    try {
        if (fs.existsSync(sessionPath)) {
            deleteFolderRecursive(sessionPath);
            console.log(chalk.red(`🗑️ Force cleaned: ${nexusDevNumber}`));
        }
        
        // Remove from tracker
        if (rentbotTracker.has(nexusDevNumber)) {
            const tracker = rentbotTracker.get(nexusDevNumber);
            if (tracker.connection) {
                try {
                    tracker.connection.end();
                    tracker.connection.ws?.close();
                } catch (e) {
                    // Ignore
                }
            }
            rentbotTracker.delete(nexusDevNumber);
        }
        
        return true;
    } catch (e) {
        console.log(chalk.red(`❌ Error force cleaning ${nexusDevNumber}: ${e.message}`));
        return false;
    }
}

// Session cleanup function
function cleanupExpiredSessions() {
    const sessionDir = './richstore/pairing';
    if (!fs.existsSync(sessionDir)) return;
    
    
    fs.readdirSync(sessionDir).forEach(folder => {
        if (folder === 'pairing.json') return;
        
        const folderPath = path.join(sessionDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const tracker = rentbotTracker.get(folder);
            if (tracker && tracker.disconnected) {
                console.log(chalk.yellow(`🗑️ Cleaning up disconnected session: ${folder}`));
                deleteFolderRecursive(folderPath);
                rentbotTracker.delete(folder);
                return;
            }
            
            try {
                // Judged by the newest thing INSIDE the folder, not the folder's own mtime: that
                // only moves when an entry is added or removed at the top level, so a session that
                // is connected but quiet could look abandoned and be deleted -- another way to lose
                // a pairing without anything actually being wrong with it.
                const stamps = fs.readdirSync(folderPath).map((entry) => {
                    try { return fs.statSync(path.join(folderPath, entry)).mtimeMs; } catch { return 0; }
                });
                stamps.push(fs.statSync(folderPath).mtimeMs);
                const newest = stamps.reduce((a, b) => Math.max(a, b), 0);
                if (newest < Date.now() - SESSION_MAX_AGE_MS) {
                    console.log(chalk.yellow(`🗑️ Cleaning up stale session: ${folder}`));
                    deleteFolderRecursive(folderPath);
                    rentbotTracker.delete(folder);
                }
            } catch (e) {
                console.log(chalk.red(`❌ Error checking session age: ${e.message}`));
            }
        }
    });
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(chalk.blue(`📁 Created directory: ${dirPath}`));
    }
}

// Stand-in for the makeInMemoryStore that Baileys used to export and no longer does.
//
// Only the pieces this bot actually reaches for: bind() (fed by messages.upsert, which includes
// our own sends because emitOwnEvents is on), loadMessage() for getQuotedObj, and an empty
// presences object for the presence command in case.js. Bounded, because this is per socket.
function makeLiteStore(maxMessages = 2000) {
    const messages = new Map();

    return {
        presences: {},

        bind(ev) {
            ev.on('messages.upsert', ({ messages: batch }) => {
                for (const msg of batch || []) {
                    const jid = msg?.key?.remoteJid;
                    const id = msg?.key?.id;
                    if (!jid || !id || !msg.message) continue;
                    if (messages.size >= maxMessages) messages.delete(messages.keys().next().value);
                    messages.set(`${jid}:${id}`, msg.message);
                }
            });
        },

        async loadMessage(jid, id) {
            const message = messages.get(`${jid}:${id}`);
            return message ? { key: { remoteJid: jid, id }, message } : undefined;
        },
    };
}

async function startpairing(nexusDevNumber) {
    // Ensure base directory exists
    ensureDirectoryExists('./richstore/pairing');

    // ── One socket per number, enforced ──────────────────────────────────────────────────────
    // This function is called from two independent places -- the startup restore in server.js and
    // every pairing request -- and it used to overwrite tracker.connection without closing what
    // was there. A second live socket for one number is not a retry: WhatsApp replaces the loser
    // with 440, the loser reconnects in its turn, and the two trade the number back and forth
    // forever. The socket is then never up long enough to be handed a pairing code, which is
    // exactly what "the website is not generating a code" looked like from the outside -- and the
    // abandoned sockets piled up until the container ran out of memory and died.
    //
    // So: reuse a socket that is still up, and close one that is not before replacing it.
    const tracked = rentbotTracker.get(nexusDevNumber);
    if (tracked && tracked.connection) {
        const liveSocket = tracked.connection.ws;
        if (liveSocket && liveSocket.readyState === 1) {
            tracked.lastActivity = Date.now();
            return tracked.connection;
        }
        try { tracked.connection.end(new Error('superseded')); } catch (ignored) {}
        try { liveSocket?.close(); } catch (ignored) {}
        tracked.connection = null;
    }

    if (!rentbotTracker.has(nexusDevNumber)) {
        rentbotTracker.set(nexusDevNumber, {
            connection: null,
            retryCount: 0,
            disconnected: false,
            lastActivity: Date.now()
        });
    }
    
    const tracker = rentbotTracker.get(nexusDevNumber);
    tracker.retryCount++;
    tracker.disconnected = false;
    tracker.lastActivity = Date.now();

    // Load baileys ESM module (cannot be require()'d — ESM only)
    const {
        default: makeWASocket,
        jidDecode,
        DisconnectReason,
        makeCacheableSignalKeyStore,
        useMultiFileAuthState,
        Browsers,
        getContentType,
        proto,
        downloadContentFromMessage,
        generateWAMessageContent,
        fetchLatestBaileysVersion
    } = await loadBaileys();
    // Neither 6.7 nor 7.0.0-rc14 exports makeInMemoryStore any more, so the old
    // `makeInMemoryStore ? ... : null` always produced null. Everything reading `store` was
    // therefore either dead or a crash waiting to happen: store.loadMessage in getQuotedObj, and
    // store.presences in case.js. Use our own small cache instead.
    const store = makeLiteStore();
    const pairingCode = true;
    const useMobile = false;

    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    // Ensure session directory exists
    const sessionPath = `./richstore/pairing/${nexusDevNumber}`;
    ensureDirectoryExists(sessionPath);
    
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(sessionPath);

    const nexus = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        // Give Baileys a caching key store rather than the raw multi-file one: it holds the Signal
        // keys in memory. This is the configuration the working paired sockets on this host use,
        // and a stalled/uncached key store is how a session drifts out of step in the first place.
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        version,
        browser: Browsers.ubuntu("Edge"),
        // No getMessage here, deliberately. It was answering every decryption retry with an empty
        // conversation, which is worse than having none at all. 7.0.0-rc14 caches outgoing
        // messages for retries itself and defaults getMessage to `async () => undefined`, so the
        // correct move is to leave it out.
        shouldSyncHistoryMessage: msg => {
            console.log(`\x1b[32mLoading Chat [${msg.progress}%]\x1b[39m`);
            return !!msg.syncType;
        },
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
    })
    
    tracker.connection = nexus;
    
    if (store) store.bind(nexus.ev);

    if (pairingCode && !state.creds.registered) {
        if (useMobile) {
            throw new Error('Cannot use pairing code with mobile API');
        }

        let phoneNumber = nexusDevNumber.replace(/[^0-9]/g, '');
        
        if (!phoneNumber) {
            throw new Error('Invalid phone number');
        }
        
        // Ask for the code as soon as the socket will accept the request, rather than sitting on a
        // flat 3s timeout. That timeout was the whole cost of a pairing: nothing else here is slow.
        // requestPairingCode() throws while the websocket is still coming up, so try almost
        // immediately and step back on each refusal. Every refusal means no code was issued, so
        // retrying cannot invalidate anything -- and the happy path costs ~0.3s instead of 3s.
        const requestPairingCodeWithRetry = async (attempt = 0) => {
            try {
                let code = await nexus.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;

                console.log(chalk.bgGreen.black(`📱 Pairing code for ${nexusDevNumber}: ${chalk.white.bold(code)}`));

                // Ensure pairing directory exists
                ensureDirectoryExists('./richstore/pairing');

                fs.writeFileSync(
                    './richstore/pairing/pairing.json',
                    JSON.stringify({ 
                        number: nexusDevNumber,
                        code: code,
                        timestamp: new Date().toISOString()
                    }, null, 2),
                    'utf8'
                );

                console.log(chalk.green(`✓ Pairing code saved to pairing.json`));
            } catch (err) {
                // Still connecting, or WhatsApp refused. 12 steps of 400ms covers the same ~5s
                // worst case the old fixed 3s delay was guarding against.
                if (attempt < 12) {
                    setTimeout(() => requestPairingCodeWithRetry(attempt + 1), 400);
                    return;
                }
                console.log(chalk.red(`❌ Error requesting pairing code: ${err.message}`));
            }
        };

        setTimeout(() => requestPairingCodeWithRetry(), 300);
    }

    nexus.newsletterMsg = async (key, content = {}, timeout = 5000) => {
        const { type: rawType = 'INFO', name, description = '', picture = null, react, id, newsletter_id = key, ...media } = content;
        const type = rawType.toUpperCase();
        if (react) {
            if (!(newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id))) throw [{ message: 'Use Id Newsletter', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
            if (!id) throw [{ message: 'Use Id Newsletter Message', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
            const hasil = await nexus.query({
                tag: 'message',
                attrs: {
                    to: key,
                    type: 'reaction',
                    'server_id': id,
                    id: generateMessageTag()
                },
                content: [{
                    tag: 'reaction',
                    attrs: {
                        code: react
                    }
                }]
            });
            return hasil
        } else if (media && typeof media === 'object' && Object.keys(media).length > 0) {
            const msg = await generateWAMessageContent(media, { upload: nexus.waUploadToServer });
            const anu = await nexus.query({
                tag: 'message',
                attrs: { to: newsletter_id, type: 'text' in media ? 'text' : 'media' },
                content: [{
                    tag: 'plaintext',
                    attrs: /image|video|audio|sticker|poll/.test(Object.keys(media).join('|')) ? { mediatype: Object.keys(media).find(key => ['image', 'video', 'audio', 'sticker','poll'].includes(key)) || null } : {},
                    content: proto.Message.encode(msg).finish()
                }]
            })
            return anu
        } else {
            if ((/(FOLLOW|UNFOLLOW|DELETE)/.test(type)) && !(newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id))) return [{ message: 'Use Id Newsletter', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
            const _query = await nexus.query({
                tag: 'iq',
                attrs: {
                    to: 's.whatsapp.net',
                    type: 'get',
                    xmlns: 'w:mex'
                },
                content: [{
                    tag: 'query',
                    attrs: {
                        query_id: type == 'FOLLOW' ? '99268589007193' : type == 'UNFOLLOW' ? '72386323462143' : type == 'CREATE' ? '62342100967086' : type == 'DELETE' ? '83165376883630' : '65633160870686'
                    },
                    content: new TextEncoder().encode(JSON.stringify({
                        variables: /(FOLLOW|UNFOLLOW|DELETE)/.test(type) ? { newsletter_id } : type == 'CREATE' ? { newsletter_input: { name, description, picture }} : { fetch_creation_time: true, fetch_full_image: true, fetch_viewer_metadata: false, input: { key, type: (newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id)) ? 'JID' : 'INVITE' }}
                    }))
                }]
            }, timeout);
            const res = JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_join_v2 || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_leave_v2 || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_create || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_delete_v2 || JSON.parse(_query.content[0].content)?.errors || JSON.parse(_query.content[0].content)
            res.thread_metadata ? (res.thread_metadata.host = 'https://mmg.whatsapp.net') : null
            return res
        }
    }

    nexus.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
        } else {
            return jid;
        }
    };
    
    nexus.ev.on('messages.upsert', async chatUpdate => {
        // Logged before any early return, so "never arrived" can be told apart from "arrived and
        // rejected before it could be handled" -- with stdout buffered on a panel there is no
        // other way to see which one is happening.
        try {
            const mk = (nexusboijid && nexusboijid.key) || {};
            const hasMsg = Boolean(nexusboijid && nexusboijid.message && Object.keys(nexusboijid.message).length);
            require('fs').appendFileSync('messages.log',
                `[${new Date().toISOString()}] upsert n=${chatUpdate.messages.length} type=${chatUpdate.type} jid=${mk.remoteJid || '?'} hasMessage=${hasMsg} id=${mk.id || '?'}\n`);
        } catch (ignored) {}
    try {
        const nexusboijid = chatUpdate.messages[0];
        if (!nexusboijid.message || !Object.keys(nexusboijid.message).length) return;
            nexusboijid.message = (Object.keys(nexusboijid.message)[0] === 'ephemeralMessage') ? nexusboijid.message.ephemeralMessage.message : nexusboijid.message;
            let botNumber = await nexus.decodeJid(nexus.user.id);
            let antiswview = global.db?.data?.settings?.[botNumber]?.antiswview || false;
            if (antiswview) {
                if (nexusboijid.key && nexusboijid.key.remoteJid === 'status@broadcast'){  
                    await nexus.readMessages([nexusboijid.key]);
                }
            }

            if (!nexus.public && !nexusboijid.key.fromMe && chatUpdate.type === 'notify') return;
            if (nexusboijid.key.id.startsWith('BAE5') && nexusboijid.key.id.length === 16) return;
            nexusboiConnect = nexus
            mek = smsg(nexusboiConnect, nexusboijid, store);
            // One line per incoming message, to a file rather than the console: Node buffers
            // stdout on a panel, so otherwise there is no way to tell "the message never arrived"
            // from "it arrived and something rejected it".
            try {
                const mk = nexusboijid.key || {};
                require('fs').appendFileSync('messages.log',
                    `[${new Date().toISOString()}] in   jid=${mk.remoteJid || '?'} type=${mek && mek.mtype} fromMe=${Boolean(mk.fromMe)} text=${JSON.stringify(String((mek && (mek.text || mek.body)) || '').slice(0, 60))}\n`);
            } catch (ignored) {}
            require("./case")(nexusboiConnect, mek, chatUpdate, store);
        } catch (err) {
            // Also to a file. Everything a message goes through is inside this one try, so a
            // failure here means the message simply gets no answer -- and with stdout buffered on
            // a panel, console.log on its own shows nothing.
            console.log(err);
            try {
                require('fs').appendFileSync('errors.log',
                    `[${new Date().toISOString()}] upsert: ${err && err.stack ? err.stack : err}\n`);
            } catch (ignored) {}
        }
    });

    // ── ANTI-RAID DETECTION ──
    if (!global._raidTracker) global._raidTracker = {};
    nexus.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (action !== 'add') return;
        try {
            const settingsPath = './database/settings.json';
            if (!fs.existsSync(settingsPath)) return;
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (!settings[id]?.antiraid) return;

            if (!global._raidTracker[id]) global._raidTracker[id] = { joins: [], locked: false };
                  participants.forEach(() => global._raidTracker[id].joins.push(now));
            global._raidTracker[id].joins = global._raidTracker[id].joins.filter(t => now - t < 10000);

            if (global._raidTracker[id].joins.length >= 5 && !global._raidTracker[id].locked) {
                global._raidTracker[id].locked = true;
                await nexus.groupSettingUpdate(id, 'announcement');
                await nexus.sendMessage(id, {
                    text: `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ 🚨 *RAID DETECTED!*\n✪ ${global._raidTracker[id].joins.length}+ members joined in 10s\n✪ 🔒 Group locked automatically\n✪ Only admins can message now\n✪ Contact admins to verify\n╰━━━━━━━━━━━━━━━━━━╯`
                });
                setTimeout(() => {
                    try { global._raidTracker[id] = { joins: [], locked: false }; } catch(e) {}
                }, 5 * 60 * 1000);
            }
        } catch(e) {
            console.log('Antiraid error:', e.message);
        }
    });

    nexus.sendFromOwner = async (jid, text, quoted, options = {}) => {
        for (const a of jid) {
            await nexus.sendMessage(a + '@s.whatsapp.net', { text, ...options }, { quoted });
        }
    }
    nexus.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options)
        } else {
            buffer = await imageToWebp(buff)
        }
        await nexus.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        .then( response => {
            fs.unlinkSync(buffer)
            return response
        })
    }

    nexus.public = true

    nexus.sendText = (jid, text, quoted = '', options) => nexus.sendMessage(jid, { text: text, ...options }, { quoted })

    nexus.getFile = async (PATH, save) => {
        let res
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
        let type = await FileType.fromBuffer(data) || {
            mime: 'application/octet-stream',
            ext: '.bin'
        }
        filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext)
        if (data && save) fs.promises.writeFile(filename, data)
        return {
            res,
            filename,
            size: await getSizeMedia(data),
            ...type,
            data
        }
    }
    
    nexus.ments = (teks = "") => {
        return teks.match("@")
        ? [...teks.matchAll(/@([0-9]{5,16}|0)/g)].map(
            (v) => v[1] + "@s.whatsapp.net"
            )
        : [];
    };
    
    nexus.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await nexus.getFile(path, true);
        let { res, data: file, filename: pathFile } = type;

        if (res && res.status !== 200 || file.length <= 65536) {
            try {
                throw {
                    json: JSON.parse(file.toString())
                };
            } catch (e) {
                if (e.json) throw e.json;
            }
        }

        let opt = {
            filename
        };

        if (quoted) opt.quoted = quoted;
        if (!type) options.asDocument = true;

        let mtype = '',
            mimetype = type.mime,
            convert;

        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) {
            convert = await (ptt ? toPTT : toAudio)(file, type.ext);
            file = convert.data;
            pathFile = convert.filename;
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else mtype = 'document';

        if (options.asDocument) mtype = 'document';

        delete options.asSticker;
        delete options.asLocation;
        delete options.asVideo;
        delete options.asDocument;
        delete options.asImage;

        let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype };
        let m;

        try {
            m = await nexus.sendMessage(jid, message, { ...opt, ...options });
        } catch (e) {
            m = null;
        } finally {
            if (!m) m = await nexus.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
            file = null;
            return m;
        }
    }

    nexus.sendTextWithMentions = async (jid, text, quoted, options = {}) => nexus.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })

    nexus.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        let trueFileName = attachExtension ? ('./sticker/' + filename + '.' + type.ext) : './sticker/' + filename
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    nexus.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }

    // Enhanced connection.update handler
    nexus.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        // Every connect and disconnect, to a file: a socket that keeps dropping and reconnecting
        // looks identical to a healthy one from the outside.
        try {
            let status = '';
            if (connection === 'close') status = String(new Boom(lastDisconnect?.error)?.output?.statusCode || '');
            require('fs').appendFileSync('connection.log',
                `[${new Date().toISOString()}] ${nexusDevNumber} connection=${connection || '-'} status=${status}\n`);
        } catch (ignored) {}
        const tracker = rentbotTracker.get(nexusDevNumber);

        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(chalk.yellow(`🔌 Connection closed for ${nexusDevNumber}, reason: ${reason}`));

              if (reason === 405) {
                  // A 405 means the connection failed. It is not proof that the credentials are
                  // dead, and deleting the session the moment it appeared meant a single failed
                  // reconnect -- which is exactly what a restart is -- cost the user their pairing
                  // and forced them to pair again. Look at what is actually on disk first: retry
                  // while the credentials are intact, and only remove a session that is unusable.
                  const usable = await validateSession(nexusDevNumber);
                  if (usable && (tracker.retryCount || 0) < MAX_RETRIES_405) {
                      tracker.retryCount = (tracker.retryCount || 0) + 1;
                      console.log(chalk.yellow(`⚠️ 405 for ${nexusDevNumber}: session intact, retry ${tracker.retryCount}/${MAX_RETRIES_405}`));
                      await sleep(5000);
                      queuePairing(nexusDevNumber);
                      return;
                  }
                  console.log(chalk.red.bold(`❌ 405 for ${nexusDevNumber}: session unusable after ${tracker.retryCount || 0} tries`));
                  forceCleanupSession(nexusDevNumber);
                  tracker.disconnected = true;
                  tracker.connection = null;
                  console.log(chalk.red(`🚫 ${nexusDevNumber} will NOT reconnect. User must re-pair.`));
                  return;
            } else if (reason === 440) {
                if (tracker.retryCount < MAX_RETRIES_440) {
                    console.warn(chalk.yellow(`⚠️ Error 440 for ${nexusDevNumber}. Retry ${tracker.retryCount}/${MAX_RETRIES_440}...`));
                    await sleep(3000);
                    queuePairing(nexusDevNumber);
                } else {
                    console.error(chalk.red.bold(`❌ Failed after ${MAX_RETRIES_440} attempts for ${nexusDevNumber}`));
                    forceCleanupSession(nexusDevNumber);
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.badSession) {
                console.log(chalk.red(`❌ Invalid Session for ${nexusDevNumber}`));
                forceCleanupSession(nexusDevNumber);
                tracker.disconnected = true;
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.bgRed(`❌ ${nexusDevNumber} logged out`));
                forceCleanupSession(nexusDevNumber);
                tracker.disconnected = true;
            } else if (reason === DisconnectReason.connectionClosed || 
                       reason === DisconnectReason.connectionLost || 
                       reason === DisconnectReason.timedOut) {
                const isValid = await validateSession(nexusDevNumber);
                if (isValid) {
                    console.log(chalk.yellow(`🔄 Reconnecting ${nexusDevNumber}...`));
                    await sleep(3000);
                    queuePairing(nexusDevNumber);
                } else {
                    console.log(chalk.red(`❌ Invalid session for ${nexusDevNumber}`));
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.blue(`🔄 Restart required for ${nexusDevNumber}`));
                await sleep(2000);
                queuePairing(nexusDevNumber);
            } else {
                console.log(chalk.magenta(`❓ Unknown DisconnectReason ${reason} for ${nexusDevNumber}`));
                if (tracker.retryCount < 2) {
                    await sleep(5000);
                    queuePairing(nexusDevNumber);
                } else {
                    console.log(chalk.red(`❌ Max retries for ${nexusDevNumber}`));
                    tracker.disconnected = true;
                }
            }
        } else if (connection === "open") {
            console.log(chalk.bgGreen.black(`✅ Connected: ${nexusDevNumber}`));
            tracker.retryCount = 0;
            tracker.disconnected = false;
            tracker.lastActivity = Date.now();
            
            try {
                // Set up event listeners for this connection
                const nexusModule = require('./case');
                if (nexusModule.setupEventListeners && typeof nexusModule.setupEventListeners === 'function') {
                    try {
                        nexusModule.setupEventListeners(nexus, store);
                        console.log(chalk.green(`✓ Event listeners set up for ${nexusDevNumber}`));
                    } catch (err) {
                        console.log(chalk.yellow(`⚠️ Event listener setup error: ${err.message}`));
                    }
                }
                
                console.log(chalk.green.bold(`🎉 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 ɪs ᴀᴄᴛɪᴠᴇ ɪɴ :${nexusDevNumber}`));
            } catch (e) {
                console.log(chalk.yellow(`⚠️ Auto-actions failed: ${e.message}`));
            }
        } else if (connection === "connecting") {
            console.log(chalk.blue(`🔄 Connecting ${nexusDevNumber}...`));
        }
    });

    nexus.ev.on('creds.update', saveCreds);
    
    const healthCheckInterval = setInterval(() => {
        if (tracker.disconnected) {
            clearInterval(healthCheckInterval);
            return;
        }
        
        tracker.lastActivity = Date.now();
        
        if (nexus.ws?.readyState === 1) {
            nexus.sendPresenceUpdate('available').catch(() => {});
        }
    }, 60000);

    return nexus;
}

function smsg(nexus, m, store) {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = nexus.decodeJid(m.fromMe && nexus.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = nexus.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype]?.message)] : m.message[m.mtype]) || {}
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || (m.mtype == 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) || (m.mtype == 'buttonsResponseMessage' && m.msg?.selectedButtonId) || (m.mtype == 'viewOnceMessage' && m.msg?.caption) || m.text || ''
        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage || null
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
            m.quoted.sender = nexus.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === nexus.decodeJid(nexus.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false
                let q = await store.loadMessage(m.chat, m.quoted.id, nexus)
                return smsg(nexus, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            m.quoted.delete = () => nexus.sendMessage(m.quoted.chat, { delete: vM.key })
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => nexus.copyNForward(jid, vM, forceForward, options)
            m.quoted.download = () => nexus.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg?.url) m.download = () => nexus.downloadMediaMessage(m.msg)
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || ''
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? nexus.sendMedia(chatId, text, 'file', '', m, { ...options }) : nexus.sendText(chatId, text, m, { ...options })
    m.copy = () => smsg(nexus, M.fromObject(M.toObject(m)))
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => nexus.copyNForward(jid, m, forceForward, options)

    return m
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update '${__filename}'`))
    delete require.cache[file]
    require(file)
})

module.exports = startpairing;
