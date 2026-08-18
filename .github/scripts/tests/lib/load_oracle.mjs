/**
 * Shared vm sandbox loader for the Oracle engine tests.
 *
 * oracle.js is a browser file with no exports, so every test that wants to
 * call into it has to build the same stubbed DOM and run it in a vm context.
 * That loader was copy-pasted per test file, which meant a test could quietly
 * end up exercising a sandbox the real pipeline never uses. One copy lives
 * here instead.
 *
 * Deliberately NOT imported by snapshot_oracle.mjs: that script ships to the
 * daily workflow and keeps its own loader so a test-only refactor can never
 * break the job. test_snapshot_oracle.mjs covers it by running the real
 * script as a subprocess, which exercises its loader end to end.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const ORACLE_JS = path.join(ROOT, 'oracle.js');
export const PCSO_HISTORY = path.join(ROOT, 'pcso-history.json');

export function stubEl() {
  return {
    style: {}, classList: { add(){}, remove(){}, toggle(){}, contains: () => false },
    innerHTML: '', value: '', textContent: '', min: '', max: '', dataset: {},
    setAttribute(){}, getAttribute: () => null, appendChild(){}, addEventListener(){},
    removeEventListener(){}, scrollIntoView(){}, querySelector: () => stubEl(),
    querySelectorAll: () => [], options: [], selectedIndex: 0, checked: false, disabled: false,
  };
}

/**
 * Run oracle.js in a fresh sandbox with `historyText` served to its own
 * pcso-history.json fetch. Resolves once the engine's history load settled.
 */
export async function loadEngine(historyText) {
  const sandbox = {
    // Silence the engine's load chatter; tests print their own results.
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
    navigator: { userAgent: 'oracle-tests' },
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

/** Load the engine against the repo's real pcso-history.json. */
export async function loadEngineFromRepo() {
  return loadEngine(fs.readFileSync(PCSO_HISTORY, 'utf8'));
}

/** YYYY-MM-DD for a Date, using its UTC fields (dates here are calendar labels). */
export function ymd(dt) {
  return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0')
       + '-' + String(dt.getUTCDate()).padStart(2, '0');
}

/** Simple pass/fail recorder shared by the .mjs suites. */
export function makeChecker() {
  const failures = [];
  const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  ' + detail : ''}`);
    if (!ok) failures.push(name);
    return ok;
  };
  return { check, failures };
}
