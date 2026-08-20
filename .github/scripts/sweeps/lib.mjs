// Shared machinery for the Oracle configuration sweeps.
//
// Two halves:
//   1. loadOracleEngine() — the real oracle.js in a Node vm sandbox, exactly
//      the pattern snapshot_oracle.mjs uses. Nothing is reimplemented here.
//   2. A PARAMETERISED copy of convergence()'s selection stage, so a sweep can
//      vary the configuration. validate.mjs proves this copy reproduces the
//      shipped engine bit-for-bit at the shipped configuration, on every draw
//      on file — run it before trusting any number a sweep prints.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SLASH_TO_KEY = { '6/42':'642','6/45':'645','6/49':'649','6/55':'655','6/58':'658' };
export const POOL = { '642':42,'645':45,'649':49,'655':55,'658':58 };
export const LABELS = ['Py','Ch','As','Ba','Fs','IC','PoF','Ta','An','Ho','En'];
const LOSHU_HOME = {1:'N',2:'SW',3:'E',4:'SE',5:'C',6:'NW',7:'W',8:'NE',9:'S'};

// ── the real engine, sandboxed ─────────────────────────────────────────────
function stubEl(){
  return { style:{}, classList:{add(){},remove(){},toggle(){},contains:()=>false},
    innerHTML:'', value:'', textContent:'', min:'', max:'', dataset:{},
    setAttribute(){}, getAttribute:()=>null, appendChild(){}, addEventListener(){},
    removeEventListener(){}, scrollIntoView(){}, querySelector:()=>stubEl(),
    querySelectorAll:()=>[], options:[], selectedIndex:0, checked:false, disabled:false };
}
export function loadOracleEngine(){
  const oracleSrc = fs.readFileSync(path.join(ROOT,'oracle.js'),'utf8');
  const historyText = fs.readFileSync(path.join(ROOT,'pcso-history.json'),'utf8');
  const sandbox = {
    console, AbortController, Intl, Date, Math, JSON, Object, Array, Promise, Set, Map,
    parseInt, parseFloat, String, Number, isNaN, isFinite, Boolean, RegExp, Error,
    setTimeout, clearTimeout, setInterval, clearInterval,
    document:{ getElementById:()=>stubEl(), querySelector:()=>stubEl(),
      querySelectorAll:()=>[], addEventListener:()=>{}, createElement:()=>stubEl() },
    window:{ addEventListener:()=>{} },
    localStorage:{ getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
    sessionStorage:{ getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
    navigator:{ userAgent:'node-oracle-sweep' },
    fetch: async (url) => String(url).includes('oracle-history.json')
      ? { ok:false, status:404, json:async()=>({}) }
      : { ok:true, status:200, json:async()=>JSON.parse(historyText) },
  };
  sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(oracleSrc, sandbox, { filename:'oracle.js' });
  return sandbox;
}

// Every real 6-ball draw on file, oldest first.
export function loadDraws(){
  const hist = JSON.parse(fs.readFileSync(path.join(ROOT,'pcso-history.json'),'utf8'));
  const out = [];
  for (const [slash, gk] of Object.entries(SLASH_TO_KEY))
    for (const e of hist[slash] || [])
      if (e && e.date && Array.isArray(e.nums) && e.nums.length === 6)
        out.push({ game: gk, date: e.date, nums: e.nums.slice().sort((a,b)=>a-b) });
  out.sort((a,b)=> a.date<b.date?-1 : a.date>b.date?1 : (a.game<b.game?-1:1));
  return out;
}
export const readingsPath = () => path.join(HERE,'readings.json');
export function loadReadings(){
  const p = readingsPath();
  if (!fs.existsSync(p)) throw new Error('readings.json missing — run:  node .github/scripts/sweeps/extract.mjs');
  return JSON.parse(fs.readFileSync(p,'utf8'));
}

// ── parameterised selection stage ──────────────────────────────────────────
export function digitOf(n){ const r = n % 9; return r === 0 ? 9 : r; }
const famCache = {};
export function families(pool){
  if (famCache[pool]) return famCache[pool];
  const f = {}; for (let d=1; d<=9; d++) f[d] = [];
  for (let n=1; n<=pool; n++) f[digitOf(n)].push(n);
  return (famCache[pool] = f);
}

// Rotation rules. Index 0 is the shipped house rule; validate.mjs pins it.
export const OFFSETS = [
  { name:'shipped   ((star+d)*pool+hex+dnum)', fn:(star,d,pool,hex,dnum)=> (star+d)*pool+hex+dnum },
  { name:'additive  (star+d+pool+hex+dnum)',   fn:(star,d,pool,hex,dnum)=> star+d+pool+hex+dnum },
  { name:'no-star   (d*pool+hex+dnum)',        fn:(star,d,pool,hex,dnum)=> d*pool+hex+dnum },
  { name:'star+hex  (star+hex)',               fn:(star,d,pool,hex,dnum)=> star+hex },
  { name:'hex only  (hex)',                    fn:(star,d,pool,hex,dnum)=> hex },
  { name:'dnum only (dnum)',                   fn:(star,d,pool,hex,dnum)=> dnum },
  { name:'no rotation (lowest member)',        fn:()=> 0 },
  { name:'mixed     (star*hex+d*dnum+pool)',   fn:(star,d,pool,hex,dnum)=> star*hex+d*dnum+pool },
];
// The stage-2 coefficient grid: ((A*star + B*d) * P + E*hex + F*dnum), P in {1,pool}.
export function offsetGrid(){
  const g = [];
  for (const A of [0,1,2]) for (const B of [0,1,2]) for (const P of [0,1])
    for (const E of [0,1]) for (const F of [0,1])
      g.push({ name:`((${A}*star+${B}*d)*${P?'pool':'1'}+${E}*hex+${F}*dnum)`,
               fn:(star,d,pool,hex,dnum)=> (A*star+B*d)*(P?pool:1)+E*hex+F*dnum });
  return g;
}

// bestNums() order for all nine families, for one date-reading and pool.
export function famOrders(reading, pool, offFn, useBonus){
  const fam = families(pool), loShu = reading.loShu || {};
  const dnum = (typeof reading.dateSumN === 'number' && isFinite(reading.dateSumN)) ? reading.dateSumN : 0;
  const hex  = (typeof reading.hexN === 'number' && isFinite(reading.hexN)) ? reading.hexN : 0;
  const bonus = new Int8Array(pool + 1);
  if (useBonus){
    const add = n => { if (n >= 1 && n <= pool) bonus[n] += 10; };
    if (reading.cardN !== null && reading.cardN >= 1) add(reading.cardN);
    if (reading.dateSumN !== null) add(reading.dateSumN);
    if (reading.hexN) add(reading.hexN);
    if (reading.nucN) add(reading.nucN);
    if (reading.chgN) add(reading.chgN);
    const seen = new Set();
    for (const dg of (reading.angelDigits || [])){
      const rep = dg * 11;
      if (rep >= 1 && rep <= pool && !seen.has(rep)) { seen.add(rep); bonus[rep] += 10; }
    }
  }
  const out = [];
  for (let d = 1; d <= 9; d++){
    const f = fam[d], k = f.length;
    let star = loShu[LOSHU_HOME[d]];
    if (typeof star !== 'number' || !isFinite(star)) star = d;
    let o = k ? (offFn(star, d, pool, hex, dnum) % k) : 0;
    if (o < 0) o += k;
    const rank = new Int16Array(pool + 1);
    for (let i = 0; i < k; i++) rank[f[(o + i) % k]] = k - i;
    out.push(Int16Array.from(f.slice().sort((a,b)=>((rank[b]+bonus[b])-(rank[a]+bonus[a]))||(a-b))));
  }
  return out;
}

// Digit families ordered by how many of the selected sources hit them.
// asc=true reverses it (weakest families first) — a sweep dimension, not the engine.
export function sortedDigits(srcBits, mask, asc){
  const a = [];
  for (let d = 1; d <= 9; d++){ let b = srcBits[d-1] & mask, c = 0; while (b){ b &= b-1; c++; } a.push([d,c]); }
  a.sort((x,y)=> asc ? x[1]-y[1] : y[1]-x[1]);   // stable => ties keep ascending digit
  return Int8Array.from(a.map(x=>x[0]));
}

// cappedFill(): walk families in order, take up to `cap` from each.
export function pick(order, fo, cap, needed = 6){
  const out = [];
  for (let i = 0; i < 9 && out.length < needed; i++){
    const f = fo[order[i]-1];
    for (let j = 0; j < cap && j < f.length && out.length < needed; j++) out.push(f[j]);
  }
  if (out.length < needed)                       // safety net; never fires for 6-ball
    for (let i = 0; i < 9 && out.length < needed; i++)
      for (const n of fo[order[i]-1]) if (out.indexOf(n) < 0 && out.length < needed) out.push(n);
  return out.sort((a,b)=>a-b);
}

export function mulberry(seed){
  let s = seed >>> 0;
  return () => { s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0)/4294967296; };
}
