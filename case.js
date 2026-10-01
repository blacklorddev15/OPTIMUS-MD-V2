require('./setting/config')
// baileys v6 is ESM-only — exports loaded lazily inside async handler via import()

const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const os = require('os')
const axios = require('axios')
const fsx = require('fs-extra')
const crypto = require('crypto')
const googleTTS = require('google-tts-api')
const mathjs = require('mathjs')
const speed = () => Date.now()
const timestampp = speed();
let jimp; try { jimp = require("jimp"); } catch(e) { jimp = null; console.warn('[WARN] jimp not available:', e.message); }
const latensi = speed() - timestampp
const moment = require('moment-timezone')
const yts = require('yt-search');
let ytdl; try { ytdl = require('@vreden/youtube_scraper'); } catch(e) { ytdl = null; console.warn('[WARN] @vreden/youtube_scraper not available:', e.message); }
const { smsg, tanggal, getTime, isUrl, sleep, clockString, runtime, fetchJson, getBuffer, jsonformat, format, parseMention, getRandom, getGroupAdmins, generateProfilePicture } = require('./allfunc/storage')
let imageToWebp, videoToWebp, writeExifImg, writeExifVid, addExif;
try {
    const exif = require('./allfunc/exif.js');
    imageToWebp = exif.imageToWebp; videoToWebp = exif.videoToWebp;
    writeExifImg = exif.writeExifImg; writeExifVid = exif.writeExifVid; addExif = exif.addExif;
} catch(e) {
    console.warn('[WARN] exif.js not available (ffmpeg missing?):', e.message);
    imageToWebp = videoToWebp = writeExifImg = writeExifVid = addExif = async () => { throw new Error('ffmpeg not available'); };
}
const richpic = fs.readFileSync(`./media/image1.jpg`)
const numberEmojis = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
// At the very top of your index.js or main bot file
const tictactoeGames = {}; // Stores ongoing Tic-Tac-Toe games per chat
const ownername = "𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋"
const hangmanGames = {};   // Stores ongoing Hangman games per chat
const hangmanVisual = [
    "😃🪓______", // 6 attempts left
    "😃🪓__|____",
    "😃🪓__|/___",
    "😃🪓__|/__",
    "😃🪓__|/\\_",
    "😃🪓__|/\\_", 
    "💀 Game Over!" // 0 attempts left
];
const { getSetting, setSetting } = require("./Settings.js")
const groupCache = new Map(); // Cache group metadata
const msg = { only: { group: "This command can only be used in groups." }, admin: "Only group admins can use this command.", botAdmin: "The bot must be an admin to do this.", premium: "This command is reserved for premium users." };
const themeemoji = "✪";
const MANDATORY_GROUP = 'https://chat.whatsapp.com/IGUAzSs582JBFNe5Oq8rZa?mode=gi_t';
const userTrackFile = './allfunc/userTrack.json';
if (!fs.existsSync(userTrackFile)) fs.writeFileSync(userTrackFile, '{}');
let userTrack = JSON.parse(fs.readFileSync(userTrackFile));
function trackUser(sender, pushName) {
    if (!userTrack[sender]) { userTrack[sender] = { name: pushName || "Unknown", firstSeen: moment().format('DD/MM/YYYY HH:mm:ss'), messageCount: 1 }; }
    else { userTrack[sender].name = pushName || userTrack[sender].name; userTrack[sender].messageCount++; }
    fs.writeFileSync(userTrackFile, JSON.stringify(userTrack, null, 2));
}
process.on('uncaughtException', (err) => { console.error(err); });

module.exports = rich = async (rich, m, chatUpdate, store) => {
const from = m.from || m.chat || m.key?.remoteJid
try {
      

const body = (
    m.mtype === "conversation" ? m.message?.conversation :
    m.mtype === "extendedTextMessage" ? m.message?.extendedTextMessage?.text :

    m.mtype === "imageMessage" ? m.message?.imageMessage?.caption :
    m.mtype === "videoMessage" ? m.message?.videoMessage?.caption :
    m.mtype === "documentMessage" ? m.message?.documentMessage?.caption || "" :
    m.mtype === "audioMessage" ? m.message?.audioMessage?.caption || "" :
    m.mtype === "stickerMessage" ? m.message?.stickerMessage?.caption || "" :

    m.mtype === "buttonsResponseMessage" ? m.message?.buttonsResponseMessage?.selectedButtonId :
    m.mtype === "listResponseMessage" ? m.message?.listResponseMessage?.singleSelectReply?.selectedRowId :
    m.mtype === "templateButtonReplyMessage" ? m.message?.templateButtonReplyMessage?.selectedId :
    m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg?.nativeFlowResponseMessage?.paramsJson).id :


    m.mtype === "messageContextInfo" ? m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || m.text :
    m.mtype === "reactionMessage" ? m.message?.reactionMessage?.text :
    m.mtype === "contactMessage" ? m.message?.contactMessage?.displayName :
    m.mtype === "contactsArrayMessage" ? m.message?.contactsArrayMessage?.contacts?.map(c => c.displayName).join(", ") :
    m.mtype === "locationMessage" ? `${m.message?.locationMessage?.degreesLatitude}, ${m.message?.locationMessage?.degreesLongitude}` :
    m.mtype === "liveLocationMessage" ? `${m.message?.liveLocationMessage?.degreesLatitude}, ${m.message?.liveLocationMessage?.degreesLongitude}` :
    m.mtype === "pollCreationMessage" ? m.message?.pollCreationMessage?.name :
    m.mtype === "pollUpdateMessage" ? m.message?.pollUpdateMessage?.name :
    m.mtype === "groupInviteMessage" ? m.message?.groupInviteMessage?.groupJid :

    m.mtype === "viewOnceMessage" ? (m.message?.viewOnceMessage?.message?.imageMessage?.caption ||
                                     m.message?.viewOnceMessage?.message?.videoMessage?.caption ||
                                     "[Pesan sekali lihat]") :
    m.mtype === "viewOnceMessageV2" ? (m.message?.viewOnceMessageV2?.message?.imageMessage?.caption ||
                                       m.message?.viewOnceMessageV2?.message?.videoMessage?.caption ||
                                       "[Pesan sekali lihat]") :
    m.mtype === "viewOnceMessageV2Extension" ? (m.message?.viewOnceMessageV2Extension?.message?.imageMessage?.caption ||
                                                m.message?.viewOnceMessageV2Extension?.message?.videoMessage?.caption ||
                                                "[Pesan sekali lihat]") :

    m.mtype === "ephemeralMessage" ? (m.message?.ephemeralMessage?.message?.conversation ||
                                      m.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
                                      "[Pesan sementara]") :

    m.mtype === "interactiveMessage" ? "[Pesan interaktif]" :

    m.mtype === "protocolMessage" ? "[Pesan telah dihapus]" :

    ""
);
const prefix = '.'; // Only dot as prefix
const owner = JSON.parse(fs.readFileSync('./allfunc/owner.json'))
const Premium = JSON.parse(fs.readFileSync('./allfunc/premium.json'))
const isCmd = body.startsWith(prefix);
const args = body.slice(prefix.length).trim().split(/ +/); // everything after the dot
const command = args.shift().toLowerCase(); // first word is the command
const text = args.join(" ")
const botNumber = await rich.decodeJid(rich.user.id)
const isCreator = [botNumber, ...owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
const isDev = owner
  .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  const isOwner = [botNumber, ...owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
const isPremium = [botNumber, ...Premium].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
const qtext = q = args.join(" ")
const quoted = m.quoted ? m.quoted : m
const { spawn: spawn, exec } = require('child_process')
const sender = m.isGroup ? (m.key.participant ? m.key.participant : m.participant) : m.key.remoteJid 
trackUser(sender, m.pushName);
const groupMetadata = m.isGroup ? await rich.groupMetadata(from).catch(e => null) : null
const participants = m.isGroup && groupMetadata ? groupMetadata.participants || [] : []
const groupAdmins = m.isGroup && groupMetadata ? getGroupAdmins(participants) : []
const isBotAdmins = m.isGroup ? groupAdmins.includes(botNumber) : false
const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false
const groupName = m.isGroup && groupMetadata ? groupMetadata.subject || "" : "";
const pushname = m.pushName || "No Name"
const time = moment(Date.now()).tz('Asia/Jakarta').locale('id').format('HH:mm:ss z')
const mime = (quoted.msg || quoted).mimetype || ''
const todayDateWIB = new Date().toLocaleDateString('id-ID', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const reply = async (text) => rich.sendMessage(m.chat, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                externalAdReply: {
                    title: "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃",
                    body: pushname,
                    mediaUrl: "https://gangalink.vercel.app/i/e0ems1q2.jpg",
                    sourceUrl: "https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E",
                    thumbnailUrl: "https://gangalink.vercel.app/i/e0ems1q2.jpg",
                    showAdAttribution: true
                }
            }
        });
async function sendImage(imageUrl, caption) {
  rich.sendMessage(m.chat, {
    image: { url: imageUrl },
    caption,
    contextInfo: {
      forwardingScore: 9,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "@newletter",
        newsletterName: "𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮",
      }
    }
  }, { quoted: m });
}
const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);
const Richie = "𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋";
if (!rich.public) {
if (!isCreator) return
}
const example = (teks) => {
return `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ᴜsᴀɢᴇ : *${prefix+command}* ${teks}`
}

let antilinkStatus = {};
if (!global.banned) global.banned = {} // stores banned users JIDs
if (getSetting(m.sender, "autobio", true)) {
    rich.updateProfileStatus(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 ɪs ᴄᴏɴɴᴇᴄᴛᴇᴅ ᴀɴᴅ ᴡᴇʟʟ ʀᴜɴɴɪɴɢ`).catch(_ => _)
}
if (isCmd)  {
    console.log(chalk.black(chalk.bgWhite('[𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃]')), chalk.black(chalk.bgGreen(new Date)), chalk.black(chalk.bgBlue(body || m.mtype)) + '\n✪' + chalk.magenta('=> From'), chalk.green(pushname), chalk.yellow(m.sender) + '\n' + chalk.blueBright('=>In'), chalk.green(m.isGroup ? pushname : 'Private Chat', m.chat))
}

if (getSetting(m.chat, "autoReact", false)) {
    const emojis = [
        "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
        "😍", "😘", "😎", "🤩", "🤔", "😏", "😣", "😥", "😮", "🤐",
        "😪", "😫", "😴", "😌", "😛", "😜", "😝", "🤤", "😒", "😓",
        "😔", "😕", "🙃", "🤑", "😲", "😖", "😞", "😟", "😤", "😢",
        "😭", "😨", "😩", "🤯", "😬", "😰", "😱", "🥵", "🥶", "😳",
        "🤪", "🀄", "😠", "🀄", "😷", "🤒", "🤕", "🤢", "🤮", "🤧",
        "😇", "🥳", "🤠", "🤡", "🤥", "🤫", "🤭", "🧐", "🤓", "😈",
        "👿", "👹", "👺", "💀", "👻", "🖕", "🙏", "🤖", "🎃", "😺",
        "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "💋", "💌",
        "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "💔", "❤️"
    ];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    try {
        await rich.sendMessage(m.chat, {
            react: { text: randomEmoji, key: m.key },
        });
    } catch (err) {
        console.error('Error while reacting:', err.message);
    }
}

if (getSetting(m.chat, "autoTyping", false)) {
    rich.sendPresenceUpdate('composing', from)
}
if (getSetting(m.chat, "autoRecording", false)) {
    rich.sendPresenceUpdate('recording', from)
}
if (getSetting(m.chat, "autoRecordType", false)) {
    let xeonrecordin = ['recording','composing']
    let xeonrecordinfinal = xeonrecordin[Math.floor(Math.random() * xeonrecordin.length)]
    rich.sendPresenceUpdate(xeonrecordinfinal, from)
}

// Anti-command: auto-delete bot commands sent by non-admins
if (getSetting(m.chat, 'anticmd', false) && m.isGroup && isCmd && !isAdmins && !isCreator) {
    try { await rich.sendMessage(m.chat, { delete: m.key }); } catch (e) {}
    return;
}

if (getSetting(m.chat, "antilink", false) && m.isGroup) {
    let linkRegex = /(https?:\/\/[^\s]+)/gi;
    if (linkRegex.test(m.text)) {
        if (isAdmins || isCreator) return;
        await rich.sendMessage(m.chat, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *ʟɪɴᴋ ᴅᴇᴛᴇᴄᴛᴇᴅ!* @${m.sender.split("@")[0]} ʟɪɴᴋ ᴀʀᴇ ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ.`, mentions: [m.sender] }, { quoted: m });
        try {
            await rich.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant } });
        } catch (e) {
            console.log("Failed to delete or kick:", e);
        }
    }
}

if (getSetting(m.sender, "autoViewStatus", false) && m.key.remoteJid === "status@broadcast") {
    try {
        await rich.readMessages([m.key]);
        console.log(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Viewed status from: ${m.key.participant}`);
    } catch (err) {
        console.log("❌ Error viewing status:", err);
    }
}

if (getSetting(m.chat, "autoRecording", false)) {
    rich.sendPresenceUpdate('recording', from)
}  
    
if (getSetting(m.chat, "autoTyping", false)) {
    rich.sendPresenceUpdate('composing', from)
}

if (getSetting(m.chat, "autoRecordType", false)) {
    let xeonrecordin = ['recording','composing']
    let xeonrecordinfinal = xeonrecordin[Math.floor(Math.random() * xeonrecordin.length)]
    rich.sendPresenceUpdate(xeonrecordinfinal, from)
}

if (getSetting(m.sender, "autoread", false)) {
   try {
      await rich.readMessages([m.key]) 
   } catch (e) {
      console.log("Auto-Read Error:", e)
   }
}

if (getSetting(m.sender, "banned", false)) {
    await rich.sendMessage(m.chat, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ʏᴏᴜ ᴀʀᴇ ғʀᴏᴍ ᴜsɪɴɢ ᴍᴇ, @${m.sender.split('@')[0]}`, mentions: [m.sender] }, { quoted: m })
    return
}

if (getSetting(m.chat, "feature.autoreply", false)) {
   const autoReplyList = { "ʜᴇʏ": "ᴅᴀʀʟɪɴɢ", "ᴄᴀɴ ɪ ʜᴇʟᴘ ʏᴏᴜ": "ɪ ʜᴏᴘᴇ ʏᴏᴜ 𝚊𝚛𝚎 ғɪɴᴇ", "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 ɪs ʜᴇʀᴇ": "ᴅᴇᴠ ʙʏ ᴠᴀʀɴᴏx✦ᴘʀɪᴍᴇ" }
   if (autoReplyList[m.text?.toLowerCase()]) {
      await rich.sendMessage(m.chat, { text: autoReplyList[m.text.toLowerCase()] }, { quoted: m })
   }
}

if (getSetting(m.chat, "feature.antispam", false) && m.isGroup) {
    if (!global.spam) global.spam = {};
    if (!global.spam[m.sender]) global.spam[m.sender] = { count: 0, last: Date.now() };

    let spamData = global.spam[m.sender];
    let now = Date.now();

    if (now - spamData.last < 5000) { // 5s window
        spamData.count++;
        if (spamData.count >= 5) {
            try {
                // Kick the user from the group
                await rich.groupParticipantsUpdate(m.chat, [m.sender], "remove");
                await rich.sendMessage(m.chat, { 
                    text: ` 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪@${m.sender.split('@')[0]} ʜᴀs ʙᴇᴇɴ ᴋɪᴄᴋᴇᴅ ғᴏʀ sᴘᴀᴍᴍɪɴɢ!`, 
                    mentions: [m.sender] 
                });
            } catch (err) {
                console.log("Failed to kick spammer:", err);
            }
            spamData.count = 0; // reset counter after kick
        }
    } else {
        spamData.count = 1;
    }
    spamData.last = now;
}

if (getSetting(m.chat, "feature.antibadword", false)) {
   const badWords = ["fuck", "bitch", "sex", "nigga","bastard","fool","mumu","idiot"]
   if (badWords.some(word => m.text?.toLowerCase().includes(word))) {
      await rich.sendMessage(m.chat, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ @${m.sender.split('@')[0]} ᴡᴀᴛᴄʜ ʏᴏᴜʀ ʟᴀɴɢᴜᴀɢᴇ`, mentions: [m.sender] })
      await rich.sendMessage(m.chat, { delete: m.key })
   }
}

if (getSetting(m.chat, "feature.antibot", false)) {
   let botPrefixes = ['.', '!', '/', '£']
   if (botPrefixes.includes(m.text?.trim()[0])) {
      if (m.sender !== (global.owner[0] || '224669288332') + "@s.whatsapp.net") {
         await rich.sendMessage(m.chat, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ʙᴏᴛ ᴍᴏɴɪᴛᴏʀ ɪs ᴀᴄᴛɪғ ! @${m.sender.split('@')[0]} ʏᴏᴜʀ ʙᴏᴛ ɪs ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ.`, mentions: [m.sender] })
         await rich.sendMessage(m.chat, { delete: m.key })
      }
   }
}

if (m.message) {
    console.log(chalk.hex('#3498db')(`message " ${body} "  from ${pushname} id ${m.isGroup ? `group ${groupName}` : 'private chat'}`));
}

switch(command) {


case 'menu': 
case 'buddha': {
    
    const menuImages = [
       'https://gangalink.vercel.app/i/e0ems1q2.jpg',
       'https://gangalink.vercel.app/i/e0ems1q2.jpg',
       'https://gangalink.vercel.app/i/nfp41v55.jpg'
       ];

    // Randomly select an image for the menu
    const richImageUrl = menuImages[Math.floor(Math.random() * menuImages.length)];

    const menuText = `
╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕
┃✪╭━━━━━━━━━━━━━━━━━
┃✪│👤 ᴜsᴇʀ :❯ ${m.pushName}
┃✪│🔆 ᴘʀᴇғɪx :❯ ${prefix}
┃✪│👑 ᴏᴡɴᴇʀ :❯ 𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵
┃✪│⏰️ ᴛɪᴍᴇ :❯ ${new Date().toLocaleTimeString()}
┃✪│🌐 ᴍᴏᴅᴇ :❯ ${rich.public ? 'public' : 'Self'}
┃✪│♻️ ᴠᴇʀsɪᴏɴ :❯ 2.0.5
╰━━━━━━━━━━━━━━━━━≽
${readMore}
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍ 〔🛠𝗢𝗪𝗡𝗘𝗥 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍sᴇʟғ
┃✪│❍ᴘᴜʙʟɪᴄ
┃✪│❍ᴘᴀɪʀ
┃✪│❍ʀᴇᴘᴏ
┃✪│❍ᴀʟɪᴠᴇ
┃✪│❍ᴘɪɴɢ
┃✪│❍ᴠᴠ
┃✪│❍ᴀɪ
╰━━━━━━━━━━━━━━━┈⊷
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔📦𝗚𝗘𝗡𝗘𝗥𝗔𝗟 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ᴅᴇᴍᴏᴛᴇ
┃✪│❍ᴄʟᴏsᴇᴛɪᴍᴇ
┃✪│❍ᴏᴘᴇɴᴛɪᴍᴇ
┃✪│❍ᴜɴᴍᴜᴛᴇ
┃✪│❍ᴜɴʙᴀɴ
┃✪│❍ᴘʀᴏᴍᴏᴛᴇ
┃✪│❍ᴍᴜᴛᴇ
┃✪│❍ʙᴀɴ
┃✪│❍ᴛᴀɢᴀʟʟ
┃✪│❍ʜɪᴅᴇᴛᴀɢ
┃✪│❍ᴀɴᴛɪʟɪɴᴋ
┃✪│❍ʙʟᴏᴄᴋ
┃✪│❍ᴜɴʙʟᴏᴄᴋ
┃✪│❍ᴊᴏɪɴ
┃✪│❍ʟᴇғᴛ
┃✪│❍ᴡᴇʟᴄᴏᴍᴇ
┃✪│❍ᴊɪᴅ
┃✪│❍ɪᴅᴄʜ
┃✪│❍ᴛᴀɢᴀʟʟ
┃✪│❍ʜɪᴅᴇᴛᴀɢ
╰━━━━━━━━━━━━━━━┈⊷
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔📭𝗞𝗜𝗖𝗞 𝗠𝗘𝗡𝗨 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ᴋɪᴄᴋ
┃✪│❍ᴋɪᴄᴋᴀᴅᴍɪɴs
┃✪│❍ᴋɪᴄᴋᴀʟʟ
╰━━━━━━━━━━━━━━━┈⊷
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔⚠️𝗔𝗡𝗧𝗜-𝗠𝗘𝗡𝗨 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ᴀɴᴛɪʟᴏᴠᴇ
┃✪│❍ᴀɴᴛɪᴘsᴇᴜᴅᴏ
┃✪│❍ᴀɴᴛɪʙᴀᴅᴡᴏʀᴅ
┃✪│❍ᴀɴᴛɪғᴀᴋᴇ
┃✪│❍ᴀɴᴛɪsᴘᴀᴍ
┃✪│❍ᴀɴᴛɪᴛᴀɢ
┃✪│❍ᴀɴᴛɪᴘᴏʀɴᴏ
┃✪│❍ᴀɴᴛɪsᴛɪᴄᴋ
┃✪│❍ᴀɴᴛɪᴘᴜʀɢᴇᴜʀ
┃✪│❍ᴀɴᴛɪʀᴇᴀᴄᴛ
┃✪│❍ᴀɴᴛɪᴅᴇʟᴇᴛᴇ
┃✪│❍ᴀɴᴛɪʙᴏᴛ
┃✪│❍ᴀɴᴛɪɪɴsᴜʟᴛ
┃✪│❍ᴀɴᴛɪᴘʀɪᴠᴀᴛᴇ
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔📥𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ᴛɪᴋᴛᴏᴋ
┃✪│❍ᴀᴘᴋ
┃✪│❍ᴘʟᴀʏ
┃✪│❍ʏᴛsᴇᴀʀᴄʜ
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔✨️𝗖𝗢𝗡𝗩𝗘𝗥𝗦𝗜𝗢𝗡 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ᴛᴏᴍᴘ4
┃✪│❍ᴛᴏᴍᴘ3
┃✪│❍ᴛᴏɪᴍɢ
┃✪│❍ᴛᴏᴜʀʟ
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔🔮𝗧𝗘𝗫𝗧/𝗚𝗙𝗫 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ɢʟɪᴛᴄʜᴛᴇxᴛ
┃✪│❍ᴡʀɪᴛᴇᴛᴇxᴛ
┃✪│❍ᴀᴅᴠᴀɴᴄᴇᴅɢʟᴏᴡ
┃✪│❍ᴛʏᴘᴏɢʀᴀᴘʜʏᴛᴇxᴛ
┃✪│❍ᴘɪxᴇʟɢʟɪᴛᴄʜ
┃✪│❍ɴᴇᴏɴɢʟɪᴛᴄʜ
┃✪│❍ғʟᴀɢᴛᴇxᴛ
┃✪│❍ғʟᴀɢ3ᴅᴛᴇxᴛ
┃✪│❍ᴅᴇʟᴇᴛɪɴɢᴛᴇxᴛ
┃✪│❍ʙʟᴀᴄᴋᴘɪɴᴋsᴛʏʟᴇ
┃✪│❍ɢʟᴏᴡɪɴɢᴛᴇxᴛ
┃✪│❍ᴜɴᴅᴇʀᴡᴀᴛᴇʀᴛᴇxᴛ
┃✪│❍ʟᴏɢᴏᴍᴀʀᴋᴇʀ
┃✪│❍ᴄᴀʀᴛᴏᴏɴsᴛʏʟᴇ
┃✪│❍ᴘᴀᴘᴇʀᴄᴜᴛsᴛʏʟᴇ
┃✪│❍ᴡᴀᴛᴇʀᴄᴏʟᴏʀᴛᴇxᴛ
┃✪│❍ɢᴀʟᴀxʏsᴛʏʟᴇ
┃✪│❍ɢғx1
┃✪│❍ɢғx2
┃✪│❍ɢғx3
┃✪│❍ɢғx4
┃✪│❍ɢғx5
┃✪│❍ɢғx6
┃✪│❍ɢғx7
┃✪│❍ɢғx8
┃✪│❍ɢғx9
┃✪│❍ɢғx10
┃✪│❍ɢғx11
┃✪│❍ɢғx12
╭━━━━━━━━━━━━━━━━━≽
┃✪│❍〔🎮𝗚𝗔𝗠𝗘 〕
╰━━━━━━━━━━━━━━━━━≽
┃✪│❍ʜᴀɴɢᴍᴀɴ
┃✪│❍ᴛɪᴄᴛᴀᴄᴛᴏᴇ
┃✪│❍ᴅɪᴄᴇ
┃✪│ ᴄᴏɪɴ
┃✪│❍ʀᴘs
┃✪│❍ʀᴘsʟs
┃✪│❍ɴᴜᴍʙᴀᴛᴛʟᴇ
┃✪│❍ᴇᴍᴏᴊɪǫᴜɪᴢ
┃✪│❍ɢᴜᴇss
┃✪│❍ᴛʀɪᴠɪᴀ
╰━━━━━━━━━━━━━━━━━≽
> ©σρƚιɱυʂ-xɱԃ 2026 Ⴆყ 𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵

`;

    const fakeSystem = {
        key: {
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "FakeID12345",
            participant: "0@s.whatsapp.net"
        },
        message: {
            conversation: "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃"
        }
    };

    // Send the menu image with the caption.
    //
    // This was a single unlucky await: if the image host failed, the send threw, the
    // dispatcher's catch swallowed it, and .menu answered with nothing at all. That host is a
    // third party and it currently answers 402 Payment Required, so fall back to an image
    // shipped in ./media, and then to plain text. The menu must never be silent.
    try {
        await rich.sendMessage(from, {
            image: { url: richImageUrl },
            caption: menuText
        }, { quoted: fakeSystem });
    } catch (menuImageError) {
        try {
            const menuFs = require('fs');
            const localMenuImage = ['./media/rich.jpg', './media/image1.jpg', './media/thumb.jpg']
                .find((candidate) => menuFs.existsSync(candidate));
            if (!localMenuImage) throw menuImageError;
            await rich.sendMessage(from, {
                image: menuFs.readFileSync(localMenuImage),
                caption: menuText
            }, { quoted: fakeSystem });
        } catch (menuLocalError) {
            await rich.sendMessage(from, { text: menuText }, { quoted: fakeSystem });
        }
    }
}
break;
case 'welcome': {
    if (args[0] === 'on') {
      setSetting(m.chat, "welcome", true);
      reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪✅ ᴡᴇʟᴄᴏᴍᴇ ᴍᴇssᴀɢᴇs ʜᴀᴠᴇ ʙᴇᴇɴ *ᴇɴᴀʙʟᴇᴅ* ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ');
   } else if (args[0] === 'off') {
      setSetting(m.chat, "welcome", false);
      reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪🚫 ᴡᴇʟᴄᴏᴍᴇ ᴍᴇssᴀɢᴇs ʜᴀᴠᴇ ʙᴇᴇɴ *ᴅɪsᴀʙʟᴇᴅ* ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ');
   } else {
      reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ᴜsᴀɢᴇ: welcome on/off');
   }
}
break;
// 🔹 Auto Bio
case "autobio": {
    if (!args[0]) return m.reply("Usage: autobio on/off");
    if (args[0].toLowerCase() === "on") {
        setSetting(m.sender, "autobio", true);
        m.reply("📝 Auto Bio enabled");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.sender, "autobio", false);
        m.reply("🛑 Auto Bio disabled");
    } else m.reply("Usage: autobio on/off");
}
break;

// 🔹 Auto Read
case "autoread": {
    if (!args[0]) return m.reply("Usage: autoread on/off");
    if (args[0].toLowerCase() === "on") {
        setSetting(m.sender, "autoread", true);
        m.reply("✅ Auto-Read enabled for you");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.sender, "autoread", false);
        m.reply("❌ Auto-Read disabled for you");
    } else m.reply("Usage: autoread on/off");
}
break;

// 🔹 Auto View Status
case "autoviewstatus": {
    if (!args[0]) return m.reply("Usage: autoviewstatus on/off");
    if (args[0].toLowerCase() === "on") {
        setSetting(m.sender, "autoViewStatus", true);
        m.reply("📢 Auto View Status is now ON ✅");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.sender, "autoViewStatus", false);
        m.reply("📢 Auto View Status is now OFF ❌");
    } else m.reply("Usage: autoviewstatus on/off");
}
break;

// 🔹 Auto Typing
case "autotyping": {
    if (!args[0]) return m.reply("Usage: autotyping on/off");
    if (!m.isGroup) return m.reply("ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴡᴏʀᴋs ɪɴ ɢʀᴏᴜᴘs.");

    if (args[0].toLowerCase() === "on") {
        setSetting(m.chat, "autoTyping", true);
        m.reply("📝 Auto Typing enabled in this group");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.chat, "autoTyping", false);
        m.reply("🛑 Auto Typing disabled in this group");
    } else m.reply("Usage: autotyping on/off");
}
break;

// 🔹 Auto Recording 
case "autorecording":{
    if (!args[0]) return m.reply("Usage: autorecording on/off");
    if (!m.isGroup) return m.reply("ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴡᴏʀᴋs ɪɴ ɢʀᴏᴜᴘs.");

    if (args[0].toLowerCase() === "on") {
        setSetting(m.chat, "autoRecording", true);
        m.reply("🎙️ Auto Recording enabled in this group");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.chat, "autoRecording", false);
        m.reply("🛑 Auto Recording disabled in this group");
    } else m.reply("Usage: autorecording on/off");
}
break;

// 🔹 Auto Record Type
case "autorecordtype": {
    if (!args[0]) return m.reply("Usage: autorecordtype on/off");
    if (!m.isGroup) return m.reply("This command only works in groups.");

    if (args[0].toLowerCase() === "on") {
        setSetting(m.chat, "autoRecordType", true);
        m.reply("🎛️ Auto Record Type enabled in this group");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.chat, "autoRecordType", false);
        m.reply("🛑 Auto Record Type disabled in this group");
    } else m.reply("Usage: autorecordtype on/off");
}
break;

// 🔹 Auto React
case "autoreact": {
    if (!args[0]) return m.reply("Usage: autoreact on/off");
    if (!m.isGroup) return m.reply("ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴡᴏʀᴋs ɪɴ ɢʀᴏᴜᴘs.");

    if (args[0].toLowerCase() === "on") {
        setSetting(m.chat, "autoReact", true);
        m.reply("😎 ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ ᴇɴᴀʙʟᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ");
    } else if (args[0].toLowerCase() === "off") {
        setSetting(m.chat, "autoReact", false);
        m.reply("🛑 ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ ᴅɪsᴀʙʟᴇᴅ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ");
    } else m.reply("Usage: autoreact on/off");
}
break;

//🔹 ANTI-LINK
case "antilink": if (m.isGroup) { setSetting(m.chat, "antilink", !getSetting(m.chat, "antilink", false)); reply(`🛡️ Anti-Link ${getSetting(m.chat, "antilink", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-SPAM
case "antispam": if (m.isGroup) { setSetting(m.chat, "feature.antispam", !getSetting(m.chat, "feature.antispam", false)); reply(`⚠️ Anti-Spam ${getSetting(m.chat, "feature.antispam", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-BADWORD
case "antibadword": if (m.isGroup) { setSetting(m.chat, "feature.antibadword", !getSetting(m.chat, "feature.antibadword", false)); reply(`🤬 Anti-Badword ${getSetting(m.chat, "feature.antibadword", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-BOT
case "antibot": if (m.isGroup) { setSetting(m.chat, "feature.antibot", !getSetting(m.chat, "feature.antibot", false)); reply(`🤖 Anti-Bot ${getSetting(m.chat, "feature.antibot", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-PSEUDO
case "antipseudo": if (m.isGroup) { setSetting(m.chat, "feature.antipseudo", !getSetting(m.chat, "feature.antipseudo", false)); reply(`👤 Anti-Pseudo ${getSetting(m.chat, "feature.antipseudo", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-TAG
case "antitag": if (m.isGroup) { setSetting(m.chat, "feature.antitag", !getSetting(m.chat, "feature.antitag", false)); reply(`🚫 Anti-Tag ${getSetting(m.chat, "feature.antitag", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-PORNO
case "antiporno": if (m.isGroup) { setSetting(m.chat, "feature.antiporno", !getSetting(m.chat, "feature.antiporno", false)); reply(`🔞 Anti-Porn ${getSetting(m.chat, "feature.antiporno", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-STICKER
case "antisticker": if (m.isGroup) { setSetting(m.chat, "feature.antisticker", !getSetting(m.chat, "feature.antisticker", false)); reply(`🧸 Anti-Sticker ${getSetting(m.chat, "feature.antisticker", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-PURGEUR
case "antipurgeur": if (m.isGroup) { setSetting(m.chat, "feature.antipurgeur", !getSetting(m.chat, "feature.antipurgeur", false)); reply(`🧹 Anti-Purger ${getSetting(m.chat, "feature.antipurgeur", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-REACT
case "antireact": if (m.isGroup) { setSetting(m.chat, "feature.antireact", !getSetting(m.chat, "feature.antireact", false)); reply(`😡 Anti-React ${getSetting(m.chat, "feature.antireact", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-DELETE
case "antidelete": if (m.isGroup) { setSetting(m.chat, "feature.antidelete", !getSetting(m.chat, "feature.antidelete", false)); reply(`👻 Anti-Delete ${getSetting(m.chat, "feature.antidelete", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-INSULT
case "antiinsult": if (m.isGroup) { setSetting(m.chat, "feature.antiinsult", !getSetting(m.chat, "feature.antiinsult", false)); reply(`🗣️ Anti-Insult ${getSetting(m.chat, "feature.antiinsult", false) ? 'ON' : 'OFF'}`); } else reply("Group only"); break;

//🔹 ANTI-PRIVE
case "antiprive": setSetting("bot", "antiprive", !getSetting("bot", "antiprive", false)); reply(`🔒 Anti-Private ${getSetting("bot", "antiprive", false) ? 'ON' : 'OFF'}`); break;

//🔹 TRACK-USER
case "track": case "trackuser": if (!text) reply('📊 Usage: .track @user'); else { let u = m.mentionedJid[0] || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'; if (userTrack[u]) { let t = userTrack[u]; reply(`📊 *${t.name}*\nFirst Seen: ${t.firstSeen}\nMessages: ${t.messageCount}`); } else reply('User not found'); }
break;

// 🔹 Owner case
case 'dev':
case 'owner': {
   const ownerNum = '224669288332';
   const ownerName = '𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋';
   const ownerPhoto = 'https://files.catbox.moe/jieuny.jpg';
   const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\nEND:VCARD`;
   await rich.sendMessage(m.chat, {
       image: { url: ownerPhoto },
       caption: `╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 👑 *ᴏᴡɴᴇʀ*\n✪ 📛 ɴᴀᴍᴇ: ${ownerName}\n✪ 📞 ɴᴜᴍʙᴇʀ: +${ownerNum}\n╰━━━━━━━━━━━━━━━━━━╯`,
   }, { quoted: m });
   await rich.sendMessage(m.chat, {
       contacts: { displayName: ownerName, contacts: [{ vcard }] }
   }, { quoted: m });
}
break

// 🔹 Repo case
case 'repo': {
   let txt = `  
    𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 ᴜsᴀɢᴇ :
ᴛʏᴘᴇ /pair <224𝚇𝚇𝚇𝚇>
✪ ʙᴏᴛ ʟɪɴᴋ
ɢᴏ ᴀɴᴅ ᴘᴀɪʀ  

✪ http://t.me/Optimusxmdv2bot
✪ http://t.me/Optimusxmdv2bot
`
   await rich.sendMessage(m.chat, { text: txt }, { quoted: m })
}
break

case 'url':
case 'tourl': {    

    let q = m.quoted ? m.quoted : m;
    if (!q || !q.download) return reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Reply to an Image or Video with command ${prefix + command}`);
    
    let mime = q.mimetype || '';
    if (!/image\/(png|jpe?g|gif)|video\/mp4/.test(mime)) {
        return reply('Only images or MP4 videos are supported!');
    }

    let media;
    try {
        media = await q.download();
    } catch (error) {
        return reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Failed to download media!');
    }

    const uploadImage = require('./allfunc/Data6');
    const uploadFile = require('./allfunc/Data7');
    let isTele = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime);
    let link;
    try {
        link = await (isTele ? uploadImage : uploadFile)(media);
    } catch (error) {
        return reply('Failed to upload media!');
    }

    rich.sendMessage(m.chat, {
        text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Link: ${link}`
    }, { quoted: m });
}
break;
case 'tiktok':
case 'tt':
    {
        if (!text) {
            return reply(`Example: ${prefix + command} link`);
        }
        if (!text.includes('tiktok.com')) {
            return reply(`Link Invalid!! Please provide a valid TikTok link.`);
        }
        
        m.reply("loading..");
    
        const tiktokApiUrl = `https://api.bk9.dev/download/tiktok?url=${encodeURIComponent(text)}`;

        fetch(tiktokApiUrl)
            .then(response => response.json())
            .then(data => {
                if (!data.status || !data.BK9 || !data.BK9.BK9) {
                    return reply('Failed to get a valid download link from the API.');
                }
                
                const videoUrl = data.BK9.BK9;
                
                rich.sendMessage(m.chat, {
                    caption: "success",
                    video: { url: videoUrl }
                }, { quoted: m });
            })
            .catch(err => {
                console.error(err);
                reply("An error occurred while fetching the video. Please check your network or try a different link.");
            });
    }
    break;
case 'apk':
case 'apkdl': {
  if (!text) {
    return reply(` *Example:* ${prefix + command} com.whatsapp`);
  }
  
  try {
    const packageId = text.trim();
    const res = await fetch(`https://api.bk9.dev/download/apk?id=${encodeURIComponent(packageId)}`);
    const data = await res.json();

    if (!data.status || !data.BK9 || !data.BK9.dllink) {
      return reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *APK not found.* The package ID might be incorrect or the API failed. Please try a different one.');
    }

    const { name, emperor, dllink, package: packageName } = data.BK9;

    await rich.sendMessage(m.chat, {
      image: { url: emperor},
      caption:
`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔*📦 APK Downloader* 
✪ *Name:* _${name}_
✪ *Package:* _${packageName}_
✪ *Download:* [Click Here](${dllink})`
    }, { quoted: m });

    await rich.sendMessage(m.chat, {
      document: { url: dllink },
      fileName: `${name}.apk`,
      mimetype: 'application/vnd.android.package-archive'
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    reply('*Failed to fetch APK.* An unexpected error occurred. Please try again later.');
  }
}
break;
case 'tomp4': {
   if (!m.quoted) return reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪🖼️ Reply to a *sticker or gif* with tomp4")
   let mime = m.quoted.mimetype || ''
   if (!/webp|gif/.test(mime)) return reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪⚠️ Reply must be a sticker or gif")

   try {
      // Download the quoted sticker/gif
      let media = await rich.downloadMediaMessage(m.quoted)

      // Send it as video/mp4
      await rich.sendMessage(m.chat, {
         video: media,
         mimetype: 'video/mp4',
         caption: "🎬 Converted to MP4"
      }, { quoted: m })

   } catch (e) {
      console.log(e)
      reply("❌ Failed to convert to MP4")
   }
}
break
case 'tomp3': {
   if (!m.quoted) return reply("🎥 Reply to a *video* with tomp3")
   let mime = m.quoted.mimetype || ''
   if (!/video/.test(mime)) return reply("⚠️ Reply to a video only")

   try {
      // download the quoted video
      let media = await rich.downloadMediaMessage(m.quoted)

      // send it back as audio (mp3)
      await rich.sendMessage(m.chat, {
         audio: media,
         mimetype: 'audio/mpeg',
         ptt: false
      }, { quoted: m })

   } catch (e) {
      console.log(e)
      reply("❌ Failed to convert to MP3")
   }
}
break
case 'kickadmins': {
    if (!m.isGroup) return reply(m.group)
    if (!isBotAdmins) return reply(m.botAdmin)

    let metadata = await rich.groupMetadata(m.chat)
    let participants = metadata.participants

    for (let member of participants) {
        // Skip bot and command issuer
        if (member.id === botNumber) continue
        if (member.id === m.sender) continue

        // Only kick admins
        if (member.admin === "superadmin" || member.admin === "admin") {
            await rich.groupParticipantsUpdate(
                m.chat,
                [member.id],
                'remove'
            )
            await sleep(1500) // prevent WA rate limit
        }
    }

    m.reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ᴛʜɪs ᴘʟᴀᴄᴇ ɪs ᴜɴᴅᴇʀ ᴍʏ ᴄᴏɴᴛʀᴏʟ")
}
break;
case 'kickall': {
    if (!isCreator) return reply("owner only")
    if (!m.isGroup) return reply(m.group)
    if (!isCreator) return reply(m.admin)
    if (!isBotAdmins) return reply(m.botAdmin)

    let metadata = await rich.groupMetadata(m.chat)
    let participants = metadata.participants

    for (let member of participants) {
        // skip owner & bot itself
        if (member.id === botNumber) continue
        if (member.admin === "superadmin" || member.admin === "admin") continue 

        await rich.groupParticipantsUpdate(
            m.chat,
            [member.id],
            'remove'
        )
        await sleep(1500) // delay so WA won’t block
    }

    m.reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ᴛʜᴇʀᴇ ɪs ɴᴏ ʜᴏᴘᴇ...ᴘᴜʀɢᴇ ᴇxᴇᴄᴜᴛᴇᴅ ᴀʟʟ ᴍᴇᴍʙᴇʀs ʜᴀᴠ𝙴 ʙᴇᴇɴ sᴜᴍᴍᴏɴᴇᴅ")
}
break;

case 'paptt': { if (prefix === '.') {
 if (!isCreator) return reply(m.premium)
global.paptt = [
 "https://telegra.ph/file/5c62d66881100db561c9f.mp4",
 "https://telegra.ph/file/a5730f376956d82f9689c.jpg",
 "https://telegra.ph/file/8fb304f891b9827fa88a5.jpg",
 "https://telegra.ph/file/0c8d173a9cb44fe54f3d3.mp4",
 "https://telegra.ph/file/b58a5b8177521565c503b.mp4",
 "https://telegra.ph/file/34d9348cd0b420eca47e5.jpg",
 "https://telegra.ph/file/73c0fecd276c19560133e.jpg",
 "https://telegra.ph/file/af029472c3fcf859fd281.jpg",
 "https://telegra.ph/file/0e5be819fa70516f63766.jpg",
 "https://telegra.ph/file/29146a2c1a9836c01f5a3.jpg",
 "https://telegra.ph/file/85883c0024081ffb551b8.jpg",
 "https://telegra.ph/file/d8b79ac5e98796efd9d7d.jpg",
 "https://telegra.ph/file/267744a1a8c897b1636b9.jpg",
 ]
 let url = paptt[Math.floor(Math.random() * paptt.length)]
 rich.sendFile(m.chat, url, null, '𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔Aww..umm💦,am so horny come ride my pu**y anyhow u want🤤🍑🍆', m)
}}
break
case 'coffee': {
rich.sendMessage(m.chat, {caption: m.success, image: { url: 'https://coffee.alexflipnote.dev/random' }}, { quoted: m })
            }
            break
case 'myip': {
        if (!isCreator) return reply(m.only.owner)
var http = require('http')
http.get({
'host': 'api.ipify.org',
'port': 80,
'path': '/'
}, function(resp) {
resp.on('data', function(ip) {
    reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔Your Ip Address Is: " + ip)
})
})
            }
        break


case "movie": {
    if (!text) return m.reply("Provide a movie title. Example: movie Inception");
    try {
        const res = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(text)}&apikey=6372bb60`);
        if (res.data.Response === "False") return m.reply("Movie not found.");
        const data = res.data;
        const msg = `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪🎬 Title: ${data.Title}
✪ Year: ${data.Year}
✪ Rated: ${data.Rated}
✪ Released: ${data.Released}
✪ Runtime: ${data.Runtime}
✪ Genre: ${data.Genre}
✪ Director: ${data.Director}
✪ Actors: ${data.Actors}
✪ Plot: ${data.Plot}
✪ IMDB Rating: ${data.imdbRating}
✪ Link: https://www.imdb.com/title/${data.imdbID}`;
        await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch movie info.");
    }
}
break;
case "recipe-ingredient": {
    if (!text) return m.reply("Provide an ingredient. Example: recipe-ingredient chicken");
    try {
        const res = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(text)}`);
        if (!res.data.meals) return m.reply(" No recipes found with that ingredient.");
        const meals = res.data.meals.slice(0,5).map((m,i)=>`${i+1}. ${m.strMeal}\nhttps://www.themealdb.com/meal.php?c=${m.idMeal}`).join("\n\n");
        await rich.sendMessage(m.chat, { text: `🍴 Recipes with "${text}":\n\n${meals}` }, { quoted: m });
    } catch {
        m.reply("Failed to fetch recipes.");
    }
}
break;
case "mathfact": {
    try {
        const res = await axios.get("http://numbersapi.com/random/math?json");
        await rich.sendMessage(m.chat, { text: `🔢 Math Fact:\n${res.data.text}` }, { quoted: m });
    } catch {
        m.reply("Failed to fetch math fact.");
    }
}
break;
case "sciencefact": {
    try {
        const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
        await rich.sendMessage(m.chat, { text: `🔬 Science Fact:\n${res.data.text}` }, { quoted: m });
    } catch {
        m.reply("Failed to fetch science fact.");
    }
}
break;
case "book": {
    if (!text) return m.reply("Provide a book title or author. Example: book Harry Potter");
    try {
        const res = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(text)}&limit=5`);
        if (!res.data.docs.length) return m.reply(" No books found.");
        const books = res.data.docs.map((b,i)=>`${i+1}. ${b.title} by ${b.author_name?.[0] || "Unknown"}\nLink: https://openlibrary.org${b.key}`).join("\n\n");
        await rich.sendMessage(m.chat, { text: `📚 Book Search Results:\n\n${books}` }, { quoted: m });
    } catch {
        m.reply("Failed to fetch book information.");
    }
}
break;
case "horoscope": {
    if (!text) return m.reply("Provide your zodiac sign. Example: horoscope leo");
    try {
        const res = await axios.get(`https://aztro.sameerkumar.website/?sign=${text.toLowerCase()}&day=today`, { method: "POST" });
        const data = res.data;
        const msg = `🔮 Horoscope for ${text.toUpperCase()}:\nMood: ${data.mood}\nLucky Number: ${data.lucky_number}\nLucky Color: ${data.color}\nCompatibility: ${data.compatibility}\nDate Range: ${data.date_range}\n\n${data.description}`;
        await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
    } catch {
        m.reply("Failed to fetch horoscope.");
    }
}
break;
case "recipe": {
    if (!text) return m.reply("Provide a dish name. Example: recipe pancakes");
    try {
        const res = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(text)}`);
        if (!res.data.meals) return m.reply("No recipes found.");
        const meal = res.data.meals[0];
        const msg = `🍽 Recipe: ${meal.strMeal}\nCategory: ${meal.strCategory}\nCuisine: ${meal.strArea}\n\nIngredients:\n${Array.from({length:20}).map((_,i)=>meal[`strIngredient${i+1}`] ? `${meal[`strIngredient${i+1}`]} - ${meal[`strMeasure${i+1}`]}` : '').filter(Boolean).join("\n")}\n\nInstructions:\n${meal.strInstructions}`;
        await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
    } catch {
        m.reply("Failed to fetch recipe.");
    }
}
break;

case "remind": {
    if (!text) return m.reply("Usage: remind <seconds> <message>. Example: remind 60 Take a break");
    const [sec, ...msgArr] = text.split(" ");
    const msgText = msgArr.join(" ");
    const delay = parseInt(sec) * 1000;
    if (isNaN(delay) || !msgText) return m.reply(" Invalid usage.");
    await m.reply(`⏰ Reminder set for ${sec} seconds.`);
    setTimeout(() => {
        rich.sendMessage(m.chat, { text: `⏰ Reminder: ${msgText}` });
    }, delay);
}
break;
case "define":
case "dictionary": {
    if (!text) return m.reply("Provide a word to define. Example: define computer");
    try {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
        const meanings = res.data[0].meanings[0].definitions[0].definition;
        await rich.sendMessage(m.chat, { text: `📖 ${text}:\n${meanings}` }, { quoted: m });
    } catch {
        m.reply("Could not find definition.");
    }
}
break;
case "currency": {
    if (!text) return m.reply(" Usage: currency <amount> <from> <to>\nExample: currency 100 USD NGN");
    const [amount, from, to] = text.split(" ");
    if (!amount || !from || !to) return m.reply(" Missing arguments!");

    try {
        const res = await axios.get(`https://api.exchangerate.host/convert?from=${from.toUpperCase()}&to=${to.toUpperCase()}&amount=${amount}`);
        await rich.sendMessage(m.chat, { text: `💱 ${amount} ${from.toUpperCase()} = ${res.data.result} ${to.toUpperCase()}` }, { quoted: m });
    } catch (e) {
        m.reply("Failed to convert currency.");
    }
}
break;
case "time": {
    if (!text) return m.reply("Provide a city or timezone. Example: time Lagos");
    try {
        const res = await axios.get(`http://worldtimeapi.org/api/timezone/${encodeURIComponent(text)}`);
        await rich.sendMessage(m.chat, { text: `🕒 Current time in ${res.data.timezone}:\n${res.data.datetime}` }, { quoted: m });
    } catch (e) {
        m.reply("Could not fetch time for that location.");
    }
}
break;
case "iplookup": {
    if (!text) return m.reply("Provide an IP or domain. Example: iplookup 8.8.8.8");
    try {
        const res = await axios.get(`https://ipapi.co/${text}/json/`);
        await rich.sendMessage(m.chat, { text: `🌐 IP Info for ${text}:\nCountry: ${res.data.country_name}\nRegion: ${res.data.region}\nCity: ${res.data.city}\nOrg: ${res.data.org}\nISP: ${res.data.org}` }, { quoted: m });
    } catch (e) {
        m.reply("Could not fetch IP info.");
    }
}
break;
case "genpass": {
    const length = parseInt(text) || 12;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let pass = "";
    for (let i=0;i<length;i++) pass += chars.charAt(Math.floor(Math.random()*chars.length));
    await rich.sendMessage(m.chat, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪🔑 Generated Password:${pass}` }, { quoted: m });
}
break;
case "readqr": {
    if (!m.quoted || !m.quoted.image) return m.reply("Reply to an image containing a QR code.");
    const buffer = await m.quoted.download();
    try {
        const res = await axios.post("https://api.qrserver.com/v1/read-qr-code/", buffer, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        const qrText = res.data[0].symbol[0].data;
        await rich.sendMessage(m.chat, { text: `📱 QR Code Content:\n${qrText}` }, { quoted: m });
    } catch (e) {
        m.reply("Failed to read QR code.");
    }
}
break;
case "weather": {
    if (!text) return m.reply("provide a city. Example: weather Lagos");
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=3`);
    await rich.sendMessage(m.chat, { text: `🌤 Weather:\n${res.data}` }, { quoted: m });
}
break;
case "calculate": {
    if (!text) return m.reply("Provide an expression. Example: calculate 12+25*3");
    try {
        const result = mathjs.evaluate(text);
        await rich.sendMessage(m.chat, { text: `╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🧮 *Calculate*\n✪ 📥 Input: ${text}\n✪ 📤 Result: *${result}*\n╰━━━━━━━━━━━━━━━━━━╯` }, { quoted: m });
    } catch {
        m.reply("Invalid expression.");
    }
}
break;
case "wiki": {
    if (!text) return m.reply("Provide a search term. Example: wiki JavaScript");
    const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`);
    await rich.sendMessage(m.chat, { text: `📚 ${res.data.title}\n\n${res.data.extract}` }, { quoted: m });
}
break;
case "qrcode": {
    if (!text) return m.reply("Provide text to generate QR code. Example: qrcode HelloWorld");
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    await rich.sendMessage(m.chat, { image: { url }, caption: "📱 QR Code Generated" }, { quoted: m });
}
break;
case "pdftotext": {
    if (!m.quoted || !m.quoted.fileName?.endsWith(".pdf")) return m.reply("❌ Reply to a PDF file.");
    const pdfBuffer = await m.quoted.download(); // your MD bot method
    const pdf = await pdfParse(pdfBuffer);
    await rich.sendMessage(m.chat, { text: `📄 PDF Text:\n\n${pdf.text}` }, { quoted: m });
}
break;

case "hangman": {
    const chatId = m.chat;
    const args = text?.split(" ") || [];
    let game = hangmanGames[chatId];

    // Start new game
    if (!game) {
        if (!args[0]) return m.reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪❌ Start game with a word. Example: hangman banana");
        const word = args[0].toLowerCase();
        const display = "_".repeat(word.length).split("");
        hangmanGames[chatId] = { word, display, attempts: 6, guessed: [] };
        await rich.sendMessage(chatId, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔🕹 Hangman Started!\n${display.join(" ")}\nAttempts left: 6\nVisual:\n${hangmanVisual[0]}\nGuess letters: hangman <letter>` }, { quoted: m });
        return;
    }

    // Guess a letter
    if (!args[0]) return m.reply("❌ Provide a letter. Example: hangman a");
    const letter = args[0].toLowerCase();
    if (letter.length !== 1) return m.reply("❌ Guess one letter at a time.");
    if (game.guessed.includes(letter)) return m.reply("⚠️ Already guessed.");

    game.guessed.push(letter);
    if (game.word.includes(letter)) {
        game.display = game.display.map((c, i) => (game.word[i] === letter ? letter : c));
    } else {
        game.attempts -= 1;
    }

    // Check win
    if (!game.display.includes("_")) {
        await rich.sendMessage(chatId, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪🎉 You guessed the word: ${game.word}` }, { quoted: m });
        delete hangmanGames[chatId];
        return;
    }

    // Check lose
    if (game.attempts <= 0) {
        await rich.sendMessage(chatId, { text: `💀 Game over! The word was: ${game.word}` }, { quoted: m });
        delete hangmanGames[chatId];
        return;
    }

    await rich.sendMessage(chatId, { text: `🕹 Hangman\nWord: ${game.display.join(" ")}\nAttempts left: ${game.attempts}\nVisual:\n${hangmanVisual[6 - game.attempts]}\nGuessed: ${game.guessed.join(", ")}` }, { quoted: m });
}
break;
case "tictactoe": {
    const chatId = m.chat;
    const args = text?.split(" ") || [];
    let game = tictactoeGames[chatId];

    // Start new game
    if (!game) {
        const mentions = m.mentionedJid;
        if (!mentions || mentions.length < 2) return m.reply("❌ Mention 2 users. Example: tictactoe @user1 @user2");

        const board = Array(9).fill(null); // null means empty
        const turn = mentions[0];
        tictactoeGames[chatId] = { board, turn, players: mentions };
        const display = board.map((v, i) => numberEmojis[i]).join("");
        await rich.sendMessage(chatId, { text: `🎮 Tic-Tac-Toe Started!\n${display}\nTurn: @${turn.split("@")[0]}\nPlay: tictactoe <position 1-9>` }, { quoted: m, mentions });
        return;
    }

    // Play move
    if (!args[0]) return m.reply("❌ Choose position 1-9. Example: tictactoe 5");
    const pos = parseInt(args[0]) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8) return m.reply("❌ Invalid position!");
    if (m.sender !== game.turn) return m.reply("❌ Not your turn!");
    if (game.board[pos] !== null) return m.reply("❌ Already taken!");

    const symbol = game.turn === game.players[0] ? "❌" : "⭕";
    game.board[pos] = symbol;

    // Check win
    const b = game.board;
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const winner = wins.find(w => w.every(i => b[i] === symbol));

    const displayBoard = b.map((v, i) => v || numberEmojis[i]).join("");

    if (winner) {
        await rich.sendMessage(chatId, { text: `🎉 Player @${game.turn.split("@")[0]} wins!\n${displayBoard}` }, { quoted: m, mentions: [game.turn] });
        delete tictactoeGames[chatId];
        return;
    }

    if (!b.includes(null)) {
        await rich.sendMessage(chatId, { text: `🤝 It's a tie!\n${displayBoard}` }, { quoted: m });
        delete tictactoeGames[chatId];
        return;
    }

    // Next turn
    game.turn = game.turn === game.players[0] ? game.players[1] : game.players[0];
    await rich.sendMessage(chatId, { text: `🎮 Next Turn: @${game.turn.split("@")[0]}\n${displayBoard}` }, { quoted: m, mentions: [game.turn] });
}
break;
 // ✨ TEXT MAKER COMMANDS HUB
// Usage: /command Your Text
// Example: /glitchtext nexus
// ▫️ /glitchtext - Digital glitch effects
case "glitchtext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .glitchtext Nicky Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/glitchtext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `⚡ Glitch Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Glitch Text." }, { quoted: m });
    }
}
break;

// ▫️ /writetext - Write on wet glass
case "writetext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪❌ Please provide text!\nExample: .writetext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/writetext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪✍️ Write Text Logo Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪⚠️ Error generating Write Text logo." }, { quoted: m });
    }
}
break;

// ▫️ /advancedglow - Advanced glow effects
case "advancedglow": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .advancedglow Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/advancedglow?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `💡 Advanced Glow Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Advanced Glow." }, { quoted: m });
    }
}
break;

// ▫️ /typographytext - Typography on pavement
case "typographytext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .typographytext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/typographytext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🖋️ Typography Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Typography Text." }, { quoted: m });
    }
}
break;

// ▫️ /pixelglitch - Pixel glitch effects
case "pixelglitch": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .pixelglitch Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/pixelglitch?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🧩 Pixel Glitch Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Pixel Glitch." }, { quoted: m });
    }
}
break;

// ▫️ /neonglitch - Neon glitch effects
case "neonglitch": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .neonglitch Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/neonglitch?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `💥 Neon Glitch Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Neon Glitch." }, { quoted: m });
    }
}
break;

// ▫️ /flagtext - Nigeria flag text
case "flagtext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .flagtext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/flagtext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Flag enerated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Flag Text." }, { quoted: m });
    }
}
break;

// ▫️ /flag3dtext - 3D American flag text
case "flag3dtext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .flag3dtext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/flag3dtext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🇺🇸 3D Flag Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating 3D Flag Text." }, { quoted: m });
    }
}
break;

// ▫️ /deletingtext - Eraser deleting effect
case "deletingtext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .deletingtext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/deletingtext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🩶 Deleting Text Effect Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Deleting Text." }, { quoted: m });
    }
}
break;

// ▫️ /blackpinkstyle - Blackpink style logo
case "blackpinkstyle": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .blackpinkstyle Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/blackpinkstyle?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🎀 Blackpink Style Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Blackpink Style." }, { quoted: m });
    }
}
break;
// ▫️ /glowingtext - Glowing text effects
case "glowingtext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .glowingtext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/glowingtext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `💫 Glowing Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Glowing Text." }, { quoted: m });
    }
}
break;

// ▫️ /underwatertext - 3D underwater text
case "underwatertext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .underwatertext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/underwatertext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🌊 Underwater Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Underwater Text." }, { quoted: m });
    }
}
break;

// ▫️ /logomaker - Bear logo maker
case "logomaker": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .logomaker Nicky Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/logomaker?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🐻 Logo Maker Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Logo Maker." }, { quoted: m });
    }
}
break;

// ▫️ /cartoonstyle - Cartoon graffiti text
case "cartoonstyle": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .cartoonstyle Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/cartoonstyle?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🎨 Cartoon Style Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Cartoon Style Text." }, { quoted: m });
    }
}
break;

// ▫️ /papercutstyle - 3D paper cut style
case "papercutstyle": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .papercutstyle Nicky Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/papercutstyle?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `✂️ Paper Cut Style Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Paper Cut Style." }, { quoted: m });
    }
}
break;

// ▫️ /watercolortext - Watercolor text effect
case "watercolortext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .watercolortext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/watercolortext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🖌️ Watercolor Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Watercolor Text." }, { quoted: m });
    }
}
break;

// ▫️ /effectclouds - Text on clouds in sky
case "effectclouds": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .effectclouds Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/effectclouds?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `☁️ Clouds Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Cloud Text." }, { quoted: m });
    }
}
break;

// ▫️ /blackpinklogo - Blackpink logo creator
case "blackpinklogo": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .blackpinklogo Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/blackpinklogo?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `💖 Blackpink Logo Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Blackpink Logo." }, { quoted: m });
    }
}
break;

// ▫️ /gradienttext - 3D gradient text effect
case "gradienttext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .gradienttext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/gradienttext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🌈 Gradient Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Gradient Text." }, { quoted: m });
    }
}
break;

// ▫️ /summerbeach - Write in sand summer beach
case "summerbeach": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .summerbeach Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/summerbeach?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🏖️ Summer Beach Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Summer Beach Text." }, { quoted: m });
    }
}
break;

// ▫️ /luxurygold - Luxury gold text effect
case "luxurygold": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .luxurygold Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/luxurygold?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🥇 Luxury Gold Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Luxury Gold Text." }, { quoted: m });
    }
}
break;
// ▫️ /multicoloredneon - Multicolored neon lights
case "multicoloredneon": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .multicoloredneon Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/multicoloredneon?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🌈 Multicolored Neon Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Multicolored Neon." }, { quoted: m });
    }
}
break;

// ▫️ /sandsummer - Write in sand summer beach
case "sandsummer": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .sandsummer Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/sandsummer?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🏝️ Sand Summer Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Sand Summer Text." }, { quoted: m });
    }
}
break;

// ▫️ /galaxywallpaper - Galaxy mobile wallpaper
case "galaxywallpaper": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .galaxywallpaper Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/galaxywallpaper?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🌌 Galaxy Wallpaper Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Galaxy Wallpaper." }, { quoted: m });
    }
}
break;

// ▫️ /style1917 - 1917 style text effect
case "style1917": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .style1917 Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/style1917?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🎖️ 1917 Style Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating 1917 Style Text." }, { quoted: m });
    }
}
break;

// ▫️ /makingneon - Neon light with galaxy style
case "makingneon": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .makingneon Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/makingneon?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🌠 Making Neon Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Making Neon." }, { quoted: m });
    }
}
break;

// ▫️ /royaltext - Royal text effect
case "royaltext": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .royaltext Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/royaltext?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `👑 Royal Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Royal Text." }, { quoted: m });
    }
}
break;

// ▫️ /freecreate - 3D hologram text effect
case "freecreate": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .freecreate Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/freecreate?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🧊 3D Hologram Text Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Free Create Text." }, { quoted: m });
    }
}
break;

// ▫️ /galaxystyle - Galaxy style name logo
case "galaxystyle": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .galaxystyle Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/galaxystyle?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `🪐 Galaxy Style Logo Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Galaxy Style Logo." }, { quoted: m });
    }
}
break;

// ▫️ /lighteffects - Green neon light effects
case "lighteffects": {
    if (args.length < 1) {
        return rich.sendMessage(from, { text: "❌ Please provide text!\nExample: .lighteffects Dark Tech " }, { quoted: m });
    }
    let text = args.join(" ");
    try {
        let url = `https://apis.prexzyvilla.site/lighteffects?text=${encodeURIComponent(text)}`;
        await rich.sendMessage(from, { image: { url }, caption: `💡 Light Effects Generated for: ${text}` }, { quoted: m });
    } catch (e) {
        console.error(e);
        await rich.sendMessage(from, { text: "⚠️ Error generating Light Effects." }, { quoted: m });
    }
}
break
case "numbattle": {
    const userRoll = Math.floor(Math.random() * 100) + 1;
    const botRoll = Math.floor(Math.random() * 100) + 1;
    let msg = `🎲 You rolled: ${userRoll}\n🤖 Bot rolled: ${botRoll}\n`;
    msg += userRoll > botRoll ? "🎉 You win!" : userRoll < botRoll ? "😢 You lose!" : "🤝 It's a tie!";
    await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
}
break;
case "coinbattle": {
    const userFlip = Math.random() < 0.5 ? "Heads" : "Tails";
    const botFlip = Math.random() < 0.5 ? "Heads" : "Tails";
    let msg = `🪙 You flipped: ${userFlip}\n🤖 Bot flipped: ${botFlip}\n`;
    msg += userFlip === botFlip ? "🎉 You win!" : "😢 You lose!";
    await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
}
break;
case "numberbattle": {
    const number = Math.floor(Math.random() * 50) + 1;
    if (!text) return m.reply("❌ Guess a number between 1 and 50. Example: numberbattle 25");
    const guess = parseInt(text);
    let msg = `🎯 Your guess: ${guess}\n🎲 Target number: ${number}\n`;
    msg += guess === number ? "🎉 Perfect guess!" : guess > number ? "⬇️ Too high!" : "⬆️ Too low!";
    await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
}
break;
case "math": {
    const a = Math.floor(Math.random() * 50) + 1;
    const b = Math.floor(Math.random() * 50) + 1;
    const answer = a + b;
    await rich.sendMessage(m.chat, { text: `➕ Solve: ${a} + ${b}\nReply with: mathanswer <number>` }, { quoted: m });
    
    // Store answer to check later
}
break;
case "emojiquiz": {
    const quizzes = [
        { emoji: "🐍", answer: "snake" },
        { emoji: "🍎", answer: "apple" },
        { emoji: "🏎️", answer: "car" },
        { emoji: "🎸", answer: "guitar" },
        { emoji: "☕", answer: "coffee" }
    ];
    const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
    await rich.sendMessage(m.chat, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔🧩 Guess the Emoji:\n${quiz.emoji}\nReply with: emojianswer <your guess>` }, { quoted: m });
    
    // Store the correct answer for checking
}
break;
case "dice": {
    const roll = Math.floor(Math.random() * 6) + 1;
    await rich.sendMessage(m.chat, { text: `🎲 You rolled a ${roll}!` }, { quoted: m });
}
break;
case "rpsls": {
    if (!text) return m.reply("❌ Choose rock, paper, scissors, lizard, or spock. Example: rpsls spock");
    const choices = ["rock", "paper", "scissors", "lizard", "spock"];
    const userChoice = text.toLowerCase();
    if (!choices.includes(userChoice)) return m.reply("❌ Invalid choice! Use rock, paper, scissors, lizard, or spock.");

    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    const winMap = {
        rock: ["scissors", "lizard"],
        paper: ["rock", "spock"],
        scissors: ["paper", "lizard"],
        lizard: ["spock", "paper"],
        spock: ["scissors", "rock"]
    };

    let result = "";
    if (userChoice === botChoice) result = "🤝 It's a tie!";
    else if (winMap[userChoice].includes(botChoice)) result = "🎉 You win!";
    else result = "😢 You lose!";

    await rich.sendMessage(
        m.chat,
        { text: `🪨 You chose: ${userChoice}\n🤖 Bot chose: ${botChoice}\n\n${result}` },
        { quoted: m }
    );
}
break;
case "coin": {
    const result = Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails";
    await rich.sendMessage(m.chat, { text: `🎲 Coin Flip Result: ${result}` }, { quoted: m });
}
break;
case "gamefact": {
    try {
        const res = await axios.get("https://www.freetogame.com/api/games");
        const games = res.data;
        const game = games[Math.floor(Math.random() * games.length)];
        await rich.sendMessage(
            m.chat,
            { text: `🎮 Game: ${game.title}\nGenre: ${game.genre}\nPlatform: ${game.platform}\nMore Info: ${game.game_url}` },
            { quoted: m }
        );
    } catch (e) {
        console.error("GAMEFACT ERROR:", e);
        m.reply("❌ Failed to fetch a game fact.");
    }
}
break;
case "fox": {
    try {
        const res = await axios.get("https://randomfox.ca/floof/");
        const img = res.data?.image;
        if (!img) return m.reply("❌ Could not fetch a fox image.");
        await rich.sendMessage(m.chat, { image: { url: img }, caption: "🦊 Random Fox!" }, { quoted: m });
    } catch (e) {
        console.error("FOX ERROR:", e);
        m.reply("❌ Failed to fetch a fox image.");
    }
}
break;
case "koala": {
    try {
        const res = await axios.get("https://some-random-api.ml/img/koala");
        const img = res.data?.link;
        if (!img) return m.reply("❌ Could not fetch a koala image.");
        await rich.sendMessage(m.chat, { image: { url: img }, caption: "🐨 Random Koala!" }, { quoted: m });
    } catch (e) {
        console.error("KOALA ERROR:", e);
        m.reply("❌ Failed to fetch a koala image.");
    }
}
break;
case "bird": {
    try {
        const res = await axios.get("https://some-random-api.ml/img/birb");
        const img = res.data?.link;
        if (!img) return m.reply("❌ Could not fetch a bird image.");
        await rich.sendMessage(m.chat, { image: { url: img }, caption: "🐦 Random Bird!" }, { quoted: m });
    } catch (e) {
        console.error("BIRD ERROR:", e);
        m.reply("❌ Failed to fetch a bird image.");
    }
}
break;
case "panda": {
    try {
        const res = await axios.get("https://some-random-api.ml/img/panda");
        const img = res.data?.link;
        if (!img) return m.reply("❌ Could not fetch a panda image.");
        await rich.sendMessage(m.chat, { image: { url: img }, caption: "🐼 Random Panda!" }, { quoted: m });
    } catch (e) {
        console.error("PANDA ERROR:", e);
        m.reply("❌ Failed to fetch a panda image.");
    }
}
break;
case "funfact": {
    try {
        const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
        const fact = res.data?.text || "Did you know? Bots are awesome!";
        await rich.sendMessage(m.chat, { text: `💡 Fun Fact:\n${fact}` }, { quoted: m });
    } catch (e) {
        console.error("FUNFACT ERROR:", e);
        m.reply("❌ Failed to fetch a fun fact.");
    }
}
break;
case "quotememe": {
    try {
        const res = await axios.get("https://api.quotable.io/random");
        const quote = res.data?.content || "Keep pushing forward!";
        const author = res.data?.author || "Unknown";
        await rich.sendMessage(m.chat, { text: `🖋 "${quote}"\n— ${author}` }, { quoted: m });
    } catch (e) {
        console.error("QUOTEMEME ERROR:", e);
        m.reply("❌ Failed to fetch a quote.");
    }
}
break;
case "prog": {
    try {
        const res = await axios.get("https://v2.jokeapi.dev/joke/Programming?type=single");
        const joke = res.data?.joke || "Why do programmers prefer dark mode? Because light attracts bugs!";
        await rich.sendMessage(m.chat, { text: `💻 Programming Joke:\n${joke}` }, { quoted: m });
    } catch (e) {
        console.error("PROG JOKE ERROR:", e);
        m.reply("❌ Failed to fetch a programming joke.");
    }
}
break;
case "dadjoke": {
    try {
        const res = await axios.get("https://icanhazdadjoke.com/", { headers: { Accept: "application/json" } });
        const joke = res.data?.joke || "I would tell you a joke about construction, but I'm still working on it!";
        await rich.sendMessage(m.chat, { text: `👨‍🦳 Dad Joke:\n${joke}` }, { quoted: m });
    } catch (e) {
        console.error("DAD JOKE ERROR:", e);
        m.reply("❌ Failed to fetch a dad joke.");
    }
}
break;
case "progquote": {
    try {
        const res = await axios.get("https://programming-quotes-api.herokuapp.com/quotes/random");
        const quote = res.data?.en || "Talk is cheap. Show me the code.";
        const author = res.data?.author || "Linus Torvalds";
        await rich.sendMessage(m.chat, { text: `💻 "${quote}"\n— ${author}` }, { quoted: m });
    } catch (e) {
        console.error("PROGQUOTE ERROR:", e);
        m.reply("❌ Failed to fetch a programming quote.");
    }
}
break;
case "ascii": {
    if (!text) return m.reply("❌ Provide a word or text. Example: ascii Hello");
    try {
        const res = await axios.get(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}`);
        const ascii = res.data || text;
        await rich.sendMessage(m.chat, { text: `🎨 ASCII Art:\n\n${ascii}` }, { quoted: m });
    } catch (e) {
        console.error("ASCII ERROR:", e);
        m.reply("❌ Failed to generate ASCII art.");
    }
}
break;
case "advice": {
    try {
        const res = await axios.get("https://api.adviceslip.com/advice");
        const advice = res.data?.slip?.advice || "Keep going!";
        await rich.sendMessage(m.chat, { text: `💡 Advice:\n${advice}` }, { quoted: m });
    } catch (e) {
        console.error("ADVICE ERROR:", e);
        m.reply("❌ Failed to fetch advice.");
    }
}
break;
case "guess": {
    const number = Math.floor(Math.random() * 10) + 1; // 1–10
    if (!text) return m.reply("❌ Guess a number between 1 and 10. Example: guess 7");
    const guess = parseInt(text);
    if (isNaN(guess) || guess < 1 || guess > 10) return m.reply("❌ Invalid number! Choose 1–10.");
    
    let msg = `🎯 You guessed: ${guess}\n🤖 Bot chose: ${number}\n`;
    msg += guess === number ? "🎉 You guessed it! Congrats!" : "😢 Wrong guess! Try again.";
    await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
}
break;
case "urban": {
    if (!text) return m.reply("❌ Provide a word to search. Example: urban sus");
    try {
        const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(text)}`);
        const defs = res.data?.list;
        if (!defs || !defs.length) return m.reply("❌ No definition found.");
        const top = defs[0];
        const msg = `📖 Word: ${top.word}\nDefinition: ${top.definition}\nExample: ${top.example}`;
        await rich.sendMessage(m.chat, { text: msg }, { quoted: m });
    } catch (e) {
        console.error("URBAN ERROR:", e);
        m.reply("❌ Failed to fetch definition.");
    }
}
break;
case "moviequote": {
    try {
        const res = await axios.get("https://movie-quote-api.herokuapp.com/v1/quote/");
        const quote = res.data?.quote || "May the Force be with you.";
        const movie = res.data?.show || "Unknown";
        await rich.sendMessage(
            m.chat,
            { text: `🎬 "${quote}"\n— ${movie}` },
            { quoted: m }
        );
    } catch (e) {
        console.error("MOVIE QUOTE ERROR:", e);
        m.reply("❌ Failed to fetch a movie quote.");
    }
}
break;
case "triviafact": {
    try {
        const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
        const fact = res.data?.text || "Did you know? You're awesome!";
        await rich.sendMessage(m.chat, { text: `🧠 Trivia Fact:\n${fact}` }, { quoted: m });
    } catch (e) {
        console.error("TRIVIA FACT ERROR:", e);
        m.reply("❌ Failed to fetch trivia fact.");
    }
}
break;
case "inspire": {
    try {
        const res = await axios.get("https://type.fit/api/quotes");
        const quotes = res.data;
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        await rich.sendMessage(
            m.chat,
            { text: `🌟 "${q.text}"\n— ${q.author || "Unknown"}` },
            { quoted: m }
        );
    } catch (e) {
        console.error("INSPIRE ERROR:", e);
        m.reply("❌ Failed to fetch inspiring quote.");
    }
}
break;
case "compliment": {
    try {
        const res = await axios.get("https://complimentr.com/api");
        const compliment = res.data?.compliment || "You are awesome!";
        await rich.sendMessage(m.chat, { text: `💖 ${compliment}` }, { quoted: m });
    } catch (e) {
        console.error("COMPLIMENT ERROR:", e);
        m.reply("❌ Failed to fetch a compliment.");
    }
}
break;
case "dog": {
    try {
        const res = await axios.get("https://dog.ceo/api/breeds/image/random");
        const img = res.data?.message;
        if (!img) return m.reply("❌ Could not fetch a dog image.");
        await rich.sendMessage(
            m.chat,
            { image: { url: img }, caption: "🐶 Random Dog!" },
            { quoted: m }
        );
    } catch (e) {
        console.error("DOG ERROR:", e);
        m.reply("❌ Failed to fetch a dog image.");
    }
}
break;
case 'connect':
case 'bot':
case 'pair':
await rich.sendMessage(m.chat, {react: {text: '📲', key: m.key}})  
  if (!q) return reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ᴘʟᴇᴀsᴇ ᴇɴᴛᴇʀ ᴀ ᴠᴀʟɪᴅ ɴᴜᴍʙᴇʀ\n✪ ᴛᴏ sᴇɴᴅ ᴘᴀɪʀɪɴɢ ʀᴇǫᴜᴇsᴛ ᴄᴏᴅᴇ
✪ *Usage: ${prefix}pair 224xxxxxxxxx*`);

  target = text.split("|")[0];
  sjid = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : target.replace(/[^0-9]/g,'') + "@s.whatsapp.net";

  var contactInfo = await rich.onWhatsApp(sjid);
  if (contactInfo.length === 0) {
    return reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ᴛʜᴇ ɴᴜᴍʙᴇʀ ɪs ɴᴏᴛ ʀᴇɢɪsᴛᴇʀᴇᴅ ᴏɴ ᴡʜᴀᴛsᴀᴘᴘ");
  }

  const startpairing = require('./pair.js');
  await startpairing(sjid);
  await sleep(4000);

  const cu = fs.readFileSync('./richstore/pairing/pairing.json', 'utf-8');
  const cuObj = JSON.parse(cu);

  // Send just the code first
  await rich.sendMessage(from, { text: `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪${cuObj.code}` }, { quoted: m });

  // Send the instructions next
  const instructions = `
✪𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃✪\n\n
✪ ʏᴏᴜʀ ᴄᴏᴅᴇ: ${cuObj.code}

`;

  await rich.sendMessage(from, { text: instructions }, { quoted: m });
break;
case "cat": {
    try {
        const res = await axios.get("https://api.thecatapi.com/v1/images/search");
        const img = res.data[0]?.url;
        if (!img) return m.reply("❌ Could not fetch a cat image.");
        await rich.sendMessage(
            m.chat,
            { image: { url: img }, caption: "🐱 Random Cat!" },
            { quoted: m }
        );
    } catch (e) {
        console.error("CAT ERROR:", e);
        m.reply("❌ Failed to fetch a cat image.");
    }
}
break;
case "rps": {
    if (!text) return m.reply("❌ Choose rock, paper, or scissors. Example: rps rock");
    const choices = ["rock", "paper", "scissors"];
    const userChoice = text.toLowerCase();
    if (!choices.includes(userChoice)) return m.reply("❌ Invalid choice! Use rock, paper, or scissors.");

    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let result = "";
    if (userChoice === botChoice) result = "🤝 It's a tie!";
    else if (
        (userChoice === "rock" && botChoice === "scissors") ||
        (userChoice === "paper" && botChoice === "rock") ||
        (userChoice === "scissors" && botChoice === "paper")
    ) result = "🎉 You win!";
    else result = "😢 You lose!";

    await rich.sendMessage(
        m.chat,
        { text: `🪨 You chose: ${userChoice}\n🤖 Bot chose: ${botChoice}\n\n${result}` },
        { quoted: m }
    );
}
break;
case "8ball": {
    const answers = [
        "It is certain ✅",
        "Without a doubt ✅",
        "You may rely on it ✅",
        "Ask again later 🤔",
        "Cannot predict now 🤷",
        "Don't count on it ❌",
        "My sources say no ❌",
        "Very doubtful ❌"
    ];
    if (!text) return m.reply("❌ Ask me a question! Example: 8ball Will I get rich?");
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await rich.sendMessage(m.chat, { text: `🎱 Question: ${text}\nAnswer: ${answer}` }, { quoted: m });
}
break;
case "trivia": {
    try {
        const res = await axios.get("https://opentdb.com/api.php?amount=1&type=multiple");
        const trivia = res.data.results[0];
        const options = [...trivia.incorrect_answers, trivia.correct_answer].sort(() => Math.random() - 0.5);
        const text = `❓ ${trivia.question}\n\nOptions:\n${options.map((o,i)=>`${i+1}. ${o}`).join("\n")}`;
        await rich.sendMessage(m.chat, { text }, { quoted: m });
        // Store trivia.correct_answer if you want to check the user's answer later
    } catch (e) {
        console.error("TRIVIA ERROR:", e);
        m.reply("❌ Failed to fetch trivia question.");
    }
}
break;
case "meme": {
    try {
        const res = await axios.get("https://meme-api.com/gimme");
        const meme = res.data;
        if (!meme?.url) return m.reply("❌ Could not fetch a meme.");
        await rich.sendMessage(
            m.chat,
            { image: { url: meme.url }, caption: `😂 ${meme.title}` },
            { quoted: m }
        );
    } catch (e) {
        console.error("MEME ERROR:", e);
        m.reply("❌ Failed to fetch a meme.");
    }
}
break;
case 'gfx':
case 'gfx2':
case 'gfx3':
case 'gfx4':
case 'gfx5':
case 'gfx6':
case 'gfx7':
case 'gfx8':
case 'gfx9':
case 'gfx10':
case 'gfx11':
case 'gfx12': {
  const [text1, text2] = text.split('|').map(v => v.trim());
  if (!text1 || !text2) {
    return reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔ Example: ${prefix + command} 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋`);
  }

  reply(` 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n⎔ *Generating your stylish image...\n✪🔤 Text 1: ${text1}\n✪🔡 Text 2: ${text2}\n✪⏳ Please wait!`);

  try {
    const style = command.toUpperCase();
    const apiUrl = `https://api.nexoracle.com/image-creating/${command}?apikey=d0634e61e8789b051e&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;

    await sendImage(apiUrl, `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ - ${style} Style\n✪🔤 Text 1: ${text1}\n✪🔡 Text 2: ${text2}`);
  } catch (err) {
    console.error(err);
    reply(`Failed to generate ${command.toUpperCase()} image.`);
  }
  break;
}

case 'getpp':{
    if (!isCreator) return reply("Sorry, only the owner can use this command");
let userss = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
let ghosst = userss
        try {
   var ppuser = await rich.profilePictureUrl(ghosst, 'image')
} catch (err) {
   var ppuser = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png?q=60'
}
rich.sendMessage(from, { image: { url: ppuser }}, { quoted: m })
}
break;
case 'yts': case 'ytsearch': {
  if (!isCreator) return reply(`Sorry, only the owner can use this command`)
                if (!text) return reply(`Example : ${prefix + command} story wa anime`)
                let yts = require("yt-search")
                let search = await yts(text)
                let teks = 'YouTube Search\n\n Result From '+text+'\n\n'
                let no = 1
                for (let i of search.all) {
                    teks += `${themeemoji} No : ${no++}\n${themeemoji} Type : ${i.type}\n${themeemoji} Video ID : ${i.videoId}\n${themeemoji} Title : ${i.title}\n${themeemoji} Views : ${i.views}\n${themeemoji} Duration : ${i.timestamp}\n${themeemoji} Uploaded : ${i.ago}\n${themeemoji} Url : ${i.url}\n\n─────────────────\n\n`
                }
                rich.sendMessage(m.chat, { image: { url: search.all[0].thumbnail },  caption: teks }, { quoted: m })
            }
            break
  
case 'animewlp':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://nekos.life/api/v2/img/wallpaper`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;


case 'resetlink': {
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
if (!m.isGroup) return reply(mess.only.group)
if (!isBotAdmins) return reply('Bots Must Be Admins First')
if (!isAdmins) return reply('Admin only!')
rich.groupRevokeInvite(m.chat)
}
break;
case 'animesearch': {
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
if (!text) return reply(`Which anime are you lookin for?`)
const malScraper = require('mal-scraper')
        const anime = await malScraper.getInfoFromName(text).catch(() => null)
        if (!anime) return reply(`Could not find`)
let animetxt = `
🎀 *Title: ${anime.title}*
🎋 *Type: ${anime.type}*
🎐 *Premiered on: ${anime.premiered}*
💠 *Total Episodes: ${anime.episodes}*
📈 *Status: ${anime.status}*
💮 *Genres: ${anime.genres}
📍 *Studio: ${anime.studios}*
🌟 *Score: ${anime.score}*
💎 *Rating: ${anime.rating}*
🏅 *Rank: ${anime.ranked}*
💫 *Popularity: ${anime.popularity}*
♦️ *Trailer: ${anime.trailer}*
🌐 *URL: ${anime.url}*
❄ *Description:* ${anime.synopsis}*`
                await rich.sendMessage(m.chat,{image:{url:anime.picture}, caption:animetxt},{quoted:m})
                }
                break;
                
            case 'animehighfive':{
            if (isban) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/highfive`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animecringe':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/cringe`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animedance':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
reply(mess.wait)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/dance`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animehappy':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/happy`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animeglomp':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/glomp`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animesmug':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
reply(mess.wait)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/smug`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animeblush':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
reply(mess.wait)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/blush`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;

case 'animewave':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/wave`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animesmile':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/smile`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animepoke':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/poke`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animewink':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/wink`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animebonk':{
if (!isCreator)  return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/bonk`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animebully':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/bully`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animeyeet':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/yeet`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animebite':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/bite`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animelick':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/lick`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;
case 'animekill':{
if (!isCreator) return reply(`Sorry, only the owner can use this command`)
 waifudd = await axios.get(`https://waifu.pics/api/sfw/kill`)       
            await rich.sendMessage(m.chat, { image: { url:waifudd.data.url} , caption: m.success}, { quoted:m }).catch(err => {
return('Error!')
})
}
break;


           case 'cry': case 'kill': case 'hug': case 'pat': case 'lick': 
case 'kiss': case 'bite': case 'yeet': case 'bully': case 'bonk':
case 'wink': case 'poke': case 'nom': case 'slap': case 'smile': 
case 'wave': case 'awoo': case 'blush': case 'smug': case 'glomp': 
case 'happy': case 'dance': case 'cringe': case 'cuddle': case 'highfive': 
case 'shinobu': case 'handhold': {
 if (!isCreator) return reply("Sorry only the owner can use this command")
axios.get(`https://api.waifu.pics/sfw/${command}`)
.then(({data}) => {
rich.sendImageAsSticker(from, data.url, m, { packname: global.packname, author: global.author })
})
}
break;
 case 'ai': {
  if (!text) return reply('Example: .ai what is the capital of cameroon?');

  await rich.sendPresenceUpdate('composing', m.chat);

  try {
    const { data } = await axios.post("https://chateverywhere.app/api/chat/", {
      model: {
        id: "gpt-4",
        name: "GPT-4",
        maxLength: 32000,
        tokenLimit: 8000,
        completionTokenLimit: 5000,
        deploymentName: "gpt-4"
      },
      messages: [{ pluginId: null, content: text, role: "user" }],
      prompt: text,
      temperature: 0.5
    }, {
      headers: {
        "Accept": "*/*",
        "User-Agent": "WhatsApp Bot"
      }
    });

    await rich.sendMessage(m.chat, {
      text: `╭━━━━━━━━━━━━━━━━━≽𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n│\n ✪
      ǫsᴛ: ${text}\n ┃ \n ┃ ✪ ᴀɴsᴡᴇʀ:\n ┃ ${data}\n ┃ \n ┃ ✪ ᴅᴏ ʏᴏᴜ ɴᴇᴇᴅ sᴏᴍᴇᴛʜɪɴɢ ᴇʟsᴇ ?
      ╰━━━━━━━━━━━━━━━━━≽`
    }, { quoted: m });

  } catch (e) {
    await reply(`AI encountered a problem: ${e.message}`);
  }
}
break
case 'idch': {
if (!isCreator) return reply("Sorry, only the owner can use this command");
if (!text) return reply("example : link channel")
if (!text.includes("https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E")) return reply("not a valid Link ")
let result = text.split('https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E')[1]
let res = await rich.newsletterMetadata("invite", result)
let teks = `   𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃
✪ *ID :* ${res.id}
✪*Name :* ${res.name}
✪ *Follower:* ${res.subscribers}
✪ *Status :* ${res.state}
✪ *Verified :* ${res.verification == "VERIFIED" ? "Verified" : "No"}
`
return reply(teks)
}
    break;
case 'closetime': {
    if (!isAdmins && !isCreator) return reply(global.mess.only.admin);

    let unit = args[1];
    let value = Number(args[0]);
    if (!value) return reply("*Usage:* closetime <number> <second/minute/hour/day>\n\n*Example:* 10 minute");

    let timer;
    if (unit === 'second') {
        timer = value * 1000;
    } else if (unit === 'minute') {
        timer = value * 60000;
    } else if (unit === 'hour') {
        timer = value * 3600000;
    } else if (unit === 'day') {
        timer = value * 86400000;
    } else {
        return reply('*Choose:*\nsecond\nminute\nhour\nday\n\n*Example:*\n10 minute');
    }

    reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪⏳ Close Time ${value} ${unit} starting from now...`);

    setTimeout(async () => {
        try {
            await rich.groupSettingUpdate(m.chat, 'announcement');
            reply(`✅ *On time!* Group has been closed by Admin\nNow only Admins can send messages.`);
        } catch (e) {
            reply('❌ Failed: ' + e.message);
        }
    }, timer);
}
break;
case 'opentime': {
    if (!isAdmins && !isCreator) return reply(global.mess.only.admin);

    let unit = args[1];
    let value = Number(args[0]);
    if (!value) return reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *Usage:* opentime <number> <second/minute/hour/day>\n\n✪ *Example:* 5 second');

    let timer;
    if (unit === 'second') {
        timer = value * 1000;
    } else if (unit === 'minute') {
        timer = value * 60000;
    } else if (unit === 'hour') {
        timer = value * 3600000;
    } else if (unit === 'day') {
        timer = value * 86400000;
    } else {
        return reply('*Choose:*\nsecond\nminute\nhour\nday\n\n*Example:*\n5 second');
    }

    reply(`⏳ Open Time ${value} ${unit} starting from now...`);

    setTimeout(async () => {
        try {
            await rich.groupSettingUpdate(m.chat, 'not_announcement');
            reply(`✅ *On time!* Group has been opened by Admin\nNow members can send messages.`);
        } catch (e) {
            reply('❌ Failed: ' + e.message);
        }
    }, timer);
}
break;
case 'fact':
 if (!isCreator) return reply("Sorry, only the owner can use this command");
    const bby = "https://apis.davidcyriltech.my.id/fact";

    try {
        const nyash = await axios.get(bby);
        const bwess = 'https://gangalink.vercel.app/i/e0ems1q2.jpg';
        const ilovedavid = nyash.data.fact;
        await rich.sendMessage(m.chat, { image: { url: bwess }, caption: ilovedavid });
    } catch (error) {
        reply("An Error Occured.");
    }
    break;
case 'listonline': {
if (!isCreator) return m.reply("Owner only.");
        if (!m.isGroup) return reply(m.grouponly);
        rich.sendMessage(from, { react: { text: "✅", key: m.key } })
        let id = args && /\d+\-\d+@g.us/.test(args[0]) ? args[0] : m.chat
        let online = [...Object.keys(store.presences[id]), botNumber]
        let liston = 1
        rich.sendText(m.chat, ' 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ʟɪsᴛ ᴏғ ᴏɴʟɪɴᴇ ᴍᴇᴍʙᴇʀs\n\n' + online.map(v => `✪${liston++} . @` + v.replace(/@.+/, '')).join`\n`, m, { mentions: online })
      }
      break;
case 'gpt4': case 'openai': case 'xxai': {
if (!isCreator) return reply("Sorry, only the owner can use this command");
  if (!text) return reply(`Ask me anything example ${command} how are you?`)
async function openai(text, logic) { // Membuat fungsi openai untuk dipanggil
    let response = await axios.post("https://chateverywhere.app/api/chat/", {
        "model": {
            "id": "gpt-4",
            "name": "GPT-4",
            "maxLength": 32000,  // Sesuaikan token limit jika diperlukan
            "tokenLimit": 8000,  // Sesuaikan token limit untuk model GPT-4
            "completionTokenLimit": 5000,  // Sesuaikan jika diperlukan
            "deploymentName": "gpt-4"
        },
        "messages": [
            {
                "pluginId": null,
                "content": text, 
                "role": "user"
            }
        ],
        "prompt": logic, 
        "temperature": 0.5
    }, { 
        headers: {
            "Accept": "/*/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }
    });
    
    let result = response.data;
    return result;
}

let pei = await openai(text, "")
m.reply(pei)
}
break;

case 'quote': {
    try {
        const res = await fetch('https://zenquotes.io/api/random');
        const json = await res.json();
        const quote = json[0].q;
        const author = json[0].a;

        // Optional: Generate image using API
        const quoteImg = `https://dummyimage.com/600x400/000/fff.png&text=${encodeURIComponent(`"${quote}"\n\n- ${author}`)}`;

        rich.sendMessage(m.chat, {
            image: { url: quoteImg },
            caption: `_"${quote}"_\n\n— *${author}*`
        }, { quoted: m });

    } catch (err) {
        m.reply('Failed to fetch quote.');
    }
}
break;

case 'joke': {
  let res = await fetch('https://v2.jokeapi.dev/joke/Any?type=single'); 
  let data = await res.json();

  await rich.sendMessage(m.chat, {
    image: { url: 'https://files.catbox.moe/gr1jfa.jpg' },
    caption: `*😂 Here's a joke for you:*\n\n${data.joke}`
  }, { quoted: m });
}
break;
case 'truth': {
  let res = await fetch('https://api.truthordarebot.xyz/v1/truth');
  let data = await res.json();

  await rich.sendMessage(m.chat, {
    image: { url: 'https://files.catbox.moe/ef1bcx.jpg' },
    caption: `*🔥 Truth Time!*\n\n❖ ${data.question}`
  }, { quoted: m });
}
break;
case 'dare': {
  let res = await fetch('https://api.truthordarebot.xyz/v1/dare');
  let data = await res.json();

  await rich.sendMessage(m.chat, {
    image: { url: 'j' },
    caption: `*🔥 Dare Challenge!*\n\n❖ ${data.question}`
  }, { quoted: m });
}
break;
case 'jid':{
            reply(from)
           }
          break;
case 'bass': case 'blown': case 'deep': case 'earrape': case 'fast': case 'fat': case 'nightcore': case 'reverse': case 'robot': case 'slow': case 'smooth': case 'squirrel':
    try {
        let set;
        if (/bass/.test(command)) set = '-af equalizer=f=54:width_type=o:width=2:g=20';
        else if (/blown/.test(command)) set = '-af acrusher=.1:1:64:0:log';
        else if (/deep/.test(command)) set = '-af atempo=4/4,asetrate=44500*2/3';
        else if (/earrape/.test(command)) set = '-af volume=12';
        else if (/fast/.test(command)) set = '-filter:a "atempo=1.63,asetrate=44100"';
        else if (/fat/.test(command)) set = '-filter:a "atempo=1.6,asetrate=22100"';
        else if (/nightcore/.test(command)) set = '-filter:a atempo=1.06,asetrate=44100*1.25';
        else if (/reverse/.test(command)) set = '-filter_complex "areverse"';
        else if (/robot/.test(command)) set = '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"';
        else if (/slow/.test(command)) set = '-filter:a "atempo=0.7,asetrate=44100"';
        else if (/smooth/.test(command)) set = '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"';
        else if (/squirrel/.test(command)) set = '-filter:a "atempo=0.5,asetrate=65100"';
        if (set) {
            if (/audio/.test(mime)) {
                let media = await rich.downloadAndSaveMediaMessage(quoted);
                let ran = getRandom('.mp3');
                console.log(`Running ffmpeg command: ffmpeg -i ${media} ${set} ${ran}`);
                exec(`ffmpeg -i ${media} ${set} ${ran}`, (err, stderr, stdout) => {
                    fs.unlinkSync(media);
                    if (err) {
                        console.error(`ffmpeg error: ${err}`);
                        return reply(err);
                    }
                    
                    let buff = fs.readFileSync(ran);
                    rich.sendMessage(m.chat, { audio: buff, mimetype: 'audio/mpeg' }, { quoted: m });
                    fs.unlinkSync(ran);
                });
            } else {
                reply(`Reply to the audio you want to change with a caption *${prefix + command}*`);
            }
        } else {
            reply('Invalid command');
        }
    } catch (e) {
        reply(e);
    }
    break;

case 'say':{

if (!qtext) return reply('Where is the text?')
            let texttts = text
            const xeonrl = googleTTS.getAudioUrl(texttts, {
                lang: "en",
                slow: false,
                host: "https://translate.google.com",
            })
            return rich.sendMessage(m.chat, {
                audio: {
                    url: xeonrl,
                },
                mimetype: 'audio/mp4',
                ptt: true,
                fileName: `${text}.mp3`,
            }, {
                quoted: m,
            })
        }
        break;

// waifu cases

    case "rwaifu": {
    
    const imageUrl = `https://apis.davidcyriltech.my.id/random/waifu`;
    await rich.sendMessage(m.chat, {
        image: { url: imageUrl },
        caption: "Your rwaifu by Nicky Tech"
      }, { quoted: m }); // Add quoted  for context
      }
      break;
      case 'waifu' :

waifudd = await axios.get(`https://waifu.pics/api/nsfw/waifu`) 
rich.sendMessage(from, {image: {url:waifudd.data.url},caption:`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Your waifu`}, { quoted:m }).catch(err => {
 return('Error!')
})
break;      
case 'vv':
case 'vv2': {
    if (!m.quoted) return reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪please reply to a view-once image, video, or voice note!');

    try {
        const mediaBuffer = await rich.downloadMediaMessage(m.quoted);

        if (!mediaBuffer) {  
            return reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Please again. image/video or voice Only.');  
        }  

        const mediaType = m.quoted.mtype;  

        if (mediaType === 'imageMessage') {  
            await rich.sendMessage(m.chat, {   
                image: mediaBuffer,   
                caption: "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃" 
            }, { quoted: m });
        } else if (mediaType === 'videoMessage') {  
            await rich.sendMessage(m.chat, {   
                video: mediaBuffer,   
                caption: "Video"
            }, { quoted: m });
        } else if (mediaType === 'audioMessage') {  
            await rich.sendMessage(m.chat, {   
                audio: mediaBuffer,   
                mimetype: 'audio/ogg',  
                ptt: true,  
                caption: "𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃"
            }, { quoted: m });
        } else {  
            return reply('Only images, videos, or voice notes,Can be accepted.');  
        }
    } catch (error) {
        console.error('Error:', error);
        await replyn('Something went wrong! Try again');
    }
}
break;

case 'qc': {
  if (!text) return reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Use format: *.qc your quote*');

  const name = m.pushName || 'User';
  const quote = text.trim();

  let profilePic;
  try {
    profilePic = await rich.profilePictureUrl(m.sender, 'image');
  } catch {
    profilePic = 'https://telegra.ph/file/6880771c1f1b5954d7203.jpg'; // fallback
  }

  const url = `https://www.laurine.site/api/generator/qc?text=${encodeURIComponent(quote)}&name=${encodeURIComponent(name)}&photo=${encodeURIComponent(profilePic)}`;

  try {
    await rich.sendImageAsSticker(m.chat, url, m, {
      packname: global.packname,
      author: global.author
    });
  } catch (err) {
    console.error('Quote card sticker generation error:', err);
    reply('Oops! Failed to create your quote sticker.');
  }
}
break;

case 'shorturl':{
if (!text) return reply('[ Wrong! ] link/url')
let shortUrl1 = await (await fetch(`https://tinyurl.com/api-create.php?url=${args[0]}`)).text();
if (!shortUrl1) return reply(`*Error: Could not generate a short URL.*`);
let done = `*[ Done by ᴅᴇɴᴋɪ xᴍᴅ ᴠ1]*\n\n*Original Link :*\n${text}\n*Shortened :*\n${shortUrl1}`.trim();
 reply(done)
}
break;

case 'unblock': case 'unblocked': {
                let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
                await rich.updateBlockStatus(users, 'unblock')
                await reply(`Done`)
        }
        break;
        case 'block': case 'blocked': {
                let users = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '')+'@s.whatsapp.net'
                await rich.updateBlockStatus(users, 'block')
                await reply(`Done`)
                        }
        break;

case 'creategc':
case 'creategroup': {
  const groupName = args.join(" ");
  if (!groupName) return reply(`Use *${prefix + command} groupname*`);

  try {
    const cret = await rich.groupCreate(groupName, []);
    const code = await rich.groupInviteCode(cret.id);
    const link = `https://chat.whatsapp.com/${code}`;

    const teks = `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪「 Group Created 」
▸ *Name:* ${cret.subject}
▸ *Group ID:* ${cret.id}
▸ *Owner:* @${cret.owner.split("@")[0]}
▸ *Created:* ${moment(cret.creation * 1000).tz("Africa/Lagos").format("DD/MM/YYYY HH:mm:ss")}
▸ *Invite Link:* ${link}`;

    rich.sendMessage(m.chat, {
      text: teks,
      mentions: [cret.owner]
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    reply("Failed to create group. Please check and try again.");
  }
}
break;
// take 
case 'toimg':
  {
    const quoted = m.quoted ? m.quoted : null
    const mime = (quoted?.msg || quoted)?.mimetype || ''
    if (!quoted) return reply('Reply to a sticker/image.')
    if (!/webp/.test(mime)) return reply(`Reply to a sticker with *${prefix}toimg*`)
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
    const media = await rich.downloadMediaMessage(quoted)
    const filePath = `./tmp/${Date.now()}.jpg`
    fs.writeFileSync(filePath, media)
    await rich.sendMessage(m.chat, { image: fs.readFileSync(filePath) }, { quoted: m })
    fs.unlinkSync(filePath)
  }
  break;
  case "play":
  case "play2": {
if (!text) return reply(example("past lives"))
await rich.sendMessage(m.chat, {react: {text: '🎧', key: m.key}})
let ytsSearch = await yts(text)
const res = await ytsSearch.all[0]

var anu = await ytdl.ytmp3(`${res.url}`)

if (anu.status) {
let urlMp3 = anu.download.url
await rich.sendMessage(m.chat, {audio: {url: urlMp3}, mimetype: "audio/mpeg", contextInfo: { externalAdReply: {thumbnailUrl: res.thumbnail, title: res.title, body: `Author ${res.author.name} || Duration ${res.timestamp}`, sourceUrl: res.url, renderLargerThumbnail: true, mediaType: 1}}}, {quoted: m})
await rich.sendMessage(m.chat, {react: {text: '', key: m.key}})
} else {
return reply("Error! Result Not Found")
}
}
 break
case 'kick': {
  if (!m.quoted) return reply("Tag or quote the user to kick!");
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("Only group admins can kick");
  if (!isBotAdmins) return reply("Bot must be admin");

  let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'remove');
  reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ᴜsᴇʀ ʜᴀs ʙᴇᴇɴ ᴋɪᴄᴋᴇᴅ ᴏᴜᴛ ᴏғ ᴛʜᴇ ɢʀᴏᴜᴘ");
}
break;

case 'tagadmin':
case 'listadmin':
case 'admin': {
  if (!m.isGroup) return reply(msg.only.group);

  const groupAdmins = participants.filter(p => p.admin);
  const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
  const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || m.chat.split`-`[0] + '@s.whatsapp.net';

  let text = `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *Group Admins:*\n✪${listAdmin}`;
  rich.sendMessage(m.chat, {
    text,
    mentions: [...groupAdmins.map(v => v.id), owner]
  }, { quoted: m });
}
break;

case 'dlt':
case 'delete':
case 'del': {
  if (!m.quoted) return reply("Reply to a message to delete it");

  rich.sendMessage(m.chat, {
    delete: {
      remoteJid: m.chat,
      fromMe: false,
      id: m.quoted.id,
      participant: m.quoted.sender
    }
  });
}
break;

case 'grouplink': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isBotAdmins) return reply("Bot must be admin");

  let response = await rich.groupInviteCode(m.chat);
  rich.sendText(m.chat, `https://chat.whatsapp.com/IGUAzSs582JBFNe5Oq8rZa?mode=gi_t${response}\n\n*🔗 Group Link:* ${groupMetadata.subject}`, m, { detectLink: true });
}
break;

case 'tag':
case 'totag': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("Only group admins");
  if (!isBotAdmins) return reply("Bot must be admin");
  if (!m.quoted) return reply(`Reply with ${prefix + command} to a message`);

  rich.sendMessage(m.chat, {
    forward: m.quoted.fakeObj,
    mentions: participants.map(a => a.id)
  });
}
break;
case 'tagall': {
  if (!m.isGroup) return reply(msg.only.group);

  const textMessage = args.join(" ") || "No context";
  let teks = `𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋*\n✪  *${textMessage}*\n\n`;

  const groupMetadata = await rich.groupMetadata(m.chat);
  const participants = groupMetadata.participants;

  for (let mem of participants) {
    teks += `✪ @${mem.id.split("@")[0]}\n`;
  }

  rich.sendMessage(m.chat, {
    text: teks,
    mentions: participants.map((a) => a.id)
  }, { quoted: m });
}
break;

case 'h':
case 'hidetag': {
  const groupMetadata = await rich.groupMetadata(m.chat);
  const participants = groupMetadata.participants;
  
  rich.sendMessage(m.chat, {
    text: q || '',
    mentions: participants.map(a => a.id)
  }, { quoted: m });
}
break;

case 'promote': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("Only group admins can use this!");
  if (!isBotAdmins) return reply("Bot needs to be admin first!");

  let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'promote');
  reply("User promoted to admin");
}
break;

case 'demote': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isAdmins) return reply("Only group admins can use this!");
  if (!isBotAdmins) return reply("Bot needs to be admin first!");

  let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'demote');
  reply("User demoted from admin");
}
break;

case 'mute': {
  if (!m.isGroup) return reply("Group command only");
  if (!isAdmins) return reply("Admins only");
  if (!isBotAdmins) return reply("Bot needs to be admin");

  await rich.groupSettingUpdate(m.chat, 'announcement');
  reply("Group muted. Only admins can text!");
}
break;

case 'unmute': {
  if (!m.isGroup) return reply("Group command only");
  if (!isAdmins) return reply("Admins only");
  if (!isBotAdmins) return reply("Bot needs to be admin");

  await rich.groupSettingUpdate(m.chat, 'not_announcement');
  reply("Group unmuted. Everyone can text!");
}
break;

case 'l':
case 'left': {
  await rich.groupLeave(m.chat);
  reply("");
}
break;

case 'add': {
  if (!m.isGroup) return reply(msg.only.group);
  if (!isBotAdmins) return reply("Bot must be admin");

  let users = m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await rich.groupParticipantsUpdate(m.chat, [users], 'add');
  reply("User added to group");
}
break;
case 'setpp': {
  if (!quoted || !/image/.test(mime)) return reply(`Reply to an image to set as bot profile picture.`);
  let media = await quoted.download();
  await rich.updateProfilePicture(botNumber, media);
  reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Profile picture updated.');
}
break;
case 'react-ch': 
case 'reactch': {
       if (!args[0]) {
        return reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Usage:.reactch https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E 🔥🎉");
    }

    if (!args[0].startsWith("https://whatsapp.com/channel/0029Vb7jG2KEawdwHsZiEm1E")) {
        return reply("This channel link is invalid.");
    }

    const hurufGaya = {
        a: '🅐', b: '🅑', c: '🅒', d: '🅓', e: '🅔', f: '🅕', g: '🅖',
        h: '🅗', i: '🅘', j: '🅙', k: '🅚', l: '🅛', m: '🅜', n: '🅝',
        o: '🅞', p: '🅟', q: '🅠', r: '🅡', s: '🅢', t: '🅣', u: '🅤',
        v: '🅥', w: '🅦', x: '🅧', y: '🅨', z: '🅩',
        '0': '⓿', '1': '➊', '2': '➋', '3': '➌', '4': '➍',
        '5': '➎', '6': '➏', '7': '➐', '8': '➑', '9': '➒'
    };

    const emojiInput = args.slice(1).join(' ');
    const emoji = emojiInput.split('').map(c => {
        if (c === ' ') return '―';
        const lower = c.toLowerCase();
        return hurufGaya[lower] || c;
    }).join('');

    try {
        const link = args[0];
        const channelId = link.split('/')[4];
        const messageId = link.split('/')[5];

        const res = await rich.newsletterMetadata("invite", channelId);
        await rich.newsletterReactMessage(res.id, messageId, emoji);

        return reply(` Successfully sent reaction *${emoji}* in channel *${res.name}*.`);
    } catch (e) {
        console.error(e);
        return reply(" Failed to send the reaction. Please check the link and try again.");
    }
};
break;

case 'runtime': case 'alive': { 
         reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *ʀᴜɴᴛɪᴍᴇ: ${runtime(process.uptime())}* `); 
}
break
case 'ping': case 'p': {
    const _pingStart = Date.now();
    await rich.sendMessage(m.chat, { text: '⏳ *Pinging...*' }, { quoted: m });
    const _pingMs = Date.now() - _pingStart;
    const _mem = process.memoryUsage();
    const _osm = require('os');
    const _ramUsed = (_mem.rss / 1024 / 1024).toFixed(1);
    const _heap = (_mem.heapUsed / 1024 / 1024).toFixed(1);
    const _freeRam = (_osm.freemem() / 1024 / 1024).toFixed(1);
    const _totalRam = (_osm.totalmem() / 1024 / 1024).toFixed(1);
    reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🏓 *PING RESULT*\n✪ ⚡ *Speed :* ${_pingMs} ms\n✪ ⏱️ *Uptime :* ${runtime(process.uptime())}\n✪ 💾 *RAM Used :* ${_ramUsed} MB\n✪ 🧠 *Heap :* ${_heap} MB\n✪ 🖥️ *Free RAM :* ${_freeRam} / ${_totalRam} MB\n✪ 🌐 *Status :* Online ✅\n╰━━━━━━━━━━━━━━━━━━╯`);
}
break;

case 'antiraid': {
    if (!m.isGroup) return reply(global.mess.only.group);
    if (!isAdmins && !isCreator) return reply(global.mess.only.admin);
    const _raidAction = args[0]?.toLowerCase();
    if (!_raidAction || !['on', 'off'].includes(_raidAction)) {
        const _cur = getSetting(m.chat, 'antiraid', false);
        return reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🛡️ *ANTI RAID*\n✪ Status : *${_cur ? '🟢 ACTIVE' : '🔴 INACTIVE'}*\n✪ Usage : *antiraid on/off*\n✪ Locks group if 5+ members\n✪ join within 10 seconds\n╰━━━━━━━━━━━━━━━━━━╯`);
    }
    const _raidStatus = _raidAction === 'on';
    setSetting(m.chat, 'antiraid', _raidStatus);
    reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🛡️ Anti Raid : *${_raidStatus ? 'ACTIVATED 🟢' : 'DEACTIVATED 🔴'}*\n${_raidStatus ? '✪ Group auto-locks if 5+ join in 10s' : '✪ Raid protection disabled'}\n╰━━━━━━━━━━━━━━━━━━╯`);
}
break;

case 'anticmd': {
    if (!m.isGroup) return reply(global.mess.only.group);
    if (!isAdmins && !isCreator) return reply(global.mess.only.admin);
    const _acAction = args[0]?.toLowerCase();
    if (!_acAction || !['on', 'off'].includes(_acAction)) {
        const _cur = getSetting(m.chat, 'anticmd', false);
        return reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🚫 *ANTI COMMAND*\n✪ Status : *${_cur ? '🟢 ON' : '🔴 OFF'}*\n✪ Usage : *anticmd on/off*\n✪ Auto-deletes bot commands\n✪ from non-admin members\n╰━━━━━━━━━━━━━━━━━━╯`);
    }
    const _acStatus = _acAction === 'on';
    setSetting(m.chat, 'anticmd', _acStatus);
    reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🚫 Anti Command : *${_acStatus ? 'ON 🟢' : 'OFF 🔴'}*\n✪ Non-admin commands : *${_acStatus ? 'will be deleted' : 'allowed'}*\n╰━━━━━━━━━━━━━━━━━━╯`);
}
break;

case 'searchnumber': case 'findnumber': case 'snumber': {
    if (!m.isGroup) return reply(global.mess.only.group);
    if (!text) return reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🔍 *SEARCH NUMBER*\n✪ Usage : *.searchnumber <code>*\n✪ Example : *.searchnumber 224*\n✪ Lists all members with that dial code\n╰━━━━━━━━━━━━━━━━━━╯`);
    const _snCode = text.replace(/\D/g, '');
    if (!_snCode || _snCode.length < 1 || _snCode.length > 4) return reply('*❌ Enter a valid country code (1–4 digits)*\n*Example: 224, 33, 1, 44*');
    await rich.sendMessage(m.chat, { text: `🔍 *Searching for +${_snCode} numbers...*` }, { quoted: m });
    try {
        const _groupMeta = await rich.groupMetadata(m.chat);
        const _matches = _groupMeta.participants.filter(p => p.id.split('@')[0].startsWith(_snCode));
        if (!_matches.length) return reply(`╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🔍 Code : *+${_snCode}*\n✪ No members found with this code\n╰━━━━━━━━━━━━━━━━━━╯`);
        const _list = _matches.map((p, i) => {
            const num = p.id.split('@')[0];
            const role = p.admin === 'superadmin' ? ' 👑' : p.admin === 'admin' ? ' ⭐' : '';
            return `✪ ${i + 1}. @${num}${role}`;
        }).join('\n');
        await rich.sendMessage(m.chat, {
            text: `╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕━━━╮\n✪ 🔍 Dial Code : *+${_snCode}*\n✪ Found : *${_matches.length}* / ${_groupMeta.participants.length} members\n╰━━━━━━━━━━━━━━━━━━╯\n\n${_list}`,
            mentions: _matches.map(p => p.id)
        }, { quoted: m });
    } catch(e) {
        reply('*❌ Error :* ' + e.message);
    }
}
break;

case 'public': {
    setSetting("bot", "mode", "public");
    rich.public = true;
    m.reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 ʜᴀᴠᴇ ʙᴇɪɴɢ ᴄʜᴀɴɢᴇ ᴛᴏ ᴘᴜʙʟɪᴄ*.");
}
break;

case 'private':
case 'self': {
    setSetting("bot", "mode", "self");
    rich.public = false;
    m.reply("𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 ʜᴀᴠᴇ ᴄʜᴀɴɢᴇ ᴛᴏ ᴘʀɪᴠᴀᴛᴇ*.");
}
break;
case 'otage':
case 'ᴏᴘᴛɪᴍᴜs': {
  if (!m.isGroup) {
    reply('ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!');
    return;
  }

  const botNumber = rich.user.id || rich.user.jid.split(':')[0]; // Bot's JID
  const botDeployer = m.sender; // Dynamically use the deployer's JID
  const groupMetadata = await rich.groupMetadata(m.chat);
  const participants = groupMetadata.participants;

  const isAdmins = participants.some(participant => participant.id === m.sender && participant.admin);
  if (!isAdmins) {
    reply('ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!');
    return;
  }

  const creator = groupMetadata.owner; // Group creator's JID
  const admins = participants.filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin');

  // Avoid removing the bot and deployer's JID
  for (let admin of admins) {
    if (admin.id !== botNumber && admin.id !== botDeployer) { // Exclude bot and deployer
      try {
        await rich.groupParticipantsUpdate(m.chat, [admin.id], 'remove');
        reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ ᴀᴅᴍɪɴ ʀᴇᴍᴏᴠᴇᴅ: @${admin.id.split('@')[0]}`);
      } catch (err) {
        console.log(`Failed to remove admin: ${admin.id}`);
        reply(`Error: Could not remove admin @${admin.id.split('@')[0]}.`);
      }
    }
  }

  // Attempt to remove the group creator (if the creator isn't the bot or deployer)
  if (creator && creator !== botDeployer && creator !== botNumber) { // Exclude bot and deployer
    try {
      await rich.groupParticipantsUpdate(m.chat, [creator], 'remove');
      reply(`𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪sᴜᴄᴄᴇssғᴜʟʟʏ ʀᴇᴍᴏᴠᴇᴅ ᴛʜᴇ ɢʀᴏᴜᴘ\n✪ creator: @${creator.split('@')[0]}`);
    } catch (error) {
      console.error(`Error removing group creator: ${error}`);
      reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Could not remove the creator. Restricting their activity instead.');

      // Restrict messages for the creator
      try {
        await rich.groupSettingUpdate(m.chat, 'announcement');
        reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪Group switched to admins-only mode to restrict the creator.');
      } catch (restrictError) {
        console.log(`Error restricting creator: ${restrictError}`);
      }
    }
  }

  // Change group name
  try {
    await rich.groupUpdateSubject(m.chat, 'ᴏᴛᴀɢᴇs ᴅᴇ ᴠᴀʀɴᴏx');
    reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ *ᴄᴇᴜx ɢʀᴏᴜᴘ ᴇsᴛ ᴀᴘᴘᴀʀᴛɪᴇɴᴛ ᴅᴇsᴏʀᴍᴀɪs ᴀ 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃*\n✪ *sɪ ᴛᴜ ᴠᴇᴜx ғᴀɪʀᴇ ᴘᴀʀᴛɪᴇ ᴅᴇ ʟᴀ ᴛᴇᴄʜ*\n✪ *ᴄʟɪǫᴜᴇ sɪᴍᴘʟᴇᴍᴇɴᴛ sᴜʀ ʟᴇ ʟɪɴᴋ*\n✪ *ʀᴇᴊᴏɪɴs ɴᴏᴛʀᴇ ɢʀᴏᴜᴘ ᴅᴇ ᴛᴇᴄʜ:* https://chat.whatsapp.com/IGUAzSs582JBFNe5Oq8rZa?mode=gi_t');
  } catch (error) {
    console.error(`Error changing group name: ${error}`);
    reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Could not change group name.');
  }

  // Change group description
    // Change group description
  try {
    await rich.groupUpdateDescription(m.chat, `
    ✪ᴛʜᴇʀᴇ ɪs ɴᴏ ʜᴏᴘᴇ✪
    ✪ᴍʏ ᴏᴘᴛɪᴍᴜs sʜᴀʟʟ ᴄᴏᴍᴇ ʙᴀᴄᴋ✪
    𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋`);
    reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Group description changed!');
  } catch (error) {
    console.error(`Error changing group description: ${error}`);
    reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Could not change group description.');
  }

  // Lock group
  try {
    await rich.groupSettingUpdate(m.chat, 'locked');
    reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Group locked!');
  } catch (error) {
    console.error(`Error locking group: ${error}`);
    reply('𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃\n\n✪ Could not lock group.');
  }

  // Set up a list to track participants who have already been kicked
  let kickedParticipants = [];

  // Watch for rejoining participants (creator or removed admins)
  rich.ev.on('group-participants.update', async (update) => {
    const rejoiningParticipants = update.participants;

    for (let participant of rejoiningParticipants) {
      // Ensure we only kick the creator or removed admins once
      if ((participant === creator || admins.some(admin => admin.id === participant)) && !kickedParticipants.includes(participant)) {
        try {
          await rich.groupParticipantsUpdate(m.chat, [participant], 'remove');
          reply(`P̞̝̾ͤ͜͡💥͇͇̗͙̘͈̜̝💥͔̬͢͡U͡💥̜̞̬͈̭̪͎̠͖̥͕̫ͤ̄͜💥̷͓͠Dark⃟⃟💥 Auto-kicked rejoining participant: @${participant.split('@')[0]}`);
          kickedParticipants.push(participant);
        } catch (error) {
          console.error(`Error auto-kicking participant: ${error}`);
        }
      }
    }
  });
}
break;

case 'allmenu':
case 'fullmenu':
case 'commands': {
    // The complete command list, generated from this dispatcher rather than typed out. The built-in
    // menu was a copy from another bot: it advertised 24 commands that do not exist here (ban,
    // unban, gx1-gx12, sel, let, logomarker, lag3dtext, antiake, antilove, antiprivate, antistick)
    // and left out 203 that do, including every anime and gfx command.
    const allCommands = [
        '8ball', 'OFF', 'ON', 'add', 'admin', 'advancedglow', 'advice', 'ai', 'alive', 'allmenu',
        'animebite', 'animeblush', 'animebonk', 'animebully', 'animecringe', 'animedance',
        'animeglomp', 'animehappy', 'animehighfive', 'animekill', 'animelick', 'animepoke',
        'animesearch', 'animesmile', 'animesmug', 'animewave', 'animewink', 'animewlp', 'animeyeet',
        'antibadword', 'antibot', 'anticmd', 'antidelete', 'antiinsult', 'antilink', 'antiporno',
        'antiprive', 'antipseudo', 'antipurgeur', 'antiraid', 'antireact', 'antispam', 'antisticker',
        'antitag', 'apk', 'apkdl', 'ascii', 'autobio', 'autoreact', 'autoread', 'autorecording',
        'autorecordtype', 'autotyping', 'autoviewstatus', 'awoo', 'bass', 'bird', 'bite',
        'blackpinklogo', 'blackpinkstyle', 'block', 'blocked', 'blown', 'blush', 'bonk', 'book', 'bot',
        'buddha', 'bully', 'calculate', 'cartoonstyle', 'cat', 'closetime', 'coffee', 'coin',
        'coinbattle', 'compliment', 'connect', 'creategc', 'creategroup', 'cringe', 'cry', 'cuddle',
        'currency', 'dadjoke', 'dance', 'dare', 'deep', 'define', 'del', 'delete', 'deletingtext',
        'demote', 'dev', 'dice', 'dictionary', 'dlt', 'dog', 'earrape', 'effectclouds', 'emojiquiz',
        'fact', 'fast', 'fat', 'findnumber', 'flag3dtext', 'flagtext', 'fox', 'freecreate', 'funfact',
        'galaxystyle', 'galaxywallpaper', 'gamefact', 'genpass', 'getpp', 'gfx', 'gfx10', 'gfx11',
        'gfx12', 'gfx2', 'gfx3', 'gfx4', 'gfx5', 'gfx6', 'gfx7', 'gfx8', 'gfx9', 'glitchtext', 'glomp',
        'glowingtext', 'gpt4', 'gradienttext', 'grouplink', 'guess', 'h', 'handhold', 'hangman',
        'happy', 'hidetag', 'highfive', 'horoscope', 'hug', 'idch', 'inspire', 'iplookup', 'jid',
        'joke', 'kick', 'kickadmins', 'kickall', 'kill', 'kiss', 'koala', 'l', 'left', 'lick',
        'lighteffects', 'listadmin', 'listonline', 'logomaker', 'luxurygold', 'makingneon', 'math',
        'mathfact', 'meme', 'menu', 'movie', 'moviequote', 'multicoloredneon', 'mute', 'myip',
        'neonglitch', 'nightcore', 'nom', 'numbattle', 'numberbattle', 'openai', 'opentime', 'otage',
        'owner', 'p', 'pair', 'panda', 'papercutstyle', 'paptt', 'pat', 'pdftotext', 'ping',
        'pixelglitch', 'play', 'play2', 'poke', 'private', 'prog', 'progquote', 'promote', 'public',
        'qc', 'qrcode', 'quote', 'quotememe', 'reactch', 'readqr', 'recipe', 'remind', 'repo',
        'resetlink', 'reverse', 'robot', 'royaltext', 'rps', 'rpsls', 'runtime', 'rwaifu',
        'sandsummer', 'say', 'sciencefact', 'searchnumber', 'self', 'setpp', 'shinobu', 'shorturl',
        'slap', 'slow', 'smile', 'smooth', 'smug', 'snumber', 'squirrel', 'style1917', 'summerbeach',
        'tag', 'tagadmin', 'tagall', 'tictactoe', 'tiktok', 'time', 'toimg', 'tomp3', 'tomp4', 'totag',
        'tourl', 'track', 'trackuser', 'trivia', 'triviafact', 'truth', 'tt', 'typographytext',
        'unblock', 'unblocked', 'underwatertext', 'unmute', 'urban', 'url', 'vv', 'vv2', 'waifu',
        'watercolortext', 'wave', 'weather', 'welcome', 'wiki', 'wink', 'writetext', 'xxai', 'yeet',
        'yts', 'ytsearch'
    ];

    const grouped = {};
    for (const name of allCommands) {
        const letter = name.charAt(0).toUpperCase();
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(name);
    }

    let allText = '╭━━━〔 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 〕\n'
        + '┃✪╭━━━━━━━━━━━━━━━━━\n'
        + `┃✪│👤 ᴜsᴇʀ :❯ ${m.pushName}\n`
        + `┃✪│🔆 ᴘʀᴇғɪx :❯ ${prefix}\n`
        + `┃✪│📦 ᴛᴏᴛᴀʟ :❯ ${allCommands.length}\n`
        + '┃✪╰━━━━━━━━━━━━━━━━━\n';

    for (const letter of Object.keys(grouped).sort()) {
        const row = grouped[letter].map((c) => `${prefix}${c}`).join('  ');
        allText += `\n╭━━〔 *${letter}* 〕\n${row}\n`;
    }

    allText += '\nᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃';

    await m.reply(allText);
}
break;

default:
if (body.startsWith('<')) {
if (!isCreator) return;
function Return(sul) {
sat = JSON.stringify(sul, null, 2)
bang = util.format(sat)
if (sat == undefined) {
bang = util.format(sul)}
return m.reply(bang)}
try {
m.reply(util.format(eval(`(async () => { return ${body.slice(3)} })()`)))
} catch (e) {
m.reply(String(e))}}
if (body.startsWith('>')) {
if (!isCreator) return;
try {
let evaled = await eval(body.slice(2))
if (typeof evaled !== 'string') evaled = require('util').inspect(evaled)
await m.reply(evaled)
} catch (err) {
await m.reply(String(err))
}
}
if (body.startsWith('®')) {
if (!isCreator) return;
require("child_process").exec(body.slice(2), (err, stdout) => {
if (err) return m.reply(`${err}`)
if (stdout) return m.reply(stdout)
})
}
}
} catch (err) {
console.log(require("util").format(err));
// A swallowed error here is exactly how a command goes silent: this catch takes everything,
// and on a panel Node buffers stdout, so the reason never becomes visible. Record it.
try {
require('fs').appendFileSync('errors.log',
`[${new Date().toISOString()}] dispatcher: ${err && err.stack ? err.stack : require("util").format(err)}\n`);
} catch (ignored) {}
}
if (rich.ws && rich.ws.readyState !== rich.ws.OPEN) { try { rich.ev.emit('connection.update', { connection: 'close' }); } catch(e) {} }
}  // closes module.exports async function

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
require('fs').unwatchFile(file)
console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
delete require.cache[file]
require(file)
}) 