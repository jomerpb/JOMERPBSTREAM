/**
 * Correctness tests for the Oracle engine (oracle.js).
 *
 * These check that each layer DOES WHAT IT CLAIMS — not whether it matches
 * winning numbers. Per CLAUDE.md, hit rate is not the measure: every
 * configuration lands at the ~0.73 chance baseline, so a layer can be badly
 * broken and score exactly as well as a correct one. Nothing else in this repo
 * would notice. That is what these tests are for.
 *
 * Each test below targets a defect that was actually live in this repo (see the
 * audit notes in CLAUDE.md), plus the two guarantees the code asserts in
 * comments but never verified.
 *
 * The engine is loaded in a Node vm sandbox exactly as snapshot_oracle.mjs does
 * it — the real oracle.js the browser runs, not a reimplementation.
 *
 *   node .github/scripts/tests/test_oracle_layers.mjs
 *
 * Exits non-zero if any guarantee is violated. Needs no network and writes
 * nothing; the one test that alters history does so on an in-memory copy.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');
const ORACLE_JS = path.join(ROOT, 'oracle.js');
const PCSO_HISTORY = path.join(ROOT, 'pcso-history.json');

const failures = [];

function check(name, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  ' + detail : ''}`);
  if (!ok) failures.push(name);
}

// ── engine loader (mirrors snapshot_oracle.mjs) ──────────────────────────

function stubEl() {
  return {
    style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    innerHTML: '', value: '', textContent: '', min: '', max: '', dataset: {},
    setAttribute(){}, getAttribute: () => null, appendChild(){}, addEventListener(){},
    removeEventListener(){}, scrollIntoView(){}, querySelector: () => stubEl(),
    querySelectorAll: () => [], options: [], selectedIndex: 0, checked: false, disabled: false,
  };
}

async function loadEngine(historyText) {
  const sandbox = {
    // Silence the engine's own load chatter; tests print their own results.
    console: { log(){}, error(){}, warn(){} },
    AbortController, Intl, Date, Math, JSON, Object, Array, Promise,
    parseInt, parseFloat, String, Number, isNaN, Boolean, RegExp, Error,
    setTimeout, clearTimeout, setInterval, clearInterval,
    document: {
      getElementById: () => stubEl(), querySelector: () => stubEl(),
      querySelectorAll: () => [], addEventListener: () => {}, createElement: () => stubEl(),
    },
    window: { addEventListener: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { userAgent: 'oracle-correctness-tests' },
    fetch: async (url) => String(url).includes('oracle-history.json')
      ? { ok: false, status: 404, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => JSON.parse(historyText) },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(ORACLE_JS, 'utf8'), sandbox, { filename: 'oracle.js' });
  await sandbox.PCSO_HISTORY_READY;
  if (!sandbox.PCSO_HISTORY_STATUS?.loaded) {
    throw new Error(`engine did not load history: ${sandbox.PCSO_HISTORY_STATUS?.error}`);
  }
  return sandbox;
}

/** Point the engine's date globals at a specific day. */
function setDate(sb, y, m, d) {
  sb._D = d; sb._M = m; sb._Y = y; sb._DOW = new Date(y, m - 1, d).getDay();
}

/** A run of fair random draws — every number equally likely. */
function fairDraws(max, picks, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const draw = [];
    while (draw.length < picks) {
      const n = 1 + Math.floor(Math.random() * max);
      if (!draw.includes(n)) draw.push(n);
    }
    out.push(draw);
  }
  return out;
}

const historyText = fs.readFileSync(PCSO_HISTORY, 'utf8');
const sb = await loadEngine(historyText);

// ── 1. Every date-driven layer actually varies with the date ─────────────
// The real bug: layerNumerology's Chaldean half scored three FIXED words and
// returned [3,7] on every date ever — verified constant across 4,032
// date/hour combinations — while convergence() counted it as a live,
// independent source the whole time. A layer frozen to a constant is
// invisible in the output and costs nothing in hit rate. This is the check
// that catches it, for every layer at once.
//
// Floors are set well under the counts measured when these tests were
// written, so ordinary variation never trips them. A layer that collapses
// toward a constant falls through the floor immediately.
console.log('\n1. Date-driven layers vary with the date');
const LAYER_FLOORS = {
  layerNumerology: 50,   // measured 240 distinct over 360 dates
  layerAstrology: 50,    // measured 295
  layerBazi: 10,         // measured  38 (cyclical — 60-term stem/branch)
  layerFengshui: 10,     // measured  29 (cyclical — 9-year flying star)
  layerIChing: 4,        // measured   8 (hexagram maps to few digits)
  layerTarot: 6,         // measured  17 (22 major arcana)
  layerAngelNumbers: 2,  // measured   4 (a signal detector — usually silent)
};

const distinct = {};
for (const name of Object.keys(LAYER_FLOORS)) distinct[name] = new Set();
let datesTested = 0;
for (let y = 2024; y <= 2026; y++) {
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 28; d += 3) {
      setDate(sb, y, m, d);
      datesTested++;
      for (const name of Object.keys(LAYER_FLOORS)) {
        try {
          const r = sb[name]('9PM');
          distinct[name].add(JSON.stringify(r.nums ?? r.allNums ?? []));
        } catch (e) {
          distinct[name].add('THREW:' + e.message);
        }
      }
    }
  }
}
for (const [name, floor] of Object.entries(LAYER_FLOORS)) {
  const n = distinct[name].size;
  check(`${name} varies (${n} distinct over ${datesTested} dates, floor ${floor})`,
        n >= floor, `only ${n}`);
}
check('no layer is frozen to a single constant',
      Object.values(distinct).every((s) => s.size > 1),
      Object.entries(distinct).filter(([, s]) => s.size <= 1).map(([k]) => k).join(', '));

// ── 2. layerStats implements the blend it documents ──────────────────────
// The scoring rebuild states an explicit 0.65 recency / 0.35 overdue split,
// replacing a formula that paid a number twice for the same 30-draw property
// (freq30*4 AND a +6 "hot" bonus, where "hot" WAS the freq30 top-6). The
// stated weights are only meaningful if the code actually uses them, and
// nothing checked that. Recomputing the blend from the layer's own published
// recZ/gapZ must reproduce its numScore exactly.
console.log('\n2. layerStats scoring matches its stated formula');
{
  const st = sb.layerStats('658', '9PM');
  const max = sb.GAMES['658'].max;

  check('reports the documented weights (0.65 / 0.35, half-life 15)',
        st.wRecency === 0.65 && st.wOverdue === 0.35 && st.halfLife === 15,
        `got ${st.wRecency}/${st.wOverdue}, half-life ${st.halfLife}`);

  const blend = {};
  for (let n = 1; n <= max; n++) blend[n] = st.wRecency * st.recZ[n] + st.wOverdue * st.gapZ[n];
  const vals = Object.values(blend);
  const mn = Math.min(...vals), span = (Math.max(...vals) - mn) || 1;
  let worst = 0;
  for (let n = 1; n <= max; n++) {
    worst = Math.max(worst, Math.abs((blend[n] - mn) / span * 38 - st.numScore[n]));
  }
  check('numScore is exactly the stated blend, rescaled to 0..38',
        worst < 1e-9, `max deviation ${worst}`);

  // The two signals must be genuinely different measurements. If a future
  // edit collapses them (the original double-count), this catches it.
  let same = 0;
  for (let n = 1; n <= max; n++) if (Math.abs(st.recZ[n] - st.gapZ[n]) < 1e-9) same++;
  check('recency and overdue are distinct signals, not one counted twice',
        same < max / 2, `${same}/${max} numbers have identical values`);
}

// ── 3. No digit-family size bias on fair data ────────────────────────────
// The real bug: family weights were SUMMED, but digital-root families are
// unequal in size (7 members vs 6 in 6/58), so digits 1-4 carried a
// structural +17%..+25% head start before any draw data was read. The fix
// averages instead. Fed perfectly fair draws, no family should lead.
//
// Threshold check: replaying the OLD summed formula on this same fair data
// produces a gap around 15 points; the current averaged one sits near 1.
// A limit of 6 separates them without tripping on random noise.
console.log('\n3. No digit-family bias when the data is fair');
{
  const game = sb.GAMES['658'];
  const original = game.recent;
  const TRIALS = 40;
  let lowTotal = 0, highTotal = 0;
  try {
    for (let t = 0; t < TRIALS; t++) {
      game.recent = fairDraws(game.max, 6, 400);
      const st = sb.layerStats('658', '9PM');
      let low = 0, high = 0;
      for (let d = 1; d <= 4; d++) low += st.digitWeight[d];   // the 7-member families
      for (let d = 5; d <= 9; d++) high += st.digitWeight[d];  // the 6-member families
      lowTotal += low / 4;
      highTotal += high / 5;
    }
  } finally {
    game.recent = original;
  }
  const gap = (lowTotal - highTotal) / TRIALS;
  check(`families 1-4 don't outscore 5-9 on fair data (gap ${gap.toFixed(2)}, limit 6)`,
        Math.abs(gap) < 6, `gap ${gap.toFixed(2)}`);
  check('history was restored after the fair-data swap',
        sb.GAMES['658'].recent === original);
}

// ── 4. computeOracleAsOf is deterministic ────────────────────────────────
// oracle-history.json is a permanent record and snapshot_oracle.mjs can be
// re-run with FORCE_OVERWRITE=1. If any layer picked up a random source or
// read the wall clock, the same date would log two different picks and the
// log would quietly stop meaning anything.
console.log('\n4. computeOracleAsOf is repeatable');
{
  const DATE = '2026-06-15';
  let stable = true, differing = '';
  for (const gk of ['642', '645', '649', '655', '658']) {
    const a = JSON.stringify(sb.computeOracleAsOf(gk, DATE));
    const b = JSON.stringify(sb.computeOracleAsOf(gk, DATE));
    if (a !== b) { stable = false; differing = `${gk}: ${a} vs ${b}`; }
  }
  check('same game + same date gives the same pick every time', stable, differing);
}

// ── 5. computeOracleAsOf leaves no trace ─────────────────────────────────
// It rewrites the module-level date globals and swaps GAMES[key].recent/.hot
// to rebuild a past state, restoring both in a finally block. If a future
// edit breaks that restore, the LIVE tab silently starts computing against
// whatever date was last looked up — a bug with no visible symptom.
console.log('\n5. computeOracleAsOf restores global state');
{
  setDate(sb, 2026, 8, 15);
  const before = { D: sb._D, M: sb._M, Y: sb._Y, DOW: sb._DOW };
  const recentBefore = sb.GAMES['658'].recent;
  const hotBefore = sb.GAMES['658'].hot;

  sb.computeOracleAsOf('658', '2025-01-20');

  check('date globals unchanged',
        sb._D === before.D && sb._M === before.M && sb._Y === before.Y && sb._DOW === before.DOW,
        `${before.Y}-${before.M}-${before.D} became ${sb._Y}-${sb._M}-${sb._D}`);
  check('GAMES.recent restored', sb.GAMES['658'].recent === recentBefore);
  check('GAMES.hot restored', sb.GAMES['658'].hot === hotBefore);
}

// ── 6. Engine freeze: same-day draws can never leak into a pick ──────────
// The whole point of logging through computeOracleAsOf is that a pick for a
// date cannot contain that date's own results — the snapshot job runs at
// 00:05 Manila, but a late run or a scrape landing first must not change the
// answer. The code asserts this ("by construction") and nothing verified it.
// Here the same date is computed twice: once against real history, once
// against history with a fabricated draw added ON that date. The pick must
// not move.
console.log('\n6. Same-day and future draws cannot change a pick');
{
  const DATE = '2026-05-10';
  const doctored = JSON.parse(historyText);
  const planted = { '6/58': [7, 14, 21, 28, 35, 42], '6/55': [3, 9, 18, 27, 36, 45],
                    '6/49': [5, 11, 17, 23, 29, 41], '6/45': [2, 8, 16, 24, 32, 40],
                    '6/42': [4, 10, 19, 26, 33, 38] };
  for (const [slash, nums] of Object.entries(planted)) {
    if (!Array.isArray(doctored[slash])) continue;
    // Drop any real entry on that date, then plant an obviously distinctive one.
    doctored[slash] = doctored[slash].filter((e) => e.date !== DATE);
    const at = doctored[slash].findIndex((e) => e.date < DATE);
    doctored[slash].splice(at < 0 ? doctored[slash].length : at, 0,
                           { date: DATE, nums, jackpot: 1, winners: 0 });
  }
  // EZ2 is filtered by a SEPARATE branch of computeOracleAsOf from the
  // 6-ball games, so it needs its own planted draw and its own assertion —
  // testing only the 6-ball games leaves that branch completely uncovered.
  if (Array.isArray(doctored.ez2)) {
    doctored.ez2 = doctored.ez2.filter((e) => e.date !== DATE);
    const at = doctored.ez2.findIndex((e) => e.date < DATE);
    doctored.ez2.splice(at < 0 ? doctored.ez2.length : at, 0,
                        { date: DATE, draws: { '2PM': [11, 22], '5PM': [13, 26], '9PM': [17, 29] },
                          jackpot: 4000, winners: 0 });
  }

  const sbDoctored = await loadEngine(JSON.stringify(doctored));

  let frozen = true, moved = '';
  for (const gk of ['642', '645', '649', '655', '658', 'ez2']) {
    const clean = JSON.stringify(sb.computeOracleAsOf(gk, DATE));
    const dirty = JSON.stringify(sbDoctored.computeOracleAsOf(gk, DATE));
    if (clean !== dirty) { frozen = false; moved += `${gk}: ${clean} -> ${dirty}  `; }
  }
  check('planting a draw dated the same day does not move the pick', frozen, moved);

  // And the planted draw really is in the doctored engine's history — proving
  // the test would have detected a leak rather than passing on a no-op.
  const seen6 = (sbDoctored.PCSO_HISTORY['658'] || []).some((e) => e.date === DATE);
  const seenEz2 = (sbDoctored.PCSO_HISTORY.ez2 || []).some((e) => e.date === DATE);
  check('the doctored history really contains both planted draws', seen6 && seenEz2,
        `6-ball ${seen6}, ez2 ${seenEz2} — this test proves nothing without them`);
}

console.log('\n' + '='.repeat(62));
console.log(failures.length
  ? `${failures.length} failure(s): ${failures.join(', ')}`
  : '0 failures — every guarantee holds');
process.exit(failures.length ? 1 : 0);
