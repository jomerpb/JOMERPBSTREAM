// Guarantees for the Stream tab's IMDb rating path.
//
// stream.js is a browser file, so it is loaded the way the Oracle harnesses load
// oracle.js: into a Node `vm` with a stubbed DOM, then its functions are called
// directly and asserted on real values. This lane cannot see markup or CSS —
// that is what the Playwright pass is for — but it is the only place the
// decoder, the fallback rules and the filter maths get pinned.
//
// The decoder is the load-bearing one. imdb-ratings.json stores tconsts as the
// GAPS between sorted ids, so a decoder that seeds its running sum wrong, or
// that is off by one anywhere, hands every card its NEIGHBOUR's rating — a
// failure that looks like plausible data and would never throw.

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

let fails = [];
const check = (cond, label, extra = '') => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (!cond && extra ? '  ' + extra : ''));
  if (!cond) fails.push(label);
};

// ── a DOM stub just deep enough for stream.js to reach the bottom of the file ──
const noop = () => {};
function fakeEl() {
  const el = {
    style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    children: [], innerHTML: '', textContent: '', title: '',
    appendChild: noop, setAttribute: noop, getAttribute: () => null,
    removeAttribute: noop, addEventListener: noop, querySelector: () => null,
    querySelectorAll: () => [], closest: () => null, remove: noop, scrollIntoView: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  };
  return el;
}
const store = new Map();
const sandbox = {
  console,
  document: {
    getElementById: () => fakeEl(), querySelector: () => fakeEl(), querySelectorAll: () => [],
    createElement: () => fakeEl(), addEventListener: noop, body: fakeEl(),
    documentElement: fakeEl(), readyState: 'complete',
  },
  window: { addEventListener: noop, location: { hash: '' }, matchMedia: () => ({ matches: false, addEventListener: noop }) },
  history: { scrollRestoration: 'auto', pushState: noop, replaceState: noop, back: noop, state: null },
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  },
  navigator: { userAgent: 'node', onLine: true },
  location: { hash: '', href: 'http://localhost/', origin: 'http://localhost' },
  fetch: async () => { throw new Error('no network in this lane'); },
  AbortSignal: { timeout: () => ({}) },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  setTimeout, clearTimeout, setInterval, clearInterval, Image: class {},
  requestAnimationFrame: cb => setTimeout(cb, 0),
};
sandbox.window = Object.assign(sandbox.window, sandbox);
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'stream.js'), 'utf8'), ctx, { filename: 'stream.js' });
const S = name => vm.runInContext(name, ctx);

console.log('1. the gap decoder rebuilds the exact ids the builder wrote');
{
  // Drive the real loader against a stubbed fetch rather than reimplementing it.
  const payload = { d: [10, 5, 1, 1000], r: [57, 66, 100, 12] };   // ids 10,15,16,1016
  ctx.fetch = async () => ({ ok: true, json: async () => payload });
  vm.runInContext('imdbRatingsPromise = null; imdbRatings = null;', ctx);
  const m = await S('loadImdbRatings()');
  // `instanceof Map` is asked INSIDE the sandbox: a Map built in the vm context
  // has that realm's constructor, so the outer realm's `instanceof` reports
  // false on a perfectly good Map. Cross-realm identity, not a defect.
  check(await vm.runInContext('loadImdbRatings().then(x => x instanceof Map)', ctx),
        'loadImdbRatings resolves to a Map');
  check(m.size === 4, 'all four entries decoded', m && m.size);
  check([...m.keys()].join(',') === '10,15,16,1016', 'running sum is seeded at 0 and never drifts',
        m && [...m.keys()].join(','));
  check(S('imdbLookup("tt0000015")') === '6.6', 'tt0000015 -> 6.6 (zero-padded id parses)',
        S('imdbLookup("tt0000015")'));
  check(S('imdbLookup("tt1016")') === '1.2', 'ratings divide by ten', S('imdbLookup("tt1016")'));
  check(S('imdbLookup("tt0000016")') === '10.0', '100 renders as 10.0', S('imdbLookup("tt0000016")'));
  check(S('imdbLookup("tt0000011")') === null, 'an id that is not in the file returns null');
  check(S('imdbLookup("")') === null && S('imdbLookup(null)') === null, 'empty/null ids return null');
}

console.log('\n2. a malformed or failed payload degrades to null, never throws');
for (const [label, body] of [
  ['mismatched array lengths', { d: [1, 2], r: [10] }],
  ['missing arrays', { count: 5 }],
  ['arrays that are not arrays', { d: 'nope', r: 'nope' }],
]) {
  ctx.fetch = async () => ({ ok: true, json: async () => body });
  vm.runInContext('imdbRatingsPromise = null; imdbRatings = null;', ctx);
  const m = await S('loadImdbRatings()');
  check(m === null, `${label} -> null`);
}
ctx.fetch = async () => { throw new Error('offline'); };
vm.runInContext('imdbRatingsPromise = null; imdbRatings = null;', ctx);
check((await S('loadImdbRatings()')) === null, 'a network failure -> null');

console.log('\n3. scoreOf prefers IMDb and falls back to TMDB');
check(JSON.stringify(S('scoreOf({imdbScore:"8.4", score:"8.0"})')) === '{"value":"8.4","src":"IMDb"}',
      'IMDb wins when present', JSON.stringify(S('scoreOf({imdbScore:"8.4", score:"8.0"})')));
check(JSON.stringify(S('scoreOf({imdbScore:null, score:"8.0"})')) === '{"value":"8.0","src":"TMDB"}',
      'falls back to TMDB when IMDb has no entry');
check(S('scoreOf({}).value') === null, 'no score at all -> null');
check(S('scoreOf(null).value') === null, 'a null item does not throw');

console.log('\n4. the filter cuts on the DISPLAYED number, not TMDB\'s');
{
  // The whole point: a title TMDB calls 8.0 and IMDb calls 6.6 must fail "8+".
  vm.runInContext(`
    imdbRatings = new Map([[1, 66], [2, 91]]);
    imdbRatingsPromise = Promise.resolve(imdbRatings);
    imdbIdMap = {'tv:1':'tt0000001','tv:2':'tt0000002','tv:3':''};
  `, ctx);
  const items = [
    { type: 'tv', tmdb_id: 1, score: '8.0' },   // IMDb 6.6 — must be cut at 8+
    { type: 'tv', tmdb_id: 2, score: '7.1' },   // IMDb 9.1 — must survive 8+
    { type: 'tv', tmdb_id: 3, score: '8.3' },   // no IMDb entry — TMDB stands
  ];
  ctx.__items = items;
  const kept = await vm.runInContext('filterByMinScore(__items, 8)', ctx);
  const ids = kept.map(i => i.tmdb_id).join(',');
  check(ids === '2,3', 'kept the IMDb-9.1 and the TMDB-8.3 fallback, cut the IMDb-6.6', ids);
  check(items[0].imdbScore === '6.6', 'the resolved score is cached back onto the item',
        items[0].imdbScore);
  const all = await vm.runInContext('filterByMinScore(__items, undefined)', ctx);
  check(all.length === 3, 'no threshold means no filtering');
}

console.log('\n5. the server-side pre-filter margin is wide enough to be safe');
{
  const margin = S('IMDB_FILTER_MARGIN');
  check(margin >= 3, 'margin is at least 3 points', margin);
  // Measured over 234 titles from this app's own surfaces: the lowest TMDB
  // score attached to a title IMDb rates 8.0+ was 5.7, a gap of 2.3. A margin
  // below that silently drops qualifying titles before they are ever scored.
  check(8 - margin <= 5.7, 'a title at TMDB 5.7 / IMDb 8.0 still survives the "8+" pre-filter',
        `pre-filter would sit at ${8 - margin}`);
  check(9 - margin <= 8.5, 'a title at TMDB 8.5 / IMDb 9.0 still survives the "9+" pre-filter',
        `pre-filter would sit at ${9 - margin}`);
}

console.log('\n6. anime and manga are left alone');
check((await vm.runInContext('imdbScoreFor({type:"anime", al_id:5, score:"8.2"})', ctx)) === null,
      'imdbScoreFor declines an anime item');
check((await vm.runInContext('imdbScoreFor({type:"manga", al_id:5})', ctx)) === null,
      'imdbScoreFor declines a manga item');
check(JSON.stringify(S('scoreOf({type:"anime", score:"8.2"})')) === '{"value":"8.2","src":"TMDB"}',
      'an anime keeps the AniList score it already had');

console.log('\n7. the committed ratings file decodes through the real loader');
{
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'imdb-ratings.json'), 'utf8'));
  ctx.fetch = async () => ({ ok: true, json: async () => raw });
  vm.runInContext('imdbRatingsPromise = null; imdbRatings = null;', ctx);
  const m = await S('loadImdbRatings()');
  check(m && m.size === raw.count, `decoded all ${raw.count} committed titles`, m && m.size);
  // Two worked examples from the docs. If a rebuild ever shifts the gap
  // encoding, these move off their real values and this lane catches it.
  check(S('imdbLookup("tt32199328")') === '6.6', 'Newtopia reads 6.6', S('imdbLookup("tt32199328")'));
  check(S('imdbLookup("tt33764258")') === '8.4', 'The Odyssey reads 8.4', S('imdbLookup("tt33764258")'));
  const keys = [...m.keys()];
  check(keys.every((k, i) => i === 0 || k > keys[i - 1]), 'decoded ids come out strictly ascending');
}

console.log('\n' + '='.repeat(60));
console.log(`${fails.length} failure(s)` + (fails.length ? ': ' + fails.join(', ') : ''));
process.exit(fails.length ? 1 : 0);
