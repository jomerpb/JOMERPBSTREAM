// Extracts the per-DATE reading primitives convergence() consumes, by running
// the REAL layer functions inside the vm-sandboxed oracle.js.
//
// The eleven convergence sources depend on (date, drawHour) only — never on the
// game — so one extraction per date serves all five 6-ball games. Writes
// readings.json next to this file (gitignored); every other script reads it.
//
// Usage: node .github/scripts/sweeps/extract.mjs
import fs from 'fs';
import { loadOracleEngine, loadDraws, readingsPath } from './lib.mjs';

const draws = loadDraws();
const dates = [...new Set(draws.map(d=>d.date))].sort();
console.error(`draws=${draws.length}  unique dates=${dates.length}`);

const sb = loadOracleEngine();
await sb.PCSO_HISTORY_READY;
if (!sb.PCSO_HISTORY_STATUS.loaded)
  throw new Error('engine failed to load pcso-history.json: ' + sb.PCSO_HISTORY_STATUS.error);

const readings = {};
const t0 = Date.now();
for (const ds of dates){
  const [y,m,d] = ds.split('-').map(Number);
  const saved = { _D:sb._D, _M:sb._M, _Y:sb._Y, _DOW:sb._DOW };
  sb._D = d; sb._M = m; sb._Y = y; sb._DOW = new Date(y, m-1, d).getDay();
  try {
    const num   = sb.layerNumerology('9PM');
    const astro = sb.layerAstrology('9PM');
    const bazi  = sb.layerBazi('9PM');
    const fsl   = sb.layerFengshui();
    const ich   = sb.layerIChing('9PM');
    const tar   = sb.layerTarot('9PM');
    const ang   = sb.layerAngelNumbers('9PM');
    let energy = null; try { energy = sb.calcEnergy(bazi, astro, fsl); } catch { energy = null; }
    const enN = sb.energyDigits(energy) || [];
    const hoN = (astro && astro.horaryNums) || [];
    const chRed = (num.chNums || []).map(n => sb.reduce(n));

    // convergence() PASS 1, verbatim source order:
    // 0 Py  1 Ch  2 As  3 Ba  4 Fs  5 IC  6 PoF  7 Ta  8 An  9 Ho  10 En
    const srcBits = [];
    for (let dg = 1; dg <= 9; dg++){
      let b = 0;
      if ((num.pyNums    || []).includes(dg)) b |= 1<<0;
      if (chRed.includes(dg))                 b |= 1<<1;
      if ((astro.nums    || []).includes(dg)) b |= 1<<2;
      if ((bazi.nums     || []).includes(dg)) b |= 1<<3;
      if ((fsl.nums      || []).includes(dg)) b |= 1<<4;
      if ((ich.nums      || []).includes(dg)) b |= 1<<5;
      if ((astro.pofNums || []).includes(dg)) b |= 1<<6;
      if ((tar.nums      || []).includes(dg)) b |= 1<<7;
      if ((ang.nums      || []).includes(dg)) b |= 1<<8;
      if (hoN.includes(dg))                   b |= 1<<9;
      if (enN.includes(dg))                   b |= 1<<10;
      srcBits.push(b);
    }
    const hexRaw = ich && ich.hex;
    readings[ds] = {
      srcBits,
      loShu: (fsl && fsl.loShu) || {},
      cardN:    (typeof tar.cardNum === 'number') ? tar.cardNum : null,
      dateSumN: (typeof tar.rawSum  === 'number') ? tar.rawSum  : null,
      hexN: hexRaw ? (typeof hexRaw === 'object' ? hexRaw.num : hexRaw) : null,
      nucN: (hexRaw && typeof hexRaw === 'object' && hexRaw.nuclear && typeof hexRaw.nuclear.num === 'number') ? hexRaw.nuclear.num : null,
      chgN: (hexRaw && typeof hexRaw === 'object' && hexRaw.changed && typeof hexRaw.changed.num === 'number') ? hexRaw.changed.num : null,
      angelDigits: (ang.nums || []).slice(),
    };
  } finally {
    sb._D = saved._D; sb._M = saved._M; sb._Y = saved._Y; sb._DOW = saved._DOW;
  }
}

// What the SHIPPED engine actually picks for each graded draw — validate.mjs
// compares the parameterised copy against this.
const baseline = {};
for (const dr of draws) baseline[dr.game + '|' + dr.date] = sb.computeOracleAsOf(dr.game, dr.date);

fs.writeFileSync(readingsPath(), JSON.stringify({ draws, readings, baseline }));
console.error(`wrote readings.json in ${((Date.now()-t0)/1000).toFixed(1)}s`);
