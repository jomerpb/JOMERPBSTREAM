// Exhaustive grid sweep of Oracle configurations, graded against every real
// 6-ball draw on file.
//
//   MODE=stage1  (default)  8 named rotation rules, descending family order
//                           -> 2047 source subsets x 4 caps x 8 rotations x 2 bonus
//                           =  131,008 configurations
//   MODE=stage2             72-point rotation coefficient grid + reversed order
//                           -> x72 x2 directions = 2,358,144 configurations
//
// Prints the configurations that land the most 4-or-better results, and the
// walk-forward holdout that says whether any of it is real.
//
// Usage: node --max-old-space-size=6144 .github/scripts/sweeps/grid.mjs
import { POOL, LABELS, OFFSETS, offsetGrid, famOrders, loadReadings } from './lib.mjs';

const MODE = process.env.MODE || 'stage1';
const OFFS = MODE === 'stage2' ? offsetGrid() : OFFSETS;
const NDIR = MODE === 'stage2' ? 2 : 1;
const CAPS = [1,2,3,6];
const NMASK = 2047, NCAP = CAPS.length, NB = 2, NOFF = OFFS.length;
const NCFG = NOFF * NMASK * NCAP * NB * NDIR;

const { draws, readings } = loadReadings();
const dates = [...new Set(draws.map(d=>d.date))].sort();
const dateIdx = new Map(dates.map((d,i)=>[d,i]));
const ND = dates.length;
const splitAt = dates[Math.floor(ND/2)];
console.error(`MODE=${MODE}  configs=${NCFG.toLocaleString()}  draws=${draws.length}  graded=${(NCFG*draws.length/1e9).toFixed(2)}B`);

// digit-family order for every (mask, date, direction)
const srcBits = dates.map(d => Int16Array.from(readings[d].srcBits));
const ORD = new Int8Array(NMASK * ND * NDIR * 9);
for (let mask = 1; mask <= NMASK; mask++)
  for (let di = 0; di < ND; di++){
    const sb = srcBits[di], a = [];
    for (let d = 1; d <= 9; d++){ let b = sb[d-1] & mask, c = 0; while (b){ b &= b-1; c++; } a.push([d,c]); }
    const de = a.slice().sort((x,y)=>y[1]-x[1]);
    const base = ((mask-1)*ND + di) * NDIR * 9;
    for (let i = 0; i < 9; i++) ORD[base+i] = de[i][0];
    if (NDIR === 2){ const as = a.slice().sort((x,y)=>x[1]-y[1]); for (let i=0;i<9;i++) ORD[base+9+i] = as[i][0]; }
  }

const D = draws.map(dr => {
  const pool = POOL[dr.game], win = new Uint8Array(pool+1);
  for (const n of dr.nums) win[n] = 1;
  return { di: dateIdx.get(dr.date), pool, win, test: dr.date >= splitAt ? 1 : 0, reading: readings[dr.date] };
});
const nTrain = D.filter(d=>!d.test).length, nTest = D.length - nTrain;

const h4 = new Int16Array(NCFG), h5 = new Int16Array(NCFG), h6 = new Int16Array(NCFG);
const h4tr = new Int16Array(NCFG), h4te = new Int16Array(NCFG), tot = new Int32Array(NCFG);
const t0 = Date.now();

for (let o = 0; o < NOFF; o++){
  const FO = [ D.map(d => famOrders(d.reading, d.pool, OFFS[o].fn, false)),
               D.map(d => famOrders(d.reading, d.pool, OFFS[o].fn, true)) ];
  const oBase = o * NMASK * NCAP * NB * NDIR;
  for (let k = 0; k < D.length; k++){
    const dr = D[k], win = dr.win, isTest = dr.test, di = dr.di;
    for (let b = 0; b < NB; b++){
      const fo = FO[b][k];
      for (let mask = 1; mask <= NMASK; mask++){
        const ob0 = ((mask-1)*ND + di) * NDIR * 9;
        const mBase = oBase + (mask-1) * NCAP * NB * NDIR;
        for (let dir = 0; dir < NDIR; dir++){
          const ob = ob0 + dir*9;
          for (let c = 0; c < NCAP; c++){
            const cap = CAPS[c];
            let got = 0, m = 0;
            for (let i = 0; i < 9 && got < 6; i++){
              const fam = fo[ORD[ob+i]-1];
              let lim = cap; if (lim > fam.length) lim = fam.length; if (lim > 6-got) lim = 6-got;
              for (let j = 0; j < lim; j++) if (win[fam[j]]) m++;
              got += lim;
            }
            const ci = mBase + c*NB*NDIR + b*NDIR + dir;
            tot[ci] += m;
            if (m >= 4){ h4[ci]++; if (isTest) h4te[ci]++; else h4tr[ci]++; if (m===5) h5[ci]++; if (m===6) h6[ci]++; }
          }
        }
      }
    }
  }
  if (o % 8 === 0) console.error(`  rotation ${o}/${NOFF}  ${((Date.now()-t0)/1000).toFixed(0)}s`);
}
console.error(`swept in ${((Date.now()-t0)/1000).toFixed(0)}s`);

function decode(ci){
  const per = NMASK*NCAP*NB*NDIR;
  const o = Math.floor(ci/per); let rem = ci - o*per;
  const mk = Math.floor(rem/(NCAP*NB*NDIR)) + 1; rem -= (mk-1)*(NCAP*NB*NDIR);
  const c = Math.floor(rem/(NB*NDIR)); rem -= c*(NB*NDIR);
  return { off:OFFS[o].name, cap:CAPS[c], bonus:Math.floor(rem/NDIR), dir:(rem%NDIR)?'asc':'desc',
           srcs: LABELS.filter((_,i)=> mk & (1<<i)) };
}
const dist = {}; let mn = 1e9, mx = -1e9, ev5 = 0, ev6 = 0;
for (let i = 0; i < NCFG; i++){ dist[h4[i]] = (dist[h4[i]]||0)+1;
  if (tot[i]<mn) mn = tot[i]; if (tot[i]>mx) mx = tot[i]; ev5 += h5[i]; ev6 += h6[i]; }
console.log(`\n${NCFG.toLocaleString()} configurations x ${draws.length} draws = ${(NCFG*draws.length/1e9).toFixed(2)}B graded picks\n`);
console.log('configurations by how many 4-or-better results they landed:');
for (const k of Object.keys(dist).map(Number).sort((a,b)=>a-b))
  console.log(`   ${String(k).padStart(2)} hits : ${dist[k].toLocaleString()}`);
console.log(`\n5/6 events across the whole sweep: ${ev5.toLocaleString()}   6/6 events: ${ev6.toLocaleString()}`);
console.log(`mean matches per draw, best to worst config: ${(mx/draws.length).toFixed(3)} .. ${(mn/draws.length).toFixed(3)}   (chance 0.733)`);

const idx = Array.from({length:NCFG},(_,i)=>i).sort((a,b)=>(h4[b]-h4[a])||(tot[b]-tot[a]));
console.log(`\nTOP 15 by 4-or-better  (walk-forward split ${splitAt}: ${nTrain} train / ${nTest} test)`);
console.log('rk  4+  5/6 6/6  mean   tr  te  cap bon dir   rotation                        sources');
for (let r = 0; r < 15; r++){ const ci = idx[r], d = decode(ci);
  console.log(`${String(r+1).padStart(2)}  ${String(h4[ci]).padStart(2)}   ${String(h5[ci]).padStart(2)}  ${String(h6[ci]).padStart(2)} ${(tot[ci]/draws.length).toFixed(3)}  ${String(h4tr[ci]).padStart(3)} ${String(h4te[ci]).padStart(3)}   ${d.cap}   ${d.bonus}  ${d.dir}  ${d.off.padEnd(30)} ${d.srcs.join(',')}`);
}
// The shipped configuration, for reference. Its rotation is OFFS[0] in stage1
// but sits somewhere inside the coefficient grid in stage2 — look it up by name
// rather than assuming index 0, which silently mislabels a different config.
const SHIPPED_ROTATION = MODE === 'stage2' ? '((1*star+1*d)*pool+1*hex+1*dnum)' : OFFSETS[0].name;
const shipOff = OFFS.findIndex(o => o.name === SHIPPED_ROTATION);
if (shipOff < 0) console.log('\n(shipped rotation is not inside this sweep space — no reference line)');
else {
  const shipCi = shipOff*NMASK*NCAP*NB*NDIR + (0x7FF-1)*NCAP*NB*NDIR + 1*NB*NDIR + 1*NDIR + 0;
  console.log(`\nSHIPPED configuration (all 11 sources, cap 2, ${SHIPPED_ROTATION}, bonus on, desc):`);
  console.log(`   4+ = ${h4[shipCi]}   mean = ${(tot[shipCi]/draws.length).toFixed(3)}   (tied with ${(dist[h4[shipCi]]-1).toLocaleString()} other configurations on the same 4+ count)`);
}

const byTrain = Array.from({length:NCFG},(_,i)=>i).sort((a,b)=>(h4tr[b]-h4tr[a])||(tot[b]-tot[a]));
let sTr = 0, sTe = 0; for (let r = 0; r < 100; r++){ sTr += h4tr[byTrain[r]]; sTe += h4te[byTrain[r]]; }
let allTe = 0; for (let i = 0; i < NCFG; i++) allTe += h4te[i];
console.log(`\nHOLDOUT — take the 100 best configurations on the TRAINING half, then read the unseen half:`);
console.log(`   mean 4+ in training : ${(sTr/100).toFixed(2)}`);
console.log(`   mean 4+ on unseen   : ${(sTe/100).toFixed(2)}`);
console.log(`   whole-field average : ${(allTe/NCFG).toFixed(2)}   -> the trained winners carry ${(sTe/100/(allTe/NCFG)).toFixed(2)}x the field`);
