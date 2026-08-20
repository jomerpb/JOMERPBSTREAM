// THE FORWARD TEST — the only genuinely out-of-sample evidence that exists.
//
// oracle-history.json holds picks the daily snapshot job wrote at 00:05 Manila,
// BEFORE that day's 9PM draws, and committed to git. Nothing selected them after
// the fact and no sweep touched them: they are pre-registered predictions.
// This grades them against the draws that later happened.
//
// Usage: node .github/scripts/sweeps/forward.mjs
import fs from 'fs';
import path from 'path';
import { ROOT, POOL, SLASH_TO_KEY } from './lib.mjs';

const log  = JSON.parse(fs.readFileSync(path.join(ROOT,'oracle-history.json'),'utf8'));
const hist = JSON.parse(fs.readFileSync(path.join(ROOT,'pcso-history.json'),'utf8'));
const byGameDate = {};
for (const [slash, gk] of Object.entries(SLASH_TO_KEY))
  for (const e of hist[slash] || [])
    if (e && e.date && Array.isArray(e.nums)) byGameDate[gk+'|'+e.date] = e.nums;
const ez2ByDate = {};
for (const e of hist.ez2 || []) if (e && e.date) ez2ByDate[e.date] = e.draws || {};

function C(n,k){ if(k<0||k>n) return 0; let r=1; for(let i=0;i<k;i++) r=r*(n-i)/(i+1); return r; }

const dist=[0,0,0,0,0,0,0]; let n=0, totM=0, expM=0, lam=0;
const perGame={}; const notable=[];
for (const entry of log.entries){
  for (const gk of ['642','645','649','655','658']){
    const pick = entry.picks && entry.picks[gk];
    const drawn = byGameDate[gk+'|'+entry.date];
    if (!Array.isArray(pick) || !Array.isArray(drawn)) continue;   // no draw on file yet
    const w = new Set(drawn);
    let m = 0; for (const x of pick) if (w.has(x)) m++;
    const pool = POOL[gk];
    n++; totM += m; dist[m]++; expM += 36/pool;
    lam += (C(6,4)*C(pool-6,2) + C(6,5)*C(pool-6,1) + 1) / C(pool,6);
    (perGame[gk] = perGame[gk] || {n:0,tot:0,best:0});
    perGame[gk].n++; perGame[gk].tot += m; if (m > perGame[gk].best) perGame[gk].best = m;
    if (m >= 3) notable.push({date:entry.date, gk, pick, drawn:drawn.slice().sort((a,b)=>a-b), m,
                              hit:pick.filter(x=>w.has(x)), sha:entry.engineSha});
  }
}
console.log(`PRE-REGISTERED PICKS GRADED — ${log.entries.length} logged days, ${log.entries[log.entries.length-1].date} to ${log.entries[0].date}\n`);
console.log(`6-ball picks with a draw now on file: ${n}`);
console.log(`match distribution 0..6 : ${dist.join(' / ')}`);
console.log(`mean matches            : ${(totM/n).toFixed(3)}   (chance for this exact mix: ${(expM/n).toFixed(3)})`);
console.log(`4-or-better             : ${dist[4]+dist[5]+dist[6]}   (chance expected: ${lam.toFixed(2)})`);
// how far from chance is that mean, really?
let varTot = 0;
for (const entry of log.entries) for (const gk of ['642','645','649','655','658']){
  if (!Array.isArray(entry.picks && entry.picks[gk]) || !Array.isArray(byGameDate[gk+'|'+entry.date])) continue;
  const p = POOL[gk]; varTot += 6*(6/p)*(1-6/p)*((p-6)/(p-1));
}
const sd = Math.sqrt(varTot);
console.log(`z-score of the mean      : ${((totM-expM)/sd >= 0 ? '+' : '')}${((totM-expM)/sd).toFixed(2)}   (total ${totM} vs ${expM.toFixed(1)} expected, s.d. ${sd.toFixed(1)})`);
console.log(`\nper game:   picks  mean   best`);
for (const g of ['642','645','649','655','658']){ const G=perGame[g]; if(!G) continue;
  console.log(`   6/${POOL[g]}      ${String(G.n).padStart(3)}  ${(G.tot/G.n).toFixed(3)}    ${G.best}`); }
if (notable.length){
  console.log(`\n3-or-better among the pre-registered picks:`);
  for (const x of notable.sort((a,b)=>b.m-a.m))
    console.log(`  ${x.date}  6/${POOL[x.gk]}  drawn ${x.drawn.map(v=>String(v).padStart(2,'0')).join('-')}  picked ${x.pick.map(v=>String(v).padStart(2,'0')).join('-')}  ${x.m} matched: ${x.hit.join(',')}`);
} else console.log('\nno pre-registered pick reached 3 matches.');

// EZ2, scored the way the Look Up panel does (per draw time)
let e2n=0,e2hit=0,e2both=0;
for (const entry of log.entries){
  const p = entry.picks && entry.picks.ez2, d = ez2ByDate[entry.date];
  if (!p || !d) continue;
  for (const hh of ['2PM','5PM','9PM']){
    if (!Array.isArray(p[hh]) || !Array.isArray(d[hh]) || d[hh].length !== 2) continue;
    e2n++;
    const w = new Set(d[hh]); const m = p[hh].filter(x=>w.has(x)).length;
    if (m >= 1) e2hit++; if (m === 2) e2both++;
  }
}
if (e2n) console.log(`\nEZ2: ${e2n} pre-registered draws — at least one number right ${e2hit}, both right ${e2both}`);
