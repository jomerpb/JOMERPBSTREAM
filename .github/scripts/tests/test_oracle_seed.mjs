/**
 * Contract tests for the SEEDED engine — "Next Draw From Last Result".
 *
 * This panel is the only one whose numbers are cast from a DRAW rather than a
 * date, so it has a different set of promises to keep from the two panels
 * above it. Per CLAUDE.md none of these is about hit rate: every assertion is a
 * shape, a bound, a documented rule, or the classical casting method itself.
 *
 * The two that matter most:
 *   - test 8 pins the REFUSAL. A reading cannot exist before its seed does, and
 *     a panel that quietly invented one would be the whole feature going wrong.
 *   - test 9 pins STABILITY. A seeded pick is cast from a draw that already
 *     happened, so later draws landing must never move it.
 *
 *   node .github/scripts/tests/test_oracle_seed.mjs
 *
 * Exits non-zero if any contract is violated. No network, writes nothing, and
 * never touches oracle-history.json or pcso-history.json.
 */
import fs from 'fs';
import { loadEngine, loadEngineFromRepo, makeChecker, ymd, PCSO_HISTORY } from './lib/load_oracle.mjs';

const { check, failures } = makeChecker();
const sb = await loadEngineFromRepo();
const RAW = JSON.parse(fs.readFileSync(PCSO_HISTORY, 'utf8'));

const SIX_BALL = ['642', '645', '649', '655', '658'];
const POOL = { '642': 42, '645': 45, '649': 49, '655': 55, '658': 58, ez2: 31 };
const FILE_KEY = { '642': '6/42', '645': '6/45', '649': '6/49', '655': '6/55', '658': '6/58', ez2: 'ez2' };
const EZ2_SLOTS = ['2PM', '5PM', '9PM'];

// Every recorded 6-ball draw, oldest first, as {gk, date, nums} — the corpus
// most tests below sweep.
function allSixBallDraws() {
  const out = [];
  for (const gk of SIX_BALL) {
    const rows = (RAW[FILE_KEY[gk]] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const r of rows) if (Array.isArray(r.nums) && r.nums.length === 6) out.push({ gk, date: r.date, nums: r.nums });
  }
  return out;
}

// ── 1. 報數起卦 casts exactly as the classical method prescribes ──────────
// "Split the reported numbers into two equal groups; one group's SUM gives the
// upper trigram, the other's the lower; the total mod 6 gives the moving line."
// Pinned to a worked example so a future edit cannot silently re-cast it:
// 6/58 on 2026-09-11 drew 9,3,22,2,26,34 (sum 96).
//   upper = (9+3+22) mod 8 = 34 mod 8 = 2 → Dui  ☱
//   lower = (2+26+34) mod 8 = 62 mod 8 = 6 → Kan ☵
//   moving = 96 mod 6 = 0 → 6
//   Dui over Kan = hexagram 47, 澤水困 Kùn.
console.log('\n1. Mei Hua 報數起卦 casts by the book');
{
  const c = sb.oracleSeedCast([9, 3, 22, 2, 26, 34]);
  check('the worked example casts at all', !!c);
  check(`draw total is 96 (got ${c && c.sum})`, c.sum === 96);
  check(`upper trigram is 2 Dui (got ${c && c.upper})`, c.upper === 2);
  check(`lower trigram is 6 Kan (got ${c && c.lower})`, c.lower === 6);
  check(`moving line is 6 (got ${c && c.moving})`, c.moving === 6);
  check(`hexagram is 47 (got ${c && c.hexNum})`, c.hexNum === 47);
  // A two-number report splits 1/1 — the EZ2 case, and the classical one.
  const e = sb.oracleSeedCast([15, 30]);
  check(`a two-number report splits 1/1 (got ${e.upper}/${e.lower})`, e.upper === (15 % 8 || 8) && e.lower === (30 % 8 || 8));
}

// ── 2. draw ORDER is load-bearing ────────────────────────────────────────
// pcso-history.json stores the numbers unsorted because that is the order they
// came out in, and 報數起卦 reads the two halves in that order. Sorting first
// would cast a different hexagram, silently. This proves the input is really
// being read in order rather than incidentally.
console.log('\n2. The cast reads draw order, not a sorted set');
{
  let differ = 0, total = 0;
  for (const d of allSixBallDraws()) {
    const asDrawn = sb.oracleSeedCast(d.nums);
    const sorted = sb.oracleSeedCast(d.nums.slice().sort((a, b) => a - b));
    total++;
    if (asDrawn.hexNum !== sorted.hexNum) differ++;
  }
  check(`swept a real corpus (${total} draws)`, total > 500);
  check(`sorting the draw changes the hexagram on most draws (${differ}/${total}, ${(differ / total * 100).toFixed(1)}%)`, differ / total > 0.5);
}

// ── 3. the cast refuses what it cannot read ──────────────────────────────
console.log('\n3. Unreadable input returns null rather than a guess');
{
  for (const bad of [null, undefined, [], [7], ['x', 'y'], [NaN, 5]]) {
    check(`oracleSeedCast(${JSON.stringify(bad)}) is null`, sb.oracleSeedCast(bad) === null);
  }
}

// ── 4. Angel does not manufacture a hit ──────────────────────────────────
// layerAngelNumbers() contributes nothing on a date with no repeating run, and
// its seeded twin holds the same line: only an 11/22/33/44/55 actually drawn
// counts. A layer that always finds something is a layer that says nothing.
console.log('\n4. The Angel source stays empty when nothing repeating was drawn');
{
  check('no repeating-digit number → no digits', sb.oracleSeedCast([1, 2, 3, 4, 5, 6]).an.length === 0);
  const withIt = sb.oracleSeedCast([22, 3, 4, 5, 6, 7]);
  check(`22 drawn → digit 2 (got ${JSON.stringify(withIt.an)})`, withIt.an.length === 1 && withIt.an[0] === 2);
  const two = sb.oracleSeedCast([22, 33, 4, 5, 6, 7]);
  check(`22 and 33 → two digits (got ${JSON.stringify(two.an)})`, two.an.length === 2);
}

// ── 5. Lo Shu votes for what the draw DID, never for what it missed ──────
// The "dark" palaces are displayed, so it would be an easy edit to start
// scoring them. That is the hot/overdue contradiction the stats engine was
// removed for, and this pins it shut.
console.log('\n5. Only lit Lo Shu palaces vote');
{
  let bad = 0;
  for (const d of allSixBallDraws().slice(0, 400)) {
    const c = sb.oracleSeedCast(d.nums);
    if (c.lit.some((x) => c.dark.includes(x))) bad++;
    if (c.lit.length + c.dark.length !== 9) bad++;
    if (c.sources.Ls.some((x) => c.dark.includes(x))) bad++;
  }
  check(`lit and dark partition 1..9 and only lit is voted (${bad} violations)`, bad === 0);
}

// ── 6. pick shape and pool bounds ────────────────────────────────────────
console.log('\n6. Seeded pick shape and pool bounds');
{
  const bad = [];
  let n = 0;
  for (const d of allSixBallDraws()) {
    const c = sb.oracleSeedCast(d.nums);
    const r = sb.oracleSeedPick(c, d.gk, 6);
    n++;
    const p = r.picks;
    if (!Array.isArray(p) || p.length !== 6 || new Set(p).size !== 6
        || p.some((x) => !Number.isInteger(x) || x < 1 || x > POOL[d.gk])) {
      bad.push(`${d.gk} ${d.date} ${JSON.stringify(p)}`);
    }
    // family cap: at most two per digit family for a 6-ball game
    const cnt = {};
    for (const x of p) { const dg = sb.digitOf(x); cnt[dg] = (cnt[dg] || 0) + 1; }
    if (Object.values(cnt).some((v) => v > 2)) bad.push(`${d.gk} ${d.date} family cap ${JSON.stringify(cnt)}`);
  }
  check(`swept ${n} seeded picks`, n > 500);
  check(`every pick is 6 distinct in-pool numbers, max 2 per family${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`, bad.length === 0);
}

// ── 7. the previous scheduled draw is read off PCSO_GAME_SCHED ───────────
console.log('\n7. oracleSeedPrevDrawDate agrees with the game schedule');
{
  let bad = 0, n = 0;
  for (const gk of Object.keys(POOL)) {
    for (let i = 0; i < 120; i++) {
      const ds = ymd(new Date(Date.UTC(2026, 0, 1) + i * 86400000));
      if (!sb.oracleGamesOnDate(ds).includes(gk)) continue;
      const prev = sb.oracleSeedPrevDrawDate(gk, ds);
      n++;
      if (!prev || prev >= ds) { bad++; continue; }
      if (!sb.oracleGamesOnDate(prev).includes(gk)) bad++;
      // nothing scheduled strictly between prev and ds
      for (let t = 1; ; t++) {
        const mid = ymd(new Date(Date.parse(prev + 'T00:00:00Z') + t * 86400000));
        if (mid >= ds) break;
        if (sb.oracleGamesOnDate(mid).includes(gk)) { bad++; break; }
      }
    }
  }
  check(`checked ${n} game-dates`, n > 300);
  check(`the seed date is always the immediately preceding scheduled draw (${bad} violations)`, bad === 0);
}

// ── 8. THE REFUSAL — no seed, no reading ─────────────────────────────────
// The panel's defining behaviour. A date whose preceding draw has not been
// recorded must come back ok:false naming what it is waiting for, never a set
// of numbers. Built by asking for a date far enough ahead that no seed can
// possibly exist.
console.log('\n8. A reading that has no seed refuses instead of inventing one');
{
  const today = sb.oraclePickTodayStr();
  const far = ymd(new Date(Date.parse(today + 'T00:00:00Z') + 30 * 86400000));
  let refused = 0, produced = 0;
  for (const gk of sb.oracleGamesOnDate(far)) {
    const r = sb.oracleSeedCompute(gk, far);
    if (r && r.ok === false && r.reason === 'pending' && r.waitingFor) refused++;
    else produced++;
  }
  check(`a date 30 days out refuses (${refused} refused)`, refused > 0);
  check(`and nothing is produced for it (${produced} produced)`, produced === 0);

  // ...while a date whose seed IS on file produces one, with the seed named.
  const drawsByGame = {};
  for (const d of allSixBallDraws()) (drawsByGame[d.gk] ||= []).push(d);
  let ok = 0, wrongSeed = 0;
  for (const gk of SIX_BALL) {
    const rows = drawsByGame[gk];
    for (const row of rows.slice(-40)) {
      const r = sb.oracleSeedCompute(gk, row.date);
      if (!r || !r.ok) continue;
      ok++;
      if (!(r.seedDate < row.date)) wrongSeed++;
    }
  }
  check(`recorded dates do produce a reading (${ok})`, ok > 100);
  check(`and the seed is always strictly earlier than the date read (${wrongSeed} violations)`, wrongSeed === 0);
}

// ── 9. STABILITY — a seeded pick never moves once it exists ──────────────
// The panel above is history-free so its picks cannot move. This one IS seeded
// from history, so the equivalent promise has to be proved rather than assumed:
// because the seed is a draw that already happened, later draws landing must
// leave the answer alone. Built by loading a SECOND engine whose history is
// truncated right after each seed — i.e. the world as it looked on the day.
console.log('\n9. Later draws landing never move an existing pick');
{
  const cut = '2026-06-30';
  const truncated = {};
  for (const k of Object.keys(RAW)) {
    truncated[k] = Array.isArray(RAW[k]) ? RAW[k].filter((e) => e && e.date && e.date <= cut) : RAW[k];
  }
  const sbOld = await loadEngine(JSON.stringify(truncated));
  let n = 0, moved = 0;
  for (const gk of SIX_BALL) {
    const rows = (truncated[FILE_KEY[gk]] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const row of rows.slice(1)) {
      const a = sbOld.oracleSeedCompute(gk, row.date);
      const b = sb.oracleSeedCompute(gk, row.date);
      if (!a || !a.ok || !b || !b.ok) continue;
      n++;
      if (a.seedDate !== b.seedDate || a.picks.join(',') !== b.picks.join(',')) moved++;
    }
  }
  check(`compared ${n} past readings against the world as it was`, n > 200);
  check(`not one changed when later draws were added (${moved} moved)`, moved === 0);
}

// ── 10. the seeded engine does not touch the history-free one ────────────
// Everything here is additive. computeOracleAsOf() feeds oracle-snapshot.yml
// every night, so a seeded pick leaking into it would corrupt the log.
console.log('\n10. computeOracleAsOf is unaffected by the seeded engine');
{
  // Pinned values, taken from the committed oracle-history.json entry for
  // 2026-09-14 — i.e. what the daily job actually wrote with the old engine.
  const PINNED = {
    '642': [6, 24, 28, 29, 37, 38],
    '645': [1, 2, 6, 11, 24, 28],
    '649': [2, 6, 24, 28, 37, 47],
    '655': [2, 6, 24, 28, 37, 47],
    '658': [2, 6, 24, 28, 37, 56],
  };
  for (const [gk, want] of Object.entries(PINNED)) {
    const got = sb.computeOracleAsOf(gk, '2026-09-14');
    check(`${gk} on 2026-09-14 is still ${want.join('-')} (got ${JSON.stringify(got)})`, JSON.stringify(got) === JSON.stringify(want));
  }
  const ez = sb.computeOracleAsOf('ez2', '2026-09-14');
  check(`ez2 on 2026-09-14 is unchanged (got ${JSON.stringify(ez)})`, JSON.stringify(ez) === JSON.stringify({ '2PM': [11, 28], '5PM': [11, 28], '9PM': [28, 29] }));
}

// ── 11. EZ2 is seeded per draw time, not from a merged six ───────────────
console.log('\n11. EZ2 seeds each draw time from the same time the day before');
{
  const rows = (RAW.ez2 || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const target = rows[rows.length - 1].date;
  const r = sb.oracleSeedCompute('ez2', target);
  check('EZ2 produces a seeded reading', r && r.ok && r.ez2);
  if (r && r.ok) {
    const seed = r.seedEntry;
    let bad = 0;
    for (const slot of EZ2_SLOTS) {
      const want = (seed.draws && seed.draws[slot]) || [];
      const c = r.casts[slot];
      if (!c || JSON.stringify(c.nums) !== JSON.stringify(want)) bad++;
      const p = r.byHour[slot] && r.byHour[slot].picks;
      if (!Array.isArray(p) || p.length !== 2 || new Set(p).size !== 2
          || p.some((x) => x < 1 || x > 31)) bad++;
      // EZ2's family cap is 1
      if (Array.isArray(p) && sb.digitOf(p[0]) === sb.digitOf(p[1])) bad++;
    }
    check(`each slot is cast from its own two numbers and returns two distinct 1..31 picks (${bad} violations)`, bad === 0);
  }
}

// ── 12. every number in every pool stays reachable ───────────────────────
// The same guarantee test 9 in test_oracle_layers.mjs makes for the date
// engine: a rotation or an element table that quietly starves a family would
// make part of the board unpickable. Swept across the real seed corpus.
console.log('\n12. No number is unreachable under the seeded picker');
{
  const seen = {};
  for (const gk of SIX_BALL) seen[gk] = new Set();
  for (const d of allSixBallDraws()) {
    for (const gk of SIX_BALL) {
      const c = sb.oracleSeedCast(d.nums.map((n) => ((n - 1) % POOL[gk]) + 1));
      for (const x of sb.oracleSeedPick(c, gk, 6).picks) seen[gk].add(x);
    }
  }
  for (const gk of SIX_BALL) {
    const missing = [];
    for (let n = 1; n <= POOL[gk]; n++) if (!seen[gk].has(n)) missing.push(n);
    check(`${gk}: all ${POOL[gk]} numbers reachable${missing.length ? ' — missing ' + missing.join(',') : ''}`, missing.length === 0);
  }
}

console.log('\n==============================================================');
if (failures.length) {
  console.error(`${failures.length} failure(s):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('0 failures — the seeded panel keeps its promises');
