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
// A TMDB mean off too few votes is not a rating. Resident Evil was scored 10.0
// off ONE vote and led the whole Upcoming grid once the grids became ordered.
check(S('scoreOf({score:"10.0", votes:1}).value') === null,
      'a TMDB mean off 1 vote prints nothing', JSON.stringify(S('scoreOf({score:"10.0", votes:1})')));
check(S(`scoreOf({score:"8.0", votes:${S('TMDB_VOTE_FLOOR')} - 1}).value`) === null,
      'just under the floor is dropped');
check(S(`scoreOf({score:"8.0", votes:${S('TMDB_VOTE_FLOOR')}}).value`) === '8.0',
      'exactly at the floor is kept');
check(S('scoreOf({score:"8.0"}).value') === '8.0',
      'an unknown vote count is left alone, not treated as zero');
// The floor must never touch IMDb's number — it cleared IMDb's own floor, and
// 77 of 259 IMDb-rated titles in the sample carry under 100 TMDB votes.
check(S('scoreOf({imdbScore:"8.4", score:"9.9", votes:2}).value') === '8.4',
      'a thin TMDB vote count does not suppress IMDb\'s rating');

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
  // Stub tmdb() itself, and PUT IT BACK afterwards. Left in place it leaks into
  // every later test: the genre list came back from /external_ids and a whole
  // block silently scored against TMDB's number instead of IMDb's.
  vm.runInContext('__realTmdb = tmdb; tmdbTvGenrePromise = null; tmdbTvGenreIds = null; tmdb = async () => __tvGenres;', ctx);

  const tv = await vm.runInContext("splitGenresForTmdb('tv',[27,18,53,80])", ctx);
  check(JSON.stringify(tv.server) === '[18,80]', 'Drama and Crime go to TMDB', JSON.stringify(tv.server));
  check(JSON.stringify(tv.client) === '[27,53]', 'Horror and Thriller are held back', JSON.stringify(tv.client));

  const mv = await vm.runInContext("splitGenresForTmdb('movie',[27,18,53])", ctx);
  check(mv.client.length === 0 && mv.server.length === 3,
        'movies use TMDB\'s full list, so nothing is held back');

  const empty = await vm.runInContext("splitGenresForTmdb('tv',[])", ctx);
  check(empty.server.length === 0 && empty.client.length === 0, 'no genres in, none out');
  vm.runInContext('tmdb = __realTmdb; tmdbTvGenrePromise = null; tmdbTvGenreIds = null;', ctx);
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

console.log('\n13. Status is filtered from IMDb dates, which TMDB cannot do at all');
{
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'imdb-browse.json'), 'utf8'));
  ctx.fetch = async () => ({ ok: true, json: async () => raw });
  vm.runInContext('imdbBrowsePromise = null; imdbBrowse = null;', ctx);
  const B = await S('loadImdbBrowse()');
  check(!!B, 'the index with the end-year column loads');
  check(await vm.runInContext('loadImdbBrowse().then(b => b.endYear.length === b.ids.length)', ctx),
        'the end-year column is decoded alongside the ids');

  // Ten shows whose real status is public knowledge. The naive "endYear is set"
  // reading gets 9 of these — it calls The Boys finished because IMDb records an
  // announced final year. This rule must get all ten.
  const KNOWN = [
    ['tt0903747','Breaking Bad','done'], ['tt0944947','Game of Thrones','done'],
    ['tt2560140','Attack on Titan','done'], ['tt1520211','The Walking Dead','done'],
    ['tt5491994','Planet Earth II','done'], ['tt0096697','The Simpsons','ongoing'],
    ['tt1190634','The Boys','ongoing'], ['tt13406094','The Last of Us','ongoing'],
    ['tt11280740','Severance','ongoing'],
  ];
  let agree = 0, missing = 0;
  for (const [tc, name, want] of KNOWN) {
    const got = await vm.runInContext(`(() => {
      const b = imdbBrowse, n = ${parseInt(tc.slice(2), 10)};
      let lo = 0, hi = b.ids.length - 1;
      while (lo <= hi) { const m = (lo+hi)>>1;
        if (b.ids[m] === n) return imdbStatusOf(b, m, ${new Date().getFullYear()});
        if (b.ids[m] < n) lo = m+1; else hi = m-1; }
      return 'ABSENT';
    })()`, ctx);
    if (got === 'ABSENT') { missing++; continue; }
    if (got === want) agree++;
    else check(false, `${name} reads ${got}, expected ${want}`);
  }
  check(missing === 0, 'every known show is in the index', `${missing} absent`);
  check(agree === KNOWN.length, `all ${KNOWN.length} known shows read correctly`, agree);

  // The query must actually cut on it.
  const done = await vm.runInContext("imdbBrowseQuery({kind:'tv', statuses:['ended']})", ctx);
  const ongoing = await vm.runInContext("imdbBrowseQuery({kind:'tv', statuses:['returning']})", ctx);
  const all = await vm.runInContext("imdbBrowseQuery({kind:'tv'})", ctx);
  check(done.length > 1000 && ongoing.length > 1000, 'both statuses return a real catalogue',
        `${done.length} / ${ongoing.length}`);
  check(done.length + ongoing.length <= all.length + 5,
        'the two partitions do not overlap meaningfully', `${done.length}+${ongoing.length} vs ${all.length}`);
  check(await vm.runInContext(`(() => { const b=imdbBrowse, y=${new Date().getFullYear()};
    return imdbBrowseQuery({kind:'tv',statuses:['ended']}).every(i => imdbStatusOf(b,i,y)==='done'); })()`, ctx),
    'every "Completed" result really reads as finished');

  // Canceled selects the same set as Completed — IMDb draws no distinction.
  const canc = await vm.runInContext("imdbBrowseQuery({kind:'tv', statuses:['canceled']})", ctx);
  check(canc.length === done.length, 'Canceled maps onto Completed (IMDb has no separate flag)');

  // Two boxes ticked is OR, like every other multi-select.
  const both = await vm.runInContext("imdbBrowseQuery({kind:'tv', statuses:['ended','returning']})", ctx);
  check(both.length >= done.length && both.length >= ongoing.length,
        'ticking both statuses widens rather than narrows', both.length);

  // The regression this whole change is about.
  const users = await vm.runInContext(
    "imdbBrowseQuery({kind:'tv', minRating:8, yearGte:'2026-01-01', yearLte:'2026-12-31'})", ctx);
  check(users.length > 100,
        `"TV, 2026, 8.0+" now returns ${users.length} candidates (TMDB path gave 21)`, users.length);
}

console.log('\n14. browse grids are sorted by the DISPLAYED rating, descending');
{
  // A RECORDING DOM. renderGrid() paints into it, so this reads the order the
  // grid actually ended up in rather than trusting the comparator in isolation.
  // href is reflected property → attribute the way a real <a> does it, because
  // the scroll anchor reads it back with getAttribute.
  const mkEl = () => {
    const attrs = new Map();
    const el = {
      style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      children: [], innerHTML: '', textContent: '', title: '',
      appendChild(c) { el.children.push(c); return c; },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: k => (attrs.has(k) ? attrs.get(k) : null),
      removeAttribute: k => attrs.delete(k),
      addEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
      closest: () => null, remove: noop, scrollIntoView: noop,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    };
    Object.defineProperty(el, 'href', {
      get: () => attrs.get('href') || '', set: v => attrs.set('href', String(v)),
    });
    // Assigning innerHTML replaces the element's contents, so the stub has to
    // drop its children too — otherwise a repaint reads as an append and the
    // test can no longer tell a sorted pool from a stack of sorted pages.
    Object.defineProperty(el, 'innerHTML', { get: () => '', set: () => { el.children.length = 0; el.paints++; } });
    el.paints = 0;
    return el;
  };
  const grids = new Map();
  const realGetById = ctx.document.getElementById;
  const realCreate  = ctx.document.createElement;
  ctx.document.getElementById = id => {
    if (!grids.has(id)) grids.set(id, mkEl());
    return grids.get(id);
  };
  ctx.document.createElement = () => mkEl();

  // Ratings for tt0001001..tt0001010, gap-encoded the way the real file is.
  const RATE = [72, 95, 61, 88, 88, 50, 99, 67, 83, 74];   // ×10
  ctx.fetch = async (u) => {
    const url = String(u);
    if (url.includes('imdb-ratings.json')) {
      return { ok: true, json: async () => ({ d: [1001, 1, 1, 1, 1, 1, 1, 1, 1, 1], r: RATE }) };
    }
    if (url.includes('/external_ids')) {
      const id = parseInt(url.match(/\/(?:tv|movie)\/(\d+)\/external_ids/)[1], 10);
      return { ok: true, json: async () => ({ imdb_id: 'tt' + String(1000 + id).padStart(7, '0') }) };
    }
    throw new Error('unexpected fetch ' + url);
  };
  vm.runInContext('imdbRatingsPromise = null; imdbRatings = null; imdbIdMap = {};', ctx);
  store.clear();

  // tmdb id N carries IMDb rating RATE[N-1]/10, and a TMDB vote_average that
  // deliberately disagrees — sorting on the wrong one is visible immediately.
  // Built INSIDE the vm so every item is an inner-realm object, the way a real
  // fromTMDB() result is.
  vm.runInContext(`function __mk(n, type){
    return {type, id:n, tmdb_id:n, title:'T'+n, score:(10 - n/10).toFixed(1)};
  }`, ctx);
  const page = (from, to, type = 'tv') =>
    vm.runInContext(`[${Array.from({length: to - from + 1}, (_, k) => `__mk(${from + k}, '${type}')`).join(',')}]`, ctx);

  const shown = id => grids.get(id).children.map(c => c.getAttribute('href').replace('#detail-tv-', ''));
  const rating = href => (RATE[parseInt(href, 10) - 1] / 10);

  // (a) the key is the printed number, and unrated sinks below every rating
  const key = vm.runInContext(`[gridRatingOf({score:'7.4'}), gridRatingOf({imdbScore:'6.6', score:'8.0'}), gridRatingOf({})]`, ctx);
  check(key[0] === 7.4 && key[1] === 6.6 && key[2] === -1,
        'gridRatingOf reads IMDb over TMDB, and unrated sorts last', JSON.stringify(key));

  // (b) one page paints in descending order of the IMDb number
  ctx.__p1 = page(1, 5);
  await vm.runInContext("renderRatedGrid('tv-grid', __p1, false, undefined)", ctx);
  const one = shown('tv-grid');
  check(one.length === 5, 'page 1 painted every card', one.length);
  check(one.every((h, i) => i === 0 || rating(one[i - 1]) >= rating(h)),
        'page 1 is descending by the IMDb rating', one.map(h => `${h}=${rating(h)}`).join(' '));
  check(rating(one[0]) === 9.5, 'the highest-rated title leads the grid', rating(one[0]));

  // (c) THE SAWTOOTH TEST. Page 2 carries the best title in the set; appending
  // must re-sort the whole pool, not stack a second descending run underneath.
  ctx.__p2 = page(6, 10);
  await vm.runInContext("renderRatedGrid('tv-grid', __p2, true, undefined)", ctx);
  const two = shown('tv-grid');
  check(two.length === 10, 'both pages are on screen', two.length);
  check(two.every((h, i) => i === 0 || rating(two[i - 1]) >= rating(h)),
        'the POOL is descending, not each page separately',
        two.map(h => `${h}=${rating(h)}`).join(' '));
  check(two[0] === '7', "page 2's 9.9 sorted to the very top", two[0]);
  const perPage = [...one, ...page(6, 10).map(x => String(x.id))];
  check(perPage.some((h, i) => i && rating(perPage[i - 1]) < rating(h)),
        'control: sorting the pages separately really would sawtooth');

  // (d) a title arriving twice is rendered once
  await vm.runInContext("renderRatedGrid('tv-grid', __p1, true, undefined)", ctx);
  check(shown('tv-grid').length === 10, 'a repeated page adds no duplicate cards', shown('tv-grid').length);

  // (e) equal ratings keep the order the source ranked them in (4 and 5 are both 8.8)
  const at4 = two.indexOf('4'), at5 = two.indexOf('5');
  check(at4 >= 0 && at5 === at4 + 1, 'a tie keeps the source ranking (stable sort)', `${at4},${at5}`);

  // (f) a render whose token is stale paints nothing — a second tab tap wins
  const stale = vm.runInContext("nextGridRun('movies-grid')", ctx);
  vm.runInContext("nextGridRun('movies-grid')", ctx);
  ctx.__p3 = page(1, 3, 'movie');
  await vm.runInContext(`renderRatedGrid('movies-grid', __p3, false, ${stale})`, ctx);
  check(!grids.has('movies-grid') || grids.get('movies-grid').children.length === 0,
        'a superseded load does not paint over the newer grid');

  // (g) a resolved item marks its card done, so a repaint skips hydration
  const done = vm.runInContext(`(() => {
    const el = document.createElement('a');
    markImdbTarget(el, {type:'tv', tmdb_id: 1, imdbScore: '7.2'});
    const el2 = document.createElement('a');
    markImdbTarget(el2, {type:'tv', tmdb_id: 2});
    return [el.getAttribute('data-imdb-done'), el.getAttribute('data-imdb-key'),
            el2.getAttribute('data-imdb-done'), el2.getAttribute('data-imdb-key')];
  })()`, ctx);
  check(done[0] === '1' && done[1] === 'tv:1', 'an already-resolved card is marked done', JSON.stringify(done));
  check(done[2] === null && done[3] === 'tv:2', 'an unresolved card still queues for hydration', JSON.stringify(done));

  // (h) THE PAINT COUNT IS THE DESIGN. An unresolved pool must paint once
  // straight away and again when the lookups land — blocking on the lookup
  // measured 14,042 ms of skeleton on a 1.5 Mbps profile. A pool with nothing
  // left to resolve must paint exactly once, with no reshuffle to watch.
  grids.delete('tv-grid');
  vm.runInContext("nextGridRun('tv-grid')", ctx);
  ctx.__p4 = page(1, 5);
  await vm.runInContext("renderRatedGrid('tv-grid', __p4, false, undefined)", ctx);
  check(grids.get('tv-grid').paints === 2,
        'an unresolved page paints immediately, then repaints in order',
        String(grids.get('tv-grid').paints));

  // Same items, now carrying answers — one paint, no reshuffle.
  grids.delete('tv-grid');
  vm.runInContext("nextGridRun('tv-grid')", ctx);
  await vm.runInContext("renderRatedGrid('tv-grid', __p4, false, undefined)", ctx);
  check(grids.get('tv-grid').paints === 1,
        'a pool with every score already known paints exactly once',
        String(grids.get('tv-grid').paints));

  // Anime never touches IMDb, so it is always the single-paint case.
  grids.delete('anime-grid');
  vm.runInContext(`__an = [{type:'anime',al_id:1,title:'A',score:'7.0'},
                          {type:'anime',al_id:2,title:'B',score:'9.0'}]`, ctx);
  await vm.runInContext("renderRatedGrid('anime-grid', __an, false, undefined)", ctx);
  check(grids.get('anime-grid').paints === 1, 'an anime grid paints once',
        String(grids.get('anime-grid').paints));
  check(grids.get('anime-grid').children.map(c => c.getAttribute('href')).join() ===
        '#detail-anime-2,#detail-anime-1', 'and is still sorted by AniList\'s score');

  ctx.document.getElementById = realGetById;
  ctx.document.createElement = realCreate;
}

console.log('\n15. a card that paints with NO rating can still be filled in later');
// The bug this pins: resolveImdbCards() can only UPDATE a .js-score element it
// finds, and the builders used to emit none at all when scoreOf() returned
// null. So a title with a weak TMDB score but a real IMDb one was blank
// forever on every surface that does not repaint — the home rows, Search and
// the actor filmography grid. Measured in Chromium before the fix: for
// 2 Days and 1 Night (TMDB 6.7 off 30 votes, IMDb 8.2 off 310) imdbScoreFor()
// returned "8.2" and the card stayed empty.
{
  const realCreate = ctx.document.createElement;
  // innerHTML is a plain string on the stub, which is all this needs: the
  // assertion is about what the builder EMITS, not how it renders.
  ctx.document.createElement = () => {
    const el = { style: {}, dataset: {}, cssText: '',
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      innerHTML: '', textContent: '', title: '', hidden: false,
      setAttribute: () => {}, getAttribute: () => null, appendChild: () => {},
      addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] };
    Object.defineProperty(el, 'style', { value: { cssText: '' }, writable: true });
    return el;
  };

  const blank = { type: 'tv', id: 1, tmdb_id: 1, title: 'Blank', score: '6.7', votes: 30 };
  const rated = { type: 'tv', id: 2, tmdb_id: 2, title: 'Rated', score: '8.0', votes: 900 };

  for (const [name, fn] of [['buildGridCard', 'buildGridCard'], ['buildSmCard', 'buildSmCard']]) {
    vm.runInContext(`__blank = ${JSON.stringify(blank)}; __rated = ${JSON.stringify(rated)};`, ctx);
    const outBlank = vm.runInContext(`${fn}(__blank).innerHTML`, ctx);
    const outRated = vm.runInContext(`${fn}(__rated).innerHTML`, ctx);
    check(/js-score/.test(outBlank),
          `${name} still emits a .js-score element when there is no number`, outBlank.slice(0, 120));
    check(/js-score[^>]*\shidden/.test(outBlank),
          `${name} hides that empty badge rather than showing an empty chip`);
    check(!/⭐/.test(outBlank), `${name} prints no star while the badge is empty`);
    check(/js-score/.test(outRated) && !/js-score[^>]*\shidden/.test(outRated),
          `${name} leaves a real rating visible`);
    check(/⭐8\.0/.test(outRated), `${name} prints the number it has`, outRated.slice(0, 160));
  }

  // imdbShowBadge is the half that was missing: it un-hides.
  const el = { textContent: '', title: '', hidden: true, dataset: {},
               classList: { _s: new Set(), add(c) { this._s.add(c); }, contains(c) { return this._s.has(c); } } };
  ctx.__badge = el;
  vm.runInContext('imdbShowBadge(__badge, "8.2")', ctx);
  check(el.textContent === '⭐8.2', 'imdbShowBadge writes the star and the number', el.textContent);
  check(el.hidden === false, 'imdbShowBadge UN-HIDES the badge (the missing half)');
  check(el.classList.contains('is-imdb'), 'and tints it IMDb amber');
  check(el.title === 'IMDb 8.2', 'and names the source in the tooltip', el.title);

  // data-sp keeps the detail pill's spacing ("⭐ 8.2") distinct from a card's.
  const pill = { textContent: '', title: '', hidden: true, dataset: { sp: ' ' },
                 classList: { _s: new Set(), add(c) { this._s.add(c); }, contains: () => false } };
  ctx.__badge = pill;
  vm.runInContext('imdbShowBadge(__badge, "8.2")', ctx);
  check(pill.textContent === '⭐ 8.2', 'data-sp is honoured for the detail pill', pill.textContent);

  check(vm.runInContext('imdbShowBadge(null, "8.2")', ctx) === false,
        'a missing element returns false instead of throwing');

  ctx.document.createElement = realCreate;
}

console.log('\n' + '='.repeat(60));
console.log(`${fails.length} failure(s)` + (fails.length ? ': ' + fails.join(', ') : ''));
process.exit(fails.length ? 1 : 0);
