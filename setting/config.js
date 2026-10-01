// From this folder rather than the working directory, so the bot finds the same .env as server.js
// even when the host starts it from somewhere else.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');

// ── VARNOX website database ──────────────────────────────────────────────────
// Used by lib/siteBridge.js to link this bot to the website. Read LAST, so a value
// supplied by the host, by .env or by database-url.txt always wins over this one.
// Paste the whole connection string between the quotes, on one line:
//
//   global.databaseUrl = 'postgresql://user:pass@host/db?sslmode=require';
//
// ⚠️ WARNING — this file is tracked in a PUBLIC repository. Committing a real value
// publishes that credential to anyone who can read the repo, and it grants full
// access to every table in that database. Prefer .env or database-url.txt, which
// .gitignore already covers. Never `git add setting/config.js` after pasting a value.
global.databaseUrl = process.env.DATABASE_URL || '';

global.owner = process.env.OWNER_NUMBER || '224669288332';
global.footer = '𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃';
global.status = true;
global.prefa = ['.', '🇬🇳'];
global.owner = [process.env.OWNER_NUMBER || '224669288332'];
global.xprefix = '.';
global.gambar = 'https://gangalink.vercel.app/i/e0ems1q2.jpg';
global.OWNER_NAME = '𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋';
global.DEVELOPER = [process.env.DEV_ID || '7805569343'];
global.BOT_NAME = '𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃';
global.bankowner = '𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋';
global.creatorName = '𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋';
global.ownernumber = process.env.OWNER_NUMBER || '224669288332';
global.antilink = false;
global.location = 'Guinée,Conakry';
global.link = 'https://www.youtube.com/';
global.autobio = false;
global.botName = '𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃';
global.version = '2.0.5';
global.botname = '𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃';
global.author = '𝐛𝐲 𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋';
global.themeemoji = '👑';
global.wagc = 'https://chat.whatsapp.com/IGUAzSs582JBFNe5Oq8rZa?mode=gi_t';
global.thumbnail = 'https://gangalink.vercel.app/i/e0ems1q2.jpg';
global.richpp = 'https://gangalink.vercel.app/i/e0ems1q2.jpg';
global.packname = '𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃';
global.author = '\n\n\n\n\nCreated by 𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋\ntelegram : @Varnox_Or_novark';
global.creator = (process.env.OWNER_NUMBER || '224669288332') + '@s.whatsapp.net';
global.ownername = '𝐌ꝛ 𝛁𝚫𝚪𝚴𝚯𝚾•𝚸𝚪𝚰𝚳𝚵𝚵 𝚻𝚵𝐂𝚮 𝚯𝐅𝐅𝚰𝐂𝐈𝚫𝐋';
global.onlyowner = '*🚫 Only Owner*\n';
global.database = '*🚫 Only Database Users*';
global.mess = {
    wait: '⏳ *Please wait...*',
    success: '✅ *Done!*',
    on: '*𝐎𝐏𝐓𝐈𝐌𝐔𝐒-𝐗𝐌𝐃 is active*',
    prem: '*🚫 Premium users only. Contact owner to get premium access.*',
    off: 'off',
    query: {
        text: "❓ Where's the text?",
        link: "❓ Where's the link?",
    },
    error: {
        fitur: '*🚫 This feature has an error. Please contact the developer.*',
    },
    only: {
        group: '*🚫 This command can only be used in groups.*',
        private: '*🚫 This command can only be used in private chats.*',
        owner: '*🚫 This command is restricted to the owner only.*',
        admin: '*🚫 This command is for group admins only.*',
        badmin: '*🚫 Bot must be a group admin to use this command.*',
        premium: '*🚫 This feature is for premium users only.*',
    }
};

global.hituet = 0;
global.autoRecording = false;
global.autoTyping = false;
global.autorecordtype = false;
global.autoread = false;
global.autobio = false;
global.anti92 = false;
global.autoswview = true;

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    require(file);
});
