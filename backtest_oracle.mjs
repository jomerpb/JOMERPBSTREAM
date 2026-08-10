// backtest_oracle.mjs — Oracle tab "Report Card" / simulation engine.
//
// Mirrors backtest_pse_signals.py's walk-forward, no-look-ahead discipline,
// but reuses the SAME oracle.js engine the site runs (loaded via vm, same
// trick as snapshot_oracle.mjs) instead of porting the math to a second
// language — the 12-source convergence logic is too large a surface to
// keep two independent implementations in sync.
//
// For every historical PCSO draw, computeOracleAsOf(gameKey, date) is
// called with ONLY draws strictly before that date visible (the engine's
// own freeze — see oracle.js's ENGINE FREEZE comment), exactly reproducing
// what the site would have shown that day. The resulting picks are graded
// against what actually happened, and compared against two random
// baselines so a reader can see whether the Oracle beats chance:
//
//   1. THEORETICAL — the exact hypergeometric mean/PMF for picking `needed`
//      numbers out of `max` against a `m`-number winning set. Closed form,
//      no simulation error.
//   2. MONTE CARLO — thousands of actual simulated random picks (uniform,
//      without replacement, matching how the Oracle itself always returns
//      distinct numbers) graded against the same real draws. This is the
//      "sim" a reader can cross-check against #1: if they don't agree
//      closely, something in the simulator is broken.
//
// Honest framing baked into the output, not just the UI: lottery draws are
// independent random events, so the only scientifically correct prior is
// that the Oracle's average matches should equal the theoretical baseline.
// This script does not try to make that come out otherwise — it measures
// it and reports the "edge" (oracle avg − theoretical avg), which a
// well-calibrated reader should expect to hover near zero.
//
// READ-ONLY: only reads oracle.js / pcso-history.json, only writes
// oracle-backtest.json. Never touches the scrapers or their outputs.
//
// Lives at repo ROOT alongside oracle.js and pcso-history.json.
// Usage: node backtest_oracle.mjs

import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const ORACLE_JS = path.join(ROOT, 'oracle.js');
const PCSO_HISTORY = path.join(ROOT, 'pcso-history.json');
const OUT = path.join(ROOT, 'oracle-backtest.json');

const GAMES_6BALL = ['642', '645', '649', '655', '658'];
const EZ2_HOURS = ['2PM', '5PM', '9PM'];

// Floor of prior draws needed before a date is graded — early dates have
// too little history for the stats layer (hot/overdue) to mean anything,
// same rationale as backtest_pse_signals.py's MIN_BARS.
const MIN_PRIOR_DRAWS = 15;
// Monte Carlo trials per graded draw. High enough that the simulated mean
// tracks the exact theoretical mean to within a few thousandths — see the
// "mcVsTheoreticalDeltaCheck" field in the output, which exists purely so
// a drifted simulator would be visible instead of silently trusted.
const SIMS_PER_DRAW = 2000;

// ── vm sandbox loader — identical approach to snapshot_oracle.mjs ─────
function stubEl() {
  return {
    style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    innerHTML: '', value: '', textContent: '', min: '', max: '', dataset: {},
    setAttribute(){}, getAttribute: () => null, appendChild(){}, addEventListener(){},
    removeEventListener(){}, scrollIntoView(){}, querySelector: () => stubEl(),
    querySelectorAll: () => [], options: [], selectedIndex: 0, checked: false, disabled: false,
  };
}

function loadOracleEngine(oracleSrc, pcsoHistoryText) {
  const sandbox = {
    console, AbortController, Intl, Date, Math, JSON, Object, Array, Promise,
    parseInt, parseFloat, String, Number, isNaN, Boolean, RegExp, Error,
    setTimeout, clearTimeout, setInterval, clearInterval,
    document: {
      getElementById: () => stubEl(), querySelector: () => stubEl(),
      querySelectorAll: () => [], addEventListener: () => {}, createElement: () => stubEl(),
    },
    window: { addEventListener: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { userAgent: 'node-backtest-script' },
    fetch: async (url) => {
      if (String(url).includes('oracle-history.json')) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => JSON.parse(pcsoHistoryText) };
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(oracleSrc, sandbox, { filename: 'oracle.js' });
  return sandbox;
}

// ── seeded RNG (mulberry32) — deterministic so reruns against an
// unchanged pcso-history.json reproduce identical Monte Carlo output ───
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Uniform random k-subset (distinct, order irrelevant) of [1..n] via
// partial Fisher-Yates — matches the Oracle's own guarantee of returning
// `needed` distinct numbers, so the baseline is apples-to-apples.
function randomKSubset(k, n, rng) {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = i + 1;
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr.slice(0, k);
}

function matchCount(pickArr, actualSet) {
  let n = 0;
  for (const p of pickArr) if (actualSet.has(p)) n++;
  return n;
}

// Exact hypergeometric: choose(K,x)*choose(N-K,n-x)/choose(N,n), computed
// via incremental ratios (not raw factorials) to stay numerically stable
// for N up to 58.
function choose(n, r) {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 0; i < r; i++) result *= (n - i) / (i + 1);
  return result;
}
function hyperPMF(N, K, n, x) {
  return (choose(K, x) * choose(N - K, n - x)) / choose(N, n);
}
function hyperFullDist(N, K, n) {
  const dist = [];
  for (let x = 0; x <= n; x++) dist.push(hyperPMF(N, K, n, x));
  return dist;
}
function distMean(dist) {
  let m = 0;
  for (let x = 0; x < dist.length; x++) m += x * dist[x];
  return m;
}
// Exact hypergeometric variance of match-count for a single draw: picking
// n numbers (no replacement) from a population of N containing K winners.
function hyperVariance(N, K, n) {
  if (N <= 1) return 0;
  return n * (K / N) * ((N - K) / N) * ((N - n) / (N - 1));
}
function countsToDist(counts, total) {
  return counts.map((c) => (total ? c / total : 0));
}

function sortAscByDate(entries) {
  return entries.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function readJsonSafe(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw new Error(`Failed to parse ${filePath}: ${e.message}`); }
}

// ── grading: 6-ball games ──────────────────────────────────────────────
function gradeSixBallGame(sandbox, gameKey) {
  const game = sandbox.GAMES[gameKey];
  const max = game.max;
  const needed = 6;
  const entries = sortAscByDate((sandbox.PCSO_HISTORY[gameKey] || []).filter(
    (e) => e && e.date && Array.isArray(e.nums) && e.nums.length === needed
  ));

  const rng = mulberry32(0xC0FFEE ^ hashStr(gameKey));
  const oracleCounts = new Array(needed + 1).fill(0);
  const mcCounts = new Array(needed + 1).fill(0);
  let nGraded = 0, dateMin = null, dateMax = null, mcTrials = 0;
  let skippedErrors = 0;

  for (let i = MIN_PRIOR_DRAWS; i < entries.length; i++) {
    const entry = entries[i];
    const actualSet = new Set(entry.nums);
    let picks;
    try {
      picks = sandbox.computeOracleAsOf(gameKey, entry.date);
    } catch (e) {
      skippedErrors++;
      continue;
    }
    if (!Array.isArray(picks) || picks.length !== needed) { skippedErrors++; continue; }

    const oracleM = matchCount(picks, actualSet);
    oracleCounts[oracleM]++;
    nGraded++;
    dateMin = dateMin === null || entry.date < dateMin ? entry.date : dateMin;
    dateMax = dateMax === null || entry.date > dateMax ? entry.date : dateMax;

    for (let s = 0; s < SIMS_PER_DRAW; s++) {
      const randPick = randomKSubset(needed, max, rng);
      mcCounts[matchCount(randPick, actualSet)]++;
      mcTrials++;
    }
  }

  const theoreticalDist = hyperFullDist(max, needed, needed); // K=needed since actual draw always has `needed` winning numbers
  const theoreticalMean = distMean(theoreticalDist);
  const oracleDist = countsToDist(oracleCounts, nGraded);
  const oracleMean = distMean(oracleDist);
  const mcDist = countsToDist(mcCounts, mcTrials);
  const mcMean = distMean(mcDist);

  // Standard error of the AVERAGE match-count over nGraded independent
  // draws, under the null hypothesis "the Oracle is statistically
  // equivalent to a random guess" (same distribution as theoreticalDist
  // per draw). Lets the UI say whether `edge` is a real deviation from
  // chance or just sampling noise, instead of eyeballing a raw number.
  const perDrawVariance = hyperVariance(max, needed, needed);
  const edgeStdError = nGraded ? Math.sqrt(perDrawVariance / nGraded) : null;
  const edge = oracleMean - theoreticalMean;

  return {
    gameKey, max, needed,
    n: nGraded, skippedErrors,
    dateRange: { from: dateMin, to: dateMax },
    oracle: { avgMatches: round4(oracleMean), matchDist: oracleDist.map(round4) },
    monteCarlo: { avgMatches: round4(mcMean), matchDist: mcDist.map(round4), simsPerDraw: SIMS_PER_DRAW, trials: mcTrials },
    theoretical: { avgMatches: round4(theoreticalMean), matchDist: theoreticalDist.map(round4) },
    mcVsTheoreticalDeltaCheck: round4(mcMean - theoreticalMean), // should be ~0 — sanity check on the simulator itself
    edge: round4(edge),
    edgeStdError: edgeStdError === null ? null : round4(edgeStdError),
    // |edge| within ~2 standard errors of 0 = statistically consistent with
    // pure chance (expected, honest outcome for a real lottery). Outside
    // that band would be the notable finding — sampling noise it is not.
    edgeWithinNoise: edgeStdError === null ? null : Math.abs(edge) <= 2 * edgeStdError,
  };
}

// ── grading: EZ2 (2 numbers, 1..31, drawn WITH replacement by PCSO — so
// the "actual set" can be size 1 on a double like [22,22]) ─────────────
function gradeEz2(sandbox) {
  const max = sandbox.GAMES.ez2.max; // 31
  const needed = 2;
  const entries = sortAscByDate((sandbox.PCSO_HISTORY.ez2 || []).filter((e) => e && e.date && e.draws));

  const rng = mulberry32(0xC0FFEE ^ hashStr('ez2'));
  const perHour = {};
  for (const h of EZ2_HOURS) {
    perHour[h] = {
      oracleCounts: new Array(needed + 1).fill(0),
      mcCounts: new Array(needed + 1).fill(0),
      theoreticalMeanSum: 0,
      theoreticalVarianceSum: 0,
      priorSeen: 0, nGraded: 0, mcTrials: 0,
      dateMin: null, dateMax: null, skippedErrors: 0,
    };
  }

  for (const entry of entries) {
    let picksAll = null;
    const needsAnyHour = EZ2_HOURS.some((h) => {
      const st = perHour[h];
      return Array.isArray(entry.draws[h]) && entry.draws[h].length === 2 && st.priorSeen >= MIN_PRIOR_DRAWS;
    });
    if (needsAnyHour) {
      try { picksAll = sandbox.computeOracleAsOf('ez2', entry.date); } catch (e) { picksAll = null; }
    }

    for (const h of EZ2_HOURS) {
      const st = perHour[h];
      const draw = entry.draws[h];
      if (!Array.isArray(draw) || draw.length !== 2) continue; // this hour has no result on this date
      if (st.priorSeen < MIN_PRIOR_DRAWS) { st.priorSeen++; continue; }
      st.priorSeen++;

      const actualSet = new Set(draw); // size 1 if it was a double like [22,22]
      const m = actualSet.size;
      const picks = picksAll && Array.isArray(picksAll[h]) ? picksAll[h] : null;
      if (!picks || picks.length !== needed) { st.skippedErrors++; continue; }

      const oracleM = matchCount(picks, actualSet);
      st.oracleCounts[oracleM]++;
      st.nGraded++;
      st.dateMin = st.dateMin === null || entry.date < st.dateMin ? entry.date : st.dateMin;
      st.dateMax = st.dateMax === null || entry.date > st.dateMax ? entry.date : st.dateMax;
      // Exact hypergeometric mean/variance for THIS draw: m (the actual
      // winning-set size) varies 1 or 2 per draw depending on whether PCSO
      // drew a double, so both are accumulated per-draw and averaged.
      st.theoreticalMeanSum += (needed * m) / max;
      st.theoreticalVarianceSum += hyperVariance(max, m, needed);

      for (let s = 0; s < SIMS_PER_DRAW; s++) {
        const randPick = randomKSubset(needed, max, rng);
        st.mcCounts[matchCount(randPick, actualSet)]++;
        st.mcTrials++;
      }
    }
  }

  const out = {};
  for (const h of EZ2_HOURS) {
    const st = perHour[h];
    const oracleDist = countsToDist(st.oracleCounts, st.nGraded);
    const oracleMean = distMean(oracleDist);
    const mcDist = countsToDist(st.mcCounts, st.mcTrials);
    const mcMean = distMean(mcDist);
    const theoreticalMean = st.nGraded ? st.theoreticalMeanSum / st.nGraded : 0;
    const avgPerDrawVariance = st.nGraded ? st.theoreticalVarianceSum / st.nGraded : 0;
    const edgeStdError = st.nGraded ? Math.sqrt(avgPerDrawVariance / st.nGraded) : null;
    const edge = oracleMean - theoreticalMean;
    out[h] = {
      n: st.nGraded, skippedErrors: st.skippedErrors,
      dateRange: { from: st.dateMin, to: st.dateMax },
      oracle: { avgMatches: round4(oracleMean), matchDist: oracleDist.map(round4) },
      monteCarlo: { avgMatches: round4(mcMean), matchDist: mcDist.map(round4), simsPerDraw: SIMS_PER_DRAW, trials: st.mcTrials },
      theoretical: { avgMatches: round4(theoreticalMean) },
      mcVsTheoreticalDeltaCheck: round4(mcMean - theoreticalMean),
      edge: round4(edge),
      edgeStdError: edgeStdError === null ? null : round4(edgeStdError),
      edgeWithinNoise: edgeStdError === null ? null : Math.abs(edge) <= 2 * edgeStdError,
    };
  }
  return { max, needed, hours: out };
}

function round4(x) { return Math.round(x * 10000) / 10000; }

async function main() {
  if (!fs.existsSync(ORACLE_JS)) throw new Error(`Missing ${ORACLE_JS} — run from repo root or check checkout.`);
  if (!fs.existsSync(PCSO_HISTORY)) throw new Error(`Missing ${PCSO_HISTORY} — run from repo root or check checkout.`);

  const oracleSrc = fs.readFileSync(ORACLE_JS, 'utf8');
  const pcsoHistoryText = fs.readFileSync(PCSO_HISTORY, 'utf8');
  const engineSha = (process.env.GITHUB_SHA || 'local').slice(0, 7);

  console.log('Loading Oracle engine and PCSO history...');
  const sandbox = loadOracleEngine(oracleSrc, pcsoHistoryText);
  await sandbox.PCSO_HISTORY_READY;
  if (sandbox.PCSO_HISTORY_STATUS && sandbox.PCSO_HISTORY_STATUS.loaded === false) {
    throw new Error(`Engine failed to load pcso-history.json: ${sandbox.PCSO_HISTORY_STATUS.error}`);
  }

  const sixBall = {};
  for (const gk of GAMES_6BALL) {
    console.log(`Grading ${gk}...`);
    sixBall[gk] = gradeSixBallGame(sandbox, gk);
    console.log(`  ${gk}: n=${sixBall[gk].n} oracle avg=${sixBall[gk].oracle.avgMatches} theoretical avg=${sixBall[gk].theoretical.avgMatches} edge=${sixBall[gk].edge}`);
  }

  console.log('Grading ez2...');
  const ez2 = gradeEz2(sandbox);
  for (const h of EZ2_HOURS) {
    const st = ez2.hours[h];
    console.log(`  ez2 ${h}: n=${st.n} oracle avg=${st.oracle.avgMatches} theoretical avg=${st.theoretical.avgMatches} edge=${st.edge}`);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    engineSha,
    minPriorDraws: MIN_PRIOR_DRAWS,
    simsPerDraw: SIMS_PER_DRAW,
    method: 'walk-forward (computeOracleAsOf sees only draws strictly before the graded date) + Monte Carlo random-pick baseline + exact hypergeometric theoretical baseline',
    sixBall,
    ez2,
  };

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  console.log('Wrote oracle-backtest.json');
}

main().catch((e) => {
  console.error('backtest_oracle.mjs failed:', e.message);
  process.exit(1);
});
