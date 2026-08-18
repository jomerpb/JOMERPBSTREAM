/**
 * Safety tests for snapshot_oracle.mjs — the daily job that writes
 * oracle-history.json.
 *
 * That file is treated as immutable: entries logged by an older engine stay
 * exactly as they were (CLAUDE.md, "oracle-history.json spans two engines").
 * The script's promises are that it is idempotent per day, that
 * FORCE_OVERWRITE=1 replaces only today's entry, and that entries are stored
 * newest-first. Nothing verified any of it.
 *
 * The script is run as a real subprocess against a TEMPORARY COPY of the repo,
 * which also exercises its own vm loader end to end — the one place the test
 * sandbox could otherwise drift from what the workflow actually runs.
 *
 *   node .github/scripts/tests/test_snapshot_oracle.mjs
 *
 * Never reads or writes the repo's real oracle-history.json.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { makeChecker, ROOT } from './lib/load_oracle.mjs';

const { check, failures } = makeChecker();

const REAL_LOG = path.join(ROOT, 'oracle-history.json');
const realLogBefore = fs.existsSync(REAL_LOG) ? fs.readFileSync(REAL_LOG) : null;

// ── a throwaway checkout holding only what the script reads ──────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-oracle-test-'));
for (const f of ['oracle.js', 'pcso-history.json', 'snapshot_oracle.mjs']) {
  fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f));
}
const LOG = path.join(tmp, 'oracle-history.json');

function run(env = {}) {
  return execFileSync('node', ['snapshot_oracle.mjs'],
    { cwd: tmp, env: { ...process.env, ...env }, encoding: 'utf8' });
}
const readLog = () => JSON.parse(fs.readFileSync(LOG, 'utf8'));

const SIX_BALL = ['642', '645', '649', '655', '658'];
const EZ2_SLOTS = ['2PM', '5PM', '9PM'];

// An older entry the script must never touch, plus a deliberately wrong pick
// so any silent "correction" shows up immediately.
const OLD_ENTRY = {
  date: '2020-01-01',
  generatedAt: '2020-01-01T00:00:00.000Z',
  engineSha: 'older-engine',
  picks: { '642': [1,2,3,4,5,6], '645': [1,2,3,4,5,6], '649': [1,2,3,4,5,6],
           '655': [1,2,3,4,5,6], '658': [1,2,3,4,5,6],
           ez2: { '2PM': [1,2], '5PM': [3,4], '9PM': [5,6] } },
};
fs.writeFileSync(LOG, JSON.stringify({ updated: '2020-01-01T00:00:00.000Z', entries: [OLD_ENTRY] }, null, 2) + '\n');

// ── 1. a first run appends today's entry ─────────────────────────────────
console.log('\n1. First run logs today');
run();
let log = readLog();
const today = log.entries[0] && log.entries[0].date;
check('an entry was added', log.entries.length === 2, `${log.entries.length} entries`);
check('newest entry is first (prepended)', log.entries[1].date === '2020-01-01', log.entries.map((e) => e.date).join(','));
check('the pre-existing older entry is byte-identical',
      JSON.stringify(log.entries[1]) === JSON.stringify(OLD_ENTRY));
check('entry carries date, generatedAt, engineSha and picks',
      log.entries[0].date && log.entries[0].generatedAt && log.entries[0].engineSha && log.entries[0].picks);

// ── 2. the logged shape ──────────────────────────────────────────────────
console.log('\n2. Logged pick shape');
{
  const picks = log.entries[0].picks;
  check('all five 6-ball games are logged as 6 numbers',
        SIX_BALL.every((g) => Array.isArray(picks[g]) && picks[g].length === 6
          && new Set(picks[g]).size === 6),
        JSON.stringify(picks && Object.keys(picks)));
  check('EZ2 is logged with its three draw hours of 2 numbers',
        picks.ez2 && EZ2_SLOTS.every((s) => Array.isArray(picks.ez2[s]) && picks.ez2[s].length === 2));
  check('no game is missing', SIX_BALL.concat('ez2').every((g) => picks[g] !== undefined));
}

// ── 3. idempotent per day ────────────────────────────────────────────────
// The workflow can be dispatched manually on a day it already ran, and the
// scheduled run can overlap. A second run must be a no-op, not a second entry
// and not a rewrite.
console.log('\n3. Second run same day is a no-op');
{
  const before = fs.readFileSync(LOG, 'utf8');
  const out = run();
  const after = fs.readFileSync(LOG, 'utf8');
  check('the file is byte-for-byte unchanged', before === after);
  check('it says why it skipped', /idempotent|skipping/i.test(out), out.trim().split('\n').pop());
  check('still exactly two entries', readLog().entries.length === 2);
}

// ── 4. FORCE_OVERWRITE replaces only today ───────────────────────────────
console.log('\n4. FORCE_OVERWRITE=1 replaces today only');
{
  const before = readLog();
  const out = run({ FORCE_OVERWRITE: '1' });
  const after = readLog();
  check('entry count is unchanged', after.entries.length === before.entries.length,
        `${before.entries.length} -> ${after.entries.length}`);
  check('today is still the first entry and still today', after.entries[0].date === today);
  check('it reports the replacement', /replaced/i.test(out), out.trim().split('\n').pop());
  check('the older entry survived untouched',
        JSON.stringify(after.entries[1]) === JSON.stringify(OLD_ENTRY));
  check('the replacement is the same pick, not a different one',
        JSON.stringify(after.entries[0].picks) === JSON.stringify(before.entries[0].picks),
        'picks moved on an overwrite of the same date');
}

// ── 5. what it logs is what the engine computes ──────────────────────────
// The script exists so the site and the log cannot disagree. Recomputing the
// same date through the engine must reproduce the logged numbers exactly.
console.log('\n5. Logged picks match a direct engine recompute');
{
  const { loadEngineFromRepo } = await import('./lib/load_oracle.mjs');
  const sb = await loadEngineFromRepo();
  const logged = readLog().entries[0];
  const wrong = [];
  for (const g of SIX_BALL) {
    const direct = JSON.stringify(sb.computeOracleAsOf(g, logged.date));
    if (direct !== JSON.stringify(logged.picks[g])) wrong.push(`${g}: ${direct} vs ${JSON.stringify(logged.picks[g])}`);
  }
  const ez2Direct = JSON.stringify(sb.computeOracleAsOf('ez2', logged.date));
  if (ez2Direct !== JSON.stringify(logged.picks.ez2)) wrong.push(`ez2: ${ez2Direct} vs ${JSON.stringify(logged.picks.ez2)}`);
  check('every logged game matches computeOracleAsOf for that date', wrong.length === 0, wrong[0] || '');
}

// ── 6. it starts a log from nothing ──────────────────────────────────────
console.log('\n6. Cold start with no log file');
{
  fs.unlinkSync(LOG);
  run();
  const fresh = readLog();
  check('a missing oracle-history.json is created', fs.existsSync(LOG));
  check('it holds exactly one entry, for today',
        fresh.entries.length === 1 && fresh.entries[0].date === today);
  check('the file records an updated timestamp', typeof fresh.updated === 'string' && fresh.updated.length > 0);
}

// ── 7. the real log was never touched ────────────────────────────────────
console.log('\n7. The repo\'s own oracle-history.json is untouched');
{
  const now = fs.existsSync(REAL_LOG) ? fs.readFileSync(REAL_LOG) : null;
  check('unchanged on disk',
        (realLogBefore === null && now === null) || (realLogBefore && now && realLogBefore.equals(now)));
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n' + '='.repeat(62));
console.log(failures.length
  ? `${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`
  : '0 failures — the snapshot job keeps its promises');
process.exit(failures.length ? 1 : 0);
