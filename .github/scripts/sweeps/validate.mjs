// Proves lib.mjs's parameterised selection stage reproduces the SHIPPED engine
// exactly, at the shipped configuration, on every 6-ball draw on file.
// Nothing a sweep prints means anything unless this passes.
//
// Usage: node .github/scripts/sweeps/validate.mjs
import { POOL, OFFSETS, famOrders, sortedDigits, pick, loadReadings } from './lib.mjs';

const { draws, readings, baseline } = loadReadings();
const ALL_SOURCES = 0x7FF;      // all 11
const SHIPPED_CAP = 2;          // FAMILY_CAP for a 6-ball game
let ok = 0; const bad = [];
for (const dr of draws){
  const r = readings[dr.date], pool = POOL[dr.game];
  const got  = pick(sortedDigits(r.srcBits, ALL_SOURCES, false),
                    famOrders(r, pool, OFFSETS[0].fn, true), SHIPPED_CAP);
  const want = baseline[dr.game + '|' + dr.date];
  if (JSON.stringify(got) === JSON.stringify(want)) ok++;
  else if (bad.length < 5) bad.push({ ...dr, got, want });
}
console.log(`baseline reproduction vs computeOracleAsOf(): ${ok}/${draws.length} identical`);
if (bad.length){ console.log(JSON.stringify(bad, null, 1)); process.exit(1); }
console.log('PASS — the sweep picker is the shipped picker.');
