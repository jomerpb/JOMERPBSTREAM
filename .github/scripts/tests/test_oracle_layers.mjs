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
// Seeded so the suite is deterministic. With Math.random the fair-data test
// below was a coin flip against its own tolerance: measured on unmodified
// main, the family gap wandered from -4.87 to +4.39 against a limit of 6, so
// CI went red at random with nothing wrong. mulberry32 is a standard 32-bit
// PRNG; the seed is arbitrary and only has to be fixed.
let _fairSeed = 0x9e3779b9;
function _fairRandom() {
  _fairSeed = (_fairSeed + 0x6d2b79f5) | 0;
  let t = _fairSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function fairDraws(max, picks, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const draw = [];
    while (draw.length < picks) {
      const n = 1 + Math.floor(_fairRandom() * max);
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

// ── 7. ephemeris epoch ──────────────────────────────────────────────────
// The whole astro engine is quoted from Paul Schlyter, whose day number `d`
// is referred to 2000 Jan 0.0 (JD 2451543.5) — NOT to J2000.0 (JD 2451545.0),
// which is 1.5 days later. astroDayNumber() once subtracted 2451545 while a
// comment called the result "Schlyter's d", running the entire ephemeris
// 1.000 day behind: the Moon ~13.2 deg out, nearly half a zodiac sign.
console.log('\n7. Ephemeris epoch matches Schlyter');
{
  // Schlyter's own published day-number formula, as the independent reference.
  const schlyter = (y, m, D, ut) =>
    367 * y - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4) + Math.floor(275 * m / 9) + D - 730530 + ut / 24;
  let worst = 0;
  for (const [y, m, d] of [[2000, 1, 1], [1999, 12, 31], [2026, 3, 20], [2026, 8, 18], [2030, 6, 1]]) {
    worst = Math.max(worst, Math.abs(sb.astroDayNumber(y, m, d, 8) - schlyter(y, m, d, 0)));
  }
  check("astroDayNumber equals Schlyter's day number", worst < 1e-9, `worst delta ${worst}`);

  // Independent anchor: the March 2026 equinox (Sun at 0 deg) is 2026-03-20
  // 14:46 UT. Schlyter's Sun is good to ~1 arcmin, so allow half a day.
  let lo = sb.astroDayNumber(2026, 3, 15, 8), hi = sb.astroDayNumber(2026, 3, 25, 8);
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (sb.astroSunPos(mid).lonsun > 180) lo = mid; else hi = mid;
  }
  const equinoxJd = (lo + hi) / 2 + 2451543.5;
  const trueJd = 2461120.11528; // 2026-03-20 14:46 UT
  check('March 2026 equinox lands on the right day', Math.abs(equinoxJd - trueJd) < 0.5,
        `off by ${((equinoxJd - trueJd) * 24 * 60).toFixed(0)} min`);
}

// ── 8. Chinese lunar calendar ───────────────────────────────────────────
// layerIChing casts Mei Hua Yi Shu on the LUNAR month and day. Chinese New
// Year is lunar month 1 day 1 by definition, so it pins both the month
// numbering and the leap-month rule at once.
console.log('\n8. Chinese lunar calendar');
{
  const cny = [[2020, 1, 25], [2021, 2, 12], [2022, 2, 1], [2023, 1, 22], [2024, 2, 10],
               [2025, 1, 29], [2026, 2, 17], [2027, 2, 6], [2028, 1, 26], [2033, 1, 31]];
  const bad = cny.filter(([y, m, d]) => {
    const r = sb.chineseLunarDate(y, m, d);
    return !(r.month === 1 && r.day === 1 && !r.leap);
  });
  check('Chinese New Year is lunar month 1 day 1', bad.length === 0,
        bad.map((c) => c.join('-')).join(', '));

  // Leap months, by the "first month of the sui with no zhongqi" rule.
  const leaps = [[2020, 5, 23, 4], [2023, 3, 22, 2], [2025, 7, 25, 6]];
  const badLeap = leaps.filter(([y, m, d, n]) => {
    const r = sb.chineseLunarDate(y, m, d);
    return !(r.leap && r.month === n && r.day === 1);
  });
  check('known leap months are detected and numbered', badLeap.length === 0,
        badLeap.map((c) => c.join('-')).join(', '));

  // Structural invariants across a long span.
  let shape = true, detail = '';
  for (let y = 2018; y <= 2035 && shape; y++) {
    for (let m = 1; m <= 12; m++) {
      const r = sb.chineseLunarDate(y, m, 15);
      if (!(r.month >= 1 && r.month <= 12 && r.day >= 1 && r.day <= 30)) {
        shape = false; detail = `${y}-${m}-15 -> ${JSON.stringify(r)}`; break;
      }
    }
  }
  check('lunar month 1..12 and day 1..30 everywhere 2018-2035', shape, detail);

  // KNOWN LIMIT, asserted so it cannot silently get worse: Schlyter's Moon is
  // ~1-2 arcmin, i.e. new-moon timing good to about +/-26 min. When a new moon
  // falls within ~15 min of local midnight the month start can land on the
  // wrong civil day. Measured against Meeus over 730 lunations (1990-2050):
  // 2 disagreements, 0.3%. 2030-02-03 00:08 CST is one of them.
  const y2030 = sb.chineseLunarDate(2030, 2, 3);
  check('2030 CNY is the documented +/-26 min edge case (day 1 or 2)',
        y2030.month === 1 && (y2030.day === 1 || y2030.day === 2),
        JSON.stringify(y2030));
}

// ── 9. Element -> digit tables use ONE scheme, and reach all nine digits ──
// layerBazi and layerIChing each carried a table that mixed two incompatible
// systems: Water/Fire/Wood from the He Tu 生成數 (1/6, 2/7, 3/8) sitting beside
// Metal [6,7] and Earth [2,5,8], which are Lo Shu PALACE numbers. Nothing in
// either scheme puts 4 or 9 where that mix left them, so both layers were
// structurally incapable of ever naming digit 4 or digit 9 — measured 0% of
// 1096 dates for each — while 6 and 7 were paid by two elements at once.
// Downstream the digit-4 family took 1.7% of all picks against a uniform
// 11.1%, and 31 was never picked in 6/49 across three years of dates.
// A wrong-but-consistent table would still pass a "does it vary" test, so this
// asserts the property that actually failed: full coverage of 1..9.
console.log('\n9. BaZi and I Ching can reach every digit 1-9');
{
  const seenBazi = new Set(), seenIching = new Set();
  const d0 = Date.UTC(2025, 0, 1);
  for (let i = 0; i < 400; i++) {
    const dt = new Date(d0 + i * 86400000);
    setDate(sb, dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    for (const hr of ['2PM', '5PM', '9PM']) {
      sb.layerBazi(hr).nums.forEach((n) => seenBazi.add(n));
      sb.layerIChing(hr).nums.forEach((n) => seenIching.add(n));
    }
  }
  const missingB = [1,2,3,4,5,6,7,8,9].filter((d) => !seenBazi.has(d));
  const missingI = [1,2,3,4,5,6,7,8,9].filter((d) => !seenIching.has(d));
  check('layerBazi emits all nine digits over 400 dates', missingB.length === 0,
        `never emitted: ${missingB.join(', ')}`);
  check('layerIChing emits all nine digits over 400 dates', missingI.length === 0,
        `never emitted: ${missingI.join(', ')}`);

  // And the consequence the user actually sees: no number in any pool may be
  // unreachable. Before the fix, 31 was picked 0 times in 6/49 over 3 years.
  const unreachable = [];
  for (const gk of ['642', '645', '649', '655', '658']) {
    const picked = new Set();
    for (let i = 0; i < 400; i++) {
      const dt = new Date(d0 + i * 86400000);
      const ds = dt.toISOString().slice(0, 10);
      if (sb.oracleGamesOnDate(ds).indexOf(gk) < 0) continue;
      sb.computeOracleAsOf(gk, ds).forEach((n) => picked.add(n));
    }
    for (let n = 1; n <= sb.GAMES[gk].max; n++) if (!picked.has(n)) unreachable.push(`${gk}:${n}`);
  }
  check('no number in any pool is unreachable by the picker', unreachable.length === 0,
        unreachable.join(' '));
}

// ── 10. Flying Star annual number is always a star, 1..9 ─────────────────
// `9-((fsYear-2024)%9)` was guarded only against undershoot. JavaScript's %
// keeps the sign of the dividend, so years before the 2024 anchor overshot the
// TOP of the range and the guard never fired — 2023 gave 10, 2022 gave 11,
// 2020 gave 13. The Oracle Pick picker's min is 2020-01-01, so the page really
// rendered "Annual Flying Star 2022 = #11", and because convergence() only
// scans digits 1..9 the annual star silently vanished from every reading
// before Lichun 2024.
console.log('\n10. Flying Star numbers stay inside 1..9');
{
  const bad = [];
  for (let y = 2018; y <= 2045; y++) {
    for (const m of [1, 3, 6, 9, 12]) {
      setDate(sb, y, m, 15);
      const fs = sb.layerFengshui();
      const nums = [fs.nums, Object.values(fs.loShu)].flat();
      for (const v of nums) if (!(Number.isInteger(v) && v >= 1 && v <= 9)) bad.push(`${y}-${m}:${v}`);
    }
  }
  check('every annual/monthly/palace star is an integer 1..9 across 2018-2045',
        bad.length === 0, bad.slice(0, 8).join(' '));

  // Known anchor points on the descending annual cycle.
  const want = { 2020: 4, 2022: 2, 2023: 1, 2024: 9, 2025: 8, 2026: 7, 2033: 9 };
  const wrong = [];
  for (const y of Object.keys(want)) {
    setDate(sb, Number(y), 6, 15);
    const got = sb.layerFengshui().nums[0]; // annualStar is first in the set
    if (got !== want[y]) wrong.push(`${y} want ${want[y]} got ${got}`);
  }
  check('annual star counts down 2024=9 and wraps both directions',
        wrong.length === 0, wrong.join('; '));
}

// ── 11. reduce() is the digital root, with the old safe fallback ──────────
// Rewritten from a String-split/parseInt walk to the closed form n%9. The two
// must agree on every integer, and the guard matters as much as the formula:
// the string version fell through to 9 for NaN/undefined/floats (parseInt('.')
// -> NaN -> `n||9`), and callers treat the result as a usable digit. A bare
// n%9 would hand them NaN instead and poison every comparison downstream.
console.log('\n11. reduce() digital root');
{
  const slow = (n) => { if (n <= 0) return 9; while (n > 9) n = [...String(n)].reduce((a, b) => a + parseInt(b), 0); return n || 9; };
  let bad = 0, first = '';
  for (let n = -50; n <= 20000; n++) {
    if (sb.reduce(n) !== slow(n)) { bad++; if (!first) first = `n=${n} got ${sb.reduce(n)} want ${slow(n)}`; }
  }
  check('matches the iterative digit-sum on every integer -50..20000', bad === 0, first);
  check('non-numbers still fall back to 9, never NaN',
        sb.reduce(NaN) === 9 && sb.reduce(undefined) === 9 && sb.reduce(12.5) === 9,
        `${sb.reduce(NaN)} / ${sb.reduce(undefined)} / ${sb.reduce(12.5)}`);
}

// ── 12. computeOracleAsOf restores the globals when it THROWS ────────────
// Test 5 covers the happy path. The restore used to be a bare statement after
// the work, so any throw before it — an unknown game key, a missing history
// bucket after a failed fetch — left _D/_M/_Y/_DOW pinned to the looked-up
// date for the rest of the session, and every later render on the page then
// silently computed for the wrong day.
console.log('\n12. computeOracleAsOf restores globals on the error path');
{
  setDate(sb, 2026, 8, 15);
  const before = { D: sb._D, M: sb._M, Y: sb._Y, DOW: sb._DOW };
  let threw = false;
  try { sb.computeOracleAsOf('no-such-game', '2025-01-20'); } catch (e) { threw = true; }
  check('a bad game key still throws (the guard is not swallowing errors)', threw);
  check('date globals restored even though the call threw',
        sb._D === before.D && sb._M === before.M && sb._Y === before.Y && sb._DOW === before.DOW,
        `${before.Y}-${before.M}-${before.D} became ${sb._Y}-${sb._M}-${sb._D}`);
}

console.log('\n' + '='.repeat(62));
console.log(failures.length
  ? `${failures.length} failure(s): ${failures.join(', ')}`
  : '0 failures — every guarantee holds');
process.exit(failures.length ? 1 : 0);
