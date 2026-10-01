#!/usr/bin/env node
/**
 * Verify that DATABASE_URL is the database the website actually uses.
 *
 * Read-only: it counts rows and reads settings; it never writes, never creates
 * anything. The connection string is masked in all output, so the result is safe
 * to paste anywhere.
 *
 *   DATABASE_URL='postgresql://...' node check-db.js
 */
const { Client } = require('pg');

const url = process.argv[2] || process.env.DATABASE_URL || '';
const mask = (u) => String(u).replace(/:\/\/([^:]+):[^@]*@/, '://$1:••••@');

if (!url) {
  console.log('  no DATABASE_URL given.');
  console.log('  usage: DATABASE_URL=\'postgresql://...\' node check-db.js');
  process.exit(2);
}

(async () => {
  console.log(`  target: ${mask(url)}\n`);
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  try {
    await c.connect();
    const meta = await c.query('select current_database() as db, current_user as usr, version() as v');
    console.log(`  connected: ${meta.rows[0].db} as ${meta.rows[0].usr}`);
    console.log(`  server   : ${meta.rows[0].v.split(',')[0]}`);

    const t = await c.query(`select table_name from information_schema.tables
                              where table_schema='public' order by table_name`);
    const names = t.rows.map(r => r.table_name);
    const varnox = names.filter(n => n.startsWith('varnox_'));
    console.log(`  tables   : ${names.length} total, ${varnox.length} with the varnox_ prefix`);

    const needed = ['varnox_pairing_requests', 'varnox_server_heartbeats', 'varnox_sessions'];
    const missing = needed.filter(n => !names.includes(n));

    if (missing.length) {
      console.log('\n  VERDICT: NOT the website database.');
      console.log(`  missing: ${missing.join(', ')}`);
      if (names.length) {
        const other = [...new Set(names.map(n => (n.includes('_') ? n.split('_')[0] : n)))].slice(0, 8);
        console.log(`  it looks like a different platform's schema instead: ${other.join(', ')}`);
      }
      console.log('  the bridge would fail every poll with "relation does not exist".');
      process.exit(1);
    }

    console.log('\n  VERDICT: this is the website database.');
    for (const tbl of varnox) {
      const n = await c.query(`select count(*)::int as n from "${tbl}"`);
      console.log(`    ${tbl.padEnd(28)} ${String(n.rows[0].n).padStart(6)} rows`);
    }
    const s = await c.query(`select key, value from varnox_settings order by key`).catch(() => ({ rows: [] }));
    if (s.rows.length) {
      console.log('  settings:');
      for (const r of s.rows) console.log(`    ${r.key} = ${String(r.value).slice(0, 60)}`);
    }
    const h = await c.query(`select server_id, name, last_seen from varnox_server_heartbeats order by server_id`).catch(() => ({ rows: [] }));
    console.log('  heartbeats:');
    for (const r of h.rows) console.log(`    server ${r.server_id}  ${r.name}  last_seen ${r.last_seen.toISOString()}`);
    if (!h.rows.length) console.log('    (none yet — expected until the bot has run once)');
  } catch (e) {
    console.log('\n  VERDICT: could not connect —', e.message);
    process.exit(1);
  } finally {
    await c.end().catch(() => {});
  }
})();
