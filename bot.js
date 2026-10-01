require('./setting/config');
require('dotenv').config();
const fs = require('fs');
const {
    Telegraf,
    Context,
    Markup
} = require('telegraf');
const {
    message,
    editedMessage,
    channelPost,
    editedChannelPost,
    callbackQuery
} = require('telegraf/filters');
const path = require('path');
const os = require('os');
const yts = require('yt-search');
const { ytdl } = require('./allfunc/scrape-ytdl');
const startpairing = require('./pair');
const { BOT_TOKEN } = require('./token');
const adminFilePath = './database/admintele.json';
const bannedPath = './richstore/pairing/banned.json';
const ITEMS_PER_PAGE = 10;
const pagedListPairs = {};
const botStartTime = Date.now();
// Lazy ESM loader — baileys v6+ is ESM only
let _baileysLib = null;
async function loadBaileysLib() {
    if (!_baileysLib) _baileysLib = await import('@whiskeysockets/baileys');
    return _baileysLib;
}

if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });
if (!fs.existsSync('./richstore/pairing')) fs.mkdirSync('./richstore/pairing', { recursive: true });
if (!fs.existsSync('./richstore/pairing/users.json')) fs.writeFileSync('./richstore/pairing/users.json', '[]');

if (!fs.existsSync(adminFilePath)) {
    const defaultAdmin = [String(process.env.OWNER_ID || '7805569343')];
    fs.writeFileSync(adminFilePath, JSON.stringify(defaultAdmin, null, 2));
}

const userStore = './richstore/pairing/users.json';

function trackUser(id) {
    try {
        const users = JSON.parse(fs.readFileSync(userStore, 'utf8') || '[]');
        if (!users.includes(String(id))) {
            users.push(String(id));
            fs.writeFileSync(userStore, JSON.stringify(users, null, 2));
        }
    } catch (e) {
        console.error('trackUser error:', e.message);
    }
}

const adminIDs = JSON.parse(fs.readFileSync(adminFilePath, 'utf8'));
const bot = new Telegraf(BOT_TOKEN);
const premium_file = './premium.json';
let premiumUsers = [];

try {
    if (fs.existsSync(premium_file)) {
        premiumUsers = JSON.parse(fs.readFileSync(premium_file, 'utf-8'));
    } else {
        fs.writeFileSync(premium_file, JSON.stringify([]));
    }
} catch (error) {
    console.error('Failed to load premium users:', error);
}

const userStates = {};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPushName(ctx) {
    return ctx.from.first_name || ctx.from.username || 'User';
}

function sendListPairPage(ctx, userID, pageIndex) {
    const pairedDevices = pagedListPairs[userID] || [];
    const totalPages = Math.max(1, Math.ceil(pairedDevices.length / ITEMS_PER_PAGE));
    pageIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);
    const start = pageIndex * ITEMS_PER_PAGE;
    const currentPage = pairedDevices.slice(start, start + ITEMS_PER_PAGE);

    const pageText = currentPage.length
        ? currentPage.map((id, i) => `✪ *${start + i + 1}.* \`${id}\``).join('\n')
        : '_No paired devices found._';

    const navButtons = [];
    if (pageIndex > 0) navButtons.push({ text: '⬅️ Back', callback_data: `listpair_page_${pageIndex - 1}` });
    if (pageIndex < totalPages - 1) navButtons.push({ text: '➡️ Next', callback_data: `listpair_page_${pageIndex + 1}` });

    const text = `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ *Paired Bots (Page ${pageIndex + 1}/${totalPages}):*\n\n${pageText}\n╰━━━━━━━━━━━━━━━━━━╯`;

    ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: navButtons.length ? [navButtons] : [] }
    }).catch(() => {
        ctx.reply(text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: navButtons.length ? [navButtons] : [] }
        });
    });
}

function sendDelPairPage(ctx, userID, pageIndex) {
    const pairedDevices = pagedListPairs[userID] || [];
    const totalPages = Math.max(1, Math.ceil(pairedDevices.length / ITEMS_PER_PAGE));
    pageIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);
    const start = pageIndex * ITEMS_PER_PAGE;
    const currentPage = pairedDevices.slice(start, start + ITEMS_PER_PAGE);
    const keyboard = currentPage.map(id => [{ text: `🗑️ ${id}`, callback_data: `delpair_${id}` }]);
    const navButtons = [];
    if (pageIndex > 0) navButtons.push({ text: '⬅️ Back', callback_data: `delpair_page_${pageIndex - 1}` });
    if (pageIndex < totalPages - 1) navButtons.push({ text: '➡️ Next', callback_data: `delpair_page_${pageIndex + 1}` });
    if (navButtons.length) keyboard.push(navButtons);
    const text = pairedDevices.length
        ? `🗑️ *Delete Paired Devices (Page ${pageIndex + 1}/${totalPages}):*\n\nTap a device ID to delete.`
        : '_No paired devices found._';
    ctx.deleteMessage().catch(() => {});
    ctx.reply(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

function formatRuntime(seconds) {
    const pad = (s) => (s < 10 ? '0' + s : s);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
}

bot.command('ping', async (ctx) => {
    const uptime = Math.floor((Date.now() - botStartTime) / 1000);
    ctx.reply(
        `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ 🏓 *ᴘɪɴɢ ʀᴇsᴘᴏɴsᴇ*\n✪ ⏱️ *ʀᴜɴᴛɪᴍᴇ:* \`${formatRuntime(uptime)}\`\n✪ ✅ *sᴛᴀᴛᴜs:* Online\n╰━━━━━━━━━━━━━━━━━━╯`,
        { parse_mode: 'Markdown' }
    );
});

bot.start((ctx) => {
    const userId = ctx.from.id;
    trackUser(userId);

    ctx.reply(
        '╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ ᴜsᴇ ᴍʏ ʙᴏᴛ ᴄᴀʀᴇғᴜʟʟʏ\n✪ ᴛᴏ ᴜsᴇ ᴍʏ ᴠᴀʀɴᴏx x ᴜʟᴛʀᴀ ʙᴏᴛ ᴄʟɪᴄᴋ ᴘᴀɪʀɪɴɢ\n✪ ᴅᴇᴠ: @Varnox_Or_novark \n╰━━━━━━━━━━━━━━━━━━╯',
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✦ ᴄʟɪᴄᴋ sᴛᴀʀᴛ ᴘᴀɪʀɪɴɢ ✦', callback_data: 'start_bot' }]
                ]
            }
        }
    );
});

bot.action('start_bot', async (ctx) => {
    const pushname = getPushName(ctx);
    const photoUrl = 'https://gangalink.vercel.app/i/nfp41v55.jpg';
    const captionText = `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮
┃✪╭━━━━━━━━━━━━━━━━━≽
┃✪│ 👑 ᴅᴇᴠ :❯ @Varnox_Or_novark 
┃✪│ 🤖 ʙᴏᴛ :❯ 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔
┃✪│ ♻️ ᴠᴇʀsɪᴏɴ :❯ 2.0.5
┃✪│ 👋 ʜᴇʟʟᴏ :❯ ${pushname}
┃✪╰━━━━━━━━━━━━━━━━━≽
╰━━━━━━━━━━━━━━━┈⊷
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔📥 ᴄᴏᴍᴍᴀɴᴅs 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│ /connect - ᴘᴀɪʀ ᴡʜᴀᴛsᴀᴘᴘ
┃✪│ /delpair - ᴅᴇʟᴇᴛᴇ ᴘᴀɪʀ
┃✪│ /ping - ᴄʜᴇᴄᴋ sᴛᴀᴛᴜs
┃✪│ /broadcast - sᴇɴᴅ ᴍsɢ
╰━━━━━━━━━━━━━━━┈⊷
©σρƚιɱυʂ-xɱԃ ρσɯҽɾҽԃ Ⴆყ ʋαɾɳσx✦ρɾιɱҽ`;

    const buttons = Markup.inlineKeyboard([
        [
            Markup.button.url('👥 ɢʀᴏᴜᴘ ✪', 'https://t.me/varnox_Gc'),
            Markup.button.url('🔔 ᴄʜᴀɴɴᴇʟ ✪', 'https://t.me/varnox_official')
        ]
    ]);

    try {
        await ctx.sendChatAction('upload_photo');
        await ctx.replyWithPhoto(photoUrl, {
            caption: captionText,
            parse_mode: 'HTML',
            ...buttons
        });
    } catch (err) {
        console.error('Image failed to load, sending fallback text:', err.message);
        await ctx.reply(captionText, { parse_mode: 'HTML', ...buttons });
    }
});

bot.command('connect', async (ctx) => {
    try {
        const userId = ctx.from.id;

        const text = ctx.message.text.split(' ')[1];
        if (!text) {
            return ctx.reply(
                `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ ʜᴏᴡ ᴛᴏ ᴄᴏɴɴᴇᴄᴛ:\n✪ ᴇɴᴛᴇʀ ʏᴏᴜʀ ɴᴜᴍʙᴇʀ ʙᴇʟᴏᴡ\n✪ ᴇxᴀᴍᴘʟᴇ: /connect 224xxxxx\n╰━━━━━━━━━━━━━━━━━━╯`,
                { parse_mode: 'Markdown' }
            );
        }

        if (/[a-z]/i.test(text)) {
            return ctx.reply('✪ ❌ Please enter a valid phone number (digits only).');
        }

        if (!/^\d{7,15}(\|\d{1,10})?$/.test(text)) {
            return ctx.reply('✪ ❌ Format: /connect 224xxxx (numbers only, no symbols or letters)');
        }

        if (text.startsWith('0')) {
            return ctx.reply('✪ ❌ Please use international format (no leading 0).');
        }

        const target = text.split('|')[0];
        const Xreturn = ctx.message.reply_to_message
            ? ctx.message.reply_to_message.from.id
            : target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (!Xreturn) {
            return ctx.reply('✪ ❌ This number is not registered on WhatsApp');
        }

        const countryCode = text.slice(0, 3);
        const prefixxx = text.slice(0, 1);
        if (['252', '229', '92', '0'].includes(countryCode) || prefixxx === '0') {
            return ctx.reply('🚫 Sorry, numbers with this country code are not supported.');
        }

        const pairingFolder = './richstore/pairing';
        const pairedUsersFromJson = fs.readdirSync(pairingFolder).filter(file => file.endsWith('@s.whatsapp.net')).length;
        if (pairedUsersFromJson >= 70) {
            return ctx.reply('✪ ⚠️ *Pairing limit reached. Contact owner to expand server capacity.*', { parse_mode: 'Markdown' });
        }

        await ctx.reply('╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ ⏳ *Generating pairing code...*\n✪ Please wait a moment...\n╰━━━━━━━━━━━━━━━━━━╯', { parse_mode: 'Markdown' });

        const startpairingLocal = require('./pair.js');
        await startpairingLocal(Xreturn);
        await sleep(4000);

        const cu = fs.readFileSync('./richstore/pairing/pairing.json', 'utf-8');
        const cuObj = JSON.parse(cu);

        ctx.reply(
            `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 ᴘᴀɪʀ 〕━━━╮\n✪ ✅ ᴘᴀɪʀɪɴɢ ʀᴇᴀᴅʏ!\n✪ 📱 ɴᴜᴍʙᴇʀ: \`${target}\`\n✪ 🔑 ᴄᴏᴅᴇ: \`${cuObj.code}\`\n╰━━━━━━━━━━━━━━━━━━╯\n\n_Enter this code in WhatsApp > Linked Devices > Link with phone number_`,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 ᴄʜᴀɴɴᴇʟ ✪', url: 'https://t.me/varnox_official' }]
                    ]
                }
            }
        );
    } catch (error) {
        console.error('Error in connect command:', error);
        ctx.reply('⎔ An error occurred while processing your request. Please try again.');
    }
});

bot.command('listpair', async (ctx) => {
    const userID = ctx.from.id.toString();
    if (!adminIDs.includes(userID)) {
        return ctx.reply('🚫 *Unauthorized access.*', { parse_mode: 'Markdown' });
    }
    const pairingPath = './richstore/pairing';
    if (!fs.existsSync(pairingPath)) return ctx.reply('No paired devices found.');
    const entries = fs.readdirSync(pairingPath, { withFileTypes: true });
    const pairedDevices = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    if (pairedDevices.length === 0) return ctx.reply('✪ No paired devices found.');
    pagedListPairs[userID] = pairedDevices;
    sendListPairPage(ctx, userID, 0);
});

bot.action(/^listpair_page_(\d+)$/, async (ctx) => {
    const userID = ctx.from.id.toString();
    const pageIndex = parseInt(ctx.match[1]);
    sendListPairPage(ctx, userID, pageIndex);
    await ctx.answerCbQuery();
});

bot.command('deluser', async (ctx) => {
    const userID = ctx.from.id.toString();
    if (!adminIDs.includes(userID)) {
        return ctx.reply('🚫 *Unauthorized access.*', { parse_mode: 'Markdown' });
    }
    const pairingPath = './richstore/pairing';
    if (!fs.existsSync(pairingPath)) return ctx.reply('No paired devices found.');
    const entries = fs.readdirSync(pairingPath, { withFileTypes: true });
    const pairedDevices = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    if (pairedDevices.length === 0) return ctx.reply('✪ No paired devices found.');
    pagedListPairs[userID] = pairedDevices;
    sendDelPairPage(ctx, userID, 0);
});

bot.action(/^delpair_page_(\d+)$/, async (ctx) => {
    const userID = ctx.from.id.toString();
    const pageIndex = parseInt(ctx.match[1]);
    sendDelPairPage(ctx, userID, pageIndex);
    await ctx.answerCbQuery();
});

bot.action(/^delpair_(.+)$/, async (ctx) => {
    const userID = ctx.from.id.toString();
    if (!adminIDs.includes(userID)) {
        return ctx.answerCbQuery('🚫 Unauthorized', { show_alert: true });
    }
    const targetId = ctx.match[1];
    const targetPath = `./richstore/pairing/${targetId}`;
    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        await ctx.answerCbQuery(`✅ Deleted: ${targetId}`, { show_alert: true });
        ctx.reply(`✅ *Deleted:* \`${targetId}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.answerCbQuery('❌ Not found', { show_alert: true });
    }
});

bot.command('broadcast', async (ctx) => {
    const senderId = ctx.from.id;
    const msgText = ctx.message.text.split(' ').slice(1).join(' ');
    if (!adminIDs.includes(senderId.toString())) {
        return ctx.reply('🚫 *Unauthorized access.*', { parse_mode: 'Markdown' });
    }
    if (!msgText) {
        return ctx.reply('𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔\n\n✪ Usage: /broadcast Your message here!');
    }
    const users = JSON.parse(fs.readFileSync('./richstore/pairing/users.json', 'utf8') || '[]');
    let success = 0, failed = 0;
    await ctx.reply(`📡 *Broadcasting to ${users.length} users...*`, { parse_mode: 'Markdown' });
    for (const userId of users) {
        try {
            await ctx.telegram.sendMessage(userId, `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ 📢 *Broadcast Message:*\n\n${msgText}\n╰━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
            success++;
        } catch {
            failed++;
        }
    }
    ctx.reply(`╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ 📊 *Broadcast Complete*\n✪ ✅ Success: ${success}\n✪ ❌ Failed: ${failed}\n╰━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

bot.command('xreport', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return ctx.reply('𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔\n\n✪ Usage: /xreport 224xxxx');
    }
    const targetNumber = args[0].replace(/\D/g, '');
    if (!targetNumber) return ctx.reply('❌ Invalid number. Use digits only.');
    const { default: makeWASocket, useMultiFileAuthState, jidNormalizedUser } = await loadBaileysLib();
    const targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
    const pairingPath = './richstore/pairing';
    if (!fs.existsSync(pairingPath)) return ctx.reply('No active paired devices found.');
    const sessions = fs.readdirSync(pairingPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(pairingPath, entry.name));
    if (sessions.length === 0) return ctx.reply('✪ No active WhatsApp sessions to perform report.');
    await ctx.reply(`╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ 🚨 Starting *mass-report* on +${targetNumber}\n✪ Using ${sessions.length} paired bots...\n╰━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    for (const sessionPath of sessions) {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            const rich = makeWASocket({ auth: state });
            rich.ev.on('creds.update', saveCreds);
            for (let i = 0; i < 30; i++) {
                try {
                    await rich.ws.sendNode({
                        tag: 'iq',
                        attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'w:report' },
                        content: [{ tag: 'report', attrs: { to: targetJid, type: 'spam', id: rich.generateMessageTag() }, content: [] }]
                    });
                    await sleep(2000);
                } catch (err) {
                    console.error(`Report attempt ${i + 1} failed:`, err.message);
                }
            }
        } catch (err) {
            console.error(`Error with session ${path.basename(sessionPath)}:`, err.message);
        }
    }
    ctx.reply(`╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ ✅ *Report complete on +${targetNumber}*\n╰━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

bot.command('delpair', async (ctx) => {
    const text = ctx.message.text.trim();
    const args = text.split(' ').slice(1);
    if (args.length === 0) {
        return ctx.reply('𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔\n\n✪ Usage: /delpair 224xxxx', { parse_mode: 'Markdown' });
    }
    const inputNumber = args[0].replace(/\D/g, '');
    const jidSuffix = `${inputNumber}@s.whatsapp.net`;
    const pairingPath = './richstore/pairing';
    if (!fs.existsSync(pairingPath)) return ctx.reply('No paired devices found.');
    const entries = fs.readdirSync(pairingPath, { withFileTypes: true });
    const matched = entries.find(entry => entry.isDirectory() && entry.name.endsWith(jidSuffix));
    if (!matched) return ctx.reply(`❌ No paired device found for number ${inputNumber}`);
    const targetPath = `${pairingPath}/${matched.name}`;
    fs.rmSync(targetPath, { recursive: true, force: true });
    ctx.reply(
        `╭━━━〔 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 〕━━━╮\n✪ ✅ ᴘᴀɪʀ ᴅᴇʟᴇᴛᴇᴅ\n✪ 📱 ɴᴜᴍʙᴇʀ: \`${inputNumber}\`\n✪ 🆔 ɪᴅ: \`${matched.name}\`\n╰━━━━━━━━━━━━━━━━━━╯`,
        { parse_mode: 'Markdown' }
    );
});

bot.on(message('text'), async (ctx) => {
    const userId = ctx.from.id;
    if (userStates[userId] === 'waiting_for_song') {
        const text = ctx.message.text;
        try {
            await ctx.reply('🔍 *Searching...*', { parse_mode: 'Markdown' });
            const search = await yts(text);
            const telaso = search.all[0].url;
            const response = await ytdl(telaso);
            const puki = response.data.mp3;
            await ctx.replyWithAudio({ url: puki }, {
                caption: `🎵 *${search.all[0].title}*\n⏱️ ${search.all[0].timestamp}`,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error(error);
            ctx.reply('❌ An error occurred while downloading the song. Please try again.');
        }
        delete userStates[userId];
    }
});

bot.launch()
    .then(() => {
        console.log('╔══════════════════════════════════════╗');
        console.log('║  ✅ 𝗩𝗔𝗥𝗡𝗢𝗫 𝗫 𝗨𝗟𝗧𝗥𝗔 Bot is running!     ║');
        console.log('╚══════════════════════════════════════╝');
    })
    .catch(err => console.error('❌ Error while running bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
