// scripts/snapshot_oracle.mjs
//
// Logs today's Oracle pick to oracle-history.json, using the SAME oracle.js
// engine the site runs (loaded via vm, not reimplemented), called through
// oracleSeedCompute() so the logged value is exactly what the page's lead card
// shows. A seeded pick is cast from a draw that ALREADY HAPPENED, so it can
// never contain same-day draw data either — even if this workflow runs late,
// or a scrape lands first. Run by .github/workflows/oracle-snapshot.yml at 00:05 Asia/Manila.
//
// Idempotent: if today's entry already exists, does nothing unless
// FORCE_OVERWRITE=1 is set in the environment (manual re-run / correction).
//
// Lives at repo ROOT alongside oracle.js and oracle-history.json.
// Usage: node snapshot_oracle.mjs
// Reads:  ./oracle.js, ./pcso-history.json
// Writes: ./oracle-history.json

import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname; // this file sits at repo root
const ORACLE_JS = path.join(ROOT, 'oracle.js');
const PCSO_HISTORY = path.join(ROOT, 'pcso-history.json');
const ORACLE_HISTORY = path.join(ROOT, 'oracle-history.json');


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
    navigator: { userAgent: 'node-snapshot-script' },
    fetch: async (url) => {
      // The engine's own loader fetches 'pcso-history.json' — serve it from
      // the local checkout instead of the network (faster, no CDN lag/races).
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

function manilaToday() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw new Error(`Failed to parse ${filePath}: ${e.message}`);
  }
}

async function main() {
  if (!fs.existsSync(ORACLE_JS)) throw new Error(`Missing ${ORACLE_JS} — run from repo root or check checkout.`);
  if (!fs.existsSync(PCSO_HISTORY)) throw new Error(`Missing ${PCSO_HISTORY} — run from repo root or check checkout.`);

  const oracleSrc = fs.readFileSync(ORACLE_JS, 'utf8');
  const pcsoHistoryText = fs.readFileSync(PCSO_HISTORY, 'utf8');
  const todayStr = manilaToday();
  const forceOverwrite = process.env.FORCE_OVERWRITE === '1';
  const engineSha = (process.env.GITHUB_SHA || 'local').slice(0, 7);

  const log = readJsonSafe(ORACLE_HISTORY, { updated: null, entries: [] });
  if (!Array.isArray(log.entries)) log.entries = [];

  const existingIdx = log.entries.findIndex((e) => e && e.date === todayStr);
  if (existingIdx !== -1 && !forceOverwrite) {
    console.log(`oracle-history.json already has an entry for ${todayStr} — skipping (idempotent). Set FORCE_OVERWRITE=1 to replace it.`);
    return;
  }

  console.log(`Computing Oracle picks as-of ${todayStr} (Asia/Manila) using the live engine...`);
  const sandbox = loadOracleEngine(oracleSrc, pcsoHistoryText);
  await sandbox.PCSO_HISTORY_READY;

  if (sandbox.PCSO_HISTORY_STATUS && sandbox.PCSO_HISTORY_STATUS.loaded === false) {
    throw new Error(`Engine failed to load pcso-history.json: ${sandbox.PCSO_HISTORY_STATUS.error}`);
  }

  // Logs the SEEDED pick — the one the page actually shows. It used to log
  // computeOracleAsOf(), the history-free engine, and that stayed true only
  // while a panel displayed it. Once the seeded card replaced that panel the
  // log and the page were two different engines wearing one label: measured
  // 2026-09-15, 6/42 read 08-17-21-29-38-39 on the card and 01-10-16-24-25-33
  // in the log, 0 of 6 in common.
  //
  // Entries are tagged with oracle.js's ORACLE_SEED_ENGINE ('seeded-11' since
  // 2026-09-24, when the six moment-cast methods joined; plain 'seeded' before
  // that) so the page can tell them apart from the older ones, which stay in
  // the file untouched (see the immutability rule in CLAUDE.md) and are simply
  // no longer displayed.
  //
  // ONLY GAMES DRAWN TODAY, and only those whose seed is on file. The previous
  // version logged all six every day regardless of the schedule; a seeded pick
  // for a game that does not draw today is not a thing this page ever shows.
  // A game whose seed has not been appended yet is OMITTED rather than logged
  // from an older draw — a wrong-seed pick recorded as fact is worse than a
  // gap, and the gap is visible.
  //
  // This makes the two scheduled jobs ORDER-DEPENDENT: pcso-history-append.yml
  // at 23:00 Manila must land before oracle-snapshot.yml at 00:05, or the seed
  // for the day is missing and that game logs nothing. The crons already run in
  // that order; this is why they must stay that way.
  const picks = {};
  const seeds = {};
  const scheduled = sandbox.oracleGamesOnDate(todayStr);
  for (const gk of scheduled) {
    let r = null;
    try {
      r = sandbox.oracleSeedCompute(gk, todayStr);
    } catch (e) {
      console.warn(`  ${gk}: oracleSeedCompute threw — ${e.message}`);
      continue;
    }
    if (!r || !r.ok) {
      console.warn(`  ${gk}: no seed yet (${(r && r.reason) || 'unknown'}${r && r.waitingFor ? ', waiting for ' + r.waitingFor : ''}) — not logged`);
      continue;
    }
    if (gk === 'ez2') {
      const byHour = {};
      for (const slot of ['2PM', '5PM', '9PM']) {
        const p = r.byHour[slot] && r.byHour[slot].picks;
        if (!Array.isArray(p) || p.length !== 2) {
          throw new Error(`ez2 ${slot} on ${todayStr} returned an unexpected shape: ${JSON.stringify(p)}`);
        }
        byHour[slot] = p;
      }
      picks.ez2 = byHour;
    } else {
      if (!Array.isArray(r.picks) || r.picks.length !== 6) {
        throw new Error(`oracleSeedCompute('${gk}', '${todayStr}') returned an unexpected shape: ${JSON.stringify(r.picks)}`);
      }
      picks[gk] = r.picks;
    }
    seeds[gk] = r.seedDate;
  }
  if (!Object.keys(picks).length) {
    throw new Error(`No game could be cast for ${todayStr} — every scheduled game is missing its seed. Has pcso-history-append.yml run?`);
  }

  const entry = {
    date: todayStr,
    generatedAt: new Date().toISOString(),
    engineSha,
    // The engine's own version tag, read from oracle.js rather than repeated
    // here, so the page's Look Up gate and this log cannot drift apart.
    engine: sandbox.ORACLE_SEED_ENGINE,
    picks,
    seeds,
  };

  if (existingIdx !== -1) {
    log.entries[existingIdx] = entry;
    console.log(`FORCE_OVERWRITE=1 — replaced existing entry for ${todayStr}.`);
  } else {
    log.entries.unshift(entry); // newest-first, matching pcso-history.json's convention
  }
  log.updated = new Date().toISOString();

  fs.writeFileSync(ORACLE_HISTORY, JSON.stringify(log, null, 2) + '\n');

  const pad = (a) => a.map((n) => String(n).padStart(2, '0')).join('-');
  console.log(`Wrote oracle-history.json — ${todayStr} (${entry.engine}):`);
  for (const gk of Object.keys(picks)) {
    if (gk === 'ez2') {
      console.log(`  ez2  seed ${seeds.ez2}  2PM: ${pad(picks.ez2['2PM'])}  5PM: ${pad(picks.ez2['5PM'])}  9PM: ${pad(picks.ez2['9PM'])}`);
    } else {
      console.log(`  ${gk}  seed ${seeds[gk]}  ${pad(picks[gk])}`);
    }
  }
}

main().catch((e) => {
  console.error('snapshot_oracle.mjs failed:', e.message);
  process.exit(1);
});
