// Direct optimisation, not a grid. The within-family rotation becomes a FREE
// parameter per digit (o_1..o_9), which subsumes every rotation formula grid.mjs
// can express; source subset, family cap and family-order direction are searched
// alongside it. Basin-hopping hill climb, maximising the 4-or-better count.
//
// Two things are measured:
//   1. the CEILING — the best 4+ count reachable when fitting all draws;
//   2. the same optimiser run on the training half only, scored on the unseen
//      half, repeated, against an unoptimised random configuration.
//
// Usage: node --max-old-space-size=6144 .github/scripts/sweeps/climb.mjs
//        RESTARTS=1500 HOPS=25 TRIALS=20 SEED=424242 node ... (defaults shown)
//
// SHUFFLE=<n> shuffles the date -> winning-numbers link inside each game before
// searching, so no configuration can carry information. Run it at the SAME
// RESTARTS budget as a real run: whatever ceiling it reaches is what this
// optimiser extracts from nothing, and a real ceiling only means something if
// it clears that. Skips the holdout (there is nothing to hold out).
import fs from 'fs';
import { POOL, LABELS, families, loadReadings, mulberry, HERE } from './lib.mjs';
import path from 'path';

const RESTARTS = Number(process.env.RESTARTS || 1500);
const HOPS     = Number(process.env.HOPS     || 25);
const TRIALS   = Number(process.env.TRIALS   || 20);
const SHUFFLE  = process.env.SHUFFLE ? Number(process.env.SHUFFLE) : 0;
const rnd      = mulberry(Number(process.env.SEED || 424242));

const { draws, readings } = loadReadings();
const dates = [...new Set(draws.map(d=>d.date))].sort();
const dateIdx = new Map(dates.map((d,i)=>[d,i]));
const ND = dates.length, NMASK = 2047, CAPS = [1,2,3,6];
const splitAt = dates[Math.floor(ND/2)];

const srcBits = dates.map(d=>Int16Array.from(readings[d].srcBits));
const ORD = new Int8Array(NMASK*ND*2*9);
for (let mask = 1; mask <= NMASK; mask++)
  for (let di = 0; di < ND; di++){
    const sb = srcBits[di], a = [];
    for (let d = 1; d <= 9; d++){ let b = sb[d-1]&mask, c = 0; while (b){ b &= b-1; c++; } a.push([d,c]); }
    const de = a.slice().sort((x,y)=>y[1]-x[1]), as = a.slice().sort((x,y)=>x[1]-y[1]);
    const base = ((mask-1)*ND+di)*18;
    for (let i = 0; i < 9; i++){ ORD[base+i] = de[i][0]; ORD[base+9+i] = as[i][0]; }
  }
const D = draws.map(dr => {
  const pool = POOL[dr.game], fam = families(pool), win = new Uint8Array(pool+1);
  for (const n of dr.nums) win[n] = 1;
  return { di:dateIdx.get(dr.date), win,
           fam:[1,2,3,4,5,6,7,8,9].map(d=>Int16Array.from(fam[d])),
           test: dr.date >= splitAt ? 1 : 0 };
});
if (SHUFFLE){
  const shuf = mulberry(SHUFFLE);
  const byGame = {};
  draws.forEach((d,i)=>{ (byGame[d.game] = byGame[d.game] || []).push(i); });
  for (const g of Object.keys(byGame)){
    const ids = byGame[g], perm = ids.slice();
    for (let i = perm.length-1; i > 0; i--){ const j = Math.floor(shuf()*(i+1)); [perm[i],perm[j]] = [perm[j],perm[i]]; }
    const pool = POOL[g];
    const fresh = ids.map((_,i)=>{ const w = new Uint8Array(pool+1); for (const n of draws[perm[i]].nums) w[n] = 1; return w; });
    ids.forEach((id,i)=>{ D[id].win = fresh[i]; });
  }
  console.log(`*** SHUFFLE=${SHUFFLE} — date/draw link permuted within each game; this run measures NOISE ***\n`);
}
const TRAIN = D.filter(d=>!d.test), TEST = D.filter(d=>d.test);

function score(set, mask, cap, dir, off){
  const mb = (mask-1)*ND; let hits = 0;
  for (let k = 0; k < set.length; k++){
    const dr = set[k], ob = (mb+dr.di)*18 + dir*9, win = dr.win, fam = dr.fam;
    let got = 0, m = 0;
    for (let i = 0; i < 9 && got < 6; i++){
      const d = ORD[ob+i], f = fam[d-1], kk = f.length;
      let lim = cap; if (lim > kk) lim = kk; if (lim > 6-got) lim = 6-got;
      const o = off[d-1];
      for (let j = 0; j < lim; j++) if (win[f[(o+j)%kk]]) m++;
      got += lim;
    }
    if (m >= 4) hits++;
  }
  return hits;
}
// Coordinate ascent. Each coordinate keeps the BEST value seen, never a stale
// one — reverting to a pre-improvement value here makes the climber report a
// score its own returned configuration does not have.
function localOpt(set, st){
  let improved = true, cur = score(set, st.mask, st.cap, st.dir, st.off), ev = 1;
  while (improved){
    improved = false;
    for (let i = 0; i < 9; i++){
      let bestV = st.off[i], bestS = cur;
      for (let v = 0; v < 7; v++){
        if (v === bestV) continue;
        st.off[i] = v; const s = score(set, st.mask, st.cap, st.dir, st.off); ev++;
        if (s > bestS){ bestS = s; bestV = v; }
      }
      st.off[i] = bestV; if (bestS > cur){ cur = bestS; improved = true; }
    }
    for (let b = 0; b < 11; b++){ const nm = st.mask ^ (1<<b); if (nm < 1 || nm > NMASK) continue;
      const s = score(set, nm, st.cap, st.dir, st.off); ev++; if (s > cur){ cur = s; st.mask = nm; improved = true; } }
    for (const c of CAPS){ if (c === st.cap) continue;
      const s = score(set, st.mask, c, st.dir, st.off); ev++; if (s > cur){ cur = s; st.cap = c; improved = true; } }
    { const nd = 1-st.dir; const s = score(set, st.mask, st.cap, nd, st.off); ev++;
      if (s > cur){ cur = s; st.dir = nd; improved = true; } }
  }
  return { cur, ev };
}
function basinHop(set, restarts, hops){
  let best = null, ev = 0;
  for (let r = 0; r < restarts; r++){
    let st = { mask:1+Math.floor(rnd()*NMASK), cap:CAPS[Math.floor(rnd()*4)], dir:Math.floor(rnd()*2), off:new Int8Array(9) };
    for (let i = 0; i < 9; i++) st.off[i] = Math.floor(rnd()*7);
    let o = localOpt(set, st); ev += o.ev; let cur = o.cur;
    for (let h = 0; h < hops; h++){
      const cand = { mask:st.mask, cap:st.cap, dir:st.dir, off:Int8Array.from(st.off) };
      const nk = 1 + Math.floor(rnd()*3);
      for (let z = 0; z < nk; z++) cand.off[Math.floor(rnd()*9)] = Math.floor(rnd()*7);
      if (rnd() < 0.35){ const nm = cand.mask ^ (1<<Math.floor(rnd()*11)); if (nm >= 1 && nm <= NMASK) cand.mask = nm; }
      const o2 = localOpt(set, cand); ev += o2.ev;
      if (o2.cur >= cur){ cur = o2.cur; st = cand; }
    }
    if (!best || cur > best.score) best = { score:cur, mask:st.mask, cap:st.cap, dir:st.dir, off:Array.from(st.off) };
  }
  return { best, ev };
}
const show = b => `sources=[${LABELS.filter((_,i)=>b.mask&(1<<i)).join(',')}] cap=${b.cap} order=${b.dir?'asc':'desc'} rot=[${b.off.join(',')}]`;

const t0 = Date.now();
console.log(`basin-hopping: ${RESTARTS} restarts x ${HOPS} hops\n`);
const RA = basinHop(D, RESTARTS, HOPS);
const recheck = score(D, RA.best.mask, RA.best.cap, RA.best.dir, Int8Array.from(RA.best.off));
console.log(`CEILING, fitting all ${D.length} draws (${RA.ev.toLocaleString()} evaluations):`);
console.log(`   best 4+ hits = ${RA.best.score}`);
console.log(`   ${show(RA.best)}`);
console.log(`   self-check, independently re-scored = ${recheck} ${recheck===RA.best.score?'(consistent)':'*** INCONSISTENT ***'}`);
if (recheck !== RA.best.score) process.exitCode = 1;

if (SHUFFLE){
  console.log(`\n(holdout skipped — nothing to hold out on shuffled data)`);
  fs.writeFileSync(path.join(HERE,`climb.null.${SHUFFLE}.json`), JSON.stringify({ shuffle:SHUFFLE, restarts:RESTARTS, ceiling:RA.best }, null, 1));
  process.exit(process.exitCode || 0);
}
console.log(`\nREPEATED HOLDOUT — optimise on ${TRAIN.length} training draws, then read ${TEST.length} unseen ones:`);
const rows = [];
for (let t = 0; t < TRIALS; t++){
  const r = basinHop(TRAIN, 60, 15);
  rows.push({ train:r.best.score, test:score(TEST, r.best.mask, r.best.cap, r.best.dir, Int8Array.from(r.best.off)), cfg:show(r.best) });
}
console.log('   trial  train4+  test4+');
rows.forEach((r,i)=>console.log(`   ${String(i+1).padStart(4)}   ${String(r.train).padStart(5)}   ${String(r.test).padStart(5)}`));
const mTr = rows.reduce((a,b)=>a+b.train,0)/rows.length, mTe = rows.reduce((a,b)=>a+b.test,0)/rows.length;
console.log(`   ------------------------`);
console.log(`   mean    ${mTr.toFixed(2)}    ${mTe.toFixed(2)}`);
let ref = 0; for (let t = 0; t < 500; t++){
  const off = new Int8Array(9); for (let i = 0; i < 9; i++) off[i] = Math.floor(rnd()*7);
  ref += score(TEST, 1+Math.floor(rnd()*NMASK), CAPS[Math.floor(rnd()*4)], Math.floor(rnd()*2), off);
}
console.log(`\n   an UNOPTIMISED random configuration averages ${(ref/500).toFixed(2)} 4+ hits on those same unseen draws.`);
console.log(`\n(${((Date.now()-t0)/1000).toFixed(0)}s)`);
fs.writeFileSync(path.join(HERE,'climb.result.json'),
  JSON.stringify({ ceiling:RA.best, evals:RA.ev, rows, meanTrain:mTr, meanTest:mTe, randomTest:ref/500, splitAt }, null, 1));
