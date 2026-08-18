/**
 * Contract tests for everything DOWNSTREAM of the Oracle layers.
 *
 * test_oracle_layers.mjs checks that each layer does what it claims. This file
 * checks what the tab then does with them: the pick's shape and pool bounds,
 * the alignment scorer both surfaces share, the game schedule, the sphere
 * palette mapping, and the jackpot clause's five conditions.
 *
 * Per CLAUDE.md none of this is about hit rate — every assertion here is about
 * a stated contract (a shape, a bound, a documented rule), never about whether
 * a pick matched a draw.
 *
 *   node .github/scripts/tests/test_oracle_pick.mjs
 *
 * Exits non-zero if any contract is violated. No network, writes nothing, and
 * never touches oracle-history.json.
 */
import fs from 'fs';
import path from 'path';
import { loadEngine, loadEngineFromRepo, makeChecker, ymd, ROOT, ORACLE_JS } from './lib/load_oracle.mjs';

const { check, failures } = makeChecker();
const sb = await loadEngineFromRepo();

const SIX_BALL = ['642', '645', '649', '655', '658'];
const POOL = { '642': 42, '645': 45, '649': 49, '655': 55, '658': 58 };
const EZ2_SLOTS = ['2PM', '5PM', '9PM'];

// A fixed calendar window, so the suite reads the same on every run.
const SWEEP_START = Date.UTC(2026, 0, 1);
const SWEEP_DAYS = 300;
function sweepDates(n = SWEEP_DAYS) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(ymd(new Date(SWEEP_START + i * 86400000)));
  return out;
}

// ── 1. the pick's shape and pool bounds ──────────────────────────────────
// The picks land in the UI as spheres and in oracle-history.json as data.
// Nothing asserted that a 6/42 pick stays inside 1..42, that a pick has no
// repeated number, or that EZ2 returns two numbers per slot. Measured 0
// violations when this was written, so the pin is free.
console.log('\n1. Pick shape and pool bounds');
{
  const bad = [];
  let sixCount = 0, ez2Count = 0;
  for (const ds of sweepDates()) {
    for (const gk of sb.oracleGamesOnDate(ds)) {
      if (gk === 'ez2') {
        const r = sb.computeOracleAsOf('ez2', ds);
        for (const slot of EZ2_SLOTS) {
          const a = r && r[slot];
          ez2Count++;
          if (!Array.isArray(a) || a.length !== 2 || new Set(a).size !== 2
              || a.some((n) => !Number.isInteger(n) || n < 1 || n > 31)) {
            bad.push(`${ds} ez2 ${slot} ${JSON.stringify(a)}`);
          }
        }
      } else {
        const p = sb.computeOracleAsOf(gk, ds);
        sixCount++;
        if (!Array.isArray(p) || p.length !== 6 || new Set(p).size !== 6
            || p.some((n) => !Number.isInteger(n) || n < 1 || n > POOL[gk])) {
          bad.push(`${ds} ${gk} ${JSON.stringify(p)}`);
        }
      }
    }
  }
  check(`6-ball picks are 6 distinct numbers in pool (${sixCount} picks)`,
        !bad.some((b) => !b.includes('ez2')), bad.filter((b) => !b.includes('ez2'))[0] || '');
  check(`EZ2 picks are 2 distinct numbers in 1..31 (${ez2Count} slots)`,
        !bad.some((b) => b.includes('ez2')), bad.filter((b) => b.includes('ez2'))[0] || '');
  check('picks are sorted ascending',
        sweepDates(60).every((ds) => SIX_BALL.filter((g) => sb.oracleGamesOnDate(ds).includes(g))
          .every((g) => { const p = sb.computeOracleAsOf(g, ds);
            return p.every((n, i) => i === 0 || p[i - 1] <= n); })));
}

// ── 2. the shape snapshot_oracle.mjs depends on ──────────────────────────
// CLAUDE.md: the return shape (bare array; {'2PM','5PM','9PM'} for EZ2) "is
// what the snapshot script logs, so don't change it". The script throws on a
// wrong shape, which fails the daily job AFTER the fact — this fails first.
console.log('\n2. computeOracleAsOf return shape (snapshot_oracle.mjs contract)');
{
  const six = sb.computeOracleAsOf('658', '2026-08-23');
  check('6-ball returns a bare array of 6', Array.isArray(six) && six.length === 6, JSON.stringify(six));
  const ez = sb.computeOracleAsOf('ez2', '2026-08-23');
  check('EZ2 returns exactly the three draw-hour keys',
        ez && !Array.isArray(ez) && JSON.stringify(Object.keys(ez)) === JSON.stringify(EZ2_SLOTS),
        JSON.stringify(ez && Object.keys(ez)));
  const det = sb.computeOracleAsOf('658', '2026-08-23', { withDetail: true });
  check('withDetail adds picks/sorted/digitScores without changing picks',
        det && JSON.stringify(det.picks) === JSON.stringify(six)
        && Array.isArray(det.sorted) && typeof det.digitScores === 'object');
}

// ── 3. the pick is reproducible across a fresh engine ────────────────────
// The existing suite re-calls the same loaded instance. This reloads oracle.js
// from scratch: a pick that depends on load-time state rather than the date
// alone survives the first check and fails this one.
console.log('\n3. Reproducible across a separate engine load');
{
  const sb2 = await loadEngineFromRepo();
  const differing = [];
  for (const ds of sweepDates(40)) {
    for (const gk of sb.oracleGamesOnDate(ds)) {
      const a = JSON.stringify(sb.computeOracleAsOf(gk, ds));
      const b = JSON.stringify(sb2.computeOracleAsOf(gk, ds));
      if (a !== b) differing.push(`${ds} ${gk}: ${a} vs ${b}`);
    }
  }
  check('two independent engine loads agree on every pick', differing.length === 0, differing[0] || '');
}

// ── 4. one scorer, two surfaces ──────────────────────────────────────────
// CLAUDE.md records that these drifted once: the pick panel blended both
// halves while Analyze My Numbers reported the digit half alone, so identical
// numbers read 54% in one place and 67% in the other. The fix was to make both
// call oracleAlignment. Nothing checked that they still do, or that the blend
// is the documented one.
console.log('\n4. oracleAlignment — the shared scorer');
{
  const src = fs.readFileSync(ORACLE_JS, 'utf8');
  const defs = (src.match(/var W_DIGIT\s*=/g) || []).length;
  const calls = (src.match(/oracleAlignment\(/g) || []).length;
  check('the 70/30 weights are defined in exactly one place', defs === 1, `found ${defs}`);
  check('oracleAlignment has its definition plus both call sites', calls >= 3, `found ${calls}`);

  const ds10 = {}; for (let d = 1; d <= 9; d++) ds10[d] = { score: 10 };
  const ds0 = {}; for (let d = 1; d <= 9; d++) ds0[d] = { score: 0 };
  check('all-max digit scores with no meaning reads 100%', sb.oracleAlignment([1,2,3,4,5,6], ds10, {}, 58).pct === 100);
  check('all-zero digit scores reads 0%', sb.oracleAlignment([1,2,3,4,5,6], ds0, {}, 58).pct === 0);
  check('weights are exactly 0.70 / 0.30',
        sb.oracleAlignment([1], ds10, {}, 58).wDigit === 0.70
        && sb.oracleAlignment([1], ds10, {}, 58).wCapture === 0.30);

  // The blend must be reproducible from the breakdown the function itself
  // publishes — that is what stops one surface re-deriving half of it.
  const meaning = { 7: ['x'], 14: ['y'], 21: ['z'] };
  const cases = [[[7,14,21,2,3,4], 58], [[1,2,3,4,5,6], 42], [[7], 49], [[], 55]];
  const wrong = [];
  for (const [nums, pool] of cases) {
    for (const dsc of [ds10, ds0]) {
      const bd = sb.oracleAlignment(nums, dsc, meaning, pool);
      const expect = (bd.capPct === null) ? bd.digitPct
                   : Math.round(bd.wDigit * bd.digitPct + bd.wCapture * bd.capPct);
      if (bd.pct !== expect) wrong.push(`${JSON.stringify(nums)}/${pool}: ${bd.pct} != ${expect}`);
      if (bd.pct < 0 || bd.pct > 100) wrong.push(`${JSON.stringify(nums)}/${pool}: out of range ${bd.pct}`);
    }
  }
  check('pct is the published blend of its own halves, always 0..100', wrong.length === 0, wrong[0] || '');

  // Meaning capture is the per-game half: a number outside the pool cannot be
  // captured, so it must not be counted in the denominator either.
  const bdSmall = sb.oracleAlignment([7], ds10, { 7: ['a'], 50: ['b'] }, 42);
  check('unreachable meaningful numbers are excluded from the pool-sized half',
        bdSmall.reachable.includes(7) && !bdSmall.reachable.includes(50),
        JSON.stringify(bdSmall.reachable));

  // ── the digit half is pool-aware ──
  // It used to be scored against a flat `nums.length * 10`, which made it
  // identical for every 6-ball game on a date (730/730 measured) — the picker
  // takes two from each of the same top three families whatever the pool, so
  // both halves of the fraction were pool-blind. It is now measured against the
  // strongest total the pool actually allows, which differs because digit
  // families are finite and unequal in size.
  {
    const dsFlat = {}; for (let d = 1; d <= 9; d++) dsFlat[d] = { score: d === 1 ? 10 : 1 };
    // Digit family 1 holds 5 numbers in 6/42 but 7 in 6/58, so a six-number set
    // can sit entirely on the day's best digit in 6/58 and cannot in 6/42.
    const small = sb.oracleDigitIdeal(dsFlat, 42, 6);
    const large = sb.oracleDigitIdeal(dsFlat, 58, 6);
    check('the achievable ceiling is lower in a smaller pool', small < large, `${small} vs ${large}`);
    check('the ceiling never exceeds every-number-at-the-best-score',
          large <= 6 * 10 && small <= 6 * 10, `${small} / ${large}`);
    check('an empty request has no ceiling', sb.oracleDigitIdeal(dsFlat, 58, 0) === 0);

    // Same numbers, same reading, different pool must now read differently.
    const a = sb.oracleAlignment([1, 10, 19, 28, 37, 2], dsFlat, {}, 42).digitPct;
    const b = sb.oracleAlignment([1, 10, 19, 28, 37, 2], dsFlat, {}, 58).digitPct;
    check('the same numbers score differently in different pools', a !== b, `6/42 ${a}% vs 6/58 ${b}%`);

    // And it must still be a real fraction of a real ceiling.
    const bd = sb.oracleAlignment([1, 10, 19, 28, 37, 2], dsFlat, {}, 58);
    check('digitPct is the pick total over the pool ceiling',
          bd.digitPct === Math.round(bd.digitTotal / bd.digitIdeal * 100),
          `${bd.digitPct} vs ${bd.digitTotal}/${bd.digitIdeal}`);
  }

  // Across real dates the day's games must no longer all print one number.
  {
    let differ = 0, dates = 0;
    for (const ds of sweepDates(200)) {
      const games = sb.oracleGamesOnDate(ds).filter((g) => g !== 'ez2');
      if (games.length < 2) continue;
      const reading = sb.oracleDateReading(ds, '9PM');
      const mean = (reading && reading.meaning) || {};
      const pcts = games.map((g) => {
        const det = sb.computeOracleAsOf(g, ds, { withDetail: true });
        return sb.oracleAlignment(det.picks, det.digitScores, mean, sb.GAMES[g].max).pct;
      });
      dates++;
      if (new Set(pcts).size > 1) differ++;
    }
    const rate = differ / dates * 100;
    check(`same-day games mostly print different percentages (${differ}/${dates}, ${rate.toFixed(0)}%, floor 50%)`,
          rate >= 50, `${rate.toFixed(0)}%`);
  }

  // The drift was one surface re-deriving the percentage instead of asking for
  // it, so the check that matters is that BOTH named surfaces still call this
  // function inside their own bodies — a value comparison cannot see a
  // re-inlined formula, only the source can.
  const bodyOf = (name) => {
    const at = src.indexOf(`function ${name}(`);
    if (at < 0) return null;
    let depth = 0, i = src.indexOf('{', at);
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) return src.slice(at, j + 1);
    }
    return null;
  };
  for (const surface of ['renderPersonalResults', 'oraclePickGameHTML']) {
    const body = bodyOf(surface);
    check(`${surface} gets its percentage from oracleAlignment`,
          !!body && body.includes('oracleAlignment('), body ? 'does not call it' : 'function not found');
    check(`${surface} does not re-derive the blend itself`,
          !!body && !/W_DIGIT|0\.7\s*\*|\*\s*0\.7/.test(body), 'looks re-inlined');
  }
}

// ── 5. the draw schedule ─────────────────────────────────────────────────
console.log('\n5. Game schedule');
{
  const wrong = [];
  for (const ds of sweepDates()) {
    const [y, m, d] = ds.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const got = sb.oracleGamesOnDate(ds).slice().sort();
    const want = Object.keys(sb.PCSO_GAME_SCHED)
      .filter((k) => sb.PCSO_GAME_SCHED[k].includes(dow)).sort();
    if (JSON.stringify(got) !== JSON.stringify(want)) wrong.push(`${ds}: ${got} vs ${want}`);
  }
  check('every date lists exactly the games PCSO_GAME_SCHED schedules', wrong.length === 0, wrong[0] || '');
  check('EZ2 is scheduled every day', sweepDates().every((ds) => sb.oracleGamesOnDate(ds).includes('ez2')));
  check('a date with no 3-digit parts yields no games',
        JSON.stringify(sb.oracleGamesOnDate('')) === '[]'
        && JSON.stringify(sb.oracleGamesOnDate('nope')) === '[]');

  // The Oracle Pick panel's documented order: 6-ball ascending, EZ2 last. The
  // sort lives in oraclePickRender, so it is reproduced here rather than read.
  const order = (ds) => sb.oracleGamesOnDate(ds).sort((a, b) =>
    a === 'ez2' ? 1 : b === 'ez2' ? -1 : parseInt(a) - parseInt(b));
  const badOrder = sweepDates().filter((ds) => {
    const o = order(ds);
    if (o[o.length - 1] !== 'ez2') return true;
    const six = o.slice(0, -1).map(Number);
    return six.some((n, i) => i > 0 && six[i - 1] > n);
  });
  check('6-ball games sort ascending with EZ2 last', badOrder.length === 0, badOrder[0] || '');
}

// ── 6. sphere colours are game x position ────────────────────────────────
// CLAUDE.md: 6 games x 6 positions = 36 distinct classes, so a colour cannot
// repeat within a line, within a game, or on a day. EZ2 renders three
// two-sphere columns through three calls and passes an offset (0/2/4) —
// without it every column restarted at position 0 and EZ2 showed only two
// colours. That shipped once.
console.log('\n6. Sphere palette mapping');
{
  const all = [];
  for (const g of sb.OSPH_GAMES) for (let i = 0; i < 6; i++) all.push(sb.osphClass(g, i));
  check('6 games x 6 positions produce 36 distinct classes',
        all.length === 36 && new Set(all).size === 36, `${new Set(all).size} distinct`);
  check('every game has six distinct classes of its own',
        sb.OSPH_GAMES.every((g) => new Set([0,1,2,3,4,5].map((i) => sb.osphClass(g, i))).size === 6));

  // Driven through oraclePickBalls the way oraclePickGameHTML drives it — three
  // calls, offset ci*2 — because the bug that shipped was the missing offset at
  // the CALL SITE, not in osphClass. Reading the classes back out of the HTML is
  // what makes this test able to see that.
  const ez2Classes = [];
  for (let ci = 0; ci < 3; ci++) {
    const html = sb.oraclePickBalls([7, 19], {}, {}, ci * 2, 'ez2');
    for (const m of html.matchAll(/class="ball (osph-\d+)/g)) ez2Classes.push(m[1]);
  }
  check('EZ2 renders six spheres across its three columns', ez2Classes.length === 6, ez2Classes.join(' '));
  check('EZ2 offsets 0/2/4 give six distinct spheres, not two',
        new Set(ez2Classes).size === 6, ez2Classes.join(' '));

  const sixHtml = sb.oraclePickBalls([1, 2, 3, 4, 5, 6], {}, {}, 0, '658');
  const sixClasses = [...sixHtml.matchAll(/class="ball (osph-\d+)/g)].map((m) => m[1]);
  check('a 6-ball row renders six distinct spheres',
        sixClasses.length === 6 && new Set(sixClasses).size === 6, sixClasses.join(' '));
  check('two different games never share a sphere class',
        new Set([...ez2Classes, ...sixClasses]).size === 12);

  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const missing = all.filter((c) => !css.includes(`.${c}{`));
  check('every class the engine emits is styled in styles.css', missing.length === 0, missing.join(' '));
}

// ── 7. the jackpot clause's five conditions ──────────────────────────────
// Shown ONLY for a 6-ball draw dated today..+7 with no result on file: never a
// past date, never further out, never a draw already on file, never EZ2. The
// figure rolls over when nobody won, and restarts at the game's reset amount
// when somebody did. Run against a synthetic history pinned to the engine's
// own "today" so the suite does not drift as the real file grows.
console.log('\n7. Jackpot clause conditions');
{
  const today = sb.oraclePickTodayStr();
  const shift = (days) => {
    const [y, m, d] = today.split('-').map(Number);
    return ymd(new Date(Date.UTC(y, m - 1, d) + days * 86400000));
  };
  const mk = (rows) => JSON.stringify({
    updated: today,
    '6/58': rows, '6/55': [], '6/49': [], '6/45': [], '6/42': [],
    ez2: [{ date: shift(-2), draws: { '2PM': [1,2], '5PM': [3,4], '9PM': [5,6] }, jackpot: 4000, winners: 1 }],
  });

  // Nobody won the previous draw -> that jackpot rolls over.
  const rollover = await loadEngine(mk([
    { date: shift(-2), nums: [1,2,3,4,5,6], jackpot: 100000000, winners: 0 },
  ]));
  const line = rollover.oraclePickJackpotHTML('658', shift(2));
  check('in-window draw with no winner last time shows the rollover',
        line.includes('rolls over') && line.includes('₱100.0M'), line);
  check('the amount is wrapped in .opick-amt', line.includes('class="opick-amt"'), line);
  check('EZ2 never gets a jackpot clause', rollover.oraclePickJackpotHTML('ez2', shift(2)) === '');
  // EZ2 is protected twice over and only one of the two is visible from
  // outside: loadPcsoHistoryIntoGames builds EZ2 lookup entries as {date,draws}
  // with no jackpot at all, so the clause would bail on the missing amount even
  // if the gameKey guard went. Pin the loader's shape, then put a jackpot on an
  // EZ2 entry so the guard itself is the only thing left holding the line.
  check('the loader gives EZ2 entries no jackpot field',
        (rollover.PCSO_HISTORY.ez2 || []).every((e) => e.jackpot === undefined),
        JSON.stringify((rollover.PCSO_HISTORY.ez2 || [])[0]));
  {
    const ez2Entries = rollover.PCSO_HISTORY.ez2 || [];
    const restore = ez2Entries.map((e) => e.jackpot);
    ez2Entries.forEach((e) => { e.jackpot = 4000; e.winners = 0; });
    check('even with a jackpot on file, EZ2 still gets no clause',
          rollover.oraclePickJackpotHTML('ez2', shift(2)) === '',
          rollover.oraclePickJackpotHTML('ez2', shift(2)));
    ez2Entries.forEach((e, i) => { e.jackpot = restore[i]; delete e.winners; });
  }
  check('a past date is never estimated', rollover.oraclePickJackpotHTML('658', shift(-1)) === '');
  // The horizon is asserted as the documented 7 days rather than read back out
  // of the engine — reading the constant would make the test agree with any
  // value the constant happened to hold.
  check('the documented horizon is 7 days', rollover.ORACLE_PICK_JACKPOT_DAYS === 7,
        String(rollover.ORACLE_PICK_JACKPOT_DAYS));
  check('day 7 is still estimated', rollover.oraclePickJackpotHTML('658', shift(7)) !== '');
  check('day 8 is not estimated', rollover.oraclePickJackpotHTML('658', shift(8)) === '');
  check('a month out is not estimated', rollover.oraclePickJackpotHTML('658', shift(30)) === '');
  check('today counts as in-window', rollover.oraclePickJackpotHTML('658', today) !== '');

  // A draw already on file shows its confirmed figure in Look Up Result.
  const onFile = await loadEngine(mk([
    { date: shift(2), nums: [1,2,3,4,5,6], jackpot: 120000000, winners: 0 },
    { date: shift(-2), nums: [7,8,9,10,11,12], jackpot: 100000000, winners: 0 },
  ]));
  check('a draw already on file gets no estimate', onFile.oraclePickJackpotHTML('658', shift(2)) === '');

  // Somebody won -> the next draw restarts at the reset amount, which is read
  // out of the data (the jackpot of the first draw after a won one).
  // Fixture built so the three candidate answers are all different numbers:
  // the LATEST reset is ₱90M (the draw after the second win), the FIRST reset
  // is ₱60M, and the historical MINIMUM is also ₱60M. Only correct code says
  // 90 — CLAUDE.md's point that the minimum is the wrong number.
  const won = await loadEngine(mk([
    { date: shift(-2),  nums: [1,2,3,4,5,6],      jackpot: 150000000, winners: 1 },
    { date: shift(-4),  nums: [7,8,9,10,11,12],   jackpot:  90000000, winners: 0 },
    { date: shift(-6),  nums: [13,14,15,16,17,18], jackpot: 200000000, winners: 1 },
    { date: shift(-8),  nums: [19,20,21,22,23,24], jackpot:  60000000, winners: 0 },
    { date: shift(-10), nums: [25,26,27,28,29,30], jackpot: 300000000, winners: 1 },
  ]));
  const wonLine = won.oraclePickJackpotHTML('658', shift(1));
  check('after a win the clause restarts rather than rolling over',
        wonLine.includes('restarts at') && !wonLine.includes('rolls over'), wonLine);
  check('it restarts at the LATEST reset, not the first and not the minimum',
        wonLine.includes('₱90.0M'), wonLine);
  check('pcsoHistResetJackpot returns the latest reset (90M, not 60M)',
        won.pcsoHistResetJackpot('658', shift(1)) === 90000000,
        String(won.pcsoHistResetJackpot('658', shift(1))));

  // No usable previous draw -> say nothing rather than guess.
  const empty = await loadEngine(mk([]));
  check('no previous draw on file means no clause', empty.oraclePickJackpotHTML('658', shift(1)) === '');
}

// ── 8. same-day games stay visually distinct ─────────────────────────────
// The offset composition (star + d) * pool was chosen because it kept two
// games on the same day from printing the same six numbers — a presentation
// property, never a hit-rate one. It was measured over 120 dates. Over a
// five-year window the rate is small but NOT zero, so this bounds it instead
// of asserting a zero that does not hold: a change that makes same-day games
// collide often is a real regression, and this is what would catch it.
console.log('\n8. Same-day games rarely print identical picks');
{
  let collisions = 0, dates = 0;
  for (let t = Date.UTC(2024, 0, 1); t <= Date.UTC(2028, 11, 31); t += 86400000) {
    const ds = ymd(new Date(t));
    const games = sb.oracleGamesOnDate(ds).filter((g) => g !== 'ez2');
    if (games.length < 2) continue;
    dates++;
    const seen = new Set();
    for (const g of games) {
      const k = JSON.stringify(sb.computeOracleAsOf(g, ds));
      if (seen.has(k)) { collisions++; break; }
      seen.add(k);
    }
  }
  const pct = collisions / dates * 100;
  check(`same-day collisions stay rare (${collisions}/${dates} dates, ${pct.toFixed(2)}%, limit 3%)`,
        pct <= 3, `${pct.toFixed(2)}%`);
}

console.log('\n' + '='.repeat(62));
console.log(failures.length
  ? `${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`
  : '0 failures — every contract holds');
process.exit(failures.length ? 1 : 0);
