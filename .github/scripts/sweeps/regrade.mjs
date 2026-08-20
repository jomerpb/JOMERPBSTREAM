// Independently re-grades one configuration by rebuilding its picks from
// scratch and scoring them STRAIGHT from pcso-history.json on disk — bypassing
// every cached structure the sweeps use. This is what catches a sweep that
// reports a score its own configuration does not actually have.
//
// Reads climb.result.json's ceiling by default, or pass a configuration:
//   node .github/scripts/sweeps/regrade.mjs
//   CFG='{"mask":1786,"cap":3,"dir":1,"off":[2,1,1,5,1,2,6,2,2]}' node ...
import fs from 'fs';
import path from 'path';
import { POOL, LABELS, families, loadReadings, loadDraws, HERE } from './lib.mjs';

let cfg;
if (process.env.CFG) cfg = JSON.parse(process.env.CFG);
else {
  const p = path.join(HERE,'climb.result.json');
  if (!fs.existsSync(p)) throw new Error('no climb.result.json — run climb.mjs first, or pass CFG=');
  cfg = JSON.parse(fs.readFileSync(p,'utf8')).ceiling;
}
const { readings } = loadReadings();
const rows = loadDraws();     // re-read from pcso-history.json, not from the cache
console.log(`CONFIGURATION: sources=[${LABELS.filter((_,i)=>cfg.mask&(1<<i)).join(',')}] cap=${cfg.cap} order=${cfg.dir?'asc':'desc'} rot=[${cfg.off.join(',')}]\n`);

function makePick(game, date){
  const pool = POOL[game], fam = families(pool), r = readings[date], a = [];
  for (let d = 1; d <= 9; d++){ let b = r.srcBits[d-1] & cfg.mask, c = 0; while (b){ b &= b-1; c++; } a.push([d,c]); }
  a.sort((x,y)=> cfg.dir ? x[1]-y[1] : y[1]-x[1]);
  const out = [];
  for (let i = 0; i < 9 && out.length < 6; i++){
    const d = a[i][0], f = fam[d], kk = f.length, o = cfg.off[d-1];
    for (let j = 0; j < cfg.cap && j < kk && out.length < 6; j++) out.push(f[(o+j)%kk]);
  }
  return out.sort((x,y)=>x-y);
}
const dist = [0,0,0,0,0,0,0], perGame = {}, wins = [], uniq = new Set();
let totM = 0;
for (const row of rows){
  const p = makePick(row.game, row.date), w = new Set(row.nums);
  let m = 0; for (const n of p) if (w.has(n)) m++;
  totM += m; dist[m]++;
  uniq.add(row.game + ':' + p.join('-'));
  (perGame[row.game] = perGame[row.game] || { n:0, h4:0, tot:0 });
  perGame[row.game].n++; perGame[row.game].tot += m; if (m >= 4) perGame[row.game].h4++;
  if (m >= 4) wins.push({ ...row, pick:p, m, hit:p.filter(x=>w.has(x)) });
}
console.log(`re-graded ${rows.length} draws straight from pcso-history.json`);
console.log(`matches 0..6: ${dist.join(' / ')}    mean = ${(totM/rows.length).toFixed(3)}  (chance 0.733)`);
console.log(`4-or-better  = ${wins.length}\n`);
for (const h of wins.sort((a,b)=>a.date<b.date?-1:1))
  console.log(`  ${h.date}  6/${POOL[h.game]}  drawn ${h.nums.map(n=>String(n).padStart(2,'0')).join('-')}   picked ${h.pick.map(n=>String(n).padStart(2,'0')).join('-')}   ${h.m} matched: ${h.hit.join(',')}`);
console.log('\nper game:   draws   4+    mean');
for (const g of ['642','645','649','655','658']){ const G = perGame[g];
  console.log(`   6/${POOL[g]}     ${String(G.n).padStart(4)}   ${String(G.h4).padStart(2)}   ${(G.tot/G.n).toFixed(3)}`); }
console.log(`\ndistinct picks this configuration emits across ${rows.length} game-dates: ${uniq.size}`);
