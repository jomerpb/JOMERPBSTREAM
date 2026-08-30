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
let mangaPageState  = {sub:'trending', page:1, hasMore:false};
let tvPageState     = {sub:'popular',  region:'', page:1, hasMore:false};
let moviePageState  = {sub:'popular',  page:1, hasMore:false};
let searchState     = {q:'', type:'all', page:1, hasMore:false};

// True once the inline player on the detail page has actually been handed a
// stream URL. Until then the frame shows its poster placeholder and no
// provider request has been made — see openPlayer()/resetInlinePlayer().
let playerLoaded = false;

// Remembers how far each page was scrolled, so a back/swipe-back navigation
// can restore that position instead of always snapping to the top.
let scrollPositions = {};

// Which Stream segment the home page is showing. The Continue Watching /
// Continue Reading row keys off this so it always matches the tab in view.
// Seeded from the same value streamSeg() persists, so a reload is consistent.
let currentStreamSeg = (() => {
  try { return localStorage.getItem('lastStreamSeg') || 'anime'; } catch { return 'anime'; }
})();

// Opt out of the browser's own automatic scroll restoration on history
// navigation (back/forward/swipe-back). Left on 'auto' (the default), the
// browser tries to restore scroll itself and can race with/override the
// scrollTo() calls in showPage() below, especially on mobile edge-swipe
// gestures. 'manual' makes scrollPositions the single source of truth.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

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
// ═══════════════════════════════════════════
// STATUS BAR TINT
// ═══════════════════════════════════════════
// In an installed PWA the Android status bar (clock, wifi, battery) is painted
// by the OS using <meta name="theme-color">. A web page cannot make that bar
// genuinely translucent — it is not part of the document — so "glass" here means
// painting it the same colour as whatever sits directly beneath it, which is
// what makes the page read as edge-to-edge instead of starting under a black
// band. Chrome on Android re-reads the meta tag when it changes, so this can
// follow the page.
const THEME_DEFAULT = '#07090f';   // === --bg, the colour behind every other page

function setThemeColor(hex) {
  const m = document.querySelector('meta[name="theme-color"]');
  if (m && m.getAttribute('content') !== hex) m.setAttribute('content', hex);
}

// Average the TOP STRIP of the detail backdrop so the bar continues the artwork.
// Reading pixels back needs the image to be CORS-readable: s4.anilist.co echoes
// this origin and image.tmdb.org sends *, both verified. Any failure — a tainted
// canvas, a dead URL, no image at all — just leaves the default in place, so the
// worst case is exactly today's behaviour.
function tintStatusBarFrom(src) {
  if (!src) { setThemeColor(THEME_DEFAULT); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onerror = () => setThemeColor(THEME_DEFAULT);
  img.onload = () => {
    try {
      const w = 32, h = 32;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(img, 0, 0, w, h);
      const rows = Math.max(1, Math.round(h * 0.18));      // just the top edge
      const d = ctx.getImageData(0, 0, w, rows).data;
      let r=0, g=0, b=0, n=0;
      for (let i = 0; i < d.length; i += 4) { r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
      // The backdrop renders under .detail-backdrop-overlay, which darkens it.
      // Matching the raw pixels would leave the bar visibly brighter than the
      // image right below it, which is the opposite of seamless.
      const DIM = 0.72;
      setThemeColor('#' + [r,g,b]
        .map(v => Math.round((v / n) * DIM).toString(16).padStart(2,'0')).join(''));
    } catch { setThemeColor(THEME_DEFAULT); }
  };
  img.src = src;
}

function showPage(id, restore) {
  // Only the detail page tints the bar; everything else sits on --bg.
  if (id !== 'detail-page') setThemeColor(THEME_DEFAULT);
  // Remember exactly where the page we're leaving was scrolled to.
  const outgoing = document.querySelector('.page.active');
  if (outgoing) scrollPositions[outgoing.id] = window.scrollY;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // The player lives on the detail page now, so navigating anywhere else has
  // to stop it — otherwise the iframe keeps playing audio under the next tab.
  if (id !== 'detail-page') resetInlinePlayer();
  // Only restore a remembered scroll position on back/forward navigation
  // (restore===true, set from the popstate handler). Fresh forward
  // navigation (tapping a card/tab) always starts at the top, as expected.
  window.scrollTo(0, restore ? (scrollPositions[id] || 0) : 0);
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
  currentStreamSeg = cat;
  renderContinueWatching();   // Watching <-> Reading follows the segment
  document.querySelectorAll('#stream-seg .seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  updateSegSlide(el);
  document.getElementById('sec-anime').style.display  = (cat === 'anime')  ? '' : 'none';
  document.getElementById('sec-manga').style.display  = (cat === 'manga')  ? '' : 'none';
  document.getElementById('sec-tv').style.display     = (cat === 'tv')     ? '' : 'none';
  document.getElementById('sec-movies').style.display = (cat === 'movies') ? '' : 'none';
  // Lazy-load the grid the first time a category is opened
  if (cat === 'anime'  && !document.getElementById('anime-grid').children.length)
    loadAnimeSub('trending', document.querySelector('#anime-tabs .ctab.active') || document.querySelectorAll('#anime-tabs .ctab')[1]);
  if (cat === 'manga'  && !document.getElementById('manga-grid').children.length)
    loadMangaSub('latest', document.querySelector('#manga-tabs .ctab.active') || document.querySelectorAll('#manga-tabs .ctab')[1]);
  if (cat === 'tv'     && !document.getElementById('tv-grid').children.length)
    loadTVSub('popular', '', document.querySelector('#tv-tabs .ctab.active') || document.querySelectorAll('#tv-tabs .ctab')[1]);
  if (cat === 'movies' && !document.getElementById('movies-grid').children.length)
    loadMovieSub('popular', document.querySelector('#movie-tabs .ctab.active') || document.querySelectorAll('#movie-tabs .ctab')[1]);
}

// Position of each category in #stream-seg, in DOM order. Every place that
// needs to press a segment button by index reads this one map — the order is
// declared once here rather than re-spelled at each call site.
const SEG_INDEX = {anime:0, manga:1, tv:2, movies:3};

function navTo(tab) {
  // Anime/Manga/TV/Movies pages were merged into the home Stream tab
  if (tab in SEG_INDEX) {
    navTo('home');
    streamSeg(tab, document.querySelectorAll('#stream-seg .seg-btn')[SEG_INDEX[tab]]);
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
    if(h==='oracle'){showPage('oracle-page', true);setNav('oracle');return;}
    showPage('home-page', true); setNav('home'); return;
  }
  const page = state.page;
  showPage(page, true);
  const navMap = {'home-page':'home','anime-page':'anime','manga-page':'manga','tv-page':'tv','movies-page':'movies','search-page':'search','oracle-page':'oracle','trade-page':'trade'};
  if (navMap[page]) setNav(navMap[page]);
  if (page === 'detail-page' && state.item) await openDetail(state.item, true);
});

// ═══════════════════════════════════════════
// LANG
// ═══════════════════════════════════════════
function setLang(lang) {
  if (lang === currentLang && playerLoaded) return;
  currentLang = lang;
  document.getElementById('det-sub')?.classList.toggle('active', lang==='sub');
  document.getElementById('det-dub')?.classList.toggle('active', lang==='dub');
  // Only anime has a sub/dub split in the stream URL, and only a player that
  // is already showing something needs re-pointing at it.
  if (playerLoaded) playStream();
}

// ═══════════════════════════════════════════
// CARD BUILDERS — anchor tags for long press
// ═══════════════════════════════════════════
// Manga, manhwa and manhua are one internal type ('manga') — same AniList
// query, same grid, same detail page — and differ only by country of origin.
// The badge is the one place that spells the difference out, so the label is
// derived from item.origin rather than stored as a separate type.
const MANGA_ORIGIN_LABEL = {JP:'Manga', KR:'Manhwa', CN:'Manhua', TW:'Manhua'};
function mangaKind(item) { return MANGA_ORIGIN_LABEL[item?.origin] || 'Manga'; }

function typeLabelShort(item) {
  if (item.type === 'manga') return mangaKind(item).toUpperCase();
  return {anime:'ANIME', movie:'MOVIE', tv:'TV'}[item.type] || 'TV';
}

function skRow(n) {
  return Array(n).fill(0).map(()=>`<div style="flex-shrink:0;"><div class="sk" style="width:105px;height:148px;border-radius:8px;"></div><div class="sk" style="width:90px;height:9px;border-radius:4px;margin-top:5px;"></div></div>`).join('');
}

function buildSmCard(item) {
  const c = document.createElement('a');
  c.className = 'card-sm';
  c.href = `#detail-${item.type}-${item.al_id||item.tmdb_id||item.id}`;
  c.style.cssText = 'text-decoration:none;color:inherit;';
  const badge = item.score ? `<div class="card-sm-badge">⭐${item.score}</div>` : '';
  const typeBadge = `<div class="card-sm-type ${item.type}">${typeLabelShort(item)}</div>`;
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
  const typeColor = item.type;
  const typeLabel = item.type==='movie' ? 'FILM' : typeLabelShort(item);

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
// MANGA PAGE
// ═══════════════════════════════════════════
// Manga rides the same AniList endpoint the Anime tab already uses — one API
// client, one rate limit, one grid renderer. It is a browse-and-discover tab,
// NOT a reader: see openMangaDetail() for why the chapter images cannot be
// fetched from this origin, and what the Read button does instead.

// Every manga list query selects the same fields. Declared once so the grid,
// the filter and the recommendation rows cannot drift apart in what they ask
// for — a missing field there shows up as a blank pill, not as an error.
const MANGA_FIELDS = 'id idMal title{english romaji}coverImage{large}bannerImage chapters volumes averageScore status startDate{year}format genres countryOfOrigin';

// AniList models manhwa/manhua as ordinary MANGA with a different
// countryOfOrigin, and light novels as format:NOVEL. Every query below
// therefore excludes NOVEL — a text novel in a cover-art grid is noise.
const MANGA_SUBS = {
  // 'latest' is handled by loadMangaLatest(), not by this table.
  trending:  {sort:'TRENDING_DESC'},
  popular:   {sort:'POPULARITY_DESC'},
  toprated:  {sort:'SCORE_DESC'},
  releasing: {sort:'POPULARITY_DESC', status:'RELEASING'},
  manhwa:    {sort:'POPULARITY_DESC', country:'KR'},
  manhua:    {sort:'POPULARITY_DESC', country:'CN'},
  oneshot:   {sort:'POPULARITY_DESC', format:'ONE_SHOT'},
  action:    {sort:'POPULARITY_DESC', genre:'Action'},
  romance:   {sort:'POPULARITY_DESC', genre:'Romance'},
  fantasy:   {sort:'POPULARITY_DESC', genre:'Fantasy'},
  // Isekai is an AniList *tag*, not a genre — the genre list has no such
  // entry, so asking for genre:"Isekai" matches nothing at all.
  isekai:    {sort:'POPULARITY_DESC', tag:'Isekai'},
};

// Deliberately NOT a `type` argument on fromAL(): that function is called as
// `.map(fromAL)` in several places, where Array#map would hand the array
// index in as the second argument and silently pick the wrong branch.
function fromALManga(m) {
  const statusMap = {RELEASING:'Ongoing',FINISHED:'Completed',NOT_YET_RELEASED:'Upcoming',CANCELLED:'Canceled',HIATUS:'On Hiatus'};
  const origin = m.countryOfOrigin || 'JP';
  const countryNames = {JP:'Japan',KR:'Korea',CN:'China',TW:'Taiwan'};
  return {
    type:     'manga',
    al_id:    m.id,
    mal_id:   m.idMal,
    title:    m.title?.english || m.title?.romaji || 'Unknown',
    year:     m.startDate?.year || '',
    score:    m.averageScore ? (m.averageScore/10).toFixed(1) : null,
    img:      m.coverImage?.large || m.coverImage?.medium || '',
    banner:   m.bannerImage || m.coverImage?.extraLarge || '',
    // AniList descriptions are HTML. <br> carries the paragraph breaks, so it
    // becomes a newline before the remaining tags are stripped — otherwise
    // every paragraph runs into the next one.
    synopsis: (m.description||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').trim(),
    chapters: m.chapters || null,
    volumes:  m.volumes  || null,
    genre:    Array.isArray(m.genres) ? (m.genres[0]||'') : '',
    genres:   m.genres || [],
    status:   statusMap[m.status] || m.status || '',
    format:   m.format || '',
    origin,
    country:  origin,
    countryFlag: countryNames[origin] || origin,
  };
}

const MANGA_ROW_TITLE = {
  latest:'📖 Latest Manga', trending:'📖 Trending Manga', popular:'📖 Popular Manga',
  toprated:'📖 Top Rated Manga', releasing:'📖 Ongoing Manga',
  manhwa:'📖 Manhwa', manhua:'📖 Manhua', oneshot:'📖 One-shots',
};

async function loadMangaSub(sub, tabEl) {
  mangaPageState = {sub, page:1, hasMore:false};
  if (tabEl) { document.querySelectorAll('#manga-tabs .ctab').forEach(t=>t.classList.remove('active')); tabEl.classList.add('active'); }
  const heading = document.getElementById('manga-row-title');
  if (heading) heading.textContent = MANGA_ROW_TITLE[sub] || '📖 Manga';
  document.getElementById('manga-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
  document.getElementById('manga-more').style.display = 'none';
  // "Latest" is the only sub-tab that is not an AniList query — it is
  // MangaFreak's own release feed, scraped into mangafreak-latest.json because
  // the site cannot be read from the browser.
  if (sub === 'latest') return loadMangaLatest();
  const {items, hasMore} = await fetchManga(sub, 1);
  renderGrid('manga-grid', items);
  mangaPageState.hasMore = hasMore;
  document.getElementById('manga-more').style.display = hasMore ? 'block' : 'none';
  if (hasMore) attachInfiniteScroll();
}

// A MangaFreak release row is not an AniList record: no score, no genres, no
// id. It carries a cover, the newest chapter and how long ago that landed, so
// those take the slots the score/year/genre badges normally use.
function buildLatestCard(entry) {
  const chapter = entry.chapter && entry.title && entry.chapter.startsWith(entry.title)
    ? entry.chapter.slice(entry.title.length).trim()
    : (entry.chapter || '');
  const card = buildGridCard({
    type: 'manga',
    title: entry.title,
    // The release feed links the 55x85 thumbnail, which is soft blown up to a
    // grid card. 100x140 is the largest size the host actually serves (200x300
    // and above come back empty), so ask for that and fall back to whatever the
    // feed gave if the path shape ever changes.
    img: (entry.cover || '').replace(/\/55x85$/, '/100x140'),
    year: entry.when || '',
    genre: chapter ? `Ch ${chapter}` : '',
    origin: 'JP',
    mfSlug: entry.slug,
  });
  card.href = MANGA_SOURCES.mangafreak.manga(entry.slug);
  card.onclick = (e) => { e.preventDefault(); openMangaFromLatest(entry); };
  return card;
}

// Tapping a Latest card should land on the app's own detail page, so it is
// looked up on AniList by title first. Titles MangaFreak carries and AniList
// does not (or names differently) fall through to the MangaFreak page itself
// rather than a dead end.
async function openMangaFromLatest(entry) {
  const Q = `query($s:String){Page(perPage:1){media(type:MANGA,search:$s,isAdult:false,format_not_in:[NOVEL],sort:SEARCH_MATCH){${MANGA_FIELDS}}}}`;
  const d = await al(Q, {s: entry.title});
  const m = d?.data?.Page?.media?.[0];
  if (m) {
    const item = fromALManga(m);
    item.mfSlug = entry.slug;          // we already know the exact page
    return openDetail(item);
  }
  window.open(MANGA_SOURCES.mangafreak.manga(entry.slug), '_blank', 'noopener');
}

async function loadMangaLatest() {
  ensureMangafreakIndex();             // warm it for the Read button
  const grid = document.getElementById('manga-grid');
  let items = [];
  try {
    const r = await fetch(`mangafreak-latest.json?nocache=${Date.now()}`);
    if (r.ok) items = (await r.json()).items || [];
  } catch {}
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Latest is unavailable</h3></div>`;
    mangaPageState.hasMore = false;
    return;
  }
  items.forEach(entry => grid.appendChild(buildLatestCard(entry)));
  // The whole feed is one committed file, so there is no next page to fetch.
  mangaPageState.hasMore = false;
  document.getElementById('manga-more').style.display = 'none';
}

async function fetchManga(sub, page) {
  const cfg = MANGA_SUBS[sub] || MANGA_SUBS.trending;
  const Q = `query($page:Int,$sort:[MediaSort],$genres:[String],$tags:[String],$country:CountryCode,$statuses:[MediaStatus],$formats:[MediaFormat]){
    Page(page:$page,perPage:24){
      pageInfo{hasNextPage}
      media(type:MANGA,isAdult:false,sort:$sort,genre_in:$genres,tag_in:$tags,countryOfOrigin:$country,status_in:$statuses,format_in:$formats,format_not_in:[NOVEL]){
        ${MANGA_FIELDS}
      }
    }
  }`;
  const data = await al(Q, {
    page,
    sort:     [cfg.sort],
    genres:   cfg.genre   ? [cfg.genre]   : undefined,
    tags:     cfg.tag     ? [cfg.tag]     : undefined,
    country:  cfg.country || undefined,
    statuses: cfg.status  ? [cfg.status]  : undefined,
    formats:  cfg.format  ? [cfg.format]  : undefined,
  });
  return {
    items:   (data?.data?.Page?.media||[]).map(fromALManga),
    // AniList reports this directly, so unlike the anime/TV grids there is no
    // need to infer "there is more" from a full page of results.
    hasMore: data?.data?.Page?.pageInfo?.hasNextPage || false,
  };
}

async function loadMoreManga() {
  if (!mangaPageState.hasMore) return;
  mangaPageState.hasMore = false;
  mangaPageState.page++;
  if (mangaPageState.sub === 'filter') {
    await applyMangaFilter(mangaPageState.page);
  } else {
    const {items, hasMore} = await fetchManga(mangaPageState.sub, mangaPageState.page);
    renderGrid('manga-grid', items, true);
    mangaPageState.hasMore = hasMore;
    document.getElementById('manga-more').style.display = hasMore ? 'block' : 'none';
    if (hasMore) attachInfiniteScroll();
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
  if (type === 'all' || type === 'manga') {
    const Q = `query($s:String,$page:Int){Page(page:$page,perPage:12){media(type:MANGA,search:$s,isAdult:false,format_not_in:[NOVEL],sort:SEARCH_MATCH){${MANGA_FIELDS}}}}`;
    const d = await al(Q, {s:q, page});
    results = results.concat((d?.data?.Page?.media||[]).map(fromALManga));
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
  showPage('detail-page', restore);

  // Skeleton
  document.getElementById('detail-backdrop-wrap').innerHTML = `<div class="sk" style="width:100%;height:100%;border-radius:0;"></div><div class="detail-backdrop-overlay"></div><div class="back-circle" onclick="goBack()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></div>`;
  document.getElementById('detail-poster').innerHTML = `<div class="sk" style="width:100%;height:100%;border-radius:7px;"></div>`;
  document.getElementById('detail-info').innerHTML = `<div class="sk" style="width:80%;height:16px;margin-bottom:8px;border-radius:4px;"></div><div class="sk" style="width:60%;height:10px;border-radius:4px;"></div>`;
  document.getElementById('detail-synopsis').textContent = '';
  document.getElementById('detail-synopsis').classList.remove('expanded');
  document.getElementById('synopsis-toggle').style.display = 'none';
  document.getElementById('synopsis-toggle').textContent = 'Show more';
  document.getElementById('detail-castprod').style.display = 'none';
  document.getElementById('detail-castprod-body').innerHTML = '';
  document.getElementById('detail-castprod-body').classList.add('collapsed');
  document.getElementById('detail-castprod-chev').classList.add('collapsed');
  document.getElementById('detail-lang').style.display = 'none';
  // currentLang was just reset to 'sub' above; the toggle has to follow it.
  // It never used to, because the toggle was hidden behind a Watch button and
  // a second copy on the player page overrode it — now it sits in the EPISODES
  // header of every title, so a leftover lit DUB would be read as fact.
  document.getElementById('det-sub')?.classList.add('active');
  document.getElementById('det-dub')?.classList.remove('active');
  document.getElementById('detail-seasons-wrap').style.display = 'none';
  showEpsSection(false);
  document.getElementById('eps-grid').innerHTML = '';
  document.getElementById('seasons-row').innerHTML = '';
  // Both collapsible sections re-close on every detail open, so a title never
  // inherits the previous one's expanded state.
  collapseSection('eps-grid', 'eps-chev', true);
  collapseSection('detail-similar-body', 'detail-similar-chev', true);
  // Player back to its placeholder, pointing at this title's art.
  resetInlinePlayer(item);
  // Hide up front so a detail page never briefly shows the previous title's
  // grid while the new one is still loading.
  const detailSim = document.getElementById('detail-similar-section');
  if (detailSim) { detailSim.style.display = 'none'; detailSimilarState.type = null; }

  if (item.type === 'anime') {
    await openAnimeDetail(item);
  } else if (item.type === 'manga') {
    await openMangaDetail(item);
  } else if (item.type === 'tv') {
    await openTVDetail(item);
  } else {
    await openMovieDetail(item);
  }

  // The skeleton placeholder set above is shorter than the fully loaded
  // content, so the scrollTo() inside showPage() can get clamped before
  // this data finishes loading in. Re-apply it now that real content
  // (poster, synopsis, episodes) has replaced the skeleton.
  if (restore) {
    requestAnimationFrame(() => window.scrollTo(0, scrollPositions['detail-page'] || 0));
  }
}

// ── ANIME DETAIL ──
async function openAnimeDetail(item) {
  const Q = `query($alId:Int,$malId:Int){Media(id:$alId,idMal:$malId,type:ANIME){id idMal title{english romaji native}coverImage{extraLarge large}bannerImage description episodes averageScore status seasonYear format nextAiringEpisode{episode} genres tags{name} relations{edges{relationType node{id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres type nextAiringEpisode{episode}}}}}}`;
  const vars = item.al_id ? {alId:item.al_id} : {malId:item.mal_id};
  const r = await al(Q, vars);
  const m = r?.data?.Media;
  if (!m) { renderAnimeUI(item, [], item); return; }

  const full = {...fromAL(m), al_id:m.id, mal_id:m.idMal||item.mal_id};
  currentItem = full;
  const animeTags = matchAnimeTags(m.tags);
  showEpsSection(true);
  renderCastProduction('anime', [], []); // no Cast & Production for anime — AniList has no reliable cast data

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
  renderDetailHero(full, 'anime', animeTags);
  document.getElementById('detail-lang').style.display = 'flex';
  renderSeasonTabs();
  selectSeason(allSeasons[0]);
  loadRecommendations(full);
}

// ── TV DETAIL ──
// ── MANGA DETAIL ──
// This is a browse page, not a reader, and that is a measured constraint
// rather than a shortcut. The chapter-image APIs (api.mangadex.org,
// api.comick.dev) answer a request from this page with no
// Access-Control-Allow-Origin header, so the browser discards the response:
// verified per-origin against a cache-busted request — api.mangadex.org
// returns ACAO for https://mangadex.org and for http://localhost, and returns
// none at all for https://jomerpb.github.io, which is where this site is
// served from. That localhost carve-out is exactly why a local Playwright run
// is not evidence here: reading would work on the test server and fail on the
// deployed page. Three public CORS relays were tried as a way round it and all
// three were down or paywalled (522, 522, 401). So the Read button hands the
// title off to MangaFreak's own search instead of pretending to open it.
// MangaFreak's search lives at /Find/<query> (its own search box posts there),
// and its matcher requires EVERY word of the query to appear in the title it has
// indexed — punctuation it ignores, extra words it does not. Two consequences,
// both measured rather than assumed:
//   * its index stores titles without a leading article, so "The Infinite Mage"
//     returns nothing while "Infinite Mage" finds the series;
//   * a trailing subtitle after ": " is usually absent from its title too.
// Hence the two trims below. Each is skipped when it would leave nothing useful.
// The separator has to require whitespace AFTER the colon so that a name with an
// internal colon ("Re:Zero") is not truncated to "Re".
// Where a manga can be read. MangaFreak is the primary — it is what the Read
// button opens. Orchisasia is offered only as a link chip further down the
// page, never as the default: it is an 18+ BL/yaoi catalogue, and this tab
// queries AniList with isAdult:false, so the two catalogues barely overlap —
// measured 5/20 of the Manhwa sub-tab and 0/20 of Trending. Marked adult:true
// so the chip can be styled and labelled as such rather than looking like an
// ordinary source.
const MANGA_SOURCES = {
  mangafreak: {
    label: 'MangaFreak ↗',
    url:   q    => 'https://ww3.mangafreak.me/Find/' + encodeURIComponent(q),
    // The direct page. Preferred over the search URL whenever the title can be
    // resolved to a slug — see mangafreakSlugFor().
    manga: slug => 'https://ww3.mangafreak.me/Manga/' + encodeURIComponent(slug),
  },
  orchisasia: {
    label: 'Orchisasia 18+ ↗',
    adult: true,
    url: q => 'https://www.orchisasia.org/?post_type=wp-manga&s=' + encodeURIComponent(q),
  },
};

// Shared by both sources. The two trims exist for MangaFreak, whose matcher
// needs every word of the query to appear in the title it indexed and whose
// index drops leading articles. On Orchisasia (a WordPress ?s= search, which is
// far more forgiving) they are a no-op — measured identical hit counts on 7
// titles either way — so one normaliser serves both rather than two that could
// drift apart.
function mangaSearchQuery(title) {
  const tidy = t => String(t || '').trim().replace(/\s+/g, ' ');
  let q = tidy(title);
  const noArticle = tidy(q.replace(/^(?:the|a|an)\s+/i, ''));
  if (noArticle.length >= 2) q = noArticle;
  const noSubtitle = tidy(q.split(/\s*[:–—]\s+|\s+-\s+/)[0]);
  if (noSubtitle.length >= 2) q = noSubtitle;
  // MangaFreak's own search box lowercases before navigating; both servers are
  // case-insensitive, but this keeps the URL identical to the one the site
  // would have produced itself.
  return q.toLowerCase();
}

function mangaSourceUrl(key, item) {
  return MANGA_SOURCES[key].url(mangaSearchQuery(item?.title));
}

// ── MANGAFREAK SLUG INDEX ──
// Read used to dump you on a search results page because the site sends no
// Access-Control-Allow-Origin — the page cannot query it. So .github/scripts/
// scrape_mangafreak.py walks its A-Z list in Actions and commits the slugs
// here, and the lookup happens locally against that file.
//
// Matching is deliberately strict. A wrong direct link is worse than a search
// page: measured over 80 real AniList titles, a loose "candidate contains every
// query word" rule sent Attack on Titan to Attack_On_Titan_Before_The_Fall and
// Tokyo Ghoul to Tokyo_Ghoulre, both wrong. Requiring whole-token equality, at
// least two tokens, and at most one extra token in the candidate leaves exactly
// one fuzzy match across those 80 — The Swordmaster's Son ->
// Swordmasters_Youngest_Son, which is correct — and drops the hit rate only
// from 64% to 61%. Anything unresolved falls back to the search URL.
let mfIndex = null;          // {exact:Map, table:[...]} once loaded
let mfIndexLoading = null;

const mfNorm   = t => String(t||'').toLowerCase().replace(/[’']/g,'')
                        .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const mfStrip  = t => t.replace(/^(?:the|a|an)\s+/,'');
const mfSquash = t => t.replace(/\s+/g,'');

function ensureMangafreakIndex() {
  if (mfIndex || mfIndexLoading) return mfIndexLoading || Promise.resolve(mfIndex);
  mfIndexLoading = fetch(`mangafreak-index.json?nocache=${Date.now()}`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      const slugs = d?.slugs || [];
      if (!slugs.length) return null;
      const table = slugs.map(slug => {
        const n = mfNorm(slug), a = mfStrip(n);
        return {slug, a, toks: a.split(' ')};
      });
      const exact = new Map();
      for (const e of table) for (const k of [e.a, mfSquash(e.a)]) if (!exact.has(k)) exact.set(k, e.slug);
      mfIndex = {exact, table};
      return mfIndex;
    })
    .catch(() => null)
    .finally(() => { mfIndexLoading = null; });
  return mfIndexLoading;
}

// Synchronous on purpose: it runs inside the Read tap so window.open is not
// separated from the gesture by an await, which mobile popup blockers reject.
// If the index has not arrived yet the caller just uses the search URL.
function mangafreakSlugFor(title) {
  if (!mfIndex || !title) return null;
  const n = mfNorm(title), a = mfStrip(n);
  for (const k of [n, a, mfSquash(a)]) { const hit = mfIndex.exact.get(k); if (hit) return hit; }
  const toks = a.split(' ').filter(t => t.length > 1);
  if (toks.length < 2) return null;          // one word matches far too much
  let best = null;
  for (const e of mfIndex.table) {
    if (!toks.every(t => e.toks.includes(t))) continue;
    const extra = e.toks.filter(t => !toks.includes(t)).length;
    if (extra > 1) continue;
    if (!best || extra < best.extra || (extra === best.extra && e.a.length < best.len))
      best = {slug:e.slug, extra, len:e.a.length};
  }
  return best ? best.slug : null;
}

function openMangaReader(item) {
  saveMangaToHistory(item);
  const slug = item.mfSlug || mangafreakSlugFor(item.title) || mangafreakSlugFor(item.titleRomaji);
  const url = slug ? MANGA_SOURCES.mangafreak.manga(slug)
                   : mangaSourceUrl('mangafreak', item);
  window.open(url, '_blank', 'noopener');
}

// Outbound links for the detail page's collapsible block: AniList for the
// record itself, then every alternate reading source. MangaFreak is omitted —
// the Read button above is already that link.
function mangaDetailLinks(item) {
  const links = [];
  if (item?.siteUrl) links.push({label:'View on AniList ↗', href:item.siteUrl});
  links.push({
    label: MANGA_SOURCES.orchisasia.label,
    href:  mangaSourceUrl('orchisasia', item),
    adult: true,
  });
  return links;
}

async function openMangaDetail(item) {
  // Fire and forget: by the time Read is tapped the slug lookup is usually
  // ready, and if it is not the search URL still works.
  ensureMangafreakIndex();
  const Q = `query($alId:Int,$malId:Int){Media(id:$alId,idMal:$malId,type:MANGA){
    id idMal title{english romaji native}coverImage{extraLarge large}bannerImage description
    chapters volumes averageScore status startDate{year}endDate{year}format genres countryOfOrigin siteUrl
    tags{name}
    staff(perPage:8,sort:RELEVANCE){edges{role node{name{full}}}}
    relations{edges{relationType node{id idMal title{english romaji}coverImage{large}episodes chapters volumes averageScore status seasonYear startDate{year}format genres type countryOfOrigin nextAiringEpisode{episode}}}}
  }}`;
  const vars = item.al_id ? {alId:item.al_id} : {malId:item.mal_id};
  const r = await al(Q, vars);
  const m = r?.data?.Media;
  if (!m) { renderSimpleDetail(item, 'manga'); return; }

  const full = {...fromALManga(m), al_id:m.id, mal_id:m.idMal||item.mal_id, siteUrl:m.siteUrl, endYear:m.endDate?.year||null};
  currentItem = full;

  renderDetailBackdrop(full.banner || full.img, full.title);
  renderDetailHero(full, 'manga', matchMangaTags(m.tags));

  // No chapter grid to label, so the EPISODES block stays hidden — same
  // treatment movies get.
  showEpsSection(false);

  // AniList staff roles are free text ("Story & Art", "Story", "Art",
  // "Original Creator", "Assistant"). Assistants are dropped: on a long
  // serial they crowd out the actual author.
  const creators = (m.staff?.edges||[])
    .filter(e => !/assistant/i.test(e.role||''))
    .slice(0,6)
    .map(e => `${e.node?.name?.full||''}${e.role?` · ${e.role}`:''}`.trim())
    .filter(Boolean);
  const publication = [
    mangaKind(full),
    full.format === 'ONE_SHOT' ? 'One-shot' : '',
    full.status,
    full.year ? (full.endYear && full.endYear !== full.year ? `${full.year}–${full.endYear}` : `${full.year}${full.status==='Ongoing'?'–':''}`) : '',
    full.volumes ? `${full.volumes} volumes` : '',
    full.chapters ? `${full.chapters} chapters` : '',
  ].filter(Boolean);
  renderCastProduction('manga', creators, publication, mangaDetailLinks(full));

  document.getElementById('detail-seasons-wrap').style.display = 'none';
  document.getElementById('eps-grid').innerHTML = '';
  allSeasons = [];
  currentSeason = null;

  const readBtn = document.getElementById('detail-play-btn');
  readBtn.textContent = '📖 Read ↗';
  readBtn.onclick = () => openMangaReader(full);

  loadRecommendations(full);
}

async function openTVDetail(item) {
  const data = await tmdb(`/tv/${item.tmdb_id||item.id}`, {append_to_response:'keywords,credits'});
  if (!data) { renderSimpleDetail(item, 'tv'); return; }

  const full = fromTMDB(data, 'tv');
  full.tmdb_id = data.id;
  currentItem = full;

  const keywordNames = (data.keywords?.results||[]).map(k=>k.name);
  const tvTags = matchTmdbTags(keywordNames);

  renderDetailBackdrop(full.banner, full.title);
  renderDetailHero(full, 'tv', tvTags);

  showEpsSection(true);
  const castNames = (data.credits?.cast||[]).slice(0,8).map(c=>c.name);
  const prodNames = [...new Set([...(data.networks||[]).map(n=>n.name), ...(data.production_companies||[]).map(p=>p.name)])];
  renderCastProduction('tv', castNames, prodNames);

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
    showEpsSection(true);
    buildEpGrid(data.number_of_episodes||20, null);
  }
  loadRecommendations(full);
}

// ── MOVIE DETAIL ──
async function openMovieDetail(item) {
  const data = await tmdb(`/movie/${item.tmdb_id||item.id}`, {append_to_response:'keywords,credits'});
  const full = data ? fromTMDB(data,'movie') : item;
  full.tmdb_id = (data||item).id;
  currentItem = full;

  const keywordNames = (data?.keywords?.keywords||[]).map(k=>k.name);
  const movieTags = matchTmdbTags(keywordNames);

  renderDetailBackdrop(full.banner, full.title);
  renderDetailHero(full, 'movie', movieTags);

  // Movies have no episode grid, so the "EPISODES" block stays hidden — the
  // tag pills live up in the hero row instead, and a movie has no dub toggle.
  showEpsSection(false);
  const castNames = (data?.credits?.cast||[]).slice(0,8).map(c=>c.name);
  const prodNames = (data?.production_companies||[]).map(p=>p.name);
  renderCastProduction('movie', castNames, prodNames);
  document.getElementById('detail-play-btn').onclick = () => openPlayer(1);
  document.getElementById('detail-play-btn').textContent = '▶ Watch Movie';
  allSeasons = [{...full, season_number:0}];
  currentSeason = allSeasons[0];
  totalEps = 1;
  loadRecommendations(full);
}

function renderDetailBackdrop(img, title) {
  tintStatusBarFrom(img);
  // The inline player's placeholder shows the same art. openDetail seeds it
  // from the card the user tapped, which is the low-res poster; this is the
  // one point every detail renderer passes through with the real banner.
  const phImg = document.getElementById('player-placeholder-img');
  if (phImg && !playerLoaded) phImg.src = img || '';
  document.getElementById('detail-backdrop-wrap').innerHTML = `
    <img src="${img||''}" alt="${title}" style="width:100%;height:100%;object-fit:cover;display:block;"/>
    <div class="detail-backdrop-overlay"></div>
    <div class="back-circle" onclick="goBack()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></div>`;
}

function renderDetailHero(item, type, extraTags=[]) {
  const typeClass = {anime:'anime',manga:'manga',tv:'tv',movie:'movie'}[type];
  const typeLabel = {anime:'🎌 Anime',manga:`📖 ${mangaKind(item)}`,tv:'📺 TV Series',movie:'🎬 Movie'}[type];

  document.getElementById('detail-poster').innerHTML = `<img src="${item.img||''}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;"/>`;

  const pills = [
    {label: typeLabel, cls: typeClass},
    {label: item.year||'', cls:''},
    {label: item.score?`⭐ ${item.score}`:'', cls:'accent'},
    {label: item.episodes?`${item.episodes} eps`:'', cls:''},
    // Manga-only counts. Anime/TV/movie items never carry these keys, so no
    // branch is needed — they simply filter out as empty below.
    {label: item.chapters?`${item.chapters} ch`:'', cls:''},
    {label: item.volumes?`${item.volumes} vol`:'', cls:''},
    {label: type==='manga' && item.status ? item.status : '', cls:''},
    // Matched content tags (Miniseries, Isekai, etc.) now sit right next to
    // the episode-count badge in this same row, instead of appearing lower
    // down next to the "EPISODES" section heading.
    ...(extraTags||[]).map(t => ({label: t, cls: 'accent'})),
  ].filter(p=>p.label);

  document.getElementById('detail-info').innerHTML = `
    <div class="detail-title">${item.title}</div>
    <div class="detail-pills">${pills.map(p=>`<span class="dpill ${p.cls}">${p.label}</span>`).join('')}</div>`;

  const synEl = document.getElementById('detail-synopsis');
  synEl.textContent = item.synopsis || 'No synopsis available.';
  synEl.classList.remove('expanded');
  const toggleBtn = document.getElementById('synopsis-toggle');
  toggleBtn.textContent = 'Show more';
  // Only offer the toggle if the text actually overflows the 4-line clamp —
  // scrollHeight vs clientHeight is measured after the browser reflows the
  // clamped box, so this reflects the real rendered overflow, not a guess.
  toggleBtn.style.display = synEl.scrollHeight > synEl.clientHeight + 1 ? 'block' : 'none';
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
      // The stream URL carries the season, so a season change makes whatever
      // is loaded wrong. Reset to the placeholder rather than leave the old
      // season playing under new episode buttons. Deliberately here and not
      // inside selectSeason/selectTVSeason: those also run during the initial
      // detail load, and selectTVSeason awaits TMDB, so a reset in there could
      // land after a resume-from-history has already started playing.
      resetInlinePlayer(currentItem);
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
    showEpsSection(true);
    buildEpGrid(9999, null);
    // Fetch real episode count in background
    al(`query($id:Int){Media(id:$id){episodes nextAiringEpisode{episode}}}`, {id: s.al_id}).then(r => {
      const m = r?.data?.Media;
      const count = m?.episodes || (m?.nextAiringEpisode?.episode ? m.nextAiringEpisode.episode - 1 : null);
      if (count) { totalEps = count; buildEpGrid(count, null); }
    });
  } else {
    totalEps = s.episodes || 100;
    showEpsSection(true);
    buildEpGrid(totalEps, null);
  }
  document.querySelectorAll('.spill').forEach((b,i) => b.classList.toggle('active', parseInt(b.dataset.idx)===allSeasons.indexOf(s)));
  document.getElementById('detail-play-btn').onclick = () => openPlayer(1);
}

async function selectTVSeason(s) {
  currentSeason = s;
  document.querySelectorAll('.spill').forEach((b,i) => b.classList.toggle('active', parseInt(b.dataset.idx)===allSeasons.indexOf(s)));
  showEpsSection(true);

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
  // Every caller sets totalEps immediately before calling this — including the
  // async AniList episode-count fetch — so this is the one place that knows the
  // count has settled. Without it the player's "Episode 1 / 1" sat stale under
  // a grid of 12 buttons until something was actually played.
  updateEpNav();
}

function renderSimpleDetail(item, type) {
  // Movies play as a single item and manga does not play at all, so neither
  // gets an episode grid or the heading above it.
  const episodic = type === 'anime' || type === 'tv';
  renderDetailBackdrop(item.banner||item.img, item.title);
  renderDetailHero(item, type);
  showEpsSection(episodic);
  renderCastProduction(type, [], [], type === 'manga' ? mangaDetailLinks(item) : []);
  if (type === 'manga') {
    const readBtn = document.getElementById('detail-play-btn');
    readBtn.textContent = '📖 Read ↗';
    readBtn.onclick = () => openMangaReader(item);
    document.getElementById('eps-grid').innerHTML = '';
    allSeasons = [];
    currentSeason = null;
    return;
  }
  allSeasons = [{...item, season_number: type==='movie'?0:1}];
  currentSeason = allSeasons[0];
  totalEps = item.episodes || (type==='movie'?1:20);
  if (episodic) buildEpGrid(totalEps, 1);
}

// ═══════════════════════════════════════════
// DETAIL PAGE — tag pills (next to EPISODES) + Cast & Production (TV/Movie only)
// ═══════════════════════════════════════════
// Anime tag pickers use raw AniList tag names as their data-val, so matching
// a title's own tags reuses those same values (keeps filter and display
// consistent, including the pre-existing Countryside→Iyashikei mapping).
const ANIME_TAG_DEFS = [
  {label:'Isekai',      val:'Isekai'},
  {label:'Shounen',     val:'Shounen'},
  {label:'Shoujo',      val:'Shoujo'},
  {label:'Seinen',      val:'Seinen'},
  {label:'Josei',       val:'Josei'},
  {label:'Reincarnation', val:'Reincarnation'},
  {label:'Time Skip',   val:'Time Skip'},
  {label:'Super Power', val:'Super Power'},
  {label:'Iyashikei',   val:'Iyashikei'},
  {label:'Countryside', val:'Iyashikei'},
];
// TV/Movie tag pickers resolve free-text terms into TMDB keyword IDs (see
// resolveKeywordIds), so matching here checks a title's own TMDB keyword
// names against those same underlying terms.
const TV_MOVIE_TAG_DEFS = [
  {label:'Coming of Age', terms:['boys love','girls love','lgbt','gay romance']},
  {label:'Reverse Harem', terms:['reverse harem']},
  {label:'Isekai',        terms:['isekai']},
  {label:'Time Loop',     terms:['time loop']},
  {label:'Zombie',        terms:['zombie']},
  {label:'Vampire',       terms:['vampire']},
  {label:'Superhero',     terms:['superhero']},
  {label:'Miniseries',    terms:['miniseries']},
  {label:'Countryside',   terms:['countryside']},
];

// Mirrors the gf-tag picker's data-val list, for the same reason the anime
// table mirrors af-tag: a pill shown on a title should be a value the filter
// can actually be set to.
const MANGA_TAG_DEFS = [
  {label:'Isekai',        val:'Isekai'},
  {label:'Shounen',       val:'Shounen'},
  {label:'Shoujo',        val:'Shoujo'},
  {label:'Seinen',        val:'Seinen'},
  {label:'Josei',         val:'Josei'},
  {label:'Reincarnation', val:'Reincarnation'},
  {label:'Cultivation',   val:'Cultivation'},
  {label:'Villainess',    val:'Villainess'},
  {label:'Martial Arts',  val:'Martial Arts'},
  {label:'Dungeon',       val:'Dungeon'},
  {label:'Super Power',   val:'Super Power'},
  {label:'Revenge',       val:'Revenge'},
  {label:'Time Skip',     val:'Time Skip'},
  {label:'Historical',    val:'Historical'},
  {label:'Female Lead',   val:'Female Protagonist'},
  {label:'Iyashikei',     val:'Iyashikei'},
];

function matchMangaTags(aniListTags) {
  const names = (aniListTags||[]).map(t=>t.name);
  const out = [];
  MANGA_TAG_DEFS.forEach(d => { if (names.includes(d.val) && !out.includes(d.label)) out.push(d.label); });
  // The hero pill row is shared with year/score/chapter/volume/status badges;
  // past three tags it wraps to a third line and pushes the synopsis down.
  return out.slice(0,3);
}

function matchAnimeTags(aniListTags) {
  const names = (aniListTags||[]).map(t=>t.name);
  const out = [];
  ANIME_TAG_DEFS.forEach(d => { if (names.includes(d.val) && !out.includes(d.label)) out.push(d.label); });
  return out;
}

function matchTmdbTags(keywordNames) {
  const lower = (keywordNames||[]).map(k=>k.toLowerCase());
  const out = [];
  TV_MOVIE_TAG_DEFS.forEach(d => {
    if (d.terms.some(term => lower.some(kn => kn.includes(term)))) out.push(d.label);
  });
  return out;
}

// Shows or hides the whole collapsible EPISODES block (header + grid).
// Hidden for movies and manga, which have no episode grid — and with it goes
// the SUB/DUB toggle that now lives in that header, which is correct: neither
// type has a dub to switch to. This used to be renderDetailTagsRow(), which
// also rendered the title's matched tag pills; those moved into the hero pill
// row next to the episode count (see renderDetailHero) and the row it drew
// them into is gone, so all that is left is the show/hide.
function showEpsSection(show) {
  const sec = document.getElementById('eps-section');
  if (sec) sec.style.display = show ? 'block' : 'none';
}

// Shared collapse mechanics for the EPISODES grid and the Similar body. The
// chevron and the body carry the same 'collapsed' class the Cast & Production
// card already uses, so all three sections behave identically.
// `force` omitted = toggle; true = collapse; false = expand.
function collapseSection(bodyId, chevId, force) {
  const body = document.getElementById(bodyId);
  const chev = document.getElementById(chevId);
  if (!body) return false;
  const collapsed = force === undefined
    ? body.classList.toggle('collapsed')
    : (body.classList.toggle('collapsed', force), force);
  if (chev) chev.classList.toggle('collapsed', collapsed);
  return collapsed;
}

function toggleEpsSection() { collapseSection('eps-grid', 'eps-chev'); }

function toggleSimilarSection() {
  const collapsed = collapseSection('detail-similar-body', 'detail-similar-chev');
  // Opening it can reveal a grid shorter than the viewport, in which case the
  // sentinel is already on screen and no scroll event will ever fire to page
  // the next batch in. Prime it once here instead.
  if (!collapsed) fillDetailSimilar();
}

// Hidden for anime — AniList has no reliable cast data for it. TV/Movie fill
// it with Cast + Production; manga reuses the same two-block layout for its
// creators and publication run, plus an optional row of outbound links.
const CASTPROD_LABELS = {
  manga: {head:'Story & Art',        a:'Story & Art', b:'Publication'},
  tv:    {head:'Cast & Production',  a:'Cast',        b:'Production'},
  movie: {head:'Cast & Production',  a:'Cast',        b:'Production'},
};

function renderCastProduction(type, castNames, prodNames, links=[]) {
  const section = document.getElementById('detail-castprod');
  const body = document.getElementById('detail-castprod-body');
  if (type === 'anime') { section.style.display = 'none'; return; }
  section.style.display = 'block';
  const L = CASTPROD_LABELS[type] || CASTPROD_LABELS.tv;
  const head = document.getElementById('detail-castprod-title');
  if (head) head.textContent = L.head;
  const chips = (names, what) => (names||[]).length
    ? `<div class="dc-chiplist">${names.map(n=>`<span>${escapeHtml(n)}</span>`).join('')}</div>`
    : `<div class="dc-empty">No ${what} information available.</div>`;
  const linkHtml = (links||[]).length
    ? `<div class="dc-block"><div class="dc-block-label">Links</div><div class="dc-chiplist">${
        links.map(l=>`<a class="dc-link${l.adult?' adult':''}" href="${escapeHtml(l.href)}" target="_blank" rel="noopener nofollow">${escapeHtml(l.label)}</a>`).join('')
      }</div></div>`
    : '';
  body.innerHTML = `
    <div class="dc-block"><div class="dc-block-label">${L.a}</div>${chips(castNames, L.a.toLowerCase())}</div>
    <div class="dc-block"><div class="dc-block-label">${L.b}</div>${chips(prodNames, L.b.toLowerCase())}</div>
    ${linkHtml}`;
}

function toggleDcSection() {
  document.getElementById('detail-castprod-body').classList.toggle('collapsed');
  document.getElementById('detail-castprod-chev').classList.toggle('collapsed');
}

function toggleSynopsis() {
  const el = document.getElementById('detail-synopsis');
  const btn = document.getElementById('synopsis-toggle');
  const expanded = el.classList.toggle('expanded');
  btn.textContent = expanded ? 'Show less' : 'Show more';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ═══════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════
async function loadRecommendations(item) {
  // Hide all rows first
  document.getElementById('rec-section').style.display = 'none';
  ['rec-row-1','rec-row-2','rec-row-3'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; });
  ['rec-grid-1','rec-grid-2','rec-grid-3'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML=''; });

  // "Similar X" used to be a fixed 12-item horizontal row here, per type, plus
  // a "Trending/Popular" row that just repeated that tab's own default listing
  // on every detail page. Both are gone: Similar is now the infinite grid below
  // (loadDetailSimilar), which is what the player page has always had, and the
  // trending row added nothing you could not see on the tab itself.
  //
  // One horizontal row survives, and only for manga: the anime adaptation. It
  // is short by nature and it is the one link that crosses into a tab that can
  // actually play what it points at.
  if (item.type === 'manga' && item.al_id) {
    const Q = `query($id:Int){Media(id:$id,type:MANGA){relations{edges{relationType node{id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres type nextAiringEpisode{episode}}}}}}`;
    const r = await al(Q, {id: item.al_id});
    const adaptations = (r?.data?.Media?.relations?.edges||[])
      .filter(e => e.node?.type === 'ANIME' && ['ADAPTATION','ALTERNATIVE','SIDE_STORY','SPIN_OFF'].includes(e.relationType))
      .map(e => ({...fromAL(e.node), al_id:e.node.id, mal_id:e.node.idMal}));
    renderRecRow(1, '🎌 Anime Adaptation', adaptations);
  }

  loadDetailSimilar(item);
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

// ── SIMILAR (detail page, infinite, every type) ──
// This is the only Similar grid left. The player page had a second copy of it
// (#similar-movies-section), which went with the page itself — the player is
// now a section of the detail page, so both grids would have been on screen at
// once, showing the same titles twice.
//
// Each type pages through its best source first, then falls back to a second
// one so the feed does not stop after a screenful:
//   anime/manga  AniList recommendations  -> same-genre popular
//   tv/movie     TMDB /similar            -> TMDB /recommendations
const ANIME_FIELDS = 'id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres';

const DETAIL_SIMILAR_TITLE = {
  anime: '✨ Similar Anime',
  manga: '✨ Similar Manga',
  tv:    '📺 Similar Series',
  movie: '🎬 Similar Movies',
};

let detailSimilarState = {type:null, alId:null, tmdbId:null, list:[], shown:0,
                          page:1, phase:'primary', genre:null, done:false, loading:false, seen:new Set()};

async function fetchMoreDetailSimilar() {
  const st = detailSimilarState;
  if (st.done || st.loading || !st.type) return 0;
  st.loading = true;
  try {
    let batch = [];

    if (st.type === 'manga' || st.type === 'anime') {
      const isManga = st.type === 'manga';
      const media = isManga ? 'MANGA' : 'ANIME';
      const fields = isManga ? MANGA_FIELDS : ANIME_FIELDS;
      const toItem = isManga ? fromALManga : (m => ({...fromAL(m), al_id:m.id, mal_id:m.idMal}));

      if (st.phase === 'primary') {
        const Q = `query($id:Int,$page:Int){Media(id:$id,type:${media}){recommendations(page:$page,perPage:24,sort:RATING_DESC){pageInfo{hasNextPage}nodes{mediaRecommendation{${fields}}}}}}`;
        const r = await al(Q, {id: st.alId, page: st.page});
        const conn = r?.data?.Media?.recommendations;
        const nodes = (conn?.nodes||[]).map(n => n.mediaRecommendation)
          .filter(m => m && (!isManga || m.format !== 'NOVEL'));
        if (conn?.pageInfo?.hasNextPage) st.page++; else { st.phase = 'fallback'; st.page = 1; }
        batch = nodes.filter(m => !st.seen.has(m.id));
        batch.forEach(m => st.seen.add(m.id));
        st.list.push(...batch.map(toItem));
        return batch.length;
      }
      if (!st.genre) { st.done = true; return 0; }
      const Q = `query($genre:String,$page:Int){Page(page:$page,perPage:24){pageInfo{hasNextPage}media(type:${media},isAdult:false${isManga?',format_not_in:[NOVEL]':''},genre:$genre,sort:POPULARITY_DESC){${fields}}}}`;
      const r = await al(Q, {genre: st.genre, page: st.page});
      const nodes = r?.data?.Page?.media || [];
      if (r?.data?.Page?.pageInfo?.hasNextPage) st.page++; else st.done = true;
      batch = nodes.filter(m => !st.seen.has(m.id));
      batch.forEach(m => st.seen.add(m.id));
      st.list.push(...batch.map(toItem));
      return batch.length;
    }

    // tv / movie — TMDB
    const endpoint = st.phase === 'primary' ? 'similar' : 'recommendations';
    const d = await tmdb(`/${st.type}/${st.tmdbId}/${endpoint}`, {page: st.page});
    const results = d?.results || [];
    const total = d?.total_pages || 1;
    if (st.page < total) st.page++;
    else if (st.phase === 'primary') { st.phase = 'fallback'; st.page = 1; }
    else st.done = true;
    batch = results.filter(m => m && !st.seen.has(m.id));
    batch.forEach(m => st.seen.add(m.id));
    st.list.push(...batch.map(m => fromTMDB(m, st.type)));
    return batch.length;
  } catch {
    st.done = true;
    return 0;
  } finally {
    st.loading = false;
  }
}

function renderMoreDetailSimilar() {
  const grid = document.getElementById('detail-similar-grid');
  const end  = document.getElementById('detail-similar-end');
  if (!grid) return;
  const st = detailSimilarState;
  const batch = st.list.slice(st.shown, st.shown + 12);
  batch.forEach(m => grid.appendChild(buildGridCard(m)));
  st.shown += batch.length;
  if (end) end.style.display = (st.done && st.shown >= st.list.length) ? 'block' : 'none';
}

async function loadDetailSimilar(item) {
  const section = document.getElementById('detail-similar-section');
  const grid = document.getElementById('detail-similar-grid');
  const titleEl = document.getElementById('detail-similar-title');
  const selfId = item?.al_id || item?.tmdb_id || item?.id;
  if (!section || !grid || !item || !DETAIL_SIMILAR_TITLE[item.type] || !selfId) {
    if (section) section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  if (titleEl) titleEl.textContent = DETAIL_SIMILAR_TITLE[item.type];
  grid.innerHTML = skRow(6);
  const end = document.getElementById('detail-similar-end');
  if (end) end.style.display = 'none';

  // Always rebuilt rather than cached per title: the grid is one shared
  // element, so a stale cache would show the previous title's results.
  detailSimilarState = {
    type: item.type,
    alId: item.al_id || null,
    tmdbId: item.tmdb_id || item.id || null,
    list: [], shown: 0, page: 1, phase: 'primary',
    genre: item.genres?.[0] || item.genre || null,
    done: false, loading: false, seen: new Set([selfId]),
  };

  // A title with no recommendations at all must still fall through to the
  // second source before we conclude there is nothing to show.
  let added = 0, guard = 0;
  while (!added && !detailSimilarState.done && guard++ < 4) added = await fetchMoreDetailSimilar();

  grid.innerHTML = '';
  if (!detailSimilarState.list.length) { section.style.display = 'none'; return; }
  renderMoreDetailSimilar();
}

const detailSimilarObserver = new IntersectionObserver(async (entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const st = detailSimilarState;
    if (!st.type) continue;
    if (st.shown < st.list.length) { renderMoreDetailSimilar(); continue; }
    if (!st.done && !st.loading) { await fetchMoreDetailSimilar(); renderMoreDetailSimilar(); }
  }
}, {rootMargin:'300px'});

(function attachDetailSimilarObserver() {
  const sentinel = document.getElementById('detail-similar-sentinel');
  if (sentinel) detailSimilarObserver.observe(sentinel);
})();

// The section is collapsed by default, so its sentinel starts at display:none
// and the observer has nothing to watch. Expanding it can leave a grid shorter
// than the viewport — sentinel already on screen, no scroll to come — so this
// pages batches in until the sentinel is pushed below the fold or the feed
// runs out. Bounded at 4 rounds so a source that returns nothing cannot spin.
async function fillDetailSimilar() {
  const st = detailSimilarState;
  const sentinel = document.getElementById('detail-similar-sentinel');
  if (!st.type || !sentinel) return;
  for (let i = 0; i < 4; i++) {
    if (st.shown < st.list.length) renderMoreDetailSimilar();
    else if (!st.done && !st.loading) { await fetchMoreDetailSimilar(); renderMoreDetailSimilar(); }
    else break;
    await new Promise(r => requestAnimationFrame(r));
    if (sentinel.getBoundingClientRect().top > window.innerHeight) break;
  }
}

// ═══════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════
// Plays an episode in the detail page's own player. This used to push a
// separate #player-page onto the history stack; it does not any more, so the
// URL stays on the title and Back goes where the user came from rather than
// bouncing them through a page they never asked to leave.
function openPlayer(ep) {
  const item = currentItem;
  if (!item || item.type === 'manga') return;
  currentEp = ep;

  const wrap = document.getElementById('detail-player-wrap');
  if (wrap) wrap.style.display = 'block';
  const ph = document.getElementById('player-placeholder');
  if (ph) ph.style.display = 'none';
  playerLoaded = true;

  playStream();                 // also draws the server picker
  updateEpNav();
  document.querySelectorAll('.ep-btn').forEach((b,i) => b.classList.toggle('active', i+1===ep));
  saveToHistory(item, currentSeason, ep);
  scrollPlayerIntoView();
}

// The player sits below the synopsis and the season pills, so a tap on Watch
// or on an episode has to bring it into view or nothing visibly happens.
function scrollPlayerIntoView() {
  const wrap = document.getElementById('detail-player-wrap');
  if (!wrap) return;
  requestAnimationFrame(() => wrap.scrollIntoView({behavior:'smooth', block:'start'}));
}

// What the placeholder's play button does: start whatever episode is queued
// (EP 1 on a fresh detail page).
function playCurrent() { openPlayer(currentEp || 1); }

// Puts the inline player back to "nothing is playing".
//   resetInlinePlayer(item) — a new title has been opened: stop the stream and
//     re-arm the placeholder with that title's artwork.
//   resetInlinePlayer()     — we are leaving the detail page: stop the stream
//     and leave the section configured as it is.
// Stopping means clearing iframe.src, which is the only way to make a
// cross-origin provider stop playing audio; nothing else reaches into it.
function resetInlinePlayer(item) {
  clearTimeout(serverLoadTimer);
  stopWatchTimer();
  hideResume();
  setPlayerFrame(null);
  playerLoaded = false;
  if (item === undefined) return;

  const wrap = document.getElementById('detail-player-wrap');
  const playable = !!item && item.type !== 'manga';
  if (wrap) wrap.style.display = playable ? 'block' : 'none';

  const ph = document.getElementById('player-placeholder');
  if (ph) {
    ph.style.display = playable ? 'flex' : 'none';
    const img = document.getElementById('player-placeholder-img');
    if (img) img.src = (item && (item.banner || item.img)) || '';
    const lbl = document.getElementById('player-placeholder-lbl');
    if (lbl) lbl.textContent = item && item.type === 'movie' ? 'Tap to play' : 'Tap to play EP 1';
  }

  currentEp = 1;
  const srv = document.getElementById('server-btns');
  if (srv) srv.innerHTML = '';
  updateEpNav();
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
  { key:'cinezo',     label:'Cinezo' },
  { key:'moviesapi',  label:'MoviesAPI' },
  { key:'vidfast',    label:'VidFast' }
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
    case 'moviesapi':
      return isMovie
        ? `https://moviesapi.to/movie/${tmdbId}`
        : `https://moviesapi.to/tv/${tmdbId}/${seasonNum}/${currentEp}`;
    case 'vidfast':
      return isMovie
        ? `https://vidfast.vc/movie/${tmdbId}`
        : `https://vidfast.vc/tv/${tmdbId}/${seasonNum}/${currentEp}`;
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

// Points the player at a URL by REPLACING the iframe element instead of
// assigning to its src. Measured in Chromium on this page: three `iframe.src =`
// assignments push three session-history entries, three element swaps push
// none. That mattered little while the player was its own page; now that
// episodes, servers and sub/dub all reload in place on the detail page, every
// one of those would have been a Back press that did nothing visible before
// the user finally got off the page. Pass no url to park the frame empty,
// which is also how the stream is stopped — the old iframe's browsing context
// goes with the element.
// Returns the live iframe so the caller can hang onload/onerror on it.
function setPlayerFrame(url) {
  const old = document.getElementById('player-iframe');
  if (!old) return null;
  const frame = old.cloneNode(false);
  if (url) frame.setAttribute('src', url); else frame.removeAttribute('src');
  old.replaceWith(frame);
  return frame;
}

// Loads the current server's URL into the player, with a load-timeout fallback.
// Note: cross-origin iframes can't be inspected for app-level errors (e.g. a provider's
// own "not found" page) — only network-level failures (onerror) and a load timeout are
// detectable. That's the best available signal without per-provider integration.
function loadServerUrl() {
  clearTimeout(serverLoadTimer);
  const item = currentItem;
  const isAnime = item?.type === 'anime';
  const status = document.getElementById('server-status');
  const url = buildUrl(currentServer);

  if (!isAnime && !url) {
    const label = SERVER_LIST.find(s => s.key === currentServer)?.label || currentServer;
    if (status) { status.style.display = 'block'; status.textContent = `${label} has no direct embed — trying next server…`; }
    autoFallback();
    return;
  }

  if (status) status.style.display = 'none';
  const iframe = setPlayerFrame(url);
  if (!iframe) return;
  iframe.onerror = function() { autoFallback(); };
  iframe.onload = function() { clearTimeout(serverLoadTimer); };

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
    setPlayerFrame(url);
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
  const row = document.querySelector('#detail-player-wrap .ep-nav-row');
  // A movie is one item — prev/next would be two permanently dead buttons, so
  // the whole row goes rather than sitting there greyed out.
  if (row) row.style.display = isMovie ? 'none' : 'flex';
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
  // Fetch anime + manga + TV + movies in parallel, limit to 3 each = 12 max results
  const [animeData, mangaData, tvData, movieData] = await Promise.all([
    al(`query($s:String){Page(perPage:3){media(type:ANIME,search:$s,isAdult:false,sort:SEARCH_MATCH){id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres}}}`, {s:q}),
    al(`query($s:String){Page(perPage:3){media(type:MANGA,search:$s,isAdult:false,format_not_in:[NOVEL],sort:SEARCH_MATCH){${MANGA_FIELDS}}}}`, {s:q}),
    tmdb('/search/tv',    {query:q, page:1}),
    tmdb('/search/movie', {query:q, page:1}),
  ]);

  const animeList = (animeData?.data?.Page?.media||[]).map(m => ({...fromAL(m), al_id:m.id}));
  const mangaList = (mangaData?.data?.Page?.media||[]).map(fromALManga);
  const tvList    = (tvData?.results||[]).slice(0,3).map(m => fromTMDB(m,'tv'));
  const movieList = (movieData?.results||[]).slice(0,3).map(m => fromTMDB(m,'movie'));
  const combined  = [...animeList, ...mangaList, ...tvList, ...movieList];

  const dropdown = document.getElementById(dropdownId);
  if (!combined.length) {
    dropdown.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px;">No results for "${q}"</div>`;
    return;
  }

  dropdown.innerHTML = '';
  combined.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dropdown-item';
    el.innerHTML = `
      <div class="dropdown-thumb"><img src="${item.img||''}" alt="${item.title}" loading="lazy"/></div>
      <div class="dropdown-info">
        <div class="dropdown-title">${item.title}</div>
        <div class="dropdown-sub">
          <span class="dropdown-type ${item.type}">${typeLabelShort(item)}</span>
          <span>${item.year||''}</span>
          ${item.episodes ? `<span>· ${item.episodes} eps</span>` : ''}
          ${item.chapters ? `<span>· ${item.chapters} ch</span>` : ''}
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

// ── MULTI-SELECT CHECKBOX PICKER — used for every filter (Genre, Country,
// Year/Era, Min Rating, Status, Tags) across Anime/TV/Movies. All share one
// trigger+panel+checkbox-grid structure so the same handful of functions
// below drive all of them; the container's data-noun tells onTagCheck what
// word to count ("3 Genres", "2 Countries", etc). ──
function toggleTagPicker(groupId) {
  const el = document.getElementById(groupId);
  if (!el) return;
  const willOpen = !el.classList.contains('open');
  // Only one picker open at a time within the same filter panel
  document.querySelectorAll('.tag-picker.open').forEach(p => p.classList.remove('open'));
  if (willOpen) {
    el.classList.add('open');
    // The popover is left-anchored to its trigger by default; with filters
    // now sitting side-by-side in a wrapping row, a trigger near the right
    // edge would otherwise push the panel off-screen, so flip it to a
    // right-anchor when that's about to happen.
    const panel = el.querySelector('.tag-picker-panel');
    if (panel) {
      panel.style.left = '0';
      panel.style.right = 'auto';
      const rect = panel.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        panel.style.left = 'auto';
        panel.style.right = '0';
      }
    }
  }
}

function clearTagPicker(groupId) {
  const el = document.getElementById(groupId);
  if (!el) return;
  el.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
  onTagCheck(groupId);
}

const FILTER_NOUN_PLURAL = {Genre:'Genres', Country:'Countries', Year:'Years', Rating:'Ratings', Status:'Statuses', Tag:'Tags'};

function onTagCheck(groupId) {
  const el = document.getElementById(groupId);
  if (!el) return;
  const checkedCount = el.querySelectorAll('input[type=checkbox]:checked').length;
  const label = document.getElementById(groupId + '-label');
  const trigger = el.querySelector('.tag-picker-trigger');
  if (label) {
    // Cache the author-written default text ("All Genres", "Any Rating"...)
    // the first time this runs, so it can be restored when nothing's checked.
    if (label.dataset.default === undefined) label.dataset.default = label.textContent;
    const noun = el.dataset.noun || 'Tag';
    const plural = FILTER_NOUN_PLURAL[noun] || (noun + 's');
    label.textContent = checkedCount ? `${checkedCount} ${checkedCount > 1 ? plural : noun}` : label.dataset.default;
  }
  if (trigger) trigger.classList.toggle('has-selection', checkedCount > 0);
  updateFilterSelectedDisplay(groupId);
  scheduleAutoApply(groupId);
}

// ── AUTO-APPLY (no more manual Apply button) ──
// Any checkbox change re-runs the matching page's filter automatically.
// Debounced so rapidly checking several boxes in a row (or resetPageFilter
// clearing 5-6 pickers at once) collapses into a single fetch instead of
// firing one request per checkbox.
let autoApplyTimer = null;
// Picker-id prefix → the page whose filter it drives. 'mf' was already taken
// by Movies when Manga arrived, hence 'gf' (manGa filter) rather than the
// obvious initial.
const FILTER_PREFIX_PAGE = {af:'anime', gf:'manga', tf:'tv', mf:'movies'};

function scheduleAutoApply(groupId) {
  const page = FILTER_PREFIX_PAGE[groupId.slice(0, 2)];
  clearTimeout(autoApplyTimer);
  autoApplyTimer = setTimeout(() => {
    if (page === 'anime')       applyAnimeFilter(1);
    else if (page === 'manga')  applyMangaFilter(1);
    else if (page === 'tv')     applyTVFilter(1);
    else if (page === 'movies') applyMovieFilter(1);
  }, 250);
}

// Selected-value summary row shown directly under each picker (requirement:
// the chosen values should appear right after the filter, not just inside
// the collapsed panel).
function updateFilterSelectedDisplay(groupId) {
  const el = document.getElementById(groupId);
  const disp = document.getElementById(groupId + '-selected');
  if (!el || !disp) return;
  const checked = [...el.querySelectorAll('input[type=checkbox]:checked')];
  if (!checked.length) { disp.style.display = 'none'; disp.innerHTML = ''; return; }
  disp.style.display = 'flex';
  disp.innerHTML = checked.map(c => {
    const lbl = c.closest('label');
    const text = lbl ? lbl.textContent.trim() : (c.dataset.val || '');
    return `<span class="filter-selected-chip">${escapeHtml(text)}</span>`;
  }).join('');
}

// Returns the de-duplicated list of underlying values for all checked boxes in
// a picker. A single checkbox's data-val may itself be a comma-separated
// combo (e.g. "boys love,girls love,lgbt,gay romance" for the "Coming of
// Age" chip, which maps to several underlying keyword terms), so each is
// split and flattened before de-duping.
function getTagVals(groupId) {
  const el = document.getElementById(groupId);
  if (!el) return [];
  const vals = [...el.querySelectorAll('input[type=checkbox]:checked')]
    .flatMap(c => (c.dataset.val || '').split(',').map(s => s.trim()).filter(Boolean));
  return [...new Set(vals)];
}

// Tapping outside an open picker collapses it back down
document.addEventListener('click', (e) => {
  if (!e.target.closest('.tag-picker')) {
    document.querySelectorAll('.tag-picker.open').forEach(p => p.classList.remove('open'));
  }
});

function getYearRange(val) {
  if (!val) return {};
  if (val.includes('s')) {
    const d = parseInt(val);
    return { gte: `${d}-01-01`, lte: `${d===1980?1989:d+9}-12-31` };
  }
  return { gte: `${val}-01-01`, lte: `${val}-12-31` };
}

// Year/Era is now multi-select. The underlying APIs only take one date
// range, so multiple selections (e.g. 2010s + 2020s) are combined into the
// min→max envelope across all chosen eras rather than queried separately.
function getYearEnvelope(groupId) {
  const vals = getTagVals(groupId);
  if (!vals.length) return {};
  let gte = null, lte = null;
  vals.forEach(v => {
    const r = getYearRange(v);
    if (r.gte && (gte === null || r.gte < gte)) gte = r.gte;
    if (r.lte && (lte === null || r.lte > lte)) lte = r.lte;
  });
  return { gte: gte || undefined, lte: lte || undefined };
}

// Min Rating is now multi-select too, but the values are nested thresholds
// (9+ is a subset of 8+), so checking several just collapses to the lowest
// one — that's the only floor that actually includes everything selected.
function getMinRatingVal(groupId) {
  const vals = getTagVals(groupId).map(Number).filter(n => !isNaN(n));
  return vals.length ? Math.min(...vals) : undefined;
}

function resetPageFilter(page) {
  const prefix = {anime:'af', manga:'gf', tv:'tf', movies:'mf'}[page];
  if (!prefix) return;
  ['genre','year','rating','country','status','tag'].forEach(g => {
    const el = document.getElementById(`${prefix}-${g}`);
    if (el) clearTagPicker(`${prefix}-${g}`);
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
    document.getElementById('anime-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('anime-more').style.display = 'none';

    const genres  = getTagVals('af-genre'); // multi-select — OR'd via genre_in
    const tags    = getTagVals('af-tag');   // multi-select — array of AniList tag names, OR-matched via tag_in
    const rating  = getMinRatingVal('af-rating'); // multi-select collapses to lowest checked threshold
    const statuses = getTagVals('af-status'); // multi-select — OR'd via status_in
    const yr      = getYearEnvelope('af-year'); // multi-select — combined into one min→max range
    const minScore = rating;
    const yGte = yr.gte ? parseInt(yr.gte.slice(0,4))*10000 : undefined;
    const yLte = yr.lte ? parseInt(yr.lte.slice(0,4))*10000+1231 : undefined;

    animeFilterQ = `query($page:Int,$genres:[String],$tags:[String],$sort:[MediaSort],$yGte:FuzzyDateInt,$yLte:FuzzyDateInt,$minScore:Int,$statuses:[MediaStatus]){
      Page(page:$page,perPage:24){
        pageInfo{hasNextPage}
        media(type:ANIME,isAdult:false,genre_in:$genres,tag_in:$tags,sort:$sort,startDate_greater:$yGte,startDate_lesser:$yLte,averageScore_greater:$minScore,status_in:$statuses){
          id idMal title{english romaji}coverImage{large}episodes averageScore status seasonYear format genres
        }
      }
    }`;
    animeFilterVars = { genres: genres.length?genres:undefined, tags: tags.length?tags:undefined, sort:['SCORE_DESC'], yGte, yLte, minScore, statuses: statuses.length?statuses:undefined };
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

// ── MANGA FILTER ──
// Same shape as the anime filter (AniList takes both), plus a country picker,
// since manhwa/manhua are MANGA records that differ only by countryOfOrigin.
let mangaFilterVars = null;
let mangaFilterQ = null;

async function applyMangaFilter(page=1) {
  if (page === 1) {
    document.getElementById('manga-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('manga-more').style.display = 'none';

    const genres   = getTagVals('gf-genre');    // multi-select — OR'd via genre_in
    const tags     = getTagVals('gf-tag');      // multi-select — AniList tag names, OR'd via tag_in
    const countries = getTagVals('gf-country'); // see note below
    const minScore = getMinRatingVal('gf-rating');
    const statuses = getTagVals('gf-status');   // multi-select — OR'd via status_in
    const yr       = getYearEnvelope('gf-year');
    const yGte = yr.gte ? parseInt(yr.gte.slice(0,4))*10000 : undefined;
    const yLte = yr.lte ? parseInt(yr.lte.slice(0,4))*10000+1231 : undefined;

    mangaFilterQ = `query($page:Int,$genres:[String],$tags:[String],$sort:[MediaSort],$yGte:FuzzyDateInt,$yLte:FuzzyDateInt,$minScore:Int,$statuses:[MediaStatus],$country:CountryCode){
      Page(page:$page,perPage:24){
        pageInfo{hasNextPage}
        media(type:MANGA,isAdult:false,genre_in:$genres,tag_in:$tags,sort:$sort,startDate_greater:$yGte,startDate_lesser:$yLte,averageScore_greater:$minScore,status_in:$statuses,countryOfOrigin:$country,format_not_in:[NOVEL]){
          ${MANGA_FIELDS}
        }
      }
    }`;
    mangaFilterVars = {
      genres: genres.length ? genres : undefined,
      tags:   tags.length   ? tags   : undefined,
      sort:   ['SCORE_DESC'],
      yGte, yLte, minScore,
      statuses: statuses.length ? statuses : undefined,
      // AniList's countryOfOrigin takes ONE CountryCode, not a list — there is
      // no countryOfOrigin_in. Ticking several origins therefore falls back to
      // no country constraint (i.e. all of them) rather than silently honouring
      // only the first box the user checked.
      country: countries.length === 1 ? countries[0] : undefined,
    };
  }

  const data = await al(mangaFilterQ, {...mangaFilterVars, page});
  const list = (data?.data?.Page?.media||[]).map(fromALManga);
  const hasMore = data?.data?.Page?.pageInfo?.hasNextPage || false;

  if (page === 1) renderGrid('manga-grid', list);
  else list.forEach(m => document.getElementById('manga-grid').appendChild(buildGridCard(m)));

  mangaPageState = {sub:'filter', page, hasMore};
  document.getElementById('manga-more').style.display = hasMore ? 'block' : 'none';
  if (hasMore) attachInfiniteScroll();
}

// ── TV FILTER ──
// Store filter URL base for pagination
let tvFilterUrl = null;
let tvFilterStatuses = [];

async function applyTVFilter(page=1) {
  if (page === 1) {
    document.getElementById('tv-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('tv-more').style.display = 'none';

    const countries = getTagVals('tf-country'); // multi-select — OR'd via pipe
    const genres    = getTagVals('tf-genre');    // multi-select — OR'd via pipe
    const rating    = getMinRatingVal('tf-rating'); // multi-select collapses to lowest checked threshold
    const statuses  = getTagVals('tf-status');   // multi-select — see note below
    const tagVal    = getTagVals('tf-tag').join(','); // multi-select — resolveKeywordIds already OR-matches comma-separated terms
    const yr        = getYearEnvelope('tf-year'); // multi-select — combined into one min→max range
    tvFilterStatuses = statuses;

    const url = new URL(`${TMDB_BASE}/discover/tv`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    if (countries.length) {
      url.searchParams.set('sort_by', 'popularity.desc');
      url.searchParams.set('vote_count.gte', '0');
    } else {
      url.searchParams.set('sort_by', 'vote_average.desc');
      url.searchParams.set('vote_count.gte', '50');
    }
    if (countries.length) url.searchParams.set('with_origin_country', countries.join('|'));
    if (genres.length)    url.searchParams.set('with_genres', genres.join('|'));
    if (rating !== undefined) url.searchParams.set('vote_average.gte', rating);
    if (yr.gte)  url.searchParams.set('first_air_date.gte', yr.gte);
    if (yr.lte)  url.searchParams.set('first_air_date.lte', yr.lte);
    // NOTE: TMDB's /discover/tv has no real "status" filter parameter — list
    // results don't even carry the fields fromTMDB needs to compute status.
    // So (same constraint as the old single-select version) we can only
    // force-label results with a known status when exactly ONE is checked;
    // with 0 or 2+ checked there's no reliable single label to apply, so
    // status is left for fromTMDB to derive normally (may come back blank).

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

    // Save base URL and statuses for pagination
    tvFilterUrl = url.toString();
  }

  try {
    const r = await fetch(`${tvFilterUrl}&page=${page}`, {signal: AbortSignal.timeout(10000)});
    const d = await r.json();
    const statusMap = {'returning':'Ongoing','ended':'Completed','planned':'Upcoming','canceled':'Canceled'};
    const knownStatus = tvFilterStatuses.length === 1 ? (statusMap[tvFilterStatuses[0]] || '') : '';
    const items = (d?.results||[]).map(m => {
      const item = fromTMDB(m,'tv');
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
    document.getElementById('movies-grid').innerHTML = `<div class="sk" style="height:100px;grid-column:1/-1;border-radius:8px;"></div>`;
    document.getElementById('movies-more').style.display = 'none';

    const countries = getTagVals('mf-country'); // multi-select — OR'd via pipe
    const genres    = getTagVals('mf-genre');    // multi-select — OR'd via pipe
    const rating    = getMinRatingVal('mf-rating'); // multi-select collapses to lowest checked threshold
    const statuses  = getTagVals('mf-status');   // multi-select — Released+Upcoming together (or neither) = no date filter
    const tagVal    = getTagVals('mf-tag').join(','); // multi-select — resolveKeywordIds already OR-matches comma-separated terms
    const yr        = getYearEnvelope('mf-year'); // multi-select — combined into one min→max range

    const url = new URL(`${TMDB_BASE}/discover/movie`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    if (countries.length) {
      url.searchParams.set('sort_by', 'popularity.desc');
      url.searchParams.set('vote_count.gte', '0');
    } else {
      url.searchParams.set('sort_by', 'vote_average.desc');
      url.searchParams.set('vote_count.gte', '100');
    }
    if (countries.length) url.searchParams.set('with_origin_country', countries.join('|'));
    if (genres.length) url.searchParams.set('with_genres', genres.join('|'));
    if (rating !== undefined) url.searchParams.set('vote_average.gte', rating);
    if (yr.gte) url.searchParams.set('primary_release_date.gte', yr.gte);
    if (yr.lte) url.searchParams.set('primary_release_date.lte', yr.lte);
    if (statuses.length === 1) {
      if (statuses[0] === 'upcoming') url.searchParams.set('primary_release_date.gte', new Date().toISOString().slice(0,10));
      else if (statuses[0] === 'released') url.searchParams.set('primary_release_date.lte', new Date().toISOString().slice(0,10));
    }

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
    if (page === 'manga'  && mangaPageState.hasMore)  loadMoreManga();
    if (page === 'tv'     && tvPageState.hasMore)     loadMoreTV();
    if (page === 'movies' && moviePageState.hasMore)  loadMoreMovies();
  });
}, { rootMargin: '200px' });

function attachInfiniteScroll() {
  ['anime','manga','tv','movies'].forEach(page => {
    const sentinel = document.getElementById(`${page}-sentinel`);
    if (sentinel) infiniteObserver.observe(sentinel);
  });
}

// ═══════════════════════════════════════════
// WATCH HISTORY — localStorage
// ═══════════════════════════════════════════
const HISTORY_KEY = 'jomerpb_history';
// Manga is kept in its own bucket rather than sharing the watch list: the two
// rows are shown separately, cleared separately, and a manga entry has no
// season/episode/progress for the watch card to read.
const MANGA_HISTORY_KEY = 'jomerpb_manga_history';
const MAX_HISTORY = 20;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function getMangaHistory() {
  try { return JSON.parse(localStorage.getItem(MANGA_HISTORY_KEY) || '[]'); }
  catch { return []; }
}

// Manga never opens the player, so nothing ever calls saveToHistory for it.
// Tapping Read is the one unambiguous "I started this" signal available, so
// that is what records it.
function saveMangaToHistory(item) {
  try {
    const key = item?.al_id || item?.mal_id;
    if (!key) return;
    const id = `manga-${key}`;
    const list = getMangaHistory().filter(h => h.id !== id);
    list.unshift({
      id, type:'manga',
      al_id: item.al_id, mal_id: item.mal_id,
      title: item.title,
      img: item.img || item.banner || '',
      origin: item.origin || 'JP',
      chapters: item.chapters || null,
      ts: Date.now(),
    });
    localStorage.setItem(MANGA_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    renderContinueWatching();
  } catch {}
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

// One row, two modes. On the Manga segment it becomes Continue Reading and
// reads the manga bucket; on Anime/TV/Movies it is Continue Watching as before.
// The two never mix, so a manga cannot appear under "Watching".
const CW_PLAY_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#111"><path d="M8 5v14l11-7z"/></svg>`;
const CW_READ_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#111"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/></svg>`;

function renderContinueWatching() {
  const reading = currentStreamSeg === 'manga';
  const history = reading ? getMangaHistory() : getHistory();
  const section = document.getElementById('cw-section');
  const row = document.getElementById('cw-row');
  const title = document.getElementById('cw-title');
  if (!section || !row) return;
  if (title) title.textContent = reading ? '📖 Continue Reading' : '▶ Continue Watching';
  if (!history.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  row.innerHTML = '';
  history.forEach(h => {
    const card = document.createElement('div');
    card.className = 'cw-card';
    const isManga = h.type === 'manga';
    // A manga entry has no episode count to be a fraction of, so it gets no
    // progress bar rather than a meaningless full or empty one.
    const progress = isManga ? null : Math.min((h.ep / (h.totalEps||1)) * 100, 100);
    const sub = isManga
      ? [mangaKind(h), h.chapters ? `${h.chapters} ch` : ''].filter(Boolean).join(' · ')
      : (h.type === 'movie' ? 'Movie' : `S${h.seasonNum||1} · EP ${h.ep}`);
    card.innerHTML = `
      <div class="cw-img">
        <img src="${h.img}" alt="${h.title}" loading="lazy"/>
        <div class="cw-play">
          <div class="cw-play-btn">${isManga ? CW_READ_ICON : CW_PLAY_ICON}</div>
        </div>
        ${progress === null ? '' : `<div class="cw-progress"><div class="cw-progress-fill" style="width:${progress}%"></div></div>`}
        <button class="cw-remove" onclick="removeFromHistory(event,'${h.id}')">✕</button>
      </div>
      <div class="cw-info">
        <div class="cw-title">${h.title}</div>
        <div class="cw-sub">${sub}</div>
      </div>`;
    card.onclick = () => resumeItem(h);
    row.appendChild(card);
  });
}

async function resumeItem(h) {
  if (h.type === 'manga') {
    // No player to resume into — the detail page, with its Read button, is the
    // whole of what "resume" can mean for a manga.
    await openDetail({
      type:'manga', al_id:h.al_id, mal_id:h.mal_id, id:h.al_id,
      title:h.title, img:h.img, banner:h.img,
      origin:h.origin, chapters:h.chapters,
    });
    return;
  }
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
    // Ids are `${type}-${id}`, and manga only ever lands in the manga bucket,
    // so the prefix is enough to pick the list to write back.
    const isManga = id.startsWith('manga-');
    const key = isManga ? MANGA_HISTORY_KEY : HISTORY_KEY;
    const list = (isManga ? getMangaHistory() : getHistory()).filter(h => h.id !== id);
    localStorage.setItem(key, JSON.stringify(list));
    renderContinueWatching();
  } catch {}
}

function clearHistory() {
  // Clears whichever list is on screen — the button sits in that row's header.
  const reading = currentStreamSeg === 'manga';
  if (!confirm(reading ? 'Clear all reading history?' : 'Clear all watch history?')) return;
  try {
    localStorage.removeItem(reading ? MANGA_HISTORY_KEY : HISTORY_KEY);
    renderContinueWatching();
  } catch {}
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
    } else if (type==='manga') {
      const Q=`query($id:Int){Media(id:$id,type:MANGA){${MANGA_FIELDS} description}}`;
      const r=await al(Q,{id:parseInt(id)});
      if(r?.data?.Media)return fromALManga(r.data.Media);
    } else if (type==='tv') {
      const d=await tmdb(`/tv/${id}`); if(d)return fromTMDB(d,'tv');
    } else if (type==='movie') {
      const d=await tmdb(`/movie/${id}`); if(d)return fromTMDB(d,'movie');
    }
    return null;
  }

  // Detail page
  const detailM = hash.match(/^detail-(anime|manga|tv|movie)-(\d+)$/);
  if (detailM) {
    showPage('detail-page');
    loadHome();
    const item = await fetchItem(detailM[1], detailM[2]);
    if (item) await openDetail(item, true);
    else { showPage('home-page'); setNav('home'); }
    return;
  }

  // Old #player-<type>-<id>-s<n>-e<n> links, from before the player moved onto
  // the detail page. The page they named no longer exists, so they open the
  // title's detail page and start that episode in its inline player — a
  // bookmark or a shared link still lands on the same episode.
  const playerM = hash.match(/^player-(anime|tv|movie)-(\d+)-s(\d+)-e(\d+)$/);
  if (playerM) {
    showPage('detail-page');
    loadHome();
    const item = await fetchItem(playerM[1], playerM[2]);
    if (item) {
      await openDetail(item);
      // openDetail resolves the real season list; only then is it safe to ask
      // for an episode, and only if that season actually still lines up.
      const wantSeason = parseInt(playerM[3]);
      const seasonIdx = allSeasons.findIndex(x => (x.season_number||1) === wantSeason);
      if (seasonIdx > 0) {
        const s2 = allSeasons[seasonIdx];
        if (s2.type === 'anime') selectSeason(s2); else await selectTVSeason(s2);
      }
      openPlayer(parseInt(playerM[4]));
    } else { showPage('home-page'); setNav('home'); }
    return;
  }

  // Tab pages
  // Old anime/tv/movies hashes now open home with that category selected
  if (hash in SEG_INDEX) {
    history.replaceState({page:'home-page'},'','#home');
    showPage('home-page'); setNav('home');
    loadHome();
    streamSeg(hash, document.querySelectorAll('#stream-seg .seg-btn')[SEG_INDEX[hash]]);
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
  if (savedSeg && savedSeg !== 'anime' && savedSeg in SEG_INDEX) {
    const btn = document.querySelectorAll('#stream-seg .seg-btn')[SEG_INDEX[savedSeg]];
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
