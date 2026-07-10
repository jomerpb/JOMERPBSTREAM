// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════
const TMDB_KEY  = '06523e121afa0ea9002d8f8f1be31965';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w500';
const TMDB_BG   = 'https://image.tmdb.org/t/p/w780';
const ANILIST   = 'https://graphql.anilist.co';

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let currentItem    = null;
let currentSeason  = null;
let allSeasons     = [];
let currentEp      = 1;
let totalEps       = 1;
let currentLang    = 'sub';

// Pagination state
let animePageState  = {sub:'trending', page:1, hasMore:false};
let tvPageState     = {sub:'popular',  region:'', page:1, hasMore:false};
let moviePageState  = {sub:'popular',  page:1, hasMore:false};
let searchState     = {q:'', type:'all', page:1, hasMore:false};

// Similar Movies (player page) state
let similarMoviesState = {list:[], shown:0, forId:null};

// ═══════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════
async function tmdb(path, params={}) {
  try {
    const url = new URL(`${TMDB_BASE}${path}`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k,v]) => v !== undefined && url.searchParams.set(k,v));
    const r = await fetch(url.toString(), {signal: AbortSignal.timeout(10000)});
    return r.json();
  } catch { return null; }
}

async function al(query, variables={}) {
  try {
    const r = await fetch(ANILIST, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({query, variables}),
      signal: AbortSignal.timeout(10000)
    });
    return r.json();
  } catch { return null; }
}

// ═══════════════════════════════════════════
// NAV — Browser History API
// ═══════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const isPlayer = id === 'player-page';
  document.querySelector('.bottom-nav').style.display = isPlayer ? 'none' : 'flex';
  // Remove bottom padding on player page so fullscreen button isn't blocked
  document.body.style.paddingBottom = isPlayer ? '0' : 'var(--nav-h)';
  window.scrollTo(0, 0);
}

function goHome() {
  history.pushState({page:'home-page'}, '', '#home');
  showPage('home-page'); setNav('home');
  loadHome();
}

function goBack() { history.back(); }

function navigateTo(id, extra={}) {
  const hash = id.replace('-page','');
  history.pushState({page:id, ...extra}, '', `#${hash}`);
  showPage(id);
}

function setNav(tab) {
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.querySelector('.nav-dot').style.display = 'none';
  });
  const el = document.getElementById('nav-' + tab);
  if (el) { el.classList.add('active'); el.querySelector('.nav-dot').style.display = 'block'; }
}

function updateSegSlide(el, instant) {
  const slide = document.getElementById('stream-seg-slide');
  if (!slide || !el) return;
  if (instant) {
    const prevTransition = slide.style.transition;
    slide.style.transition = 'none';
    slide.style.width = el.offsetWidth + 'px';
    slide.style.left = el.offsetLeft + 'px';
    // Force reflow so the 'none' transition is committed before restoring it
    void slide.offsetWidth;
    slide.style.transition = prevTransition;
  } else {
    slide.style.width = el.offsetWidth + 'px';
    slide.style.left = el.offsetLeft + 'px';
  }
}
window.addEventListener('resize', () => {
  const active = document.querySelector('#stream-seg .seg-btn.active');
  if (active) updateSegSlide(active, true);
});

function streamSeg(cat, el) {
  localStorage.setItem('lastStreamSeg', cat);
  document.querySelectorAll('#stream-seg .seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  updateSegSlide(el);
  document.getElementById('sec-anime').style.display  = (cat === 'anime')  ? '' : 'none';
  document.getElementById('sec-tv').style.display     = (cat === 'tv')     ? '' : 'none';
  document.getElementById('sec-movies').style.display = (cat === 'movies') ? '' : 'none';
  // Lazy-load the grid the first time a category is opened
  if (cat === 'anime'  && !document.getElementById('anime-grid').children.length)
    loadAnimeSub('trending', document.querySelector('#anime-tabs .ctab.active') || document.querySelectorAll('#anime-tabs .ctab')[1]);
  if (cat === 'tv'     && !document.getElementById('tv-grid').children.length)
    loadTVSub('popular', '', document.querySelector('#tv-tabs .ctab.active') || document.querySelectorAll('#tv-tabs .ctab')[1]);
  if (cat === 'movies' && !document.getElementById('movies-grid').children.length)
    loadMovieSub('popular', document.querySelector('#movie-tabs .ctab.active') || document.querySelectorAll('#movie-tabs .ctab')[1]);
}

function navTo(tab) {
  // Anime/TV/Movies pages were merged into the home Stream tab
  if (tab === 'anime' || tab === 'tv' || tab === 'movies') {
    const idx = {anime:0, tv:1, movies:2}[tab];
    navTo('home');
    streamSeg(tab, document.querySelectorAll('#stream-seg .seg-btn')[idx]);
    return;
  }
  setNav(tab);
  navigateTo(tab + '-page');
  if (tab === 'search') setTimeout(() => document.getElementById('search-input')?.focus(), 100);
  if (tab === 'home') loadHome();
  if (tab === 'trade' && !tpCurrentSym) tpSelectTicker(BLUE_CHIP_SYMS[0]);
}

// Back/forward/gesture handler
window.addEventListener('popstate', async (e) => {
  const state = e.state;
  if (!state?.page) {
    var h=window.location.hash.replace('#','');
    if(h==='oracle'){showPage('oracle-page');setNav('oracle');return;}
    showPage('home-page'); setNav('home'); return;
  }
  const page = state.page;
  if (page !== 'player-page') document.getElementById('player-iframe').src = '';
  showPage(page);
  const navMap = {'home-page':'home','anime-page':'anime','tv-page':'tv','movies-page':'movies','search-page':'search','oracle-page':'oracle','trade-page':'trade'};
  if (navMap[page]) setNav(navMap[page]);
  if (page === 'detail-page' && state.item) await openDetail(state.item, true);
  if (page === 'player-page' && state.item) {
    currentItem=state.item; currentSeason=state.season; currentEp=state.ep; currentLang=state.lang||'sub';
    currentServer=state.srv||localStorage.getItem('preferredServer')||'vidlink';
    const isAnime=state.item.type==='anime', isMovie=state.item.type==='movie';
    document.getElementById('player-title').textContent=state.item.title;
    document.getElementById('player-subtitle').textContent=isMovie?(state.item.year||''):`Episode ${state.ep}`;
    document.getElementById('player-lang-row').style.display=isAnime?'flex':'none';
    document.getElementById('psub').classList.toggle('active',currentLang==='sub');
    document.getElementById('pdub').classList.toggle('active',currentLang==='dub');
    updateServerButtons();
    document.querySelector('.bottom-nav').style.display='none';
    playStream(); updateEpNav();
    loadSimilarItems(state.item);
  }
});

// ═══════════════════════════════════════════
// LANG
// ═══════════════════════════════════════════
function setLang(lang) {
  currentLang = lang;
  document.getElementById('det-sub')?.classList.toggle('active', lang==='sub');
  document.getElementById('det-dub')?.classList.toggle('active', lang==='dub');
}
function switchLang(lang) {
  currentLang = lang;
  document.getElementById('psub').classList.toggle('active', lang==='sub');
  document.getElementById('pdub').classList.toggle('active', lang==='dub');
  playStream();
}

// ═══════════════════════════════════════════
// CARD BUILDERS — anchor tags for long press
// ═══════════════════════════════════════════
function skRow(n) {
  return Array(n).fill(0).map(()=>`<div style="flex-shrink:0;"><div class="sk" style="width:105px;height:148px;border-radius:8px;"></div><div class="sk" style="width:90px;height:9px;border-radius:4px;margin-top:5px;"></div></div>`).join('');
}

function buildSmCard(item) {
  const c = document.createElement('a');
  c.className = 'card-sm';
  c.href = `#detail-${item.type}-${item.al_id||item.tmdb_id||item.id}`;
  c.style.cssText = 'text-decoration:none;color:inherit;';
  const badge = item.score ? `<div class="card-sm-badge">⭐${item.score}</div>` : '';
  const typeBadge = `<div class="card-sm-type ${item.type}">${item.type==='anime'?'ANIME':item.type==='movie'?'MOVIE':'TV'}</div>`;
  c.innerHTML = `
    <div class="card-sm-img">
      <img src="${item.img||''}" alt="${item.title}" loading="lazy"/>
      ${badge}${typeBadge}
    </div>
    <div class="card-sm-info">
      <div class="card-sm-title">${item.title}</div>
      <div class="card-sm-sub">${item.year||''}</div>
    </div>`;
  c.onclick = (e) => { e.preventDefault(); openDetail(item); };
  return c;
}

function buildGridCard(item) {
  const c = document.createElement('a');
  c.className = 'grid-card';
  c.href = `#detail-${item.type}-${item.al_id||item.tmdb_id||item.id}`;
  c.style.cssText = 'text-decoration:none;color:inherit;display:block;';
  const typeColor = item.type==='anime'?'anime':item.type==='movie'?'movie':'tv';
  const typeLabel = item.type==='anime'?'ANIME':item.type==='movie'?'FILM':'TV';

  // Status is already mapped to text in fromTMDB/fromAL
  const statusText = item.status || '';
  const statusColor = statusText==='Ongoing'?'#22c55e':statusText==='Completed'?'#60a5fa':statusText==='Canceled'?'#ef4444':statusText==='Upcoming'?'#a78bfa':'';

  const metaParts = [];
  if (item.countryFlag) metaParts.push(`<span>${item.countryFlag}</span>`);
  if (item.year)        metaParts.push(`<span>${item.year}</span>`);
  if (item.genre)       metaParts.push(`<span>· ${item.genre}</span>`);
  if (statusText)       metaParts.push(`<span style="color:${statusColor};font-weight:700;">· ${statusText}</span>`);
  const meta = metaParts.length ? `<div class="grid-card-meta">${metaParts.join('')}</div>` : '';

  c.innerHTML = `
    <div class="grid-card-img">
      <img src="${item.img||''}" alt="${item.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;"/>
      ${item.score?`<div class="grid-card-score">⭐${item.score}</div>`:''}
      <div class="grid-card-type ${typeColor}">${typeLabel}</div>
      <div class="grid-card-overlay">
        <div class="grid-card-title">${item.title}</div>
        ${meta}
      </div>
    </div>`;
  c.onclick = (e) => { e.preventDefault(); openDetail(item); };
  return c;
}

function renderRow(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  items.forEach(item => el.appendChild(buildSmCard(item)));
}

function renderGrid(id, items, append=false) {
  const el = document.getElementById(id);
  if (!append) el.innerHTML = '';
  if (!items?.length && !append) {
    el.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Nothing found</h3></div>`;
    return;
  }
  items.forEach(item => el.appendChild(buildGridCard(item)));
}

// ═══════════════════════════════════════════
// TMDB → normalized item
// ═══════════════════════════════════════════
function fromTMDB(m, type) {
  const title = m.title || m.name || 'Unknown';
  const year  = (m.release_date || m.first_air_date || '').slice(0,4);
  const score = m.vote_average ? m.vote_average.toFixed(1) : null;
  const genreMap = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',18:'Drama',14:'Fantasy',27:'Horror',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10765:'Sci-Fi',10759:'Action',10762:'Kids',10764:'Reality',10766:'Soap',10767:'Talk'};
  const genre = m.genre_ids?.[0] ? (genreMap[m.genre_ids[0]] || '') : (m.genres?.[0]?.name || '');
  const countryCode = m.origin_country?.[0] || m.production_countries?.[0]?.iso_3166_1 || (m.original_language === 'ko' ? 'KR' : m.original_language === 'ja' ? 'JP' : m.original_language === 'zh' ? 'CN' : m.original_language === 'th' ? 'TH' : m.original_language === 'hi' ? 'IN' : m.original_language === 'fr' ? 'FR' : m.original_language === 'de' ? 'DE' : m.original_language === 'es' ? 'ES' : m.original_language === 'pt' ? 'BR' : m.original_language === 'tr' ? 'TR' : m.original_language === 'id' ? 'ID' : m.original_language === 'en' ? 'US' : '');
  const countryNames = {KR:'Korea',JP:'Japan',CN:'China',TH:'Thailand',PH:'Philippines',US:'USA',GB:'UK',IN:'India',FR:'France',DE:'Germany',IT:'Italy',ES:'Spain',AU:'Australia',CA:'Canada',MX:'Mexico',BR:'Brazil',TR:'Turkey',ID:'Indonesia',TW:'Taiwan',SG:'Singapore',HK:'Hong Kong'};
  const countryFlag = countryNames[countryCode] || countryCode || '';

  // Derive status — TMDB list results don't include status field
  // If m.status exists (detail endpoint), use it directly
  // Otherwise derive from dates and in_production flag
  let status = '';
  if (m.status) {
    const s = m.status;
    if (s==='Returning Series'||s==='In Production') status='Ongoing';
    else if (s==='Ended') status='Completed';
    else if (s==='Canceled'||s==='Cancelled') status='Canceled';
    else if (s==='Planned'||s==='In Development') status='Upcoming';
    else if (s==='Released') status='Completed';
    else status = s;
  } else {
    const now = new Date();
    const releaseDate = m.release_date || m.first_air_date || '';
    if (!releaseDate || new Date(releaseDate) > now) {
      status = 'Upcoming';
    } else if (type === 'movie') {
      status = 'Completed';
    } else {
      // TV: next_episode_to_air means still airing
      // in_production flag when available
      // last_air_date within last 12 months = likely ongoing
      if (m.next_episode_to_air) {
        status = 'Ongoing';
      } else if (m.in_production === true) {
        status = 'Ongoing';
      } else if (m.in_production === false) {
        status = 'Completed';
      } else if (m.last_air_date) {
        const lastAir = new Date(m.last_air_date);
        const monthsAgo = (now - lastAir) / (1000 * 60 * 60 * 24 * 30);
        status = monthsAgo < 12 ? 'Ongoing' : 'Completed';
      } else {
        status = '';
      }
    }
  }

  return {
    type, id:m.id, title, year, score,
    img:      m.poster_path   ? TMDB_IMG + m.poster_path   : '',
    banner:   m.backdrop_path ? TMDB_BG  + m.backdrop_path : '',
    synopsis: m.overview || '',
    seasons:  m.number_of_seasons  || null,
    episodes: m.number_of_episodes || null,
    tmdb_id:  m.id,
    genre, country: countryCode, countryFlag, status,
  };
}

function fromAL(m) {
  // AniList genres is array of strings: ["Action","Adventure",...]
  const genre = Array.isArray(m.genres) ? (m.genres[0] || '') : '';
  const episodes = m.episodes || (m.nextAiringEpisode?.episode ? m.nextAiringEpisode.episode - 1 : null);
  // Map AniList status to readable
  const statusMap = {RELEASING:'Ongoing',FINISHED:'Completed',NOT_YET_RELEASED:'Upcoming',CANCELLED:'Canceled'};
  const status = statusMap[m.status] || m.status || '';
  return {
    type: 'anime',
    al_id:    m.id,
    mal_id:   m.idMal,
    title:    m.title?.english || m.title?.romaji || 'Unknown',
    year:     m.seasonYear || m.startDate?.year || '',
    score:    m.averageScore ? (m.averageScore/10).toFixed(1) : null,
    img:      m.coverImage?.large  || m.coverImage?.medium || '',
    banner:   m.bannerImage || m.coverImage?.extraLarge    || '',
    synopsis: (m.description||'').replace(/<[^>]*>/g,''),
    episodes, genre, status,
    country: 'JP', countryFlag: 'Japan',
  };
}

// ═══════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════
async function loadHome() {
  renderContinueWatching();
  // Load default Anime grid (vertical, infinite scroll)
  if (!document.getElementById('anime-grid').children.length)
    loadAnimeSub('trending', document.querySelector('#anime-tabs .ctab.active') || document.querySelectorAll('#anime-tabs .ctab')[1]);

  const now = new Date(); const mo = now.getMonth()+1;
  const season = mo<=3?'WINTER':mo<=6?'SPRING':mo<=9?'SUMMER':'FALL';
  const year = now.getFullYear();

  const [animeData, tvData, movieData] = await Promise.all([
    al(`query{Page(perPage:15){media(type:ANIME,sort:TRENDING_DESC,isAdult:false){id idMal title{english romaji}coverImage{large}bannerImage episodes averageScore status seasonYear format genres}}}`, {}),
    tmdb('/discover/tv', {sort_by:'popularity.desc', 'with_status':'0'}),
    tmdb('/movie/popular'),
  ]);

  const animeList = (animeData?.data?.Page?.media||[]).map(fromAL);
  const tvList    = (tvData?.results||[]).slice(0,15).map(m=>{const i=fromTMDB(m,'tv');if(!i.status)i.status='Ongoing';return i;});
  const movieList = (movieData?.results||[]).slice(0,15).map(m=>fromTMDB(m,'movie'));

  // Hero — use a trending anime or TV with backdrop
  const heroItem = animeList.find(a=>a.banner) || tvList.find(t=>t.banner) || animeList[0];
  if (heroItem) {
    document.getElementById('hero-wrap').innerHTML = `
      <img src="${heroItem.banner||heroItem.img}" alt="${heroItem.title}"/>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badge">${heroItem.type==='anime'?'🎌 ANIME':heroItem.type==='tv'?'📺 TV SERIES':'🎬 MOVIE'}</div>
        <div class="hero-title">${heroItem.title}</div>
        <div class="hero-meta">
          <span>${heroItem.year||''}</span>
          ${heroItem.score?`<div class="hero-dot"></div><span>⭐ ${heroItem.score}</span>`:''}
        </div>
        <button class="hero-play" onclick="openDetail(window.__heroItem)">▶ Watch Now</button>
      </div>`;
    window.__heroItem = heroItem;
  }
}

// ═══════════════════════════════════════════
// ANIME PAGE
// ═══════════════════════════════════════════
const ANIME_GENRES = {action:'Action',romance:'Romance',isekai:'Isekai',fantasy:'Fantasy'};

async function loadAnimeSub(sub, tabEl) {
  animePageState = {sub, page:1, hasMore:false};
  if (tabEl) { document.querySelectorAll('#anime-tabs .ctab').forEach(t=>t.classList.remove('active')); tabEl.classList.add('active'); }
  document.getElementById('anime-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
  document.getElementById('anime-more').style.display = 'none';
  const items = await fetchAnime(sub, 1);
  renderGrid('anime-grid', items);
  animePageState.hasMore = items.length >= 24;
  document.getElementById('anime-more').style.display = animePageState.hasMore ? 'block' : 'none';
  if (animePageState.hasMore) attachInfiniteScroll();
}

async function fetchAnime(sub, page) {
  const now = new Date(); const mo = now.getMonth()+1;
  const season = mo<=3?'WINTER':mo<=6?'SPRING':mo<=9?'SUMMER':'FALL';
  const year = now.getFullYear();

  let sort = 'TRENDING_DESC', genre = null;
  if (sub==='new')      { sort='POPULARITY_DESC'; }
  if (sub==='toprated') { sort='SCORE_DESC'; }
  if (ANIME_GENRES[sub]) { genre = ANIME_GENRES[sub]; sort='POPULARITY_DESC'; }

  const seasonVar = sub==='new' ? `, season:$season, seasonYear:$year` : '';
  const Q = `query($page:Int,$genre:String,$sort:[MediaSort]${sub==='new'?',  $season:MediaSeason,$year:Int':''}) {
    Page(page:$page,perPage:24){
      pageInfo{hasNextPage}
      media(type:ANIME,isAdult:false,genre:$genre,sort:$sort${sub==='new'?',season:$season,seasonYear:$year':''}) {
        id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres
      }
    }
  }`;
  const vars = {page, sort:[sort], genre: genre||undefined};
  if (sub==='new') { vars.season=season; vars.year=year; }
  const data = await al(Q, vars);
  return (data?.data?.Page?.media||[]).map(fromAL);
}

async function loadMoreAnime() {
  if (!animePageState.hasMore) return;
  animePageState.hasMore = false;
  animePageState.page++;
  if (animePageState.sub === 'filter') {
    await applyAnimeFilter(animePageState.page);
  } else {
    const items = await fetchAnime(animePageState.sub, animePageState.page);
    renderGrid('anime-grid', items, true);
    animePageState.hasMore = items.length >= 24;
    document.getElementById('anime-more').style.display = animePageState.hasMore ? 'block' : 'none';
    if (animePageState.hasMore) attachInfiniteScroll();
  }
}

// ═══════════════════════════════════════════
// TV PAGE
// ═══════════════════════════════════════════
async function loadTVSub(sub, region, tabEl) {
  tvPageState = {sub, region, page:1, hasMore:false};
  if (tabEl) { document.querySelectorAll('#tv-tabs .ctab').forEach(t=>t.classList.remove('active')); tabEl.classList.add('active'); }
  document.getElementById('tv-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
  document.getElementById('tv-more').style.display = 'none';
  const items = await fetchTV(sub, region, 1);
  renderGrid('tv-grid', items);
  tvPageState.hasMore = items.length >= 20;
  document.getElementById('tv-more').style.display = tvPageState.hasMore ? 'block' : 'none';
  if (tvPageState.hasMore) attachInfiniteScroll();
}

async function fetchTV(sub, region, page) {
  let data;
  let knownStatus = ''; // we know status based on which list we're fetching

  if (region) {
    data = await tmdb('/discover/tv', {with_origin_country: region, sort_by:'popularity.desc', 'vote_count.gte':'0', page});
    knownStatus = ''; // mixed — can't know
  } else if (sub === 'popular') {
    data = await tmdb('/discover/tv', {sort_by:'popularity.desc', 'with_status':'0', page}); // 0 = Returning Series
    knownStatus = 'Ongoing';
  } else if (sub === 'top_rated') {
    data = await tmdb('/tv/top_rated', {page});
    knownStatus = ''; // mixed
  } else if (sub === 'airing_today') {
    data = await tmdb('/tv/airing_today', {page});
    knownStatus = 'Ongoing';
  } else if (sub === 'on_the_air') {
    data = await tmdb('/tv/on_the_air', {page});
    knownStatus = 'Ongoing';
  } else {
    data = await tmdb(`/tv/${sub}`, {page});
    knownStatus = '';
  }

  return (data?.results||[]).map(m => {
    const item = fromTMDB(m, 'tv');
    if (knownStatus) item.status = knownStatus;
    return item;
  });
}

async function loadMoreTV() {
  if (!tvPageState.hasMore) return;
  tvPageState.hasMore = false;
  tvPageState.page++;
  if (tvPageState.sub === 'filter') {
    await applyTVFilter(tvPageState.page);
  } else {
    const items = await fetchTV(tvPageState.sub, tvPageState.region, tvPageState.page);
    renderGrid('tv-grid', items, true);
    tvPageState.hasMore = items.length >= 20;
    document.getElementById('tv-more').style.display = tvPageState.hasMore ? 'block' : 'none';
    if (tvPageState.hasMore) attachInfiniteScroll();
  }
}

function setTVFilter(region) {
  navTo('tv');
  setTimeout(() => {
    const tab = document.querySelector('#tv-tabs .ctab:nth-child(2)');
    loadTVSub('popular', region, tab);
  }, 100);
}

// ═══════════════════════════════════════════
// MOVIES PAGE
// ═══════════════════════════════════════════
async function loadMovieSub(sub, tabEl) {
  moviePageState = {sub, page:1, hasMore:false};
  if (tabEl) { document.querySelectorAll('#movie-tabs .ctab').forEach(t=>t.classList.remove('active')); tabEl.classList.add('active'); }
  document.getElementById('movies-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
  document.getElementById('movies-more').style.display = 'none';
  const data = await tmdb(`/movie/${sub}`, {page:1});
  const items = (data?.results||[]).map(m=>fromTMDB(m,'movie'));
  renderGrid('movies-grid', items);
  moviePageState.hasMore = (data?.total_pages||1) > 1;
  document.getElementById('movies-more').style.display = moviePageState.hasMore ? 'block' : 'none';
  if (moviePageState.hasMore) attachInfiniteScroll();
}

async function loadMoreMovies() {
  if (!moviePageState.hasMore) return;
  moviePageState.hasMore = false;
  moviePageState.page++;
  if (moviePageState.sub === 'filter') {
    await applyMovieFilter(moviePageState.page);
  } else {
    const data = await tmdb(`/movie/${moviePageState.sub}`, {page: moviePageState.page});
    const items = (data?.results||[]).map(m=>fromTMDB(m,'movie'));
    renderGrid('movies-grid', items, true);
    moviePageState.hasMore = moviePageState.page < (data?.total_pages||1);
    document.getElementById('movies-more').style.display = moviePageState.hasMore ? 'block' : 'none';
    if (moviePageState.hasMore) attachInfiniteScroll();
  }
}

// ═══════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════
let searchType = 'all';
function setSearchType(type, el) {
  searchType = type;
  document.querySelectorAll('#search-type-tabs .ctab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

async function doSearch(q) {
  if (!q?.trim()) return;
  navigateTo('search-page');
  setNav('search');
  searchState = {q: q.trim(), type: searchType, page:1, hasMore:false};
  document.getElementById('search-label').textContent = `Results for "${q}"`;
  document.getElementById('search-label').style.display = 'block';
  document.getElementById('search-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
  document.getElementById('search-more').style.display = 'none';

  const items = await fetchSearch(q.trim(), searchType, 1);
  renderGrid('search-grid', items);
  searchState.hasMore = items.length >= 20;
  document.getElementById('search-more').style.display = searchState.hasMore ? 'block' : 'none';
}

async function fetchSearch(q, type, page) {
  let results = [];

  if (type === 'all' || type === 'anime') {
    const Q = `query($s:String,$page:Int){Page(page:$page,perPage:12){media(type:ANIME,search:$s,isAdult:false,sort:SEARCH_MATCH){id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}`;
    const d = await al(Q, {s:q, page});
    results = results.concat((d?.data?.Page?.media||[]).map(fromAL));
  }
  if (type === 'all' || type === 'tv') {
    const d = await tmdb('/search/tv', {query:q, page});
    results = results.concat((d?.results||[]).map(m=>fromTMDB(m,'tv')));
  }
  if (type === 'all' || type === 'movie') {
    const d = await tmdb('/search/movie', {query:q, page});
    results = results.concat((d?.results||[]).map(m=>fromTMDB(m,'movie')));
  }
  return results;
}

async function loadMoreSearch() {
  searchState.page++;
  const items = await fetchSearch(searchState.q, searchState.type, searchState.page);
  renderGrid('search-grid', items, true);
  searchState.hasMore = items.length >= 20;
  document.getElementById('search-more').style.display = searchState.hasMore ? 'block' : 'none';
}

// ═══════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════
async function openDetail(item, restore=false) {
  currentItem   = item;
  allSeasons    = [];
  currentSeason = null;
  currentLang   = 'sub';
  if (!restore) {
    history.pushState({page:'detail-page', item}, '', `#detail-${item.type}-${item.al_id||item.tmdb_id||item.id}`);
  }
  showPage('detail-page');

  // Skeleton
  document.getElementById('detail-backdrop-wrap').innerHTML = `<div class="sk" style="width:100%;height:100%;border-radius:0;"></div><div class="detail-backdrop-overlay"></div><div class="back-circle" onclick="goBack()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></div>`;
  document.getElementById('detail-poster').innerHTML = `<div class="sk" style="width:100%;height:100%;border-radius:7px;"></div>`;
  document.getElementById('detail-info').innerHTML = `<div class="sk" style="width:80%;height:16px;margin-bottom:8px;border-radius:4px;"></div><div class="sk" style="width:60%;height:10px;border-radius:4px;"></div>`;
  document.getElementById('detail-synopsis').textContent = '';
  document.getElementById('detail-lang').style.display = 'none';
  document.getElementById('detail-seasons-wrap').style.display = 'none';
  document.getElementById('eps-label').style.display = 'none';
  document.getElementById('eps-grid').innerHTML = '';
  document.getElementById('seasons-row').innerHTML = '';

  if (item.type === 'anime') {
    await openAnimeDetail(item);
  } else if (item.type === 'tv') {
    await openTVDetail(item);
  } else {
    await openMovieDetail(item);
  }
}

// ── ANIME DETAIL ──
async function openAnimeDetail(item) {
  const Q = `query($alId:Int,$malId:Int){Media(id:$alId,idMal:$malId,type:ANIME){id idMal title{english romaji native}coverImage{extraLarge large}bannerImage description episodes averageScore status seasonYear format nextAiringEpisode{episode} genres relations{edges{relationType node{id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres type nextAiringEpisode{episode}}}}}}`;
  const vars = item.al_id ? {alId:item.al_id} : {malId:item.mal_id};
  const r = await al(Q, vars);
  const m = r?.data?.Media;
  if (!m) { renderAnimeUI(item, [], item); return; }

  const full = {...fromAL(m), al_id:m.id, mal_id:m.idMal||item.mal_id};
  currentItem = full;

  // Seasons from relations
  const seasons = [{...full}];
  const seen = new Set([m.id]);
  if (m.relations?.edges) {
    for (const e of m.relations.edges) {
      const n = e.node;
      if (['SEQUEL','PREQUEL'].includes(e.relationType) && n.type==='ANIME' && !seen.has(n.id)) {
        seasons.push({...fromAL(n), al_id:n.id, mal_id:n.idMal, type:'anime'});
        seen.add(n.id);
      }
    }
  }
  seasons.sort((a,b)=>(a.year||9999)-(b.year||9999)||a.al_id-b.al_id);
  allSeasons = seasons;

  renderDetailBackdrop(full.banner||full.img, full.title);
  renderDetailHero(full, 'anime');
  document.getElementById('detail-lang').style.display = 'flex';
  renderSeasonTabs();
  selectSeason(allSeasons[0]);
  loadRecommendations(full);
}

// ── TV DETAIL ──
async function openTVDetail(item) {
  const data = await tmdb(`/tv/${item.tmdb_id||item.id}`);
  if (!data) { renderSimpleDetail(item, 'tv'); return; }

  const full = fromTMDB(data, 'tv');
  full.tmdb_id = data.id;
  currentItem = full;

  renderDetailBackdrop(full.banner, full.title);
  renderDetailHero(full, 'tv');

  // TV seasons from TMDB
  const tvSeasons = (data.seasons||[]).filter(s=>s.season_number>0).map(s=>({
    type:'tv', tmdb_id:data.id, season_number:s.season_number,
    title:`Season ${s.season_number}`, year:s.air_date?.slice(0,4),
    episodes:s.episode_count, img:s.poster_path?TMDB_IMG+s.poster_path:full.img,
    name:s.name
  }));

  if (tvSeasons.length > 0) {
    allSeasons = tvSeasons;
    document.getElementById('detail-seasons-wrap').style.display = 'block';
    renderSeasonTabs();
    selectTVSeason(tvSeasons[0]);
  } else {
    allSeasons = [{...full, season_number:1}];
    document.getElementById('eps-label').style.display = 'block';
    buildEpGrid(data.number_of_episodes||20, null);
  }
  loadRecommendations(full);
}

// ── MOVIE DETAIL ──
async function openMovieDetail(item) {
  const data = await tmdb(`/movie/${item.tmdb_id||item.id}`);
  const full = data ? fromTMDB(data,'movie') : item;
  full.tmdb_id = (data||item).id;
  currentItem = full;

  renderDetailBackdrop(full.banner, full.title);
  renderDetailHero(full, 'movie');

  // Movies have no episodes — just a Watch button
  document.getElementById('eps-label').style.display = 'none';
  document.getElementById('detail-play-btn').onclick = () => openPlayer(1);
  document.getElementById('detail-play-btn').textContent = '▶ Watch Movie';
  allSeasons = [{...full, season_number:0}];
  currentSeason = allSeasons[0];
  totalEps = 1;
  loadRecommendations(full);
}

function renderDetailBackdrop(img, title) {
  document.getElementById('detail-backdrop-wrap').innerHTML = `
    <img src="${img||''}" alt="${title}" style="width:100%;height:100%;object-fit:cover;display:block;"/>
    <div class="detail-backdrop-overlay"></div>
    <div class="back-circle" onclick="goBack()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></div>`;
}

function renderDetailHero(item, type) {
  const typeClass = {anime:'anime',tv:'tv',movie:'movie'}[type];
  const typeLabel = {anime:'🎌 Anime',tv:'📺 TV Series',movie:'🎬 Movie'}[type];

  document.getElementById('detail-poster').innerHTML = `<img src="${item.img||''}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;"/>`;

  const pills = [
    {label: typeLabel, cls: typeClass},
    {label: item.year||'', cls:''},
    {label: item.score?`⭐ ${item.score}`:'', cls:'accent'},
    {label: item.episodes?`${item.episodes} eps`:'', cls:''},
  ].filter(p=>p.label);

  document.getElementById('detail-info').innerHTML = `
    <div class="detail-title">${item.title}</div>
    <div class="detail-pills">${pills.map(p=>`<span class="dpill ${p.cls}">${p.label}</span>`).join('')}</div>`;

  document.getElementById('detail-synopsis').textContent = item.synopsis || 'No synopsis available.';
  document.getElementById('detail-play-btn').onclick = () => openPlayer(1);
  document.getElementById('detail-play-btn').textContent = '▶ Watch EP 1';
}

function renderSeasonTabs() {
  const row = document.getElementById('seasons-row');
  row.innerHTML = '';
  if (allSeasons.length <= 1) { document.getElementById('detail-seasons-wrap').style.display='none'; return; }
  document.getElementById('detail-seasons-wrap').style.display = 'block';
  allSeasons.forEach((s,i) => {
    const b = document.createElement('div');
    b.className = 'spill';
    b.textContent = s.name || s.title || `Season ${i+1}`;
    b.dataset.idx = i;
    b.onclick = () => {
      if (s.type === 'anime') selectSeason(s);
      else selectTVSeason(s);
    };
    row.appendChild(b);
  });
}

function selectSeason(s) {
  currentSeason = s;
  // For ongoing anime with no episode count, fetch actual count from AniList
  if (!s.episodes && s.al_id) {
    totalEps = 9999; // allow next button while loading
    document.getElementById('eps-label').style.display = 'block';
    buildEpGrid(9999, null);
    // Fetch real episode count in background
    al(`query($id:Int){Media(id:$id){episodes nextAiringEpisode{episode}}}`, {id: s.al_id}).then(r => {
      const m = r?.data?.Media;
      const count = m?.episodes || (m?.nextAiringEpisode?.episode ? m.nextAiringEpisode.episode - 1 : null);
      if (count) { totalEps = count; buildEpGrid(count, null); }
    });
  } else {
    totalEps = s.episodes || 100;
    document.getElementById('eps-label').style.display = 'block';
    buildEpGrid(totalEps, null);
  }
  document.querySelectorAll('.spill').forEach((b,i) => b.classList.toggle('active', parseInt(b.dataset.idx)===allSeasons.indexOf(s)));
  document.getElementById('detail-play-btn').onclick = () => openPlayer(1);
}

async function selectTVSeason(s) {
  currentSeason = s;
  document.querySelectorAll('.spill').forEach((b,i) => b.classList.toggle('active', parseInt(b.dataset.idx)===allSeasons.indexOf(s)));
  document.getElementById('eps-label').style.display = 'block';

  // Fetch episode count for this season
  const data = await tmdb(`/tv/${s.tmdb_id}/season/${s.season_number}`);
  totalEps = data?.episodes?.length || s.episodes || 10;
  buildEpGrid(totalEps, s.season_number);
  document.getElementById('detail-play-btn').onclick = () => openPlayer(1);
}

function buildEpGrid(count, seasonNum) {
  const eg = document.getElementById('eps-grid');
  eg.innerHTML = '';
  const actual = count || 100;
  // For very long series like One Piece (1000+ eps), show all up to 2000
  const max = Math.min(actual === 9999 ? 100 : actual, 2000);
  for (let i = 1; i <= max; i++) {
    const b = document.createElement('button');
    b.className = 'ep-btn';
    b.textContent = `EP ${i}`;
    b.onclick = () => openPlayer(i);
    eg.appendChild(b);
  }
}

function renderSimpleDetail(item, type) {
  renderDetailBackdrop(item.banner||item.img, item.title);
  renderDetailHero(item, type);
  allSeasons = [{...item, season_number: type==='movie'?0:1}];
  currentSeason = allSeasons[0];
  totalEps = item.episodes || (type==='movie'?1:20);
  if (type !== 'movie') buildEpGrid(totalEps, 1);
}

// ═══════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════
async function loadRecommendations(item) {
  // Hide all rows first
  document.getElementById('rec-section').style.display = 'none';
  ['rec-row-1','rec-row-2','rec-row-3'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; });
  ['rec-grid-1','rec-grid-2','rec-grid-3'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML=''; });

  const type = item.type;

  if (type === 'anime') {
    // Row 1: AniList recommendations
    const Q1 = `query($id:Int){Media(id:$id){recommendations(perPage:10,sort:RATING_DESC){nodes{mediaRecommendation{id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}}}`;
    const r1 = await al(Q1, {id: item.al_id});
    const recList = (r1?.data?.Media?.recommendations?.nodes||[])
      .map(n=>n.mediaRecommendation).filter(Boolean)
      .map(m=>({...fromAL(m), al_id:m.id}));

    // Row 2: Same genre anime
    const genre = item.genres?.[0] || null;
    const Q2 = `query($genre:String){Page(perPage:10){media(type:ANIME,isAdult:false,genre:$genre,sort:POPULARITY_DESC){id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}`;
    const r2 = await al(Q2, {genre});
    const genreList = (r2?.data?.Page?.media||[]).filter(m=>m.id!==item.al_id).map(m=>({...fromAL(m),al_id:m.id}));

    // Row 3: Trending anime
    const Q3 = `{Page(perPage:10){media(type:ANIME,isAdult:false,sort:TRENDING_DESC){id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}`;
    const r3 = await al(Q3);
    const trendList = (r3?.data?.Page?.media||[]).filter(m=>m.id!==item.al_id).map(m=>({...fromAL(m),al_id:m.id}));

    renderRecRow(1, '✨ Similar Anime', recList);
    renderRecRow(2, '🎌 More Like This', genreList);
    renderRecRow(3, '🔥 Trending Anime', trendList);

  } else if (type === 'tv') {
    const id = item.tmdb_id || item.id;
    // Row 1: TMDB similar
    const d1 = await tmdb(`/tv/${id}/similar`);
    const simList = (d1?.results||[]).slice(0,15).map(m=>fromTMDB(m,'tv'));

    // Row 2: TMDB recommendations
    const d2 = await tmdb(`/tv/${id}/recommendations`);
    const recList = (d2?.results||[]).slice(0,15).map(m=>fromTMDB(m,'tv'));

    // Row 3: Popular TV
    const d3 = await tmdb('/tv/popular');
    const popList = (d3?.results||[]).filter(m=>m.id!==id).slice(0,15).map(m=>fromTMDB(m,'tv'));

    renderRecRow(1, '📺 Similar Series', simList);
    renderRecRow(2, '👍 Recommended For You', recList);
    renderRecRow(3, '🔥 Popular Right Now', popList);

  } else if (type === 'movie') {
    const id = item.tmdb_id || item.id;
    // Row 1: Similar movies
    const d1 = await tmdb(`/movie/${id}/similar`);
    const simList = (d1?.results||[]).slice(0,15).map(m=>fromTMDB(m,'movie'));

    // Row 2: Recommendations
    const d2 = await tmdb(`/movie/${id}/recommendations`);
    const recList = (d2?.results||[]).slice(0,15).map(m=>fromTMDB(m,'movie'));

    // Row 3: Popular movies
    const d3 = await tmdb('/movie/popular');
    const popList = (d3?.results||[]).filter(m=>m.id!==id).slice(0,15).map(m=>fromTMDB(m,'movie'));

    renderRecRow(1, '🎬 Similar Movies', simList);
    renderRecRow(2, '👍 Recommended For You', recList);
    renderRecRow(3, '🔥 Popular Movies', popList);
  }
}

function renderRecRow(num, title, items) {
  if (!items?.length) return;
  const row = document.getElementById(`rec-row-${num}`);
  const grid = document.getElementById(`rec-grid-${num}`);
  const titleEl = document.getElementById(`rec-title-${num}`);
  if (!row || !grid || !titleEl) return; // skip if row was removed
  document.getElementById('rec-section').style.display = 'block';
  titleEl.textContent = title;
  grid.innerHTML = '';
  items.forEach(item => grid.appendChild(buildSmCard(item)));
  row.style.display = 'block';
}

// ═══════════════════════════════════════════
// SIMILAR ITEMS (player page, infinite scroll, sorted by rating) — movies, tv, anime
// ═══════════════════════════════════════════
async function loadSimilarItems(item) {
  const section = document.getElementById('similar-movies-section');
  if (!section) return;

  if (!item || !['movie','tv','anime'].includes(item.type)) { section.style.display = 'none'; return; }

  const selfId = item.al_id || item.tmdb_id || item.id;
  const key = `${item.type}-${selfId}`;

  // Already loaded for this title — just make sure it's visible
  if (similarMoviesState.forId === key && similarMoviesState.list.length) {
    section.style.display = 'block';
    document.getElementById('similar-movies-end').style.display =
      similarMoviesState.shown >= similarMoviesState.list.length ? 'block' : 'none';
    return;
  }

  section.style.display = 'block';
  document.getElementById('similar-title').textContent =
    item.type === 'anime' ? '✨ Similar Anime' : item.type === 'tv' ? '📺 Similar Series' : '🎬 Similar Movies';
  const grid = document.getElementById('similar-movies-grid');
  const endMsg = document.getElementById('similar-movies-end');
  grid.innerHTML = skRow(6);
  endMsg.style.display = 'none';

  try {
    let combined = [];

    if (item.type === 'anime') {
      const Q = `query($id:Int,$page:Int){Media(id:$id){recommendations(page:$page,perPage:25,sort:RATING_DESC){pageInfo{hasNextPage}nodes{mediaRecommendation{id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}}}`;
      for (let p = 1; p <= 3; p++) {
        const r = await al(Q, {id: item.al_id, page: p});
        const conn = r?.data?.Media?.recommendations;
        const nodes = (conn?.nodes || []).map(n => n.mediaRecommendation).filter(Boolean);
        combined.push(...nodes.map(m => ({...fromAL(m), al_id: m.id})));
        if (!conn?.pageInfo?.hasNextPage) break;
      }
    } else {
      const endpoint = item.type; // 'movie' or 'tv'
      const rawId = item.tmdb_id || item.id;
      const first = await tmdb(`/${endpoint}/${rawId}/similar`, {page:1});
      const totalPages = Math.min(first?.total_pages || 1, 5); // cap ~5 pages (~100 titles)
      const rest = [];
      for (let p = 2; p <= totalPages; p++) rest.push(tmdb(`/${endpoint}/${rawId}/similar`, {page:p}));
      const restData = await Promise.all(rest);
      combined = [first, ...restData].flatMap(d => d?.results || []).map(m => fromTMDB(m, item.type));
    }

    const seen = new Set();
    const list = combined
      .filter(m => {
        const mid = m.al_id || m.tmdb_id || m.id;
        if (mid === selfId || seen.has(mid)) return false;
        seen.add(mid);
        return true;
      })
      .sort((a,b) => (parseFloat(b.score)||0) - (parseFloat(a.score)||0));

    similarMoviesState = {list, shown:0, forId:key};
    grid.innerHTML = '';
    if (!list.length) { section.style.display = 'none'; return; }
    renderMoreSimilarItems();
  } catch {
    grid.innerHTML = '';
    section.style.display = 'none';
  }
}

function renderMoreSimilarItems() {
  const grid = document.getElementById('similar-movies-grid');
  const endMsg = document.getElementById('similar-movies-end');
  if (!grid) return;
  const {list, shown} = similarMoviesState;
  const batch = list.slice(shown, shown + 12);
  batch.forEach(item => grid.appendChild(buildGridCard(item)));
  similarMoviesState.shown += batch.length;
  endMsg.style.display = similarMoviesState.shown >= list.length ? 'block' : 'none';
}

const similarMoviesObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && similarMoviesState.shown < similarMoviesState.list.length) {
      renderMoreSimilarItems();
    }
  });
}, {rootMargin:'200px'});

(function attachSimilarMoviesObserver() {
  const sentinel = document.getElementById('similar-movies-sentinel');
  if (sentinel) similarMoviesObserver.observe(sentinel);
})();

// ═══════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════
function openPlayer(ep) {
  currentEp = ep;
  const item = currentItem;
  const season = currentSeason;
  const isAnime = item.type === 'anime';
  const isMovie = item.type === 'movie';
  history.pushState({page:'player-page', item, season, ep, lang:currentLang, srv:currentServer}, '', `#player-${item.type}-${item.al_id||item.tmdb_id||item.id}-s${season?.season_number||1}-e${ep}`);
  showPage('player-page');

  // Title display
  let subtitle = '';
  if (isMovie) subtitle = item.year || '';
  else {
    const sLabel = allSeasons.length > 1 ? `S${allSeasons.indexOf(season)+1} · ` : '';
    subtitle = `${sLabel}Episode ${ep}`;
  }

  document.getElementById('player-title').textContent = item.title;
  document.getElementById('player-subtitle').textContent = subtitle;

  // Show/hide lang toggle (anime only)
  const langRow = document.getElementById('player-lang-row');
  langRow.style.display = isAnime ? 'flex' : 'none';
  document.getElementById('psub').classList.toggle('active', currentLang==='sub');
  document.getElementById('pdub').classList.toggle('active', currentLang==='dub');

  // Set server label
  updateServerButtons();

  playStream();
  updateEpNav();
  document.querySelectorAll('.ep-btn').forEach((b,i) => b.classList.toggle('active', i+1===ep));
  // Save to watch history
  saveToHistory(item, season, ep);
  // Load similar items (movies, tv, anime)
  loadSimilarItems(item);
}

// ─── SERVER STATE ───
// Picklist order matches user-specified order. Movies/TV only — anime keeps its fixed MegaPlay path below.
const SERVER_LIST = [
  { key:'vidlink',    label:'Vidlink' },
  { key:'vidsrc',     label:'Vidsrc' },
  { key:'videasy',    label:'Videasy' },
  { key:'vixsrc',     label:'Vixsrc' },
  { key:'2embed',     label:'2embed' },
  { key:'peachify',   label:'Peachify' },
  { key:'cinezo',     label:'Cinezo' }
];
let currentServer = 'vidlink';
let triedServers = new Set();
let serverLoadTimer = null;

function buildUrl(server) {
  const item = currentItem;
  const season = currentSeason;

  if (item.type === 'anime') {
    const malId = item.mal_id || season?.mal_id;
    return `https://megaplay.buzz/stream/mal/${malId}/${currentEp}/${currentLang}`;
  }

  const tmdbId = item.tmdb_id || item.id;
  const seasonNum = season?.season_number || 1;
  const isMovie = item.type === 'movie';

  switch (server) {
    case 'vidlink':
      return isMovie
        ? `https://vidlink.pro/movie/${tmdbId}?autoplay=true&primaryColor=e63946`
        : `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${currentEp}?autoplay=true&primaryColor=e63946`;
    case 'vidsrc':
      return isMovie
        ? `https://vidsrc.mov/embed/movie/${tmdbId}`
        : `https://vidsrc.mov/embed/tv/${tmdbId}/${seasonNum}/${currentEp}`;
    case 'videasy':
      return isMovie
        ? `https://player.videasy.net/movie/${tmdbId}`
        : `https://player.videasy.net/tv/${tmdbId}/${seasonNum}/${currentEp}`;
    case 'vixsrc':
      return isMovie
        ? `https://vixsrc.to/movie/${tmdbId}`
        : `https://vixsrc.to/tv/${tmdbId}/${seasonNum}/${currentEp}`;
    case '2embed':
      return isMovie
        ? `https://www.2embed.cc/embed/${tmdbId}`
        : `https://www.2embed.cc/embedtv/${tmdbId}&s=${seasonNum}&e=${currentEp}`;
    case 'peachify':
      return isMovie
        ? `https://peachify.top/embed/movie/${tmdbId}`
        : `https://peachify.top/embed/tv/${tmdbId}/${seasonNum}/${currentEp}`;
    case 'cinezo':
      return isMovie
        ? `https://player.cinezo.live/embed/movie/${tmdbId}`
        : `https://player.cinezo.live/embed/tv/${tmdbId}/${seasonNum}/${currentEp}`;
    default:
      return '';
  }
}

function updateServerButtons() {
  const item = currentItem;
  const isAnime = item?.type === 'anime';
  const btns = document.getElementById('server-btns');
  if (isAnime) {
    btns.innerHTML = '<span style="font-size:10px;color:var(--muted)">Server: <b style="color:var(--accent2)">MegaPlay</b></span>';
    return;
  }
  const opts = SERVER_LIST.map(s =>
    `<option value="${s.key}" ${currentServer===s.key ? 'selected' : ''}>${s.label}</option>`
  ).join('');
  btns.innerHTML = `
    <select id="server-picklist" onchange="switchServer(this.value)" style="width:100%;box-sizing:border-box;display:block;background:var(--surface);color:#fff;border:1px solid var(--border);border-radius:0;padding:12px 10px;font-size:13px;font-weight:600;text-align:center;text-align-last:center;-moz-text-align-last:center;">
      ${opts}
    </select>
    <div id="server-status" style="display:none;font-size:11px;color:var(--muted);text-align:center;padding:6px 10px;"></div>
  `;
}

// Loads the current server's URL into the iframe, with a load-timeout fallback.
// Note: cross-origin iframes can't be inspected for app-level errors (e.g. a provider's
// own "not found" page) — only network-level failures (onerror) and a load timeout are
// detectable. That's the best available signal without per-provider integration.
function loadServerUrl() {
  clearTimeout(serverLoadTimer);
  const item = currentItem;
  const isAnime = item?.type === 'anime';
  const iframe = document.getElementById('player-iframe');
  const status = document.getElementById('server-status');
  const url = buildUrl(currentServer);

  if (!isAnime && !url) {
    const label = SERVER_LIST.find(s => s.key === currentServer)?.label || currentServer;
    if (status) { status.style.display = 'block'; status.textContent = `${label} has no direct embed — trying next server…`; }
    autoFallback();
    return;
  }

  if (status) status.style.display = 'none';
  iframe.onerror = function() { autoFallback(); };
  iframe.onload = function() { clearTimeout(serverLoadTimer); };
  iframe.src = url;

  if (!isAnime) {
    serverLoadTimer = setTimeout(autoFallback, 10000); // no 'load' fired in 10s → assume dead/blocked
  }
}

function autoFallback() {
  const status = document.getElementById('server-status');
  triedServers.add(currentServer);
  const next = SERVER_LIST.find(s => !triedServers.has(s.key));
  if (!next) {
    if (status) { status.style.display = 'block'; status.textContent = 'No working server found. Try again later or pick one manually.'; }
    return;
  }
  currentServer = next.key;
  triedServers.add(next.key);
  updateServerButtons();
  loadServerUrl();
}

// ── WATCH TIMER ──
let watchTimer = null;
let watchedSeconds = 0;

function startWatchTimer() {
  stopWatchTimer();
  watchedSeconds = 0;
  watchTimer = setInterval(function() { watchedSeconds++; }, 1000);
}

function stopWatchTimer() {
  if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
}

function formatWatchTime(secs) {
  var h = Math.floor(secs / 3600);
  var m = Math.floor((secs % 3600) / 60);
  var s = secs % 60;
  if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  return m + ':' + String(s).padStart(2,'0');
}

function showResume() {
  var row = document.getElementById('resume-row');
  var lbl = document.getElementById('resume-time-lbl');
  if (!row || watchedSeconds < 10) return; // only show if watched >10s
  lbl.textContent = formatWatchTime(watchedSeconds);
  row.style.display = 'flex';
}

function hideResume() {
  var row = document.getElementById('resume-row');
  if (row) row.style.display = 'none';
}

function resumeFromTracked() {
  hideResume();
  var t = watchedSeconds;
  var item = currentItem;
  var season = currentSeason;
  var tmdbId = item ? (item.tmdb_id || item.id) : null;
  var seasonNum = season ? (season.season_number || 1) : 1;
  if (!tmdbId) return;
  var url = '';
  // Only providers with a confirmed resume/seek parameter are handled here.
  // Others will reload from the start via loadServerUrl().
  if (currentServer === 'vidlink') {
    if (item.type === 'movie')
      url = `https://vidlink.pro/movie/${tmdbId}?autoplay=true&primaryColor=e63946&startAt=${t}`;
    else
      url = `https://vidlink.pro/tv/${tmdbId}/${seasonNum}/${currentEp}?autoplay=true&primaryColor=e63946&startAt=${t}`;
  } else if (currentServer === 'vidsrc') {
    // vidsrc.mov supports ?t= for timestamp
    if (item.type === 'movie')
      url = `https://vidsrc.mov/embed/movie/${tmdbId}?t=${t}`;
    else
      url = `https://vidsrc.mov/embed/tv/${tmdbId}/${seasonNum}/${currentEp}?t=${t}`;
  } else if (currentServer === 'vixsrc') {
    if (item.type === 'movie')
      url = `https://vixsrc.to/movie/${tmdbId}?startAt=${t}`;
    else
      url = `https://vixsrc.to/tv/${tmdbId}/${seasonNum}/${currentEp}?startAt=${t}`;
  }
  if (url) {
    clearTimeout(serverLoadTimer);
    document.getElementById('player-iframe').src = url;
  } else {
    loadServerUrl(); // provider has no confirmed resume param; reload from start
  }
  startWatchTimer(); // restart timer from 0 on new server
}

function switchServer(srv) {
  if (srv === currentServer) return;
  stopWatchTimer();
  showResume();
  currentServer = srv;
  localStorage.setItem('preferredServer', srv); // manual pick becomes the new default
  triedServers = new Set([srv]); // fresh fallback chain starting from this pick
  // Update current history state to include new server
  try {
    var st = history.state || {};
    st.srv = srv;
    history.replaceState(st, '');
  } catch(e) {}
  updateServerButtons();
  loadServerUrl();
  startWatchTimer();
}

function playStream() {
  var stored = localStorage.getItem('preferredServer') || 'vidlink';
  if (stored === 'vidsrcmov') stored = 'vidsrc'; // migrate old key name from before the picklist update
  currentServer = stored;
  triedServers = new Set([currentServer]);
  hideResume();
  stopWatchTimer();
  updateServerButtons();
  loadServerUrl();
  startWatchTimer();
}

function updateEpNav() {
  const isMovie = currentItem?.type === 'movie';
  document.getElementById('ep-indicator').textContent = isMovie ? '' : `Episode ${currentEp} / ${totalEps||'?'}`;
  document.getElementById('prev-ep').disabled = currentEp <= 1 || isMovie;
  document.getElementById('next-ep').disabled = currentEp >= totalEps || isMovie;
}

document.getElementById('prev-ep').onclick = () => { if (currentEp > 1) openPlayer(currentEp-1); };
document.getElementById('next-ep').onclick = () => { if (currentEp < totalEps) openPlayer(currentEp+1); };

// ═══════════════════════════════════════════
// LIVE SEARCH DROPDOWN
// ═══════════════════════════════════════════
let liveSearchTimer = null;

function handleLiveSearch(q, source) {
  clearTimeout(liveSearchTimer);
  const dropdownId = source === 'home' ? 'home-dropdown' : 'search-dropdown';
  const dropdown = document.getElementById(dropdownId);

  if (!q || q.trim().length < 2) {
    closeDropdown();
    return;
  }

  // Show loading state
  dropdown.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px;">Searching...</div>`;
  dropdown.classList.add('open');

  // Debounce — wait 400ms after user stops typing
  liveSearchTimer = setTimeout(() => fetchLiveResults(q.trim(), dropdownId), 400);
}

async function fetchLiveResults(q, dropdownId) {
  // Fetch anime + TV + movies in parallel, limit to 3 each = 9 max results
  const [animeData, tvData, movieData] = await Promise.all([
    al(`query($s:String){Page(perPage:3){media(type:ANIME,search:$s,isAdult:false,sort:SEARCH_MATCH){id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}`, {s:q}),
    tmdb('/search/tv',    {query:q, page:1}),
    tmdb('/search/movie', {query:q, page:1}),
  ]);

  const animeList = (animeData?.data?.Page?.media||[]).map(m => ({...fromAL(m), al_id:m.id}));
  const tvList    = (tvData?.results||[]).slice(0,3).map(m => fromTMDB(m,'tv'));
  const movieList = (movieData?.results||[]).slice(0,3).map(m => fromTMDB(m,'movie'));
  const combined  = [...animeList, ...tvList, ...movieList];

  const dropdown = document.getElementById(dropdownId);
  if (!combined.length) {
    dropdown.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px;">No results for "${q}"</div>`;
    return;
  }

  dropdown.innerHTML = '';
  combined.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dropdown-item';
    const typeLabel = item.type==='anime'?'ANIME':item.type==='movie'?'MOVIE':'TV';
    el.innerHTML = `
      <div class="dropdown-thumb"><img src="${item.img||''}" alt="${item.title}" loading="lazy"/></div>
      <div class="dropdown-info">
        <div class="dropdown-title">${item.title}</div>
        <div class="dropdown-sub">
          <span class="dropdown-type ${item.type}">${typeLabel}</span>
          <span>${item.year||''}</span>
          ${item.episodes ? `<span>· ${item.episodes} eps</span>` : ''}
          ${item.score ? `<span>· ⭐${item.score}</span>` : ''}
        </div>
      </div>`;
    el.onclick = () => { closeDropdown(); openDetail(item); };
    dropdown.appendChild(el);
  });

  // View all results button
  const viewAll = document.createElement('div');
  viewAll.className = 'dropdown-view-all';
  viewAll.innerHTML = `View all results for "${q}" →`;
  viewAll.onclick = () => { closeDropdown(); doSearch(q); };
  dropdown.appendChild(viewAll);
}

function openDropdown(source) {
  const id = source === 'home' ? 'home-dropdown' : 'search-dropdown';
  document.getElementById(id).classList.add('open');
}

function closeDropdown() {
  document.querySelectorAll('.search-dropdown').forEach(d => d.classList.remove('open'));
}

// Close dropdown when tapping outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.topbar-search')) closeDropdown();
});

// ═══════════════════════════════════════════
// PAGE FILTERS — Anime / TV / Movies
// ═══════════════════════════════════════════
function togglePageFilter(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function pickPageChip(el, groupId) {
  document.getElementById(groupId).querySelectorAll('.chip')
    .forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function getChipVal(groupId) {
  return document.getElementById(groupId)?.querySelector('.chip.active')?.dataset.val || '';
}

function getYearRange(val) {
  if (!val) return {};
  if (val.includes('s')) {
    const d = parseInt(val);
    return { gte: `${d}-01-01`, lte: `${d===1980?1989:d+9}-12-31` };
  }
  return { gte: `${val}-01-01`, lte: `${val}-12-31` };
}

function resetPageFilter(page) {
  const prefix = page==='anime'?'af':page==='tv'?'tf':'mf';
  ['genre','year','rating','country','status','tag'].forEach(g => {
    const el = document.getElementById(`${prefix}-${g}`);
    if (el) el.querySelectorAll('.chip').forEach((c,i) => c.classList.toggle('active', i===0));
  });
  const matched = document.getElementById(`${prefix}-tag-matched`);
  if (matched) { matched.textContent = ''; matched.style.display = 'none'; }
}

// ── KEYWORD RESOLUTION (TMDB) ──
// Turns free-text like "boys love, time loop" into TMDB keyword IDs joined with OR (|)
// Grabs multiple matching keyword variants per term (not just the top hit) since TMDB
// tags the same theme inconsistently (e.g. "boys love" vs "boys' love" vs "yaoi").
async function resolveKeywordIds(text) {
  const terms = (text||'').split(',').map(t=>t.trim()).filter(Boolean);
  if (!terms.length) return {ids:'', names:[]};
  const idSet = new Set();
  const names = [];
  for (const term of terms) {
    try {
      const d = await tmdb('/search/keyword', {query: term});
      const matches = (d?.results||[]).slice(0,6);
      matches.forEach(m => { if (!idSet.has(m.id)) { idSet.add(m.id); names.push(m.name); } });
    } catch {}
  }
  return {ids: [...idSet].join('|'), names};
}

// ── ANIME FILTER ──
let animeFilterVars = null;
let animeFilterQ = null;

async function applyAnimeFilter(page=1) {
  if (page === 1) {
    document.getElementById('anime-filter').style.display = 'none';
    document.getElementById('anime-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('anime-more').style.display = 'none';

    const genre   = getChipVal('af-genre');
    const tag     = getChipVal('af-tag');
    const yearVal = getChipVal('af-year');
    const rating  = getChipVal('af-rating');
    const status  = getChipVal('af-status');
    const yr      = getYearRange(yearVal);
    const minScore = rating ? parseInt(rating) : undefined;
    const yGte = yr.gte ? parseInt(yr.gte.slice(0,4))*10000 : undefined;
    const yLte = yr.lte ? parseInt(yr.lte.slice(0,4))*10000+1231 : undefined;

    animeFilterQ = `query($page:Int,$genre:String,$tag:String,$sort:[MediaSort],$yGte:FuzzyDateInt,$yLte:FuzzyDateInt,$minScore:Int,$status:MediaStatus){
      Page(page:$page,perPage:24){
        pageInfo{hasNextPage}
        media(type:ANIME,isAdult:false,genre:$genre,tag:$tag,sort:$sort,startDate_greater:$yGte,startDate_lesser:$yLte,averageScore_greater:$minScore,status:$status){
          id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres
        }
      }
    }`;
    animeFilterVars = { genre:genre||undefined, tag:tag||undefined, sort:['SCORE_DESC'], yGte, yLte, minScore, status:status||undefined };
  }

  const data = await al(animeFilterQ, {...animeFilterVars, page});
  const list = (data?.data?.Page?.media||[]).map(fromAL);
  const hasMore = data?.data?.Page?.pageInfo?.hasNextPage || false;

  if (page === 1) renderGrid('anime-grid', list);
  else list.forEach(a => document.getElementById('anime-grid').appendChild(buildGridCard(a)));

  animePageState = {sub:'filter', page, hasMore};
  document.getElementById('anime-more').style.display = hasMore ? 'block' : 'none';
  if (hasMore) attachInfiniteScroll();
}

// ── TV FILTER ──
// Store filter URL base for pagination
let tvFilterUrl = null;
let tvFilterStatus = '';

async function applyTVFilter(page=1) {
  if (page === 1) {
    document.getElementById('tv-filter').style.display = 'none';
    document.getElementById('tv-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('tv-more').style.display = 'none';

    const country = getChipVal('tf-country');
    const genre   = getChipVal('tf-genre');
    const yearVal = getChipVal('tf-year');
    const rating  = getChipVal('tf-rating');
    const status  = getChipVal('tf-status');
    const tagVal  = getChipVal('tf-tag');
    const yr      = getYearRange(yearVal);
    tvFilterStatus = status;

    const url = new URL(`${TMDB_BASE}/discover/tv`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    if (country) {
      url.searchParams.set('sort_by', 'popularity.desc');
      url.searchParams.set('vote_count.gte', '0');
    } else {
      url.searchParams.set('sort_by', 'vote_average.desc');
      url.searchParams.set('vote_count.gte', '50');
    }
    if (country) url.searchParams.set('with_origin_country', country);
    if (genre)   url.searchParams.set('with_genres', genre);
    if (rating)  url.searchParams.set('vote_average.gte', rating);
    if (yr.gte)  url.searchParams.set('first_air_date.gte', yr.gte);
    if (yr.lte)  url.searchParams.set('first_air_date.lte', yr.lte);
    if (status)  url.searchParams.set('with_status', status);

    const keywordIds = await resolveKeywordIds(tagVal);
    const matchedEl = document.getElementById('tf-tag-matched');
    if (keywordIds.ids) {
      url.searchParams.set('with_keywords', keywordIds.ids);
      // Niche tagged content (BL, reverse harem, etc.) rarely clears a high vote-count floor —
      // drop it and sort by popularity instead, same treatment as the Country filter above.
      url.searchParams.set('sort_by', 'popularity.desc');
      url.searchParams.set('vote_count.gte', '0');
      if (matchedEl) { matchedEl.textContent = 'Matched TMDB tags: ' + keywordIds.names.join(', '); matchedEl.style.display = 'block'; }
    } else if (matchedEl) {
      matchedEl.textContent = tagVal ? 'No matching TMDB tag found for: ' + tagVal : '';
      matchedEl.style.display = tagVal ? 'block' : 'none';
    }

    // Save base URL and status for pagination
    tvFilterUrl = url.toString();
  }

  try {
    const r = await fetch(`${tvFilterUrl}&page=${page}`, {signal: AbortSignal.timeout(10000)});
    const d = await r.json();
    const statusMap = {'returning':'Ongoing','ended':'Completed','planned':'Upcoming','canceled':'Canceled'};
    const knownStatus = statusMap[tvFilterStatus] || '';
    const items = (d?.results||[]).map(m => {
      const item = fromTMDB(m,'tv');
      // Always override with known status from filter selection
      if (knownStatus) item.status = knownStatus;
      return item;
    });
    if (page === 1) renderGrid('tv-grid', items);
    else items.forEach(a => document.getElementById('tv-grid').appendChild(buildGridCard(a)));
    const hasMore = (d?.page||1) < (d?.total_pages||1);
    tvPageState = {sub:'filter', region:'', page, hasMore};
    document.getElementById('tv-more').style.display = hasMore ? 'block' : 'none';
    if (hasMore) attachInfiniteScroll();
  } catch { renderGrid('tv-grid', []); }
}

// ── MOVIE FILTER ──
let movieFilterUrl = null;

async function applyMovieFilter(page=1) {
  if (page === 1) {
    document.getElementById('movie-filter').style.display = 'none';
    document.getElementById('movies-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('movies-more').style.display = 'none';

    const country = getChipVal('mf-country');
    const genre   = getChipVal('mf-genre');
    const yearVal = getChipVal('mf-year');
    const rating  = getChipVal('mf-rating');
    const status  = getChipVal('mf-status');
    const tagVal  = getChipVal('mf-tag');
    const yr      = getYearRange(yearVal);

    const url = new URL(`${TMDB_BASE}/discover/movie`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    if (country) {
      url.searchParams.set('sort_by', 'popularity.desc');
      url.searchParams.set('vote_count.gte', '0');
    } else {
      url.searchParams.set('sort_by', 'vote_average.desc');
      url.searchParams.set('vote_count.gte', '100');
    }
    if (country) url.searchParams.set('with_origin_country', country);
    if (genre)  url.searchParams.set('with_genres', genre);
    if (rating) url.searchParams.set('vote_average.gte', rating);
    if (yr.gte) url.searchParams.set('primary_release_date.gte', yr.gte);
    if (yr.lte) url.searchParams.set('primary_release_date.lte', yr.lte);
    if (status === 'upcoming') url.searchParams.set('primary_release_date.gte', new Date().toISOString().slice(0,10));
    else if (status === 'released') url.searchParams.set('primary_release_date.lte', new Date().toISOString().slice(0,10));

    const keywordIds = await resolveKeywordIds(tagVal);
    const matchedElM = document.getElementById('mf-tag-matched');
    if (keywordIds.ids) {
      url.searchParams.set('with_keywords', keywordIds.ids);
      // Same fix as TV: niche tagged content rarely clears a high vote-count floor
      url.searchParams.set('sort_by', 'popularity.desc');
      url.searchParams.set('vote_count.gte', '0');
      if (matchedElM) { matchedElM.textContent = 'Matched TMDB tags: ' + keywordIds.names.join(', '); matchedElM.style.display = 'block'; }
    } else if (matchedElM) {
      matchedElM.textContent = tagVal ? 'No matching TMDB tag found for: ' + tagVal : '';
      matchedElM.style.display = tagVal ? 'block' : 'none';
    }

    movieFilterUrl = url.toString();
  }

  try {
    const r = await fetch(`${movieFilterUrl}&page=${page}`, {signal: AbortSignal.timeout(10000)});
    const d = await r.json();
    const items = (d?.results||[]).map(m=>fromTMDB(m,'movie'));
    if (page === 1) renderGrid('movies-grid', items);
    else items.forEach(a => document.getElementById('movies-grid').appendChild(buildGridCard(a)));
    const hasMore = (d?.page||1) < (d?.total_pages||1);
    moviePageState = {sub:'filter', page, hasMore};
    document.getElementById('movies-more').style.display = hasMore ? 'block' : 'none';
    if (hasMore) attachInfiniteScroll();
  } catch { renderGrid('movies-grid', []); }
}

// ═══════════════════════════════════════════
// INFINITE SCROLL
// ═══════════════════════════════════════════
const infiniteObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const page = entry.target.dataset.page;
    if (page === 'anime'  && animePageState.hasMore)  loadMoreAnime();
    if (page === 'tv'     && tvPageState.hasMore)     loadMoreTV();
    if (page === 'movies' && moviePageState.hasMore)  loadMoreMovies();
  });
}, { rootMargin: '200px' });

function attachInfiniteScroll() {
  ['anime','tv','movies'].forEach(page => {
    const sentinel = document.getElementById(`${page}-sentinel`);
    if (sentinel) infiniteObserver.observe(sentinel);
  });
}

// ═══════════════════════════════════════════
// WATCH HISTORY — localStorage
// ═══════════════════════════════════════════
const HISTORY_KEY = 'jomerpb_history';
const MAX_HISTORY = 20;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(item, season, ep) {
  try {
    let history = getHistory();
    const id = `${item.type}-${item.al_id||item.tmdb_id||item.id}`;
    // Remove existing entry for same show
    history = history.filter(h => h.id !== id);
    // Add to front
    history.unshift({
      id,
      type: item.type,
      al_id: item.al_id,
      tmdb_id: item.tmdb_id || item.id,
      mal_id: item.mal_id,
      title: item.title,
      img: item.banner || item.img || '',
      seasonNum: season?.season_number || 1,
      ep,
      totalEps: totalEps || 1,
      ts: Date.now()
    });
    // Keep only last MAX_HISTORY
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderContinueWatching();
  } catch {}
}

function renderContinueWatching() {
  const history = getHistory();
  const section = document.getElementById('cw-section');
  const row = document.getElementById('cw-row');
  if (!history.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  row.innerHTML = '';
  history.forEach(h => {
    const card = document.createElement('div');
    card.className = 'cw-card';
    const progress = Math.min((h.ep / (h.totalEps||1)) * 100, 100);
    const typeLabel = h.type==='anime'?'ANIME':h.type==='movie'?'MOVIE':'TV';
    const epLabel = h.type==='movie' ? 'Movie' : `S${h.seasonNum||1} · EP ${h.ep}`;
    card.innerHTML = `
      <div class="cw-img">
        <img src="${h.img}" alt="${h.title}" loading="lazy"/>
        <div class="cw-play">
          <div class="cw-play-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#111"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="cw-progress"><div class="cw-progress-fill" style="width:${progress}%"></div></div>
        <button class="cw-remove" onclick="removeFromHistory(event,'${h.id}')">✕</button>
      </div>
      <div class="cw-info">
        <div class="cw-title">${h.title}</div>
        <div class="cw-sub">${epLabel}</div>
      </div>`;
    card.onclick = () => resumeItem(h);
    row.appendChild(card);
  });
}

async function resumeItem(h) {
  // Rebuild item from history data
  const item = {
    type: h.type,
    al_id: h.al_id,
    tmdb_id: h.tmdb_id,
    mal_id: h.mal_id,
    id: h.tmdb_id || h.al_id,
    title: h.title,
    img: h.img,
    banner: h.img
  };
  await openDetail(item);
  // Auto-open to the episode they were on
  setTimeout(() => openPlayer(h.ep), 800);
}

function removeFromHistory(e, id) {
  e.stopPropagation();
  try {
    let history = getHistory().filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderContinueWatching();
  } catch {}
}

function clearHistory() {
  if (!confirm('Clear all watch history?')) return;
  try { localStorage.removeItem(HISTORY_KEY); renderContinueWatching(); } catch {}
}

// ═══════════════════════════════════════════
// INIT — restore page from URL hash
// ═══════════════════════════════════════════
async function initFromHash() {
  const hash = window.location.hash.replace('#','');

  // Helper to fetch item by type+id
  async function fetchItem(type, id) {
    if (type==='anime') {
      const Q=`query($id:Int){Media(id:$id,type:ANIME){id idMal title{english romaji}coverImage{large}bannerImage episodes averageScore status seasonYear format description}}`;
      const r=await al(Q,{id:parseInt(id)});
      if(r?.data?.Media){const m=r.data.Media;return{...fromAL(m),al_id:m.id,mal_id:m.idMal};}
    } else if (type==='tv') {
      const d=await tmdb(`/tv/${id}`); if(d)return fromTMDB(d,'tv');
    } else if (type==='movie') {
      const d=await tmdb(`/movie/${id}`); if(d)return fromTMDB(d,'movie');
    }
    return null;
  }

  // Detail page
  const detailM = hash.match(/^detail-(anime|tv|movie)-(\d+)$/);
  if (detailM) {
    showPage('detail-page');
    loadHome();
    const item = await fetchItem(detailM[1], detailM[2]);
    if (item) await openDetail(item, true);
    else { showPage('home-page'); setNav('home'); }
    return;
  }

  // Player page
  const playerM = hash.match(/^player-(anime|tv|movie)-(\d+)-s(\d+)-e(\d+)$/);
  if (playerM) {
    showPage('player-page');
    document.querySelector('.bottom-nav').style.display='none';
    loadHome();
    const item = await fetchItem(playerM[1], playerM[2]);
    if (item) {
      currentItem   = item;
      currentEp     = parseInt(playerM[4]);
      currentSeason = {type:playerM[1], season_number:parseInt(playerM[3]), mal_id:item.mal_id, tmdb_id:item.tmdb_id||item.id};
      allSeasons    = [currentSeason];
      totalEps      = item.episodes||1;
      const isAnime = item.type==='anime', isMovie = item.type==='movie';
      document.getElementById('player-title').textContent    = item.title;
      document.getElementById('player-subtitle').textContent = isMovie?(item.year||''):`Episode ${currentEp}`;
      document.getElementById('player-lang-row').style.display = isAnime?'flex':'none';
      playStream(); updateEpNav();
      loadSimilarItems(item);
    } else { showPage('home-page'); setNav('home'); }
    return;
  }

  // Tab pages
  // Old anime/tv/movies hashes now open home with that category selected
  if (hash === 'anime' || hash === 'tv' || hash === 'movies') {
    const idx = {anime:0, tv:1, movies:2}[hash];
    history.replaceState({page:'home-page'},'','#home');
    showPage('home-page'); setNav('home');
    loadHome();
    streamSeg(hash, document.querySelectorAll('#stream-seg .seg-btn')[idx]);
    return;
  }

  const tabMap = {search:'search-page',oracle:'oracle-page',trade:'trade-page'};
  if (tabMap[hash]) {
    showPage(tabMap[hash]); setNav(hash); if(hash!=='oracle' && hash!=='trade') loadHome();
    if(hash==='trade' && !tpCurrentSym) tpSelectTicker(BLUE_CHIP_SYMS[0]);
    return;
  }

  // Default: home
  history.replaceState({page:'home-page'},'','#home');
  showPage('home-page'); setNav('home');
  loadHome();
  // Restore whichever segment (Anime/TV/Movies) the user last had open, so a refresh doesn't bounce back to Anime
  const savedSeg = localStorage.getItem('lastStreamSeg');
  if (savedSeg && savedSeg !== 'anime') {
    const idx = {anime:0, tv:1, movies:2}[savedSeg];
    const btn = document.querySelectorAll('#stream-seg .seg-btn')[idx];
    if (btn) streamSeg(savedSeg, btn);
  }
}

// Position the seg-slide under whichever button is active on first paint
// (covers the default "Anime" case, which never calls streamSeg() directly).
requestAnimationFrame(() => {
  const activeSegBtn = document.querySelector('#stream-seg .seg-btn.active');
  if (activeSegBtn) updateSegSlide(activeSegBtn, true);
});

// initFromHash moved below oracle div
