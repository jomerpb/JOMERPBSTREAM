// scripts/snapshot_oracle.mjs
//
// Logs today's Oracle pick for every game to oracle-history.json, using the
// SAME oracle.js engine the site runs (loaded via vm, not reimplemented),
// called through computeOracleAsOf() so the logged value can never contain
// same-day draw data — even if this workflow runs late, or a scrape lands
// first. Run by .github/workflows/oracle-snapshot.yml at 00:05 Asia/Manila.
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

const GAMES_6BALL = ['642', '645', '649', '655', '658'];

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

  const picks = {};
  for (const gk of GAMES_6BALL) {
    const result = sandbox.computeOracleAsOf(gk, todayStr);
    if (!Array.isArray(result) || result.length !== 6) {
      throw new Error(`computeOracleAsOf('${gk}', '${todayStr}') returned an unexpected shape: ${JSON.stringify(result)}`);
    }
    picks[gk] = result;
  }
  const ez2Result = sandbox.computeOracleAsOf('ez2', todayStr);
  if (!ez2Result || !ez2Result['2PM'] || !ez2Result['5PM'] || !ez2Result['9PM']) {
    throw new Error(`computeOracleAsOf('ez2', '${todayStr}') returned an unexpected shape: ${JSON.stringify(ez2Result)}`);
  }
  picks.ez2 = ez2Result;

  const entry = {
    date: todayStr,
    generatedAt: new Date().toISOString(),
    engineSha,
    picks,
  };

  if (existingIdx !== -1) {
    log.entries[existingIdx] = entry;
    console.log(`FORCE_OVERWRITE=1 — replaced existing entry for ${todayStr}.`);
  } else {
    log.entries.unshift(entry); // newest-first, matching pcso-history.json's convention
  }
  log.updated = new Date().toISOString();

  fs.writeFileSync(ORACLE_HISTORY, JSON.stringify(log, null, 2) + '\n');

  console.log(`Wrote oracle-history.json — ${todayStr}:`);
  for (const gk of GAMES_6BALL) console.log(`  ${gk}: ${picks[gk].map((n) => String(n).padStart(2, '0')).join('-')}`);
  console.log(`  ez2 2PM: ${picks.ez2['2PM'].map((n) => String(n).padStart(2, '0')).join('-')}  5PM: ${picks.ez2['5PM'].map((n) => String(n).padStart(2, '0')).join('-')}  9PM: ${picks.ez2['9PM'].map((n) => String(n).padStart(2, '0')).join('-')}`);
}

main().catch((e) => {
  console.error('snapshot_oracle.mjs failed:', e.message);
  process.exit(1);
});
