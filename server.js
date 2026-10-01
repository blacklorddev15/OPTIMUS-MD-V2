// From this folder rather than the working directory: hosts do not always start the process where
// the files live, and a .env sitting next to server.js must still be found when they don't.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// Pterodactyl passes the allocation as SERVER_PORT, Render as PORT.
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

const WEB_URL = process.env.WEB_URL || '*';
const API_SECRET = process.env.API_SECRET || '';

app.use(cors({
  origin: WEB_URL === '*' ? '*' : WEB_URL.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function checkAuth(req, res, next) {
  if (API_SECRET && req.headers['x-api-key'] !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

let isPairing = false;

app.get('/', (req, res) => {
  res.json({
    bot: 'OPTIMUS-XMD',
    version: '2.0.5',
    status: 'online',
    dev: '@Varnox_Or_novark'
  });
});

app.get('/api/status', (req, res) => {
  const pairingFolder = './richstore/pairing';
  let pairedCount = 0;
  try {
    pairedCount = fs.readdirSync(pairingFolder, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.endsWith('@s.whatsapp.net')).length;
  } catch {}
  res.json({
    status: 'online',
    bot: 'OPTIMUS-XMD',
    version: '2.0.5',
    paired: pairedCount,
    capacity: 70,
    isPairing
  });
});

app.post('/api/pair', checkAuth, async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleaned = String(number).replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  if (['0'].includes(cleaned[0])) {
    return res.status(400).json({ error: 'Do not use leading zero. Use international format.' });
  }

  const pairingFolder = './richstore/pairing';
  try {
    const count = fs.readdirSync(pairingFolder, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.endsWith('@s.whatsapp.net')).length;
    if (count >= 70) {
      return res.status(429).json({ error: 'Server at capacity. Please contact admin.' });
    }
  } catch {}

  if (isPairing) {
    return res.status(429).json({ error: 'Pairing in progress. Please wait 30 seconds and try again.' });
  }

  isPairing = true;

  try {
    const startpairing = require('./pair.js');
    const jid = `${cleaned}@s.whatsapp.net`;
    await startpairing(jid);
    await new Promise(r => setTimeout(r, 5000));

    const pairingFile = './richstore/pairing/pairing.json';
    if (!fs.existsSync(pairingFile)) {
      throw new Error('Pairing code not generated. Please try again.');
    }

    const data = JSON.parse(fs.readFileSync(pairingFile, 'utf-8'));
    if (!data.code) throw new Error('Pairing failed. Please try again.');

    res.json({ success: true, code: data.code, number: cleaned });
  } catch (err) {
    console.error('Pairing error:', err.message);
    res.status(500).json({ error: err.message || 'Pairing failed. Please try again.' });
  } finally {
    isPairing = false;
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── RECONNECT WHAT IS ALREADY PAIRED ────────────────────────────────────────
// Nothing did this before, and it is why a restart looked like losing the pairing: the bot only
// ever connected when somebody asked for a pairing code (POST /api/pair, or the .pair command),
// so after a restart every already-paired number sat idle until a new request happened to arrive.
//
// startpairing() only asks WhatsApp for a code when the credentials are NOT registered, so a
// number that is already paired simply reconnects here: no new pairing, no new code, nothing for
// the user to do.
async function restorePairedSessions() {
  const pairingFolder = './richstore/pairing';
  let sessions = [];

  try {
    sessions = fs.readdirSync(pairingFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith('@s.whatsapp.net'))
      .map((entry) => entry.name);
  } catch (ignored) {
    // nothing paired yet
  }

  if (!sessions.length) {
    console.log('🔁 No paired sessions to restore yet.');
    return [];
  }

  console.log(`🔁 Restoring ${sessions.length} paired session(s)...`);
  const startpairing = require('./pair.js');

  for (const jid of sessions) {
    try {
      await startpairing(jid);
      console.log(`🔁 ${jid} resumed`);
    } catch (error) {
      console.error(`🔁 ${jid} could not resume: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));   // one at a time
  }

  return sessions;
}

// ─── RE-PAIR BY ITSELF ───────────────────────────────────────────────────────
// When a number loses its session -- WhatsApp logging the device out, or a connect that ended with
// the credentials being discarded -- the bot used to stop at "user must re-pair" and then nothing
// happened until somebody noticed. Now it asks for a fresh code on its own, once per number per
// run, and leaves a marker so the website can publish that code where the owner will see it.
//
// Once, not in a loop, and deliberately so: every pairing links another device, and WhatsApp only
// allows four.
const autoRepairTried = new Set();
const AUTO_REPAIR_MARKER = './richstore/pairing/auto-repair.json';
const AUTO_REPAIR_EVERY_MS = 60_000;

function sessionIsRegistered(jid) {
  try {
    const creds = JSON.parse(fs.readFileSync(path.join('./richstore/pairing', jid, 'creds.json'), 'utf8'));
    return Boolean(creds && creds.registered);
  } catch (ignored) {
    return false;                 // gone, empty or unreadable: it needs pairing
  }
}

async function autoRepairSessions(known) {
  const startpairing = require('./pair.js');

  for (const jid of known) {
    if (autoRepairTried.has(jid)) continue;
    if (sessionIsRegistered(jid)) continue;

    autoRepairTried.add(jid);
    console.log(`🛠️ ${jid} has no usable session — requesting a pairing code automatically`);

    try {
      await startpairing(jid);
      fs.writeFileSync(AUTO_REPAIR_MARKER, JSON.stringify({ number: jid, at: Date.now() }));
      console.log(`🛠️ ${jid}: a fresh code has been requested; the website will publish it`);
    } catch (error) {
      console.error(`🛠️ ${jid}: could not start pairing — ${error.message}`);
    }
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP API server running on port ${PORT}`);

  // LINK TO THE VARNOX WEBSITE -------------------------------------------------
  // Publishes the heartbeat the dashboard reads, drains the website's pairing queue
  // through POST /api/pair, and mirrors paired sessions so they appear on the site.
  // Starts after listen(), because it calls back into this very server. Silent when
  // no database is configured, so using the bot without the website is unchanged.
  require('./lib/siteBridge').startSiteBridge()
    .then((bridge) => { global.siteBridge = bridge; })
    .catch((error) => console.error('[site-bridge] failed to start:', error.message));

  // Bring back the numbers that are already paired, so restarting does not look like losing the
  // pairing. Delayed a few seconds to let the socket layer and the bridge settle first.
  setTimeout(async () => {
    let known = [];
    try {
      known = await restorePairedSessions();
    } catch (error) {
      console.error('[restore] failed:', error.message);
    }

    // Then keep an eye on them: a session can also die later, after a successful start.
    if (known.length) {
      setInterval(() => {
        autoRepairSessions(known).catch((error) => console.error('[auto-repair] failed:', error.message));
      }, AUTO_REPAIR_EVERY_MS).unref?.();
    }
  }, 5000);
});

module.exports = app;
