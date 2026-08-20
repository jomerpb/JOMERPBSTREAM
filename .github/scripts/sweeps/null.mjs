// NULL CALIBRATION — the honest yardstick.
//
// Runs the IDENTICAL stage-1 search space (131,008 configurations), but with the
// date -> winning-numbers link shuffled within each game, so no configuration can
// possibly carry information. Whatever best-4+ count this finds is what a search
// of this size produces from nothing. Compare grid.mjs's answer against it before
// calling any configuration good.
//
// Usage: RUNS=100 node --max-old-space-size=6144 .github/scripts/sweeps/null.mjs
import fs from 'fs';
import path from 'path';
import { POOL, OFFSETS, famOrders, loadReadings, mulberry, HERE } from './lib.mjs';

const RUNS = Number(process.env.RUNS || 100);
const rnd = mulberry(Number(process.env.SEED || 20260820));
const { draws, readings } = loadReadings();
const CAPS = [1,2,3,6], NOFF = OFFSETS.length, NB = 2, NCAP = 4, NMASK = 2047, NFO = NOFF*NB;
const NCFG = NMASK*NCAP*NFO;
const dates = [...new Set(draws.map(d=>d.date))].sort();
const dateIdx = new Map(dates.map((d,i)=>[d,i])), ND = dates.length;

const FO = draws.map(dr => { const pool = POOL[dr.game], a = [];
  for (let o = 0; o < NOFF; o++) for (let b = 0; b < NB; b++)
    a.push(famOrders(readings[dr.date], pool, OFFSETS[o].fn, b === 1));
  return a; });
const ORD = new Int8Array(NMASK*ND*9);
for (let mask = 1; mask <= NMASK; mask++) for (let di = 0; di < ND; di++){
  const sb = readings[dates[di]].srcBits, a = [];
  for (let d = 1; d <= 9; d++){ let b = sb[d-1]&mask, c = 0; while (b){ b &= b-1; c++; } a.push([d,c]); }
  a.sort((x,y)=>y[1]-x[1]);
  const base = ((mask-1)*ND+di)*9;
  for (let i = 0; i < 9; i++) ORD[base+i] = a[i][0];
}
const byGame = {}; draws.forEach((d,i)=>{ (byGame[d.game] = byGame[d.game] || []).push(i); });

const maxima = []; const t0 = Date.now();
for (let run = 0; run < RUNS; run++){
  const winOf = new Array(draws.length);
  for (const g of Object.keys(byGame)){
    const ids = byGame[g], perm = ids.slice();
    for (let i = perm.length-1; i > 0; i--){ const j = Math.floor(rnd()*(i+1)); [perm[i],perm[j]] = [perm[j],perm[i]]; }
    for (let i = 0; i < ids.length; i++){
      const w = new Uint8Array(POOL[g]+1);
      for (const n of draws[perm[i]].nums) w[n] = 1;
      winOf[ids[i]] = w;
    }
  }
  const h4 = new Int16Array(NCFG);
  for (let mask = 1; mask <= NMASK; mask++){
    const mb = (mask-1)*NCAP*NFO;
    for (let k = 0; k < draws.length; k++){
      const ob = ((mask-1)*ND + dateIdx.get(draws[k].date))*9, win = winOf[k], foArr = FO[k];
      for (let f = 0; f < NFO; f++){ const fo = foArr[f];
        for (let c = 0; c < NCAP; c++){ const cap = CAPS[c]; let got = 0, m = 0;
          for (let i = 0; i < 9 && got < 6; i++){
            const fam = fo[ORD[ob+i]-1];
            let lim = cap; if (lim > fam.length) lim = fam.length; if (lim > 6-got) lim = 6-got;
            for (let j = 0; j < lim; j++) if (win[fam[j]]) m++;
            got += lim;
          }
          if (m >= 4) h4[mb + c*NFO + f]++;
        } }
    }
  }
  let mx = 0; for (let i = 0; i < NCFG; i++) if (h4[i] > mx) mx = h4[i];
  maxima.push(mx);
  console.error(`run ${run+1}/${RUNS}  best-4+ = ${mx}   ${((Date.now()-t0)/1000).toFixed(0)}s`);
}
fs.writeFileSync(path.join(HERE,'null.result.json'), JSON.stringify({ RUNS, maxima }, null, 1));
const s = maxima.slice().sort((a,b)=>a-b);
console.log(`\nNULL — ${RUNS} shuffled runs of the same ${NCFG.toLocaleString()}-configuration search`);
console.log(`best-4+ found per run:  min ${s[0]}   median ${s[Math.floor(RUNS/2)]}   mean ${(s.reduce((a,b)=>a+b,0)/RUNS).toFixed(2)}   max ${s[RUNS-1]}`);
for (const t of [6,7,8,9,10]){
  const n = s.filter(x=>x>=t).length;
  console.log(`  runs where pure noise reached ${String(t).padStart(2)} or better: ${String(n).padStart(3)}/${RUNS} (${(100*n/RUNS).toFixed(0)}%)`);
}
