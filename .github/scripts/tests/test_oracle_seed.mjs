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

// ── 8b. a malformed date refuses rather than string-comparing its way in ──
// The seed lookup compares dates as strings, so '2026-09-13' < 'not-a-date' is
// true and a garbage value would come back with the newest draw on file.
console.log('\n8b. A malformed date refuses');
{
  for (const bad of ['not-a-date', '', null, undefined, '2026-9-1', '20260914']) {
    const r = sb.oracleSeedCompute('658', bad);
    check(`oracleSeedCompute('658', ${JSON.stringify(bad)}) refuses`, !!r && r.ok === false && r.reason === 'baddate');
  }
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
  // Pinned values for 2026-09-14. They were first taken from the committed
  // oracle-history.json entry the daily job wrote; the Ascendant fix
  // (astroAscendant used to return the Descendant — test 13 in
  // test_oracle_layers.mjs) moved Horary and Part of Fortune and so re-pinned
  // them on 2026-09-24. Proven to be that fix alone: with only the +180° undone
  // and every seeded-engine change still in place, the OLD pins pass exactly.
  const PINNED = {
    '642': [9, 18, 28, 29, 37, 38],
    '645': [1, 2, 9, 11, 18, 28],
    '649': [2, 18, 27, 28, 37, 47],
    '655': [2, 28, 37, 45, 47, 54],
    '658': [2, 28, 37, 45, 54, 56],
  };
  for (const [gk, want] of Object.entries(PINNED)) {
    const got = sb.computeOracleAsOf(gk, '2026-09-14');
    check(`${gk} on 2026-09-14 is still ${want.join('-')} (got ${JSON.stringify(got)})`, JSON.stringify(got) === JSON.stringify(want));
  }
  const ez = sb.computeOracleAsOf('ez2', '2026-09-14');
  check(`ez2 on 2026-09-14 is unchanged (got ${JSON.stringify(ez)})`, JSON.stringify(ez) === JSON.stringify({ '2PM': [11, 28], '5PM': [7, 11], '9PM': [28, 29] }));
  // The seeded engine now borrows the date globals to cast the draw's moment
  // and the birth chart. Running it in between must leave the date engine's
  // answer — and the globals the page renders from — exactly as they were.
  const g0 = [sb._D, sb._M, sb._Y, sb._DOW].join();
  const before = JSON.stringify(sb.computeOracleAsOf('658', '2026-09-14'));
  sb.oracleSeedCompute('658', '2026-09-16');
  sb.oracleSeedDateSources('2031-01-01', '2PM');
  const after = JSON.stringify(sb.computeOracleAsOf('658', '2026-09-14'));
  check('a seeded cast in between does not move computeOracleAsOf', before === after, `${before} vs ${after}`);
  check('and it leaves the page date globals as it found them', [sb._D, sb._M, sb._Y, sb._DOW].join() === g0);
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
  // And with all eleven sources live — the six moment-cast ones narrow toward
  // the birth chart's digits, which starves the digit-6 family (it is in none
  // of the six birth casts). Starved is disclosed; unreachable would be a bug.
  const seen11 = {};
  for (const gk of SIX_BALL) seen11[gk] = new Set();
  for (const d of allSixBallDraws()) {
    const ds = sb.oracleSeedDateSources(d.date, '9PM').sources;
    for (const gk of SIX_BALL) {
      const c = sb.oracleSeedCast(d.nums.map((n) => ((n - 1) % POOL[gk]) + 1));
      for (const x of sb.oracleSeedPick(c, gk, 6, ds).picks) seen11[gk].add(x);
    }
  }
  for (const gk of SIX_BALL) {
    const missing = [];
    for (let n = 1; n <= POOL[gk]; n++) if (!seen11[gk].has(n)) missing.push(n);
    check(`${gk}: all ${POOL[gk]} numbers reachable with all 11 sources${missing.length ? ' — missing ' + missing.join(',') : ''}`, missing.length === 0);
  }
}

// ── 13. Look Up reads the SEEDED engine, and only seeded log entries ─────
// The regression this pins: after the date panel was retired, Look Up still
// rendered oracle-history.json verbatim — the history-free engine's numbers —
// under the same "Oracle's Pick" label the seeded card uses. Measured on
// 2026-09-15 the two shared 0 of 6 numbers for 6/42.
console.log('\n13. Look Up reads the seeded engine, and only seeded log entries');
{
  const rows = (RAW['6/58'] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const target = rows[rows.length - 1].date;
  const seeded = sb.oracleSeedCompute('658', target).picks;

  // (a) with no log at all, the lookup returns a live seeded cast
  sb.ORACLE_HISTORY = null;
  let look = sb.oracleHistLookup('658', target);
  check('with no log it returns a live seeded cast',
        !!look && look.source === 'recomputed' && JSON.stringify(look.picks) === JSON.stringify(seeded),
        JSON.stringify(look && look.picks));
  check('and it carries the seed it cast from', !!(look && look.seed && look.seed.seedDate));

  // (b) an UNTAGGED entry (the retired engine's) must be ignored, not shown
  const stale = [9, 9, 9, 9, 9, 9].map((_, i) => i + 1); // obviously not the seeded answer
  sb.ORACLE_HISTORY = { entries: [{ date: target, picks: { '658': stale } }] };
  look = sb.oracleHistLookup('658', target);
  check('an untagged (pre-switch) log entry is NOT displayed',
        !!look && look.source === 'recomputed' && JSON.stringify(look.picks) !== JSON.stringify(stale),
        JSON.stringify(look && look.picks));

  // (c) an entry tagged with the CURRENT engine is preferred, and tagged recorded
  check("the current engine tag is 'seeded-11'", sb.ORACLE_SEED_ENGINE === 'seeded-11', String(sb.ORACLE_SEED_ENGINE));
  sb.ORACLE_HISTORY = { entries: [{ date: target, engine: sb.ORACLE_SEED_ENGINE, picks: { '658': seeded } }] };
  look = sb.oracleHistLookup('658', target);
  check('an entry tagged with the current engine is used and marked recorded',
        !!look && look.source === 'recorded' && JSON.stringify(look.picks) === JSON.stringify(seeded));
  // (c2) the FIVE-source engine's entries (plain 'seeded') are skipped too:
  // their picks are not what the page computes any more, and showing them under
  // "Oracle's Pick" would be the two-engines-one-label bug again.
  sb.ORACLE_HISTORY = { entries: [{ date: target, engine: 'seeded', picks: { '658': stale } }] };
  look = sb.oracleHistLookup('658', target);
  check("a five-source 'seeded' entry is NOT displayed",
        !!look && look.source === 'recomputed' && JSON.stringify(look.picks) === JSON.stringify(seeded),
        JSON.stringify(look && look.picks));
  sb.ORACLE_HISTORY = null;

  // (d) the rendered panel shows the seeded numbers, not the retired engine's
  const html = sb.pcsoHistGameHTML('658', target);
  const freeEngine = sb.computeOracleAsOf('658', target);
  const shown = (html.match(/<span class="pnum pick[^"]*">(\d+)<\/span>/g) || [])
    .map((m) => parseInt(m.replace(/\D/g, ''), 10));
  check('the rendered Look Up row prints the seeded pick',
        JSON.stringify(shown) === JSON.stringify(seeded),
        `${JSON.stringify(shown)} vs seeded ${JSON.stringify(seeded)}`);
  check('and not the history-free pick',
        JSON.stringify(shown) !== JSON.stringify(freeEngine),
        `matches computeOracleAsOf ${JSON.stringify(freeEngine)}`);
  // The seed clause belongs to the seeded card ONLY. Look Up briefly carried it
  // too; the repo owner asked for it removed, so this pins it out rather than in.
  check('the Look Up row does NOT carry the seed clause', !/Cast from/.test(html)
        && !/oseed-from/.test(html), 'seed clause is back in Look Up');
  check('but the seeded card still does',
        /Cast from/.test(sb.oracleSeedGameHTML('658', target)));
}

// ── 14. the init path renders without throwing ───────────────────────────
// Ordering guard. initPcsoHist() renders Look Up during script evaluation, and
// Look Up now reaches into the seeded engine, whose tables are `var`s — hoisted
// but undefined until execution reaches them. With the init hook above those
// declarations the first render threw out of oracleSeedCast on every game, and
// NOTHING headless saw it: the shared stub gives the date input an empty value,
// so pcsoHistRender() returned early. This loads oracle.js with a stub that
// answers like the real page and fails on any console.error.
console.log('\n14. First render at init does not throw');
{
  const vm = await import('node:vm');
  const src = fs.readFileSync(new URL('../../../oracle.js', import.meta.url), 'utf8');
  const histText = fs.readFileSync(PCSO_HISTORY, 'utf8');
  const seen = [];
  const el = (value) => ({
    style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    innerHTML: '', value, textContent: '', min: '', max: '', dataset: {},
    setAttribute(){}, getAttribute: () => null, appendChild(){}, addEventListener(){},
    removeEventListener(){}, scrollIntoView(){}, querySelector: () => el(''),
    querySelectorAll: () => [], options: [], selectedIndex: 0, checked: false, disabled: false,
  });
  // A date the panel really defaults to: yesterday, in the middle of live history.
  const yday = (() => { const d = new Date(Date.now() - 86400000); return ymd(d); })();
  const sandbox = {
    console: { log(){}, warn(){}, error: (...a) => seen.push(a.map(String).join(' ')) },
    AbortController, Intl, Date, Math, JSON, Object, Array, Promise, parseInt, parseFloat,
    String, Number, isNaN, isFinite, Boolean, RegExp, Error, setTimeout, clearTimeout,
    setInterval, clearInterval,
    document: {
      getElementById: (id) => el(/-date$/.test(id) ? yday : ''),
      querySelector: () => el(''), querySelectorAll: () => [],
      addEventListener(){}, createElement: () => el(''),
    },
    window: { addEventListener(){} },
    localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    sessionStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    navigator: { userAgent: 'init-order-test' },
    fetch: async (u) => String(u).includes('oracle-history.json')
      ? { ok: false, status: 404, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => JSON.parse(histText) },
  };
  sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'oracle.js' });
  const thrown = seen.filter((m) => /TypeError|is not defined|Cannot read/.test(m));
  check('no error logged while the page initialises', thrown.length === 0, thrown[0] || '');
  check('the seeded tables are initialised before any render',
        Array.isArray(sandbox.OSEED_TRI_EL) && !!sandbox.OSEED_EL_NUMS);
}

// ── 15. ALL ELEVEN methods vote: five from the numbers, six from the moment ─
// The six date methods (Chaldean, Astrology, BaZi, Part of Fortune, Horary,
// Energy) cannot read six numbers, so they are cast for the target draw's own
// moment AND for the birth chart, and vote only where the two agree. Pins:
// the eleven slots, the birth chart itself, the AND rule, that the rule never
// hands out a permanent vote, and that the birth details never reach the page.
console.log('\n15. All eleven sources vote; the six date methods read draw moment AND birth chart');
{
  const ALL = ['Py', 'Ch', 'As', 'Ba', 'Ls', 'IC', 'PoF', 'Ta', 'An', 'Ho', 'En'];
  check('eleven slots, in convergence() order', JSON.stringify(sb.OSEED_LABELS) === JSON.stringify(ALL),
        JSON.stringify(sb.OSEED_LABELS));
  check('five number-cast + six moment-cast = the eleven',
        JSON.stringify([...sb.OSEED_NUM_LABELS, ...sb.OSEED_DATE_LABELS].sort()) === JSON.stringify(ALL.slice().sort()));

  // The birth chart, checked independently: 1985-02-21 06:10 Manila is 乙丑 year,
  // 戊寅 month (after Lichun, Feb 4), 辛卯 day (a plain 60-day count from the
  // 2000-01-07 甲子 anchor agrees), 辛卯 hour (Mao 05-07, Five Rats from 辛).
  // Sunrise that day was ~06:21, so the Ascendant must sit just before the Sun
  // (Pisces 2°) — late Aquarius — not Leo, which the pre-fix code gave.
  const B = sb.ORACLE_BIRTH;
  sb._D = B.d; sb._M = B.m; sb._Y = B.y; sb._DOW = new Date(B.y, B.m - 1, B.d).getDay();
  const bz = sb.layerBazi(B.hour), as = sb.layerAstrology(B.hour);
  const pillars = [bz.year, bz.month, bz.day, bz.hour].map((p) => p.stem + p.branch).join(' ');
  check(`birth pillars are 乙丑 戊寅 辛卯 辛卯 (got ${pillars})`, pillars === 'Yi乙Chou丑 Wu戊Yin寅 Xin辛Mao卯 Xin辛Mao卯');
  check(`birth Ascendant is Aquarius (got ${as.horaryASC})`, /^Aquarius/.test(as.horaryASC));
  const today = sb.oraclePickTodayStr().split('-').map(Number);
  sb._D = today[2]; sb._M = today[1]; sb._Y = today[0]; sb._DOW = new Date(today[0], today[1] - 1, today[2]).getDay();
  const birth = sb.oracleBirthSources();
  check('birth Chaldean reads the birth weekday and month only (THURSDAY 8, FEBRUARY 9), not the game words',
        JSON.stringify(birth.Ch) === '[8,9]', JSON.stringify(birth.Ch));

  // The AND rule, and no permanent vote, over every recorded draw date.
  const dates = [...new Set(allSixBallDraws().map((d) => d.date))];
  let notSubset = 0, votedAtAll = 0;
  const always = {};
  for (const d of dates) {
    const m = sb.oracleSeedDateSources(d, '9PM');
    for (const k of sb.OSEED_DATE_LABELS) {
      const kept = m.sources[k];
      if (kept.some((x) => !m.draw[k].includes(x) || !birth[k].includes(x))) notSubset++;
      if (kept.length) votedAtAll++;
      const set = new Set(kept);
      always[k] = always[k] ? new Set([...always[k]].filter((x) => set.has(x))) : set;
    }
  }
  check(`every moment-cast vote is named by BOTH the draw moment and the birth chart (${notSubset} violations over ${dates.length} dates)`,
        notSubset === 0 && dates.length > 300);
  const perma = sb.OSEED_DATE_LABELS.filter((k) => always[k].size).map((k) => k + ':' + [...always[k]]);
  check(`no method votes the same digit on every date — no permanent vote (${perma.join(' ') || 'none'})`, perma.length === 0);
  check(`the six methods do vote (${votedAtAll} of ${dates.length * 6} method-dates)`, votedAtAll > dates.length * 6 * 0.5);

  // The pick really uses them: the full eleven changes most picks vs five.
  let changed = 0, n = 0;
  for (const d of allSixBallDraws().slice(-200)) {
    const r = sb.oracleSeedCompute(d.gk, d.date);
    if (!r || !r.ok) continue;
    n++;
    if (sb.oracleSeedPick(r.cast, d.gk, 6).picks.join() !== r.picks.join()) changed++;
  }
  check(`the moment-cast sources reach the pick (${changed}/${n} differ from a five-source pick)`, n > 100 && changed > n * 0.3);

  // What the page prints: "/11", and nothing that identifies the birth chart.
  const rows = (RAW['6/58'] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const target = rows[rows.length - 1].date;
  const r = sb.oracleSeedCompute('658', target);
  const card = sb.oracleSeedGameHTML('658', target) + sb.oracleSeedReadingHTML(r, '658', target);
  check('ball tags and the grid print /11', /·\d+\/11</.test(card) && /\d+\/11 sources/.test(card));
  check('no "/5" left on the card', !/\d\/5[< ]/.test(card));
  const leak = ['1985', 'Feb 21', 'February 21', '06:10', '6:10', 'Aquarius 2', 'Xin辛Mao卯'].filter((t) => card.includes(t));
  check(`the birth date and time are never printed (${leak.join(', ') || 'none found'})`, leak.length === 0);
}

console.log('\n==============================================================');
if (failures.length) {
  console.error(`${failures.length} failure(s):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('0 failures — the seeded panel keeps its promises');
