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
  // stream.js builds every TMDB request with `new URL(...)`, so the sandbox
  // needs the real ones rather than a stub.
  URL, URLSearchParams,
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

console.log('\n8. the IMDb browse index answers genre/type/year/rating queries');
{
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'imdb-browse.json'), 'utf8'));
  ctx.fetch = async () => ({ ok: true, json: async () => raw });
  vm.runInContext('imdbBrowsePromise = null; imdbBrowse = null;', ctx);
  const B = await S('loadImdbBrowse()');
  check(!!B, 'the committed browse index loads');
  check(await vm.runInContext('loadImdbBrowse().then(b => b.ids.length)', ctx) === raw.count,
        `decoded all ${raw.count} browsable titles`);
  check(await vm.runInContext('loadImdbBrowse().then(b => { const a=b.ids; for(let i=1;i<a.length;i++) if(a[i]<=a[i-1]) return false; return true; })', ctx),
        'decoded ids are strictly ascending');

  // Every genre id the filter UI can emit must map to a genre the index knows,
  // or that checkbox silently returns nothing.
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const uiIds = new Set();
  for (const m of html.matchAll(/id="(?:tf|mf)-genre"[\s\S]*?<\/div>\s*<\/div>/g)) {
    for (const g of m[0].matchAll(/data-val="(\d+)"/g)) uiIds.add(Number(g[1]));
  }
  const map = S('TMDB_TO_IMDB_GENRE');
  const vocab = new Set(raw.genres);
  const unmapped = [...uiIds].filter(id => !map[id]);
  const unknown = [...uiIds].flatMap(id => (map[id] || [])).filter(n => !vocab.has(n));
  check(uiIds.size > 10, `found ${uiIds.size} genre checkboxes in the markup`, uiIds.size);
  check(unmapped.length === 0, 'every filter genre id maps to IMDb genre names', unmapped.join(','));
  check(unknown.length === 0, 'every mapped name exists in the index vocabulary', unknown.join(','));

  // Horror, TV only.
  const horror = await vm.runInContext("imdbBrowseQuery({kind:'tv', genreIds:[27]})", ctx);
  check(horror.length > 100, `"Horror" on TV returns ${horror.length} titles`, horror.length);
  const allHorror = await vm.runInContext(
    "(() => { const b=imdbBrowse, bit=1<<b.genreIndex['Horror']; return imdbBrowseQuery({kind:'tv',genreIds:[27]}).every(i => (b.genre[i]&bit) && b.type[i]!==0); })()", ctx);
  check(allHorror, 'every result is Horror AND a TV type, never a movie');

  const movHorror = await vm.runInContext(
    "(() => { const b=imdbBrowse; return imdbBrowseQuery({kind:'movie',genreIds:[27]}).every(i => b.type[i]===0); })()", ctx);
  check(movHorror, 'the movie query never returns a series');

  // Year and rating bounds.
  const y = await vm.runInContext(
    "(() => { const b=imdbBrowse; const r=imdbBrowseQuery({kind:'movie',yearGte:'2020-01-01',yearLte:'2021-12-31'}); return r.length && r.every(i => b.year[i]>=2020 && b.year[i]<=2021); })()", ctx);
  check(y, 'a year envelope is respected on both ends');
  const rr = await vm.runInContext(
    "(() => { const b=imdbBrowse; const r=imdbBrowseQuery({kind:'tv',minRating:8}); return r.length && r.every(i => b.rating[i]>=80); })()", ctx);
  check(rr, 'a Min Rating of 8 returns nothing below 8.0');

  // A compound TMDB id must OR its two IMDb genres, not drop one.
  const sf = await vm.runInContext(
    "(() => { const b=imdbBrowse, s=1<<b.genreIndex['Sci-Fi'], f=1<<b.genreIndex['Fantasy']; return imdbBrowseQuery({kind:'tv',genreIds:[10765]}).every(i => b.genre[i]&(s|f)); })()", ctx);
  check(sf, '"Sci-Fi & Fantasy" matches either IMDb genre');

  // Sort: weighted, so a 9.4 from a handful of voters cannot lead.
  const top = await vm.runInContext(
    "(() => { const b=imdbBrowse; const r=imdbBrowseQuery({kind:'movie',genreIds:[27]}).slice(0,10); return r.map(i => [b.rating[i]/10, Math.round(Math.pow(2,b.votes[i]/8))]); })()", ctx);
  check(top.every(([, v]) => v > 10000), 'the top 10 horror films all have >10k votes', JSON.stringify(top.slice(0,3)));
  const scores = await vm.runInContext(
    "(() => { const b=imdbBrowse; const r=imdbBrowseQuery({kind:'movie',genreIds:[27]}).slice(0,50); return r.map(i => imdbWeighted(b.rating[i],b.votes[i],b.meanRating)); })()", ctx);
  check(scores.every((s, i) => i === 0 || s <= scores[i-1] + 1e-9), 'results come back in descending weighted order');
}

console.log('\n9. the cast list dedupes a performer credited twice');
{
  const out = await vm.runInContext(`tmdbCastList([
    {id:1,name:'A',character:'Hero',profile_path:'/a.jpg'},
    {id:1,name:'A',character:'Hero (young)'},
    {id:2,name:'B',character:'Villain',profile_path:null},
    {name:'C',character:'Extra'}
  ])`, ctx);
  check(out.length === 3, 'four credits collapse to three people', out.length);
  check(out[0].character === 'Hero / Hero (young)', 'both roles are kept on one row', out[0].character);
  check(out[0].img === '/a.jpg', 'the photo survives the merge');
  check(out[1].img === '', 'a missing photo becomes an empty string, not null');
  check(out[2].id === null, 'a credit with no person id keeps a null id');
}

console.log('\n10. the Streaming filter builds the right TMDB query');
{
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'watch-providers.json'), 'utf8'));
  ctx.fetch = async () => ({ ok: true, json: async () => raw });
  vm.runInContext('watchProvidersPromise = null; watchProviders = null;', ctx);
  const d = await S('loadWatchProviders()');
  check(!!d, 'the committed provider list loads');
  check(d.tv.length >= 5 && d.movie.length >= 5,
        `carries ${d.tv.length} TV and ${d.movie.length} movie services`);

  const built = await vm.runInContext(`(() => {
    const u = new URL('https://api.themoviedb.org/3/discover/tv');
    const used = applyProviderParams(u, ['8','1899']);
    return { used, qs: u.search };
  })()`, ctx);
  check(built.used === true, 'applyProviderParams reports it changed the query');
  check(/with_watch_providers=8%7C1899/.test(built.qs),
        'several services are OR-joined with a pipe', built.qs);
  check(/watch_region=/.test(built.qs),
        'watch_region is always sent — TMDB ignores the provider without it', built.qs);
  check(/with_watch_monetization_types=flatrate/.test(built.qs),
        'only subscription titles, never rent/buy', built.qs);

  const none = await vm.runInContext(`(() => {
    const u = new URL('https://api.themoviedb.org/3/discover/tv');
    return { used: applyProviderParams(u, []), qs: u.search };
  })()`, ctx);
  check(none.used === false && none.qs === '',
        'no services checked leaves the query untouched');
}

console.log('\n11. genres TMDB\'s TV list refuses are held back, not dropped');
{
  // The real /genre/tv/list vocabulary. Horror(27), Thriller(53), Fantasy(14)
  // and Action(28) are absent from it — measured, each returns 0 results.
  ctx.__tvGenres = { genres: [
    {id:10759,name:'Action & Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},
    {id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},
    {id:10751,name:'Family'},{id:10762,name:'Kids'},{id:9648,name:'Mystery'},
    {id:10763,name:'News'},{id:10764,name:'Reality'},{id:10765,name:'Sci-Fi & Fantasy'},
    {id:10766,name:'Soap'},{id:10767,name:'Talk'},{id:10768,name:'War & Politics'},
    {id:37,name:'Western'} ] };
  vm.runInContext('tmdbTvGenrePromise = null; tmdbTvGenreIds = null; tmdb = async () => __tvGenres;', ctx);

  const tv = await vm.runInContext("splitGenresForTmdb('tv',[27,18,53,80])", ctx);
  check(JSON.stringify(tv.server) === '[18,80]', 'Drama and Crime go to TMDB', JSON.stringify(tv.server));
  check(JSON.stringify(tv.client) === '[27,53]', 'Horror and Thriller are held back', JSON.stringify(tv.client));

  const mv = await vm.runInContext("splitGenresForTmdb('movie',[27,18,53])", ctx);
  check(mv.client.length === 0 && mv.server.length === 3,
        'movies use TMDB\'s full list, so nothing is held back');

  const empty = await vm.runInContext("splitGenresForTmdb('tv',[])", ctx);
  check(empty.server.length === 0 && empty.client.length === 0, 'no genres in, none out');
}

console.log('\n12. the held-back genres are matched against the IMDb index');
{
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'imdb-browse.json'), 'utf8'));
  ctx.fetch = async () => ({ ok: true, json: async () => raw });
  vm.runInContext('imdbBrowsePromise = null; imdbBrowse = null;', ctx);
  await S('loadImdbBrowse()');

  // Pick a real Horror row and a real non-Horror row straight out of the index.
  const picked = await vm.runInContext(`(() => {
    const b = imdbBrowse, bit = 1 << b.genreIndex['Horror'];
    let yes = null, no = null;
    for (let i = 0; i < b.ids.length && !(yes && no); i++) {
      if ((b.genre[i] & bit) && !yes) yes = b.ids[i];
      else if (!(b.genre[i] & bit) && b.genre[i] && !no) no = b.ids[i];
    }
    return { yes, no };
  })()`, ctx);
  const tt = n => 'tt' + String(n).padStart(7, '0');
  check(await vm.runInContext(`matchesImdbGenres({imdb_id:'${tt(picked.yes)}'},[27])`, ctx),
        'a Horror title matches the Horror filter', tt(picked.yes));
  check(!(await vm.runInContext(`matchesImdbGenres({imdb_id:'${tt(picked.no)}'},[27])`, ctx)),
        'a non-Horror title does not', tt(picked.no));
  check(await vm.runInContext("matchesImdbGenres({imdb_id:'tt0000001'},[])", ctx),
        'an empty genre list matches everything');
  check(!(await vm.runInContext("matchesImdbGenres({},[27])", ctx)),
        'an item with no IMDb id cannot match');
  check(!(await vm.runInContext("matchesImdbGenres({imdb_id:'tt9999999999'},[27])", ctx)),
        'an id absent from the index does not match');
  // The binary search must agree with a linear scan on every probe.
  check(await vm.runInContext(`(() => {
    const b = imdbBrowse, bit = 1 << b.genreIndex['Horror'];
    for (let k = 0; k < 400; k++) {
      const i = (k * 457) % b.ids.length;
      const want = !!(b.genre[i] & bit);
      const got = matchesImdbGenres({imdb_id:'tt'+b.ids[i]}, [27]);
      if (want !== got) return false;
    }
    return true;
  })()`, ctx), 'binary search agrees with the index on 400 probes');
}

console.log('\n' + '='.repeat(60));
console.log(`${fails.length} failure(s)` + (fails.length ? ': ' + fails.join(', ') : ''));
process.exit(fails.length ? 1 : 0);
