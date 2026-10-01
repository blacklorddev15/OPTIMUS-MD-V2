'use strict';

/**
 * Site bridge — links this bot to the VARNOX website, so the pairing page you already run there
 * works against this bot instead of the old one.
 *
 * The website is driven entirely by Postgres. It inserts a request row and polls for the answer:
 *
 *   varnox_pairing_requests    the queue. The site writes a row with status 'pending'; this bridge
 *                              claims it, asks this bot's own POST /api/pair for a code, and
 *                              writes the result back. The site's page polls until it appears.
 *   varnox_server_heartbeats   one row per bot host (slots 1..3). Refreshed every ~45s; the
 *                              dashboard shows a server online while the row is under 2 min old.
 *   varnox_sessions            one row per paired number, mirrored from richstore/pairing.
 *   varnox_settings            where the site records which database it is actually using.
 *
 * Why it drives /api/pair rather than calling pair.js directly: server.js already owns pairing --
 * the single-pairing guard, the capacity ceiling and the code file. A second path would have to
 * reimplement all of it and would race the first.
 *
 * The status strings are the site's, not ours to invent: it branches on
 * 'pending' | 'code_generated' | 'connected' | 'failed' | 'expired'.
 *
 * Off unless a database is configured, and every failure is caught and logged: a bridge problem
 * must never take the bot down.
 */

const fs = require('fs');
const path = require('path');

const PREFIX = 'varnox_';

const DEFAULT_HEARTBEAT_MS = 45_000;
const DEFAULT_POLL_MS = 5_000;
const DEFAULT_SESSIONS_MS = 30_000;
const CODE_TIMEOUT_MS = 70_000;
const SESSION_FRESH_MS = 15 * 60 * 1000;

const ROOT = path.join(__dirname, '..');

// ── Configuration ────────────────────────────────────────────────────────────
// Four places the connection string can live, tried in this order, so anything the host supplies
// always wins. The last two exist because a panel file manager hides dot-files and a panel's
// Startup field only reaches the app for variables its egg declares.
// Only a Postgres URL is usable. This matters because a Pterodactyl egg exports its own
// DATABASE_URL for the panel's MySQL addon, and dotenv never overwrites a variable the host has
// already set -- so a mysql:// URL wins the name and every attempt dies on
// ECONNREFUSED <ip>:3306, which looks like the database being down rather than the wrong one.
const isPostgresUrl = (value) => {
  const url = String(value || '').trim().toLowerCase();
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
};

function resolveDatabaseUrl() {
  const candidates = [];

  if (process.env.DATABASE_URL) candidates.push(['the environment', process.env.DATABASE_URL]);

  // Read .env directly too: dotenv leaves an already-set variable alone, so its value has to be
  // considered on its own when the host's is the wrong kind.
  try {
    const parsed = require('dotenv').parse(fs.readFileSync(path.join(ROOT, '.env')));
    if (parsed.DATABASE_URL) candidates.push(['.env', parsed.DATABASE_URL]);
  } catch (ignored) { /* no .env */ }

  try {
    const line = fs.readFileSync(path.join(ROOT, 'database-url.txt'), 'utf8')
      .split('\n')
      .map((s) => s.trim())
      .find((s) => s && !s.startsWith('#'));
    if (line) candidates.push(['database-url.txt', line]);
  } catch (ignored) { /* no fallback file */ }

  try {
    require(path.join(ROOT, 'setting', 'config.js')); // defines global.databaseUrl
    if (global.databaseUrl) candidates.push(['setting/config.js', global.databaseUrl]);
  } catch (ignored) { /* config unreadable */ }

  for (const [source, url] of candidates) {
    if (!isPostgresUrl(url)) console.log(`[site-bridge] ignoring ${source}: not a Postgres URL`);
  }

  const usable = candidates.find(([, url]) => isPostgresUrl(url));
  return usable ? String(usable[1]).trim() : '';
}

class SiteBridge {
  constructor(options = {}) {
    this.url = options.url;
    this.serverId = Number(options.serverId || 1);
    this.serverName = options.serverName || `Server ${this.serverId}`;
    this.heartbeatMs = Number(options.heartbeatMs || DEFAULT_HEARTBEAT_MS);
    this.pollMs = Number(options.pollMs || DEFAULT_POLL_MS);
    this.sessionsMs = Number(options.sessionsMs || DEFAULT_SESSIONS_MS);
    this.secret = process.env.API_SECRET || '';
    this.botUrl = String(
      process.env.SITE_BOT_URL || `http://127.0.0.1:${process.env.PORT || process.env.SERVER_PORT || 3000}`,
    ).replace(/\/$/, '');
    this.timers = [];
    this.stopped = false;
    this.controlPool = null;
    this.dataPool = null;
  }

  log(message) {
    console.log(`[site-bridge] ${message}`);
    // Also to a file: Node block-buffers stdout when it is not a terminal, so on a panel the
    // console can stay silent for minutes while this process is perfectly busy.
    try {
      fs.appendFileSync(path.join(ROOT, 'bridge.log'), `[${new Date().toISOString()}] ${message}\n`);
    } catch (ignored) { /* logging must never break the bridge */ }
  }

  static hostOf(url) {
    try { return new URL(String(url).split('?')[0]).host; } catch (ignored) { return ''; }
  }

  static mask(url) {
    return String(url).replace(/:\/\/([^:]+):[^@]*@/, '://$1:••••@');
  }

  async start() {
    const { Pool } = require('pg');
    const ssl = { rejectUnauthorized: false };

    this.controlPool = new Pool({ connectionString: this.url, ssl, max: 3 });
    await this.controlPool.query('SELECT 1');
    this.dataPool = this.controlPool;

    // The site can be pointed at another database from its own admin panel; follow it, exactly
    // as the site does, or the two halves would silently talk past each other.
    try {
      const { rows } = await this.controlPool.query(
        `SELECT value FROM ${PREFIX}settings WHERE key = 'active_database_url'`,
      );
      const next = rows[0] && rows[0].value;
      if (next && next !== this.url) {
        this.dataPool = new Pool({ connectionString: next, ssl, max: 3 });
        await this.dataPool.query('SELECT 1');
        this.log(`using the site's active database → ${SiteBridge.hostOf(next)}`);
      }
    } catch (error) {
      this.log(`could not read the active database setting (${error.message}); using the configured one`);
    }

    this.log(`online as "${this.serverName}" → ${SiteBridge.hostOf(this.url)}`);
    this.log(`pairing route: ${this.botUrl}/api/pair`);

    await this.heartbeat();
    await this.syncSessions();

    this.schedule(() => this.heartbeat(), this.heartbeatMs);
    this.schedule(() => this.pump(), this.pollMs);
    this.schedule(() => this.syncSessions(), this.sessionsMs);
    return this;
  }

  schedule(fn, interval) {
    const timer = setInterval(() => {
      if (this.stopped) return;
      Promise.resolve(fn()).catch((error) => this.log(`error: ${error.message}`));
    }, interval);
    if (typeof timer.unref === 'function') timer.unref();
    this.timers.push(timer);
  }

  async stop() {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    for (const pool of [this.dataPool, this.controlPool]) {
      if (pool) await pool.end().catch(() => {});
    }
  }

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  async heartbeat() {
    await this.dataPool.query(
      `INSERT INTO ${PREFIX}server_heartbeats (server_id, name, last_seen)
            VALUES ($1, $2, now())
       ON CONFLICT (server_id) DO UPDATE SET name = EXCLUDED.name, last_seen = now()`,
      [this.serverId, this.serverName],
    );
  }

  // ── Publishing a code the bot asked for by itself ──────────────────────────
  /**
   * The bot re-pairs on its own when a session dies, and leaves a marker when it does. Nothing
   * would otherwise reach the website for that: a normal code is published only because the site
   * asked for one, and here nobody did. So pick the marker up, read the code the bot wrote, record
   * it as a finished request and drop the marker, so it is published exactly once.
   */
  async publishAutoRepair() {
    const markerPath = path.join(ROOT, 'richstore', 'pairing', 'auto-repair.json');
    let marker;
    try {
      marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch (ignored) {
      return;                                  // nothing asked for a re-pair
    }

    let code = null;
    try {
      const pairing = JSON.parse(fs.readFileSync(path.join(ROOT, 'richstore', 'pairing', 'pairing.json'), 'utf8'));
      const sameNumber = String(pairing.number || '').split('@')[0] === String(marker.number || '').split('@')[0];
      if (sameNumber && pairing.code) code = String(pairing.code);
    } catch (ignored) { /* the bot has not written a code yet */ }

    if (!code) return;                          // try again on the next tick

    const phone = String(marker.number).split('@')[0];
    await this.dataPool.query(
      `INSERT INTO ${PREFIX}pairing_requests (phone, status, pairing_code, error, created_at, updated_at, expires_at)
            VALUES ($1, 'code_generated', $2, NULL, now(), now(), now() + interval '10 minutes')`,
      [phone, code],
    );
    try { fs.unlinkSync(markerPath); } catch (ignored) { /* already gone */ }
    this.log(`auto re-pair for ${phone} published to the website (code ${code})`);
  }

  // ── The pairing queue ──────────────────────────────────────────────────────
  async pump() {
    await this.publishAutoRepair().catch((error) => this.log(`auto re-pair publish failed: ${error.message}`));

    // Requests nobody answered in time are closed off, so the site's page stops spinning and
    // tells the user to try again instead of waiting forever.
    await this.dataPool.query(
      `UPDATE ${PREFIX}pairing_requests
          SET status = 'expired', updated_at = now()
        WHERE status IN ('pending', 'processing') AND expires_at <= now()`,
    ).catch(() => {});

    // CTE + UPDATE ... FROM: the form the PostgreSQL docs give for a queue. SKIP LOCKED means two
    // hosts can never claim the same row and ask WhatsApp for two codes for one number.
    const claimed = await this.dataPool.query(
      `WITH next AS (
         SELECT id FROM ${PREFIX}pairing_requests
          WHERE status = 'pending' AND expires_at > now()
          ORDER BY id
          LIMIT 1
          FOR UPDATE SKIP LOCKED
       )
       UPDATE ${PREFIX}pairing_requests r
          SET status = 'processing', updated_at = now()
         FROM next
        WHERE r.id = next.id
       RETURNING r.id, r.phone`,
    );

    const row = claimed.rows[0];
    if (!row) return;

    this.log(`request #${row.id} → ${row.phone}`);
    const result = await this.requestCode(row.phone);

    if (result.code) {
      await this.dataPool.query(
        `UPDATE ${PREFIX}pairing_requests
            SET status = 'code_generated', pairing_code = $2, error = NULL, updated_at = now()
          WHERE id = $1`,
        [row.id, result.code],
      );
      this.log(`request #${row.id} → code issued`);
      return;
    }

    if (result.retry) {
      // The bot is mid-pairing or at capacity. Put it back rather than burning the request: the
      // expiry sweep above will close it if it never gets a turn.
      await this.dataPool.query(
        `UPDATE ${PREFIX}pairing_requests SET status = 'pending', updated_at = now() WHERE id = $1`,
        [row.id],
      );
      this.log(`request #${row.id} → busy, will retry`);
      return;
    }

    await this.dataPool.query(
      `UPDATE ${PREFIX}pairing_requests
          SET status = 'failed', error = $2, updated_at = now()
        WHERE id = $1`,
      [row.id, result.error],
    );
    this.log(`request #${row.id} → failed: ${result.error}`);
  }

  /** Ask this bot's own pairing API. Nothing here talks to WhatsApp directly. */
  async requestCode(phone) {
    const fetch = require('node-fetch');
    this.log(`calling ${this.botUrl}/api/pair for ${phone}`);
    try {
      const res = await fetch(`${this.botUrl}/api/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.secret ? { 'x-api-key': this.secret } : {}),
        },
        body: JSON.stringify({ number: phone }),
        timeout: CODE_TIMEOUT_MS,
      });

      const data = await res.json().catch(() => ({}));
      this.log(`reply HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);

      if (res.status === 429) {
        // "Pairing in progress" or "at capacity" — both temporary by design.
        return { code: null, retry: true, error: data.error || 'Server busy.' };
      }
      if (data && data.code) return { code: String(data.code), retry: false, error: null };

      return {
        code: null,
        retry: false,
        error: (data && data.error) || `Pairing failed (HTTP ${res.status}).`,
      };
    } catch (error) {
      const message = error.code === 'ECONNREFUSED' || error.type === 'request-timeout'
        ? `Could not reach this bot's pairing API at ${this.botUrl}.`
        : error.message;
      return { code: null, retry: false, error: message };
    }
  }

  // ── Sessions ───────────────────────────────────────────────────────────────
  /**
   * Mirror the paired numbers the bot keeps on disk. updated_at is taken from the session
   * directory's mtime rather than "now", so the site's own 15-minute freshness rule measures
   * reality instead of measuring how recently this bridge ran.
   */
  async syncSessions() {
    const folder = path.join(ROOT, 'richstore', 'pairing');
    let entries = [];
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.endsWith('@s.whatsapp.net'));
    } catch (ignored) {
      return; // nothing paired yet
    }

    for (const entry of entries) {
      const phone = entry.name.split('@')[0];
      let touched = Date.now();
      try { touched = fs.statSync(path.join(folder, entry.name)).mtimeMs; } catch (ignored) { /* keep now */ }

      const status = Date.now() - touched < SESSION_FRESH_MS ? 'connected' : 'disconnected';
      await this.dataPool.query(
        `INSERT INTO ${PREFIX}sessions (id, phone, status, updated_at)
              VALUES ($1, $2, $3, to_timestamp($4))
         ON CONFLICT (id) DO UPDATE
                 SET phone = EXCLUDED.phone,
                     status = EXCLUDED.status,
                     updated_at = EXCLUDED.updated_at`,
        [phone, phone, status, touched / 1000],
      ).catch(() => {});
    }
  }
}

/**
 * Start the bridge, or stay silent. Returns null when no database is configured, which is the
 * normal state for anyone using the bot without the website.
 */
async function startSiteBridge() {
  if (String(process.env.SITE_BRIDGE || '').toLowerCase() === 'off') {
    console.log('[site-bridge] disabled with SITE_BRIDGE=off');
    return null;
  }

  const url = resolveDatabaseUrl();
  if (!url) {
    console.log('[site-bridge] inactive — no POSTGRES url found in the environment, .env, database-url.txt or setting/config.js');
    return null;
  }

  const bridge = new SiteBridge({
    url,
    serverId: process.env.SITE_SERVER_ID || 1,
    serverName: process.env.SITE_SERVER_NAME || `Server ${process.env.SITE_SERVER_ID || 1}`,
  });

  try {
    await bridge.start();
    return bridge;
  } catch (error) {
    console.error(`[site-bridge] could not start: ${error.message}`);
    if (String(error.message).includes('does not exist')) {
      console.error('[site-bridge] that database has no varnox_ tables — is it really the website database?');
    }
    await bridge.stop();
    return null;
  }
}

module.exports = { SiteBridge, startSiteBridge };
