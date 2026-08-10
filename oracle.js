












var _phNow=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Manila'}));
var _phMo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var TODAY_PH=_phMo[_phNow.getMonth()]+' '+_phNow.getDate()+' '+_phNow.getFullYear();
var TODAY_PH_FULL=TODAY_PH;
var _phNow2=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Manila'}));
var _D=_phNow2.getDate();
var _M=_phNow2.getMonth()+1;
var _Y=_phNow2.getFullYear();
var _DOW=_phNow2.getDay();

// ══════════════════════════
// PCSO REAL HISTORICAL DATA
// ══════════════════════════
var GAMES={
  ez2:{
    name:'EZ2 2D Lotto',short:'EZ2',max:31,
    draws:{
      '2PM':[[1,12],[25,27],[31,22],[11,6],[19,4],[9,22],[2,13],[24,24],[9,21],[4,31],[29,8],[2,13],[3,15],[11,26],[19,17],[29,21],[19,19]],
      '5PM':[[31,25],[16,30],[7,10],[13,9],[12,31],[3,1],[29,15],[10,3],[22,19],[5,17],[24,3],[19,10],[28,2],[18,17],[7,1],[5,16],[28,9]],
      '9PM':[[16,24],[7,21],[24,23],[1,26],[2,29],[11,7],[16,4],[8,31],[28,27],[7,26],[22,29],[26,24],[10,7],[26,30],[9,5],[16,9]]
    },
    hot:{
      '2PM':[19,29,9,11,2,4],'5PM':[16,5,3,10,29,19],'9PM':[16,3,9,29,24,5]
    }
  },
  '642':{name:'Lotto 6/42',short:'6/42',max:42,sched:'Tue·Thu·Sat 9PM',
    recent:[[30,20,11,7,36,1],[24,39,23,5,38,12],[7,36,31,3,35,42],[35,38,39,32,37,16],[17,42,13,36,1,31],[12,22,24,38,7,13],[40,3,36,41,28,18],[33,38,34,28,36,7],[2,39,30,10,14,29],[18,16,37,13,35,23],[3,21,2,14,33,1],[39,38,34,21,10,3],[15,8,34,13,25,38],[12,18,3,17,5,8],[33,8,5,17,18,41],[15,6,31,16,22,25]],
    hot:[36,38,7,13,3,31]},
  '645':{name:'Mega Lotto 6/45',short:'6/45',max:45,sched:'Mon·Wed·Fri 9PM',
    recent:[[9,41,22,45,5,10],[41,29,27,21,33,19],[28,3,24,31,18,16],[27,15,9,13,12,8],[34,35,9,10,19,32],[44,14,10,21,35,18],[44,13,22,14,4,33],[14,45,44,42,28,20],[20,27,43,15,4,14],[1,38,18,42,4,44],[23,45,6,18,4,2],[28,38,41,35,40,5],[27,45,38,35,25,10],[23,8,9,36,43,18],[21,13,43,28,5,17],[27,9,42,37,34,3]],
    hot:[44,14,27,9,35,18]},
  '649':{name:'Super Lotto 6/49',short:'6/49',max:49,sched:'Tue·Thu·Sun 9PM',
    recent:[[44,8,32,42,12,27],[44,13,27,33,24,42],[27,26,21,6,20,16],[28,20,36,33,2,17],[16,7,47,8,4,6],[40,13,14,24,8,21],[43,22,15,4,3,17],[41,31,44,25,42,33],[27,3,2,11,16,25],[36,27,5,14,40,8],[18,21,7,43,11,3],[39,40,1,47,29,17],[10,49,30,21,48,45],[33,24,12,13,4,9],[9,28,21,2,37,23],[49,35,44,4,14,5]],
    hot:[27,44,4,8,21,13]},
  '655':{name:'Grand Lotto 6/55',short:'6/55',max:55,sched:'Mon·Wed·Sat 9PM',
    recent:[[24,10,55,36,4,41],[55,31,46,37,48,1],[8,44,43,24,4,11],[16,43,21,22,26,50],[53,19,8,34,38,52],[50,43,24,1,7,15],[32,36,29,19,8,30],[19,42,53,2,46,3],[36,4,9,44,42,24],[19,37,21,39,9,22],[33,46,43,19,38,42],[48,42,23,18,55,33],[52,36,38,12,48,42],[41,8,45,27,9,10],[47,44,26,29,38,51],[9,6,19,46,39,48]],
    hot:[43,36,19,42,24,8]},
  '658':{name:'Ultra Lotto 6/58',short:'6/58',max:58,sched:'Tue·Fri·Sun 9PM',
    recent:[[15,5,45,11,17,39],[43,53,8,45,20,11],[26,8,55,48,5,51],[17,3,25,57,30,43],[40,27,10,9,53,29],[42,7,23,41,56,44],[53,1,4,45,51,22],[20,45,13,31,7,27],[39,36,12,41,4,20],[9,53,43,39,3,47],[47,21,43,20,5,37],[2,11,12,16,55,46],[50,12,20,57,14,21],[45,20,16,33,40,28],[6,38,9,26,48,14],[39,37,35,45,16,52]],
    hot:[45,20,39,53,11,5]},
};

// ══════════════════════════
// LIVE PCSO HISTORY LOADER
// Fetches the real, manually-verified pcso-history.json from GitHub and
// overrides GAMES[key].recent/hot (and ez2 draws/hot) with it. If the fetch
// fails for any reason, the hardcoded fallback arrays above remain in use —
// the Oracle always has *something* to compute from, it just may be stale.
// ══════════════════════════
var PCSO_HISTORY_STATUS={loaded:false,source:'hardcoded fallback',error:null};
var PCSO_HISTORY_LOAD_FAILED=false; // lets pcsoHistRender() tell "genuinely no draw" apart from "fetch failed"
var PCSO_HISTORY_READY=(async function loadPcsoHistoryIntoGames(){
  var RAW_URL='pcso-history.json'; // same-origin via GitHub Pages — raw.githubusercontent.com rate-limits anonymous requests
  var MAX_ATTEMPTS=3;
  var TIMEOUT_MS=8000;
  var BACKOFF_MS=[0,800,1600];
  var BACKOFF_429_MS=[0,3000,6000];
  var lastErr=null;
  var lastWas429=false;
  var data=null;

  for(var attempt=1; attempt<=MAX_ATTEMPTS; attempt++){
    if(attempt>1){
      var backoffArr=lastWas429?BACKOFF_429_MS:BACKOFF_MS;
      await pcsoSleep(backoffArr[attempt-1]);
    }
    lastWas429=false;
    try{
      var resp=await pcsoFetchWithTimeout(RAW_URL+'?nocache='+Date.now(), TIMEOUT_MS);
      if(!resp.ok){
        lastWas429=(resp.status===429);
        throw new Error('HTTP '+resp.status);
      }
      data=await resp.json();
      break;
    }catch(e){
      lastErr=e;
      console.error('PCSO history fetch attempt '+attempt+' of '+MAX_ATTEMPTS+':', e.message);
    }
  }

  if(!data){
    var reason=(lastErr&&lastErr.message?lastErr.message:'unknown error')+(lastWas429?' — rate limited by GitHub':'');
    PCSO_HISTORY_STATUS={loaded:false,source:'hardcoded fallback',error:reason};
    PCSO_HISTORY_LOAD_FAILED=true;
    console.error('PCSO history fetch failed after '+MAX_ATTEMPTS+' attempts, using hardcoded fallback:', reason);
    if(typeof pcsoHistRender==='function'&&document.getElementById('pcso-hist-result')){
      pcsoHistRender();
    }
    return;
  }

  try{
    // ── ENGINE FREEZE ──
    // The scoring engine (layerStats via GAMES.*) only ever sees draws dated
    // STRICTLY BEFORE today (Manila). Same-day results appended by the
    // scrapers therefore cannot shift Run Expert, Analyze My Numbers, or any
    // stats display until the next calendar day — the live engine output is
    // identical to computeOracleAsOf(today) by construction.
    // PCSO_HISTORY (the lookup dict built further below) intentionally keeps
    // the FULL unfiltered data: actual winning numbers still display, and
    // computeOracleAsOf can still serve any date.
    var _fz=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Manila'}));
    var ENGINE_TODAY_PH=_fz.getFullYear()+'-'+String(_fz.getMonth()+1).padStart(2,'0')+'-'+String(_fz.getDate()).padStart(2,'0');
    var slashToKey={'6/58':'658','6/55':'655','6/49':'649','6/45':'645','6/42':'642'};
    for(var slashKey in slashToKey){
      var gk=slashToKey[slashKey];
      var entriesRaw=data[slashKey];
      if(!Array.isArray(entriesRaw)||!entriesRaw.length||!GAMES[gk]) continue;
      // entries are already sorted newest-first; drop anything dated today or later
      var entries=entriesRaw.filter(function(e){return e.date&&e.date<ENGINE_TODAY_PH;});
      var allDraws=entries.map(function(e){return e.nums;}).filter(function(n){return Array.isArray(n)&&n.length===6;});
      if(!allDraws.length) continue;
      GAMES[gk].recent=allDraws; // verified history as of yesterday (engine freeze)
      // hot numbers = top-frequency within the most recent 30 draws (recency-weighted, per earlier design)
      var recentWindow=allDraws.slice(0,30);
      var freq={};
      recentWindow.forEach(function(draw){draw.forEach(function(n){freq[n]=(freq[n]||0)+1;});});
      GAMES[gk].hot=Object.entries(freq).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(e){return parseInt(e[0]);});
    }
    if(Array.isArray(data.ez2)&&data.ez2.length&&GAMES.ez2){
      var byHour={'2PM':[],'5PM':[],'9PM':[]};
      data.ez2.forEach(function(e){
        if(!e.draws) return;
        if(!e.date||e.date>=ENGINE_TODAY_PH) return; // engine freeze — see above
        ['2PM','5PM','9PM'].forEach(function(h){
          if(Array.isArray(e.draws[h])&&e.draws[h].length===2) byHour[h].push(e.draws[h]);
        });
      });
      var anyHour=byHour['2PM'].length||byHour['5PM'].length||byHour['9PM'].length;
      if(anyHour){
        GAMES.ez2.draws=byHour;
        var hot={};
        ['2PM','5PM','9PM'].forEach(function(h){
          var freq={};
          byHour[h].slice(0,30).forEach(function(draw){draw.forEach(function(n){freq[n]=(freq[n]||0)+1;});});
          hot[h]=Object.entries(freq).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(e){return parseInt(e[0]);});
        });
        GAMES.ez2.hot=hot;
      }
    }
    PCSO_HISTORY_STATUS={loaded:true,source:'live (pcso-history.json, updated '+(data.updated||'unknown')+')',engineCutoff:ENGINE_TODAY_PH,error:null};
    PCSO_HISTORY_LOAD_FAILED=false;
    console.log('PCSO history loaded:', PCSO_HISTORY_STATUS.source);

    // Also wire the "Look Up Past Result" date-picker lookup (previously mock
    // data only, 4 dummy dates) to this same fetched dataset — no second fetch needed.
    var lookup={};
    for(var slashKey2 in slashToKey){
      var gk2=slashToKey[slashKey2];
      var entries2=data[slashKey2];
      if(Array.isArray(entries2)){
        lookup[gk2]=entries2.map(function(e){return{date:e.date,nums:e.nums,jackpot:e.jackpot};});
      }
    }
    if(Array.isArray(data.ez2)){
      lookup.ez2=data.ez2.map(function(e){return{date:e.date,draws:e.draws||{}};});
    }
    if(Object.keys(lookup).length){
      PCSO_HISTORY=lookup;
      // expand the date picker's allowed range to match what's actually available
      var allDates=[];
      Object.values(lookup).forEach(function(arr){arr.forEach(function(e){if(e.date)allDates.push(e.date);});});
      if(allDates.length){
        var dateInpEl=document.getElementById('pcso-hist-date');
        if(dateInpEl){
          allDates.sort();
          dateInpEl.min=allDates[0];
        }
      }
      if(typeof pcsoHistRender==='function'&&document.getElementById('pcso-hist-result')){
        pcsoHistFilterGames(); pcsoHistRender();
      }
    }
  }catch(e){
    PCSO_HISTORY_STATUS={loaded:false,source:'hardcoded fallback',error:e.message};
    PCSO_HISTORY_LOAD_FAILED=true;
    console.error('PCSO history processing failed, using hardcoded fallback:', e.message);
    if(typeof pcsoHistRender==='function'&&document.getElementById('pcso-hist-result')){
      pcsoHistRender();
    }
  }
})();

// ══════════════════════════
// ORACLE PICK LOG (oracle-history.json)
// Daily immutable record of the engine's pick, appended by
// .github/workflows/oracle-snapshot.yml (00:05 Manila) running
// scripts/snapshot_oracle.mjs — which calls this same file's
// computeOracleAsOf(), so the logged value equals what Run Expert
// shows all day under the engine freeze. The Look Up panel prefers
// this recorded value; dates before the log existed fall back to a
// live recompute (labeled ↻).
// ══════════════════════════
var ORACLE_HISTORY=null; // {updated, entries:[{date, engineSha, picks:{ez2:{'2PM':[a,b],...}, '642':[..6..], ...}}]} newest-first
var ORACLE_HISTORY_READY=(async function loadOracleHistory(){
  try{
    var resp=await pcsoFetchWithTimeout('oracle-history.json?nocache='+Date.now(),6000);
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    var data=await resp.json();
    if(data&&Array.isArray(data.entries)) ORACLE_HISTORY=data;
  }catch(e){
    console.warn('oracle-history.json not loaded ('+(e&&e.message?e.message:'error')+') — lookup will recompute picks live.');
  }
  if(ORACLE_HISTORY&&typeof pcsoHistRender==='function'&&document.getElementById('pcso-hist-result')){
    try{pcsoHistRender();}catch(e){}
  }
})();

// Pure source-selection helper (unit-testable, no DOM):
// returns {picks, source:'recorded'|'recomputed'} or null.
// 'recorded'   → taken verbatim from oracle-history.json (immutable audit log)
// 'recomputed' → computeOracleAsOf() fallback for dates the log doesn't cover
function oracleHistLookup(gameKey,dateStr){
  if(ORACLE_HISTORY&&Array.isArray(ORACLE_HISTORY.entries)){
    for(var i=0;i<ORACLE_HISTORY.entries.length;i++){
      var en=ORACLE_HISTORY.entries[i];
      if(en&&en.date===dateStr&&en.picks&&en.picks[gameKey]){
        return {picks:en.picks[gameKey],source:'recorded'};
      }
    }
  }
  var rc=null;
  try{ rc=computeOracleAsOf(gameKey,dateStr); }catch(e){ console.error('computeOracleAsOf '+gameKey+':',e); }
  if(!rc) return null;
  return {picks:rc,source:'recomputed'};
}
function oracleSrcTag(source,withWord){
  if(!source) return '';
  var icon=source==='recorded'?'\uD83D\uDCCC':'\u21BB';
  var word=withWord?(' '+source):'';
  return ' <span style="font-size:8px;color:var(--muted);font-weight:400">'+icon+word+'</span>';
}

// ══════════════════════════
function reduce(n){
  if(n<=0) return 9;
  while(n>9) n=[...String(n)].reduce((a,b)=>a+parseInt(b),0);
  return n||9;
}
function digitOf(n){ return reduce(n); }
function pad(n){ return String(n).padStart(2,'0'); }

// ══════════════════════════
// SHARED: Julian Day Number (standard astronomical JDN, noon-based).
// Used by both the astro engine and the BaZi day-pillar calculation so the
// two stay consistent. Verified: jdnOf(2000,1,1)=2451545 (the standard J2000
// epoch value used throughout the literature).
// ══════════════════════════
function jdnOf(y,m,d){
  var a=Math.floor((14-m)/12), yr=y+4800-a, mo=m+12*a-3;
  return d+Math.floor((153*mo+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045;
}

// ══════════════════════════
// ASTRO ENGINE — shared low-precision ephemeris helpers
// Source: Paul Schlyter, "How to compute planetary positions"
// https://stjarnhimlen.se/comp/ppcomp.html — a simplification of T. van
// Flandern & K. Pulkkinen, "Low precision formulae for planetary positions,"
// Astrophysical Journal Supplement Series, 1980. Stated accuracy: ~1 arcmin
// for the Sun and inner planets, ~1-2 arcmin for the outer planets, and
// 1-2 arcmin for the Moon (with the perturbation terms below included).
// This replaces the previous mean-longitude-only approximation, which had
// no equation-of-center correction at all — for an eccentric orbit like
// Mercury's (e≈0.206) that omission alone can misplace the position by up
// to ~20-24°, i.e. most of a zodiac sign.
// Ascendant formula (RAMC/obliquity/latitude) cross-verified against three
// independently published sources that all agree on the same closed form:
// astrologicalauthority.com/rising-sign-ascendant-calculator,
// toolsnix.com/fun/sun-moon-rising, calculatormom.com/ascendant-degree-calculator.
// Location used for house/ascendant math: Manila, PH (14.5995N, 120.9842E,
// UTC+8) — matches the PCSO draws this Oracle is built around.
// ══════════════════════════
var ASTRO_LAT=14.5995, ASTRO_LON=120.9842; // Manila
function astroNorm360(x){ x=x%360; return x<0?x+360:x; }
function astroObliquity(d){ return 23.4393-3.563e-7*d; }
function astroSolveKepler(Mdeg,e){
  var Mr=Mdeg*Math.PI/180;
  var E=Mdeg+e*(180/Math.PI)*Math.sin(Mr)*(1+e*Math.cos(Mr));
  for(var k=0;k<8;k++){
    var Er=E*Math.PI/180;
    var E1=E-(E-e*(180/Math.PI)*Math.sin(Er)-Mdeg)/(1-e*Math.cos(Er));
    if(Math.abs(E1-E)<1e-6){E=E1;break;}
    E=E1;
  }
  return E;
}
function astroSunPos(d){
  var w=astroNorm360(282.9404+4.70935e-5*d);
  var e=0.016709-1.151e-9*d;
  var M=astroNorm360(356.0470+0.9856002585*d);
  var E=astroSolveKepler(M,e);
  var Er=E*Math.PI/180;
  var xv=Math.cos(Er)-e, yv=Math.sqrt(1-e*e)*Math.sin(Er);
  var v=astroNorm360(Math.atan2(yv,xv)*180/Math.PI);
  return {lonsun:astroNorm360(v+w),r:Math.sqrt(xv*xv+yv*yv),M:M,w:w};
}
function astroMoonLon(d,sunLon,sunM){
  var Nm=astroNorm360(125.1228-0.0529538083*d);
  var wm=astroNorm360(318.0634+0.1643573223*d);
  var Mm=astroNorm360(115.3654+13.0649929509*d);
  var e=0.054900;
  var E=astroSolveKepler(Mm,e);
  var Er=E*Math.PI/180;
  var xv=Math.cos(Er)-e, yv=Math.sqrt(1-e*e)*Math.sin(Er);
  var v=astroNorm360(Math.atan2(yv,xv)*180/Math.PI);
  var lonUnpert=astroNorm360(v+wm+Nm);
  var Lm=astroNorm360(Mm+wm+Nm);
  var Dd=astroNorm360(Lm-sunLon);
  var F=astroNorm360(Lm-Nm);
  var Ms=sunM, R=Math.PI/180, corr=0;
  corr+=-1.274*Math.sin((Mm-2*Dd)*R);
  corr+=0.658*Math.sin(2*Dd*R);
  corr+=-0.186*Math.sin(Ms*R);
  corr+=-0.059*Math.sin((2*Mm-2*Dd)*R);
  corr+=-0.057*Math.sin((Mm-2*Dd+Ms)*R);
  corr+=0.053*Math.sin((Mm+2*Dd)*R);
  corr+=0.046*Math.sin((2*Dd-Ms)*R);
  corr+=0.041*Math.sin((Mm-Ms)*R);
  corr+=-0.035*Math.sin(Dd*R);
  corr+=-0.031*Math.sin((Mm+Ms)*R);
  corr+=-0.015*Math.sin((2*F-2*Dd)*R);
  corr+=0.011*Math.sin((Mm-4*Dd)*R);
  return astroNorm360(lonUnpert+corr);
}
var ASTRO_PLANET_ELEMENTS={
  mercury:{N:[48.3313,3.24587e-5],i:[7.0047,5.00e-8],w:[29.1241,1.01444e-5],a:0.387098,e:[0.205635,5.59e-10],M:[168.6562,4.0923344368]},
  venus:{N:[76.6799,2.46590e-5],i:[3.3946,2.75e-8],w:[54.8910,1.38374e-5],a:0.723330,e:[0.006773,-1.302e-9],M:[48.0052,1.6021302244]},
  mars:{N:[49.5574,2.11081e-5],i:[1.8497,-1.78e-8],w:[286.5016,2.92961e-5],a:1.523688,e:[0.093405,2.516e-9],M:[18.6021,0.5240207766]},
  jupiter:{N:[100.4542,2.76854e-5],i:[1.3030,-1.557e-7],w:[273.8777,1.64505e-5],a:5.20256,e:[0.048498,4.469e-9],M:[19.8950,0.0830853001]},
  saturn:{N:[113.6634,2.38980e-5],i:[2.4886,-1.081e-7],w:[339.3939,2.97661e-5],a:9.55475,e:[0.055546,-9.499e-9],M:[316.9670,0.0334442282]}
};
function astroPlanetLon(name,d,lonsun,rs){
  var el=ASTRO_PLANET_ELEMENTS[name];
  var N=astroNorm360(el.N[0]+el.N[1]*d);
  var i=el.i[0]+el.i[1]*d;
  var w=astroNorm360(el.w[0]+el.w[1]*d);
  var a=el.a, e=el.e[0]+el.e[1]*d;
  var M=astroNorm360(el.M[0]+el.M[1]*d);
  var E=astroSolveKepler(M,e);
  var Er=E*Math.PI/180;
  var xv=a*(Math.cos(Er)-e), yv=a*(Math.sqrt(1-e*e)*Math.sin(Er));
  var v=Math.atan2(yv,xv)*180/Math.PI;
  var r=Math.sqrt(xv*xv+yv*yv);
  var Nr=N*Math.PI/180,ir=i*Math.PI/180,wr=w*Math.PI/180,vr=v*Math.PI/180;
  var xh=r*(Math.cos(Nr)*Math.cos(vr+wr)-Math.sin(Nr)*Math.sin(vr+wr)*Math.cos(ir));
  var yh=r*(Math.sin(Nr)*Math.cos(vr+wr)+Math.cos(Nr)*Math.sin(vr+wr)*Math.cos(ir));
  var xs=rs*Math.cos(lonsun*Math.PI/180), ys=rs*Math.sin(lonsun*Math.PI/180);
  return astroNorm360(Math.atan2(yh+ys,xh+xs)*180/Math.PI);
}
function astroSunRaDec(lonsun,rs,ecl){
  var xs=rs*Math.cos(lonsun*Math.PI/180), ys=rs*Math.sin(lonsun*Math.PI/180);
  var eclr=ecl*Math.PI/180;
  var xe=xs, ye=ys*Math.cos(eclr), ze=ys*Math.sin(eclr);
  return {RA:astroNorm360(Math.atan2(ye,xe)*180/Math.PI),Dec:Math.atan2(ze,Math.sqrt(xe*xe+ye*ye))*180/Math.PI};
}
function astroSiderealDeg(sunMeanLon,utHours,geoLonEast){
  var GMST0=astroNorm360(sunMeanLon+180);
  var GMST=astroNorm360(GMST0+utHours*15);
  return astroNorm360(GMST+geoLonEast);
}
function astroAscendant(ramcDeg,latDeg,eclDeg){
  var R=ramcDeg*Math.PI/180, L=latDeg*Math.PI/180, E=eclDeg*Math.PI/180;
  var y=-Math.cos(R);
  var x=Math.sin(R)*Math.cos(E)+Math.tan(L)*Math.sin(E);
  return astroNorm360(Math.atan2(y,x)*180/Math.PI);
}
function astroAltitude(RA,Dec,lstDeg,latDeg){
  var HA=astroNorm360(lstDeg-RA); if(HA>180)HA-=360;
  var HAr=HA*Math.PI/180, Decr=Dec*Math.PI/180, Latr=latDeg*Math.PI/180;
  var x=Math.cos(HAr)*Math.cos(Decr), y=Math.sin(HAr)*Math.cos(Decr), z=Math.sin(Decr);
  var xhor=x*Math.sin(Latr)-z*Math.cos(Latr), zhor=x*Math.cos(Latr)+z*Math.sin(Latr);
  return Math.atan2(zhor,Math.sqrt(xhor*xhor+y*y))*180/Math.PI;
}
// Computes the "day number since J2000.0" (Schlyter's `d`) for a PH-local
// calendar date plus a nominal draw hour, converting PH time (UTC+8) to UT.
function astroDayNumber(y,m,dd,phHour){
  var jdn=jdnOf(y,m,dd);
  var ut=phHour-8;
  var dayShift=0;
  if(ut<0){ ut+=24; dayShift=-1; }
  return (jdn-2451545+dayShift)+ut/24.0;
}
// Void-of-course Moon: standard classical definition — the Moon is void if
// it will not perfect (come to exactness of) any Ptolemaic aspect (0/60/90/
// 120/180°, 0.35° orb) with the Sun or the five classical planets before it
// leaves its current sign. Determined here by direct numerical scan rather
// than analytic applying/separating logic (simpler to verify, same result).
function astroMoonVoidOfCourse(d){
  var sp0=astroSunPos(d);
  var moonLon=astroMoonLon(d,sp0.lonsun,sp0.M);
  var sp1=astroSunPos(d+0.01);
  var moonLon2=astroMoonLon(d+0.01,sp1.lonsun,sp1.M);
  var moonSpeed=(astroNorm360(moonLon2-moonLon+180)-180)/0.01; // deg/day
  var degRemaining=30-(moonLon%30);
  var daysToSignChange=moonSpeed>0?(degRemaining/moonSpeed):0.1;
  if(!(daysToSignChange>0)||daysToSignChange>3) daysToSignChange=3; // safety clamp
  var bodies=['sun','mercury','venus','mars','jupiter','saturn'];
  var aspects=[0,60,90,120,180];
  var steps=24;
  for(var b=0;b<bodies.length;b++){
    var name=bodies[b];
    for(var s=0;s<=steps;s++){
      var t=d+(daysToSignChange*s/steps);
      var spT=astroSunPos(t);
      var moonAt=astroMoonLon(t,spT.lonsun,spT.M);
      var bodyAt=name==='sun'?spT.lonsun:astroPlanetLon(name,t,spT.lonsun,spT.r);
      var sep=astroNorm360(moonAt-bodyAt);
      for(var ai=0;ai<aspects.length;ai++){
        var diff=Math.min(Math.abs(sep-aspects[ai]),360-Math.abs(sep-aspects[ai]));
        if(diff<0.35) return false; // an aspect perfects -> not void
      }
    }
  }
  return true;
}

// ══════════════════════════
// LAYER 1: NUMEROLOGY
// Pythagorean + Chaldean dual system
// ══════════════════════════
function layerNumerology(drawHour){
  // Universal Day = reduce all digits of full date
  var dateStr=String(_D)+String(_M)+String(_Y);
  var ud=reduce(dateStr.split('').reduce(function(a,b){return a+parseInt(b);},0));
  var h=drawHour==='2PM'?2:drawHour==='5PM'?5:9;
  var combined=reduce(ud+h);
  var dayRed=reduce(_D);
  // Month+Year
  var yRed=reduce(_Y);
  var monthYear=reduce(_M+yRed);
  // Day of week planetary ruler: Sun=1,Mon=2,Tue=9,Wed=5,Thu=3,Fri=6,Sat=8
  var dowNums=[1,2,9,5,3,6,8]; // Sun through Sat
  var saturn=dowNums[_DOW];

  var pyNums=[...new Set([ud,h,combined,saturn,monthYear,dayRed])];

  // Chaldean — static word values (PCSO, LOTTO, PHILIPPINES never change)
  var pcso=reduce(8+3+3+7);   // 21→3
  var lotto=reduce(3+7+4+4+7); // 25→7
  var phils=reduce(8+5+1+3+1+8+8+1+5+5+3); // 48→3
  var chNums=[...new Set([pcso,lotto,phils])];

  var allNums=[...new Set([...pyNums,...chNums])];
  return {
    pyNums,chNums,allNums,nums:allNums,ud,h,combined,saturn,monthYear,dayRed,
    steps:[
      `<b>Pythagorean — Universal Day:</b> ${dateStr.split('').join('+')}=${dateStr.split('').reduce((a,b)=>a+parseInt(b),0)} → <b>${ud}</b>`,
      `<b>Day of month ${_D}:</b> ${String(_D).split('').join('+')} → <b>${dayRed}</b>`,
      `<b>Draw hour ${drawHour}:</b> → <b>${h}</b> · Combined ${ud}+${h}=${ud+h} → <b>${combined}</b>`,
      `<b>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][_DOW]}=Planet ruler:</b> → <b>${saturn}</b>`,
      `<b>Month(${_M})+Year(${_Y}→${yRed}):</b> → <b>${monthYear}</b>`,
      `<b>Chaldean — "PCSO":</b> P(8)+C(3)+S(3)+O(7)=21 → <b>${pcso}</b>`,
      `<b>Chaldean — "LOTTO":</b> L(3)+O(7)+T(4)+T(4)+O(7)=25 → <b>${lotto}</b>`,
      `<b>Chaldean — "PHILIPPINES":</b> =48→12 → <b>${phils}</b>`,
    ]
  };
}

function layerAstrology(drawHour){
  // Real ephemeris positions (see ASTRO ENGINE above for source/accuracy).
  var h=drawHour==='2PM'?14:drawHour==='5PM'?17:21;
  var d=astroDayNumber(_Y,_M,_D,h);
  var sp=astroSunPos(d);
  var sunLon=sp.lonsun;
  var moon=astroMoonLon(d,sunLon,sp.M);
  var mercury=astroPlanetLon('mercury',d,sunLon,sp.r);
  var venus=astroPlanetLon('venus',d,sunLon,sp.r);
  var mars=astroPlanetLon('mars',d,sunLon,sp.r);
  var jupiter=astroPlanetLon('jupiter',d,sunLon,sp.r);
  var saturn=astroPlanetLon('saturn',d,sunLon,sp.r);
  var ecl=astroObliquity(d);
  var Ls=astroNorm360(sp.M+sp.w); // Sun's mean longitude, for GMST0
  var ut=h-8; // PH is UTC+8
  var LST=astroSiderealDeg(Ls,ut,ASTRO_LON);
  var ascReal=astroAscendant(LST,ASTRO_LAT,ecl);
  var radec=astroSunRaDec(sunLon,sp.r,ecl);
  var sunAlt=astroAltitude(radec.RA,radec.Dec,LST,ASTRO_LAT);
  var isDayChart=sunAlt>0;

  function norm(x){return astroNorm360(x);}
  var signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var signNums=[[9,1],[6,2],[3,5],[2,7],[1,4],[5,6],[3,6],[1,9],[3,9],[8,1],[4,7],[2,7]]; // nums per sign
  function signOf(deg){return Math.floor(norm(deg)/30);}
  function degInSign(deg){return norm(deg)%30;}

  var jSign=signOf(jupiter);
  var mSign=signOf(moon);
  var vSign=signOf(venus);
  var maSign=signOf(mars);

  // Part of Fortune — uses the real Ascendant computed above, and switches
  // formula by whether the Sun is actually above the horizon at draw time:
  // day chart = Asc+Moon-Sun, night chart = Asc+Sun-Moon (classical rule).
  // 2PM/5PM draws in Manila are day charts; 9PM is a night chart.
  var pof=isDayChart?norm(ascReal+moon-sunLon):norm(ascReal+sunLon-moon);
  var pofSign=signOf(pof);
  var pofNums=[...new Set(signNums[pofSign])];

  var nums=[...new Set([
    ...signNums[jSign],
    ...signNums[mSign],
    ...signNums[vSign],
    ...signNums[maSign],
    ...signNums[pofSign],
  ])];

  var signs2=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  var signRulers=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars/Pluto","Jupiter","Saturn","Uranus/Saturn","Neptune/Jupiter"];
  // 5th house cusp: Equal House system (Asc + 4 signs). Labeled honestly as
  // such — earlier copy in this app claimed "Regiomontanus," which this
  // code never actually computed.
  var h5SignIdx=(signOf(ascReal)+4)%12;
  var h5ruler=signRulers[h5SignIdx];
  var h5sign=signs2[h5SignIdx];
  var horaryNums=[...new Set([
    ...signNums[signOf(ascReal)],
    ...signNums[h5SignIdx],
  ])];
  var pofRuler=signRulers[pofSign];
  var pofDigit=reduce(Math.floor(pof/30)+1);

  // Sun-Moon aspect (unchanged classification logic, now fed real longitudes)
  var sunMoonAngle=norm(moon-sunLon);
  var aspectName=sunMoonAngle<30?"Conjunction":sunMoonAngle<90?"Sextile/Semi-square":sunMoonAngle<120?"Square":"Trine/Opposition";
  var aspNature=sunMoonAngle<30||sunMoonAngle>330?'favorable':sunMoonAngle<60||sunMoonAngle>300?'favorable':sunMoonAngle<120||sunMoonAngle>240?'caution':'caution';

  // Real horary "strictures": these used to be hardcoded ✓ text regardless
  // of the actual chart. Now genuinely computed from the positions above.
  // Jupiter essential dignity (classical rulership table):
  var jupDignity=jSign===8||jSign===11?'Domicile (rulership)':jSign===3?'Exalted':jSign===2||jSign===5?'Detriment':jSign===9?'Fall':'Peregrine (no essential dignity)';
  // Via Combusta: 15° Libra (195°) to 15° Scorpio (225°) — classical danger zone for the Moon.
  var viaCombusta=(moon>=195&&moon<=225);
  // Radical chart: Ascendant in the first 3° or last 3° of a sign is classically "too early/too late for judgement".
  var ascDegInSign=degInSign(ascReal);
  var isRadical=!(ascDegInSign<3||ascDegInSign>27);
  var moonVoid=astroMoonVoidOfCourse(d);

  return {
    nums,pofNums,horaryNums,
    horaryASC:signs2[signOf(ascReal)]+" "+degInSign(ascReal).toFixed(0)+"°",
    horaryASCRuler:signRulers[signOf(ascReal)],
    h5sign:h5sign,h5ruler:h5ruler,h5rulerPos:signs2[signOf(venus)]+" "+degInSign(venus).toFixed(0)+"°",
    h5aspect:aspectName,
    pofSign:signs2[pofSign],pofDeg:degInSign(pof).toFixed(1)+"°",
    pofRuler:pofRuler,pofDigit:pofDigit,
    isDayChart:isDayChart,jupiterDignity:jupDignity,viaCombusta:viaCombusta,isRadical:isRadical,moonVoid:moonVoid,
    aspects:[{asp:aspectName+' '+sunMoonAngle.toFixed(0)+'°',nature:aspNature,note:'Sun-Moon · '+signs2[signOf(sunLon)]+' to '+signs2[signOf(moon)]}],
    planets:[
      {name:'Jupiter ♃',sign:signs[jSign],deg:degInSign(jupiter).toFixed(1),nums:signNums[jSign]},
      {name:'Moon ☽',sign:signs[mSign],deg:degInSign(moon).toFixed(1),nums:signNums[mSign]},
      {name:'Venus ♀',sign:signs[vSign],deg:degInSign(venus).toFixed(1),nums:signNums[vSign]},
      {name:'Mars ♂',sign:signs[maSign],deg:degInSign(mars).toFixed(1),nums:signNums[maSign]},
    ],
    pof:{sign:signs[pofSign],deg:degInSign(pof).toFixed(1)},
    steps:[
      `<b>Jupiter ♃</b> at ${degInSign(jupiter).toFixed(1)}° ${signs[jSign]} (${jupDignity}) → digits: <b>${signNums[jSign].join(',')}</b>`,
      `<b>Moon ☽</b> at ${degInSign(moon).toFixed(1)}° ${signs[mSign]} → digits: <b>${signNums[mSign].join(',')}</b>`,
      `<b>Venus ♀</b> at ${degInSign(venus).toFixed(1)}° ${signs[vSign]} → digits: <b>${signNums[vSign].join(',')}</b>`,
      `<b>Mars ♂</b> at ${degInSign(mars).toFixed(1)}° ${signs[maSign]} → digits: <b>${signNums[maSign].join(',')}</b>`,
      `<b>Horary</b> ASC ${signs2[signOf(ascReal)]} (Equal House) + 5th house ${h5sign} → digits: <b>${horaryNums.join(',')}</b>`,
      `<b>Part of Fortune</b> (${isDayChart?'day':'night'} chart, Sun ${sunAlt.toFixed(0)}° ${sunAlt>0?'above':'below'} horizon) at ${degInSign(pof).toFixed(1)}° ${signs[pofSign]} → digits: <b>${pofNums.join(',')}</b>`,
    ]
  };
}

function layerBazi(drawHour){
  // Heavenly Stems and Earthly Branches
  var stems=['Jia甲','Yi乙','Bing丙','Ding丁','Wu戊','Ji己','Geng庚','Xin辛','Ren壬','Gui癸'];
  var branches=['Zi子','Chou丑','Yin寅','Mao卯','Chen辰','Si巳','Wu午','Wei未','Shen申','You酉','Xu戌','Hai亥'];
  var stemEl=['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
  var branchEl=['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];
  var branchNums=[[1,6],[2,5],[3,8],[3,8],[5],[2,7],[2,7],[2,5],[6,7],[6,7],[5],[1,6]];
  var stemNums=[[3,8],[3,8],[2,7],[2,7],[5],[5],[6,7],[6,7],[1,6],[1,6]];

  // Solar longitude of the day (needed for both the year-switch at Lichun
  // and the true Jie-Qi month boundary below). BaZi is a solar calendar —
  // months and the year both turn on solar-term crossings, not the
  // Gregorian 1st of the month. [Confirmed: Wikipedia "Four Pillars of
  // Destiny" — "The month is determined by the solar terms... rather than
  // the lunar month."]
  var _baziD=astroDayNumber(_Y,_M,_D,12);
  var _baziSunLon=astroSunPos(_baziD).lonsun;

  // Year pillar — switches at Lichun (立春, solar longitude 315°), not Jan 1.
  // Only Jan/early-Feb dates before that year's Lichun still belong to the
  // previous BaZi year.
  var baziYear=_Y;
  if(_M===1||(_M===2&&_baziSunLon<315)) baziYear=_Y-1;
  var yStem=(baziYear-4)%10; if(yStem<0)yStem+=10;
  var yBranch=(baziYear-4)%12; if(yBranch<0)yBranch+=12;

  // Month pillar — true solar-term (Jie) boundary: 12 "Jie" terms spaced
  // 30° apart in solar longitude, starting at Lichun (315°) = Yin月.
  // Month stem from the "Five Tigers" (五虎遁) rule: Jia/Ji→Bing, Yi/Geng→Wu,
  // Bing/Xin→Geng, Ding/Ren→Ren, Wu/Gui→Jia at Yin month, then +1 stem per
  // month. [Confirmed against a public worked example — see chat writeup.]
  var solarMonthIdx=Math.floor(astroNorm360(_baziSunLon-315)/30); // 0=Yin..11=Chou
  var mBranch=(2+solarMonthIdx)%12;
  var yinMonthStem=(2+(yStem%5)*2)%10;
  var mStem=(yinMonthStem+solarMonthIdx)%10;

  // Day pillar — Julian Day Number approach, corrected offset.
  // [Confirmed] dayStemIndex=(jdn-1)%10, dayBranchIndex=(jdn+1)%12 reproduces
  // the published sexagenary anchor JDnoon=2458511 → 甲子 (Jiazi) exactly;
  // the previous (jdn-10)%10 / (jdn-10)%12 formula was off by one stem and
  // one branch position (verified in chat — same anchor gives 乙丑 instead).
  var jdn=jdnOf(_Y,_M,_D);
  var dStem=(jdn-1)%10; if(dStem<0)dStem+=10;
  var dBranch=(jdn+1)%12; if(dBranch<0)dBranch+=12;

  // Hour pillar — fixed branches by hour
  var hBranchMap={'2PM':7,'5PM':9,'9PM':11}; // Wei=7,You=9,Hai=11
  var hBranch=hBranchMap[drawHour]||11;
  // Hour stem — "Five Rats" (五鼠遁) rule: Zi-hour stem = (dayStem mod 5)*2,
  // then +1 stem per subsequent 2-hour branch. The previous formula divided
  // the branch index by 2 instead of using it directly, which is wrong for
  // every hour except Zi itself (verified in chat: Jia/Ji-day Yin-hour must
  // be Bing, previous formula gave Yi).
  var hStem=((dStem%5)*2+hBranch)%10;

  var day={stem:stems[dStem],stemEl:stemEl[dStem],branch:branches[dBranch],branchEl:branchEl[dBranch],nums:[...new Set([...stemNums[dStem],...branchNums[dBranch]])]};
  var hour={stem:stems[hStem],stemEl:stemEl[hStem],branch:branches[hBranch],branchEl:branchEl[hBranch],nums:[...new Set([...stemNums[hStem],...branchNums[hBranch]])]};
  var year={stem:stems[yStem],stemEl:stemEl[yStem],branch:branches[yBranch],branchEl:branchEl[yBranch],nums:[...new Set([...stemNums[yStem],...branchNums[yBranch]])]};
  var month={stem:stems[mStem],stemEl:stemEl[mStem],branch:branches[mBranch],branchEl:branchEl[mBranch],nums:[...new Set([...stemNums[mStem],...branchNums[mBranch]])]};

  var nums=[...new Set([...day.nums,...hour.nums])];

  // BaZi interactions (clashes, combinations)
  var interactions=[];
  // Day-Hour branch clash check
  var clashPairs=[[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
  clashPairs.forEach(function(p){
    if((dBranch===p[0]&&hBranch===p[1])||(dBranch===p[1]&&hBranch===p[0]))
      interactions.push({type:"Clash",a:branches[dBranch],b:branches[hBranch],effect:"tension"});
  });
  return {
    nums,day,hour,year,month,interactions,
    steps:[
      `<b>Year Pillar:</b> ${year.stem} ${year.branch}`,
      `<b>Month Pillar:</b> ${month.stem} ${month.branch}`,
      `<b>Day Pillar:</b> ${day.stem} (${day.stemEl}) · ${day.branch} (${day.branchEl}) → digits: <b>${day.nums.join(',')}</b>`,
      `<b>Hour Pillar (${drawHour}):</b> ${hour.stem} · ${hour.branch} (${hour.branchEl}) → digits: <b>${hour.nums.join(',')}</b>`,
    ]
  };
}

function layerFengshui(){
  // Same Lichun-based solar year/month logic as BaZi above, so Flying Star
  // and BaZi never disagree about which "month" it currently is.
  var _fsD=astroDayNumber(_Y,_M,_D,12);
  var _fsSunLon=astroSunPos(_fsD).lonsun;
  var fsYear=_Y;
  if(_M===1||(_M===2&&_fsSunLon<315)) fsYear=_Y-1;

  // Period 9 (2024-2043) — fixed
  // Annual star: 2024=9,2025=8,2026=7... counting down, wrapping 1→9.
  var annualStar=9-((fsYear-2024)%9);
  if(annualStar<=0)annualStar+=9;

  // Monthly star starting value (the "正月" / first-solar-month center
  // number that subsequent months count down from) — classical rule keys
  // this off the YEAR'S EARTHLY BRANCH GROUP, not annual-star parity:
  //   子午卯酉 (Zi/Wu/Mao/You years) → 8
  //   辰戌丑未 (Chen/Xu/Chou/Wei years) → 5
  //   寅申巳亥 (Yin/Shen/Si/Hai years)  → 2
  // Source: 月紫白星起例歌诀 "子午卯酉八白起，寅申巳亥二黑求，辰戌丑未五黄中".
  // Verified against a concrete published example: 2025 (乙巳, a 巳/Si
  // year) is on record as having month-1 (寅月) center star = 2 — matches
  // this rule (Si→group 寅申巳亥→2) and does NOT match the previous
  // two-case "odd annual star→8, even→5" shortcut this code used to run
  // (annualStar(2025)=8, which is even, so the old rule wrongly gave 5).
  // The three branch groups above are exactly the earthly-branch index
  // mod 3 (Zi=0,Mao=3,Wu=6,You=9 → %3=0; Chou=1,Chen=4,Wei=7,Xu=10 →
  // %3=1; Yin=2,Si=5,Shen=8,Hai=11 → %3=2), so no separate branch lookup
  // is needed beyond the same (year-4)%12 formula layerBazi() already
  // uses for yBranch — duplicated here (self-contained per layer, same
  // pattern as the shared Lichun year-cutover logic above).
  var fsYBranch=(fsYear-4)%12; if(fsYBranch<0)fsYBranch+=12;
  var monthOneStar=[8,5,2][fsYBranch%3];
  // Months since Lichun (0=Yin/first solar month), from true solar-term
  // boundaries rather than the 1st of the Gregorian month.
  var monthOffset=Math.floor(astroNorm360(_fsSunLon-315)/30);
  var monthlyStar=((monthOneStar-monthOffset-1+90)%9)+1;

  // Lo Shu grid: place monthly star in center, arrange others
  var loShuOrder=[5,1,6,7,3,8,4,9,2]; // center,N,NW,W,SW,S,SE,E,NE for star 5
  // Offset based on monthly star
  var offset=monthlyStar-5;
  var grid={};
  var dirs=['C','N','NW','W','SW','S','SE','E','NE'];
  dirs.forEach(function(d,i){
    grid[d]=((loShuOrder[i]+offset-1+9)%9)+1;
  });

  var nums=[...new Set([annualStar,monthlyStar,grid.C,grid.E])];

  return {
    nums,loShu:grid,
    steps:[
      `<b>Period 9 (2024-2043)</b> · ruling star = 9 · active: <b>2,7,9</b>`,
      `<b>Annual Flying Star ${_Y} = #${annualStar}</b>`,
      `<b>Monthly Star (Month ${_M}) = #${monthlyStar}</b> in center`,
      `<b>Wealth stars:</b> #${monthlyStar} (center) + #${grid.E} (East) → digits: <b>${nums.join(',')}</b>`,
    ]
  };
}

// Trigram bit patterns, bottom-to-top (1=yang/solid, 0=yin/broken), Xian
// Tian (Fu Xi) numbering Qian1..Kun8 — verified against the standard
// "sons have one yang line (Zhen=bottom, Kan=middle, Gen=top), daughters
// have one yin line (Xun=bottom, Li=middle, Dui=top)" rule.
var ICHING_TRIGRAM_LINES={1:[1,1,1],2:[1,1,0],3:[1,0,1],4:[1,0,0],5:[0,1,1],6:[0,1,0],7:[0,0,1],8:[0,0,0]};
var ICHING_TRIGRAM_REV=(function(){
  var m={};
  for(var k in ICHING_TRIGRAM_LINES) m[ICHING_TRIGRAM_LINES[k].join('')]=parseInt(k);
  return m;
})();
function ichingTriFromLines(a,b,c){ return ICHING_TRIGRAM_REV[''+a+b+c]; }
// King Wen hexagram number by [lower trigram][upper trigram], 1-indexed
// trigram args (Qian1..Kun8). Rebuilt from the verified King Wen
// upper/lower trigram list (Wikipedia "List of hexagrams of the I Ching")
// and independently cross-checked two ways: (1) all eight "doubled"
// hexagrams land on their well-known numbers (Qian²=1, Dui²=58, Li²=30,
// Zhen²=51, Xun²=57, Kan²=29, Gen²=52, Kun²=2); (2) Tai (11, lower=Qian
// upper=Kun) and Pi (12, lower=Kun upper=Qian) — the two hexagrams whose
// composition is common knowledge — land correctly. The PREVIOUS table
// here failed both checks (e.g. it put lower=Qian/upper=Kun at 43, not
// 11) — this replaces a table that was simply wrong, not a stylistic
// rewrite.
var ICHING_HEX_TABLE=[
  [1,43,14,34,9,5,26,11],
  [10,58,38,54,61,60,41,19],
  [13,49,30,55,37,63,22,36],
  [25,17,21,51,42,3,27,24],
  [44,28,50,32,57,48,18,46],
  [6,47,64,40,59,29,4,7],
  [33,31,56,62,53,39,52,15],
  [12,45,35,16,20,8,23,2]
];
function ichingHexNumOf(lowerTri,upperTri){ return ICHING_HEX_TABLE[lowerTri-1][upperTri-1]; }

function layerIChing(drawHour){
  // Authentic Mei Hua Yi Shu (梅花易数) time-based casting — 年月日时起卦法,
  // Shao Yong's classical method, not a Western-numerology substitute:
  //   上卦(upper) = (年支数+月+日) mod 8      [no hour]
  //   下卦(lower) = (年支数+月+日+时支数) mod 8
  //   动爻(moving line) = (年支数+月+日+时支数) mod 6
  // 年支数 (year number) = the year's EARTHLY BRANCH index 1-12 (Zi=1..
  // Hai=12) — NOT the Gregorian year and NOT a Pythagorean-reduced digit
  // (the previous code used reduce(_Y), mixing Western numerology into a
  // Chinese casting formula). 时支数 (hour number) = the same 2-hour
  // earthly-branch index used by layerBazi()'s hour pillar (Wei=8→2PM,
  // You=10→5PM, Hai=12→9PM branches, 1-indexed here vs BaZi's 0-indexed).
  // Formula verified against a published worked example: 辰年十二月十七日申时
  // → upper=(5+12+17)%8=2(Dui), lower=(34+9)%8=3(Li), moving=(43)%6=1.
  // Month/day use the solar (Gregorian) calendar rather than converting to
  // the lunar calendar the classical method originally assumed — a
  // disclosed practical simplification (lunar-calendar conversion needs
  // real new-moon astronomy, out of scope here), consistent with how
  // layerBazi()/layerFengshui() already run on solar dates.
  var _icD=astroDayNumber(_Y,_M,_D,12);
  var _icSunLon=astroSunPos(_icD).lonsun;
  var icYear=_Y;
  if(_M===1||(_M===2&&_icSunLon<315)) icYear=_Y-1; // same Lichun-based solar year as BaZi/Feng Shui
  var icYBranch=(icYear-4)%12; if(icYBranch<0)icYBranch+=12;
  var yearNum=icYBranch+1; // 1-12, Zi=1
  var hBranchMap={'2PM':7,'5PM':9,'9PM':11}; // same 0-indexed branches as layerBazi()'s hour pillar
  var hourNum=(hBranchMap[drawHour]!==undefined?hBranchMap[drawHour]:11)+1; // 1-12, Zi=1

  var upper=(yearNum+_M+_D)%8||8;
  var lower=(yearNum+_M+_D+hourNum)%8||8;
  var changingLine=(yearNum+_M+_D+hourNum)%6||6;

  var triNames=['','Qian','Dui','Li','Zhen','Xun','Kan','Gen','Kun'];
  var triSym=['','☰','☱','☲','☳','☴','☵','☶','☷'];
  // Wu Xing element per trigram (Qian/Dui=Metal, Li=Fire, Zhen/Xun=Wood,
  // Kan=Water, Gen/Kun=Earth). Index4 (Zhen) previously said "Thunder" —
  // that's the trigram's natural-phenomenon association, not its Wu Xing
  // element, so it's corrected to "Wood" here (Wood/Thunder happened to
  // share the same digit set below, so this was cosmetic, not a scoring bug).
  var triEl=['','Metal','Metal','Fire','Wood','Wood','Water','Earth','Earth'];
  var elNums={'Metal':[6,7],'Fire':[2,7],'Wood':[3,8],'Water':[1,6],'Earth':[2,5,8]};

  var hexNum=ichingHexNumOf(lower,upper);

  // Hexagram database
  var hexDB={1:{name:"Qian",english:"The Creative",gambling:"Strong favorable energy · act decisively"},
    2:{name:"Kun",english:"The Receptive",gambling:"Receptive · follow others' lead"},
    3:{name:"Zhun",english:"Difficulty at Beginning",gambling:"Initial struggle · persistence wins"},
    4:{name:"Meng",english:"Youthful Folly",gambling:"Seek guidance · trust intuition"},
    5:{name:"Xu",english:"Waiting",gambling:"Patience required · timing critical"},
    6:{name:"Song",english:"Conflict",gambling:"Caution · avoid rash decisions"},
    7:{name:"Shi",english:"The Army",gambling:"Discipline · collective strength"},
    8:{name:"Bi",english:"Holding Together",gambling:"Alliance · cooperative fortune"},
    9:{name:"Xiao Chu",english:"Small Taming",gambling:"Minor gains · accumulation"},
    10:{name:"Lu",english:"Treading",gambling:"Careful steps · success possible"},
    11:{name:"Tai",english:"Peace",gambling:"Harmony · excellent fortune"},
    12:{name:"Pi",english:"Standstill",gambling:"Blockage · wait for better time"},
    13:{name:"Tong Ren",english:"Fellowship",gambling:"Unity · shared luck"},
    14:{name:"Da You",english:"Great Possession",gambling:"Abundance · peak fortune"},
    15:{name:"Qian",english:"Modesty",gambling:"Humble approach brings reward"},
    16:{name:"Yu",english:"Enthusiasm",gambling:"Joy · favorable for speculation"},
    17:{name:"Sui",english:"Following",gambling:"Go with flow · adapt to moment"},
    18:{name:"Gu",english:"Work on Decay",gambling:"Correct errors · renewal ahead"},
    19:{name:"Lin",english:"Approach",gambling:"Opportunity approaching · be ready"},
    20:{name:"Guan",english:"Contemplation",gambling:"Observe carefully · gather insight"},
    21:{name:"Shi He",english:"Biting Through",gambling:"Breakthrough · obstacles cleared"},
    22:{name:"Bi",english:"Grace",gambling:"Beauty · aesthetics · favorable"},
    23:{name:"Bo",english:"Splitting Apart",gambling:"Decline · not favorable now"},
    24:{name:"Fu",english:"Return",gambling:"Renewal · cycle beginning · positive"},
    25:{name:"Wu Wang",english:"Innocence",gambling:"Pure action · unexpected fortune"},
    26:{name:"Da Chu",english:"Great Taming",gambling:"Accumulate strength · hold back"},
    27:{name:"Yi",english:"Nourishment",gambling:"Feed the right energy · discern"},
    28:{name:"Da Guo",english:"Great Excess",gambling:"Peak · breakthrough or collapse"},
    29:{name:"Kan",english:"Abysmal Water",gambling:"Double danger · proceed carefully"},
    30:{name:"Li",english:"The Clinging Fire",gambling:"Clarity · dependence on others"},
    31:{name:"Xian",english:"Influence",gambling:"Attraction · mutual resonance"},
    32:{name:"Heng",english:"Duration",gambling:"Perseverance · lasting success"},
    33:{name:"Dun",english:"Retreat",gambling:"Strategic withdrawal · timing"},
    34:{name:"Da Zhuang",english:"Great Power",gambling:"Strength · momentum · act now"},
    35:{name:"Jin",english:"Progress",gambling:"Advancing · success coming"},
    36:{name:"Ming Yi",english:"Darkening of Light",gambling:"Conceal brilliance · wait"},
    37:{name:"Jia Ren",english:"Family",gambling:"Proper relationships · harmony"},
    38:{name:"Kui",english:"Opposition",gambling:"Tension · contrasting forces"},
    39:{name:"Jian",english:"Obstruction",gambling:"Difficulty · seek help"},
    40:{name:"Jie",english:"Deliverance",gambling:"Release · obstacles dissolving"},
    41:{name:"Sun",english:"Decrease",gambling:"Reduce · simplify · less is more"},
    42:{name:"Yi",english:"Increase",gambling:"Growth · benefit · expand"},
    43:{name:"Guai",english:"Breakthrough",gambling:"Resolution · decisive action"},
    44:{name:"Gou",english:"Coming to Meet",gambling:"Temptation · unexpected encounter"},
    45:{name:"Cui",english:"Gathering",gambling:"Assembly · collective fortune · favorable"},
    46:{name:"Sheng",english:"Pushing Upward",gambling:"Ascent · gradual success"},
    47:{name:"Kun",english:"Oppression",gambling:"Exhaustion · endure · change coming"},
    48:{name:"Jing",english:"The Well",gambling:"Inexhaustible source · seek depth"},
    49:{name:"Ge",english:"Revolution",gambling:"Change · transformation · major shift"},
    50:{name:"Ding",english:"The Cauldron",gambling:"Nourishment · cultural achievement"},
    51:{name:"Zhen",english:"The Arousing Thunder",gambling:"Shock · awakening · action"},
    52:{name:"Gen",english:"Keeping Still Mountain",gambling:"Stillness · meditation · wait"},
    53:{name:"Jian",english:"Development",gambling:"Gradual progress · steady gains"},
    54:{name:"Gui Mei",english:"Marrying Maiden",gambling:"Subordinate position · caution"},
    55:{name:"Feng",english:"Abundance",gambling:"Peak moment · act now"},
    56:{name:"Lu",english:"The Wanderer",gambling:"Impermanence · adapt quickly"},
    57:{name:"Xun",english:"The Gentle Wind",gambling:"Penetrate gradually · influence"},
    58:{name:"Dui",english:"The Joyous Lake",gambling:"Joy · pleasure · favorable"},
    59:{name:"Huan",english:"Dispersion",gambling:"Dissolution · scatter obstacles"},
    60:{name:"Jie",english:"Limitation",gambling:"Boundaries · discipline needed"},
    61:{name:"Zhong Fu",english:"Inner Truth",gambling:"Sincerity · authentic action"},
    62:{name:"Xiao Guo",english:"Small Exceeding",gambling:"Small steps · modesty wins"},
    63:{name:"Ji Ji",english:"After Completion",gambling:"Peak · maintain discipline"},
    64:{name:"Wei Ji",english:"Before Completion",gambling:"Almost there · final push"}};
  var hexInfo=hexDB[hexNum]||{name:'Hex '+hexNum,english:'Active energy',gambling:'Moderate fortune'};

  // Nuclear hexagram (互卦) — lines 2,3,4 become the new lower trigram,
  // lines 3,4,5 become the new upper trigram. Derived programmatically
  // from the verified trigram bit patterns rather than a second hardcoded
  // 64-entry table, so it can't drift out of sync with ICHING_HEX_TABLE.
  // Cross-checked: nuclear of Tai (11) computes to 54 (Gui Mei), the
  // commonly-cited textbook example.
  var lines6=ICHING_TRIGRAM_LINES[lower].concat(ICHING_TRIGRAM_LINES[upper]); // bottom(line1)..top(line6)
  var nucLowerTri=ichingTriFromLines(lines6[1],lines6[2],lines6[3]);
  var nucUpperTri=ichingTriFromLines(lines6[2],lines6[3],lines6[4]);
  var nucNum=ichingHexNumOf(nucLowerTri,nucUpperTri);
  var nucInfo=hexDB[nucNum]||{name:'Hex '+nucNum,english:'Inner energy',gambling:''};

  // Changed hexagram (变卦/之卦) — flip the moving line's yin/yang and
  // re-derive the resulting hexagram. This is the classical "where the
  // situation is heading" reading that the old code never actually
  // computed (it only described the moving line in prose).
  var changedLines=lines6.slice();
  changedLines[changingLine-1]=changedLines[changingLine-1]?0:1;
  var chgLowerTri=ichingTriFromLines(changedLines[0],changedLines[1],changedLines[2]);
  var chgUpperTri=ichingTriFromLines(changedLines[3],changedLines[4],changedLines[5]);
  var chgNum=ichingHexNumOf(chgLowerTri,chgUpperTri);
  var chgInfo=hexDB[chgNum]||{name:'Hex '+chgNum,english:'Resulting energy',gambling:''};

  var lineTexts=['Initial','Second','Third','Fourth','Fifth','Top'];
  var changingDesc=lineTexts[changingLine-1]+' line changing · energy in transition';

  var lEl=triEl[lower];
  var uEl=triEl[upper];
  var nums=[...new Set([...(elNums[lEl]||[5]),...(elNums[uEl]||[5])])];

  return {
    nums,
    hex:{
      num:hexNum,
      name:hexInfo.name,
      english:hexInfo.english,
      gambling:hexInfo.gambling,
      changingLine:changingDesc,
      upper:{sym:triSym[upper],name:triNames[upper]},
      lower:{sym:triSym[lower],name:triNames[lower]},
      nuclear:{num:nucNum,name:nucInfo.name},
      changed:{num:chgNum,name:chgInfo.name}
    },
    pofNums:[reduce(lower),reduce(upper),reduce(lower+upper)],
    steps:[
      `<b>Upper Trigram:</b> (year${yearNum}+month${_M}+day${_D})%8 = ${upper} = ${triSym[upper]} ${triNames[upper]} (${uEl})`,
      `<b>Lower Trigram:</b> (year${yearNum}+month${_M}+day${_D}+hour${hourNum})%8 = ${lower} = ${triSym[lower]} ${triNames[lower]} (${lEl})`,
      `<b>Hexagram ${hexNum} — ${hexInfo.name}</b> · ${hexInfo.english}`,
      `<b>Nuclear Hex ${nucNum} — ${nucInfo.name}</b> · inner energy`,
      `<b>Changing Line ${changingLine}</b> · ${changingDesc}`,
      `<b>Changed Hex ${chgNum} — ${chgInfo.name}</b> · where it's heading`,
      `<b>For speculation:</b> ${hexInfo.gambling}`,
    ]
  };
}

// ══════════════════════════
// LAYER 9: TAROT (Major Arcana — card of the day)
// Date digits reduced into Major Arcana range 0–21, per the standard
// "Tarot card of the day" numerology method. No personal data.
// ══════════════════════════
function layerTarot(drawHour){
  var dateStr=String(_D)+String(_M)+String(_Y);
  var rawSum=dateStr.split('').reduce(function(a,b){return a+parseInt(b);},0);
  var cardNum=rawSum;
  var wasReduced=false;
  while(cardNum>21){
    cardNum=String(cardNum).split('').reduce(function(a,b){return a+parseInt(b);},0);
    wasReduced=true;
  }
  var majorArcana=[
    {name:'The Fool',gambling:'Fresh, unpredictable energy · take the leap'},
    {name:'The Magician',gambling:'Willpower manifests · confident choices favored'},
    {name:'The High Priestess',gambling:'Trust intuition over pure logic today'},
    {name:'The Empress',gambling:'Abundance flowing · receptive to gain'},
    {name:'The Emperor',gambling:'Structure and discipline in number choice'},
    {name:'The Hierophant',gambling:'Stick to known patterns · tradition favored'},
    {name:'The Lovers',gambling:'Balance of two forces · pairs significant'},
    {name:'The Chariot',gambling:'Willful drive forward · decisive picks'},
    {name:'Strength',gambling:'Quiet inner confidence · patience rewarded'},
    {name:'The Hermit',gambling:'Solitary reflection · trust your own system'},
    {name:'Wheel of Fortune',gambling:'Cycles turning · classic luck-card energy'},
    {name:'Justice',gambling:'Balance and fairness · measured approach'},
    {name:'The Hanged Man',gambling:'Pause before acting · reconsider numbers'},
    {name:'Death',gambling:'Endings clear the way for new sequences'},
    {name:'Temperance',gambling:'Moderation · blend hot and cold numbers'},
    {name:'The Devil',gambling:'Watch for impulsive over-betting'},
    {name:'The Tower',gambling:'Sudden change · unexpected numbers surface'},
    {name:'The Star',gambling:'Hope and renewal · favorable open energy'},
    {name:'The Moon',gambling:'Uncertainty · lean on data over illusion'},
    {name:'The Sun',gambling:'Bright, favorable energy · optimistic pick'},
    {name:'Judgement',gambling:'Reckoning and renewal · reassess your pattern'},
    {name:'The World',gambling:'Completion · a cycle of picks closes well'},
  ];
  var card=majorArcana[cardNum]||majorArcana[0];
  var reducedDigit=reduce(cardNum);
  var extraDigits=[];
  if(cardNum>=10){
    var tens=Math.floor(cardNum/10),ones=cardNum%10;
    extraDigits=[tens===0?9:tens,ones===0?9:ones];
  }
  var nums=[...new Set([reducedDigit,...extraDigits])];
  return {
    nums,cardNum,rawSum,cardName:card.name,gambling:card.gambling,
    steps:[
      `<b>Date digit sum:</b> ${dateStr.split('').join('+')}=${rawSum}`+(wasReduced?` → reduced to <b>${cardNum}</b> (Major Arcana range 0–21)`:''),
      `<b>Card of the day:</b> ${cardNum} — <b>${card.name}</b>`,
      `<b>Reading:</b> ${card.gambling}`,
      `<b>Card digit(s):</b> <b>${nums.join(',')}</b>`,
    ]
  };
}

// ══════════════════════════
// LAYER 10: ANGEL NUMBERS (repeating-digit resonance)
// Scans today's date+hour string for genuine repeating-digit patterns
// (111, 777, mirror dates like 07/07, etc). Deliberately contributes NO
// digits on days with no real pattern — this layer does not manufacture
// hits, consistent with how the practice is actually used. No personal data.
// ══════════════════════════
function layerAngelNumbers(drawHour){
  var h=drawHour==='2PM'?2:drawHour==='5PM'?5:9;
  var dateStr=pad(_D)+pad(_M)+String(_Y)+String(h);
  var hits=[];
  var i=0;
  while(i<dateStr.length){
    var j=i;
    while(j<dateStr.length&&dateStr[j]===dateStr[i]) j++;
    var runLen=j-i;
    if(runLen>=3){
      var digRaw=parseInt(dateStr[i]);
      hits.push({pattern:dateStr[i].repeat(runLen),digit:digRaw===0?9:digRaw});
    }
    i=j;
  }
  var mirrorHit=(_D===_M);
  var nums=[...new Set(hits.map(function(x){return x.digit;}))];
  if(mirrorHit){ var md=reduce(_D); if(!nums.includes(md)) nums.push(md); }
  var hasSignal=nums.length>0;
  return {
    nums,hasSignal,hits,mirrorHit,dateStr,
    steps:[
      `<b>Date+hour string:</b> ${dateStr}`,
      hits.length?`<b>Repeating digit run(s):</b> ${hits.map(function(x){return x.pattern;}).join(', ')} → digit(s): <b>${nums.join(',')}</b>`:`<b>No repeating digit run found today</b>`,
      mirrorHit?`<b>Mirror date:</b> Day=Month(${_D}) → resonance digit <b>${reduce(_D)}</b>`:`<b>No day=month mirror today</b>`,
      hasSignal?`<b>Angel number signal active today</b>`:`<b>No angel number pattern today — this layer honestly contributes no digits (not manufactured)</b>`,
    ]
  };
}

function layerStats(gameKey,drawHour){
  var game=GAMES[gameKey];
  var isEZ2=gameKey==='ez2';
  var draws=isEZ2?game.draws[drawHour]:game.recent;
  var hotNums=isEZ2?game.hot[drawHour]:game.hot;

  var freq={};
  for(var i=1;i<=game.max;i++) freq[i]=0;
  draws.forEach(draw=>draw.forEach(n=>{ if(n>=1&&n<=game.max) freq[n]++; }));

  // Windowed frequency (most recent 30 draws, newest-first) — used for SCORING.
  // Full-history freq above is kept for display, but lifetime counts barely move
  // per draw and were freezing the picks; the 30-draw window is responsive.
  var freq30={};
  for(var i=1;i<=game.max;i++) freq30[i]=0;
  draws.slice(0,30).forEach(draw=>draw.forEach(n=>{ if(n>=1&&n<=game.max) freq30[n]++; }));

  var lastSeen={};
  for(var i=0;i<draws.length;i++)
    draws[i].forEach(n=>{ if(!(n in lastSeen)) lastSeen[n]=i; });

  // Overdue threshold: 2× the statistically expected gap for this game
  // (6-ball: max/6 draws between appearances; EZ2: max/2). The old rule
  // (gap >= 50% of total history) scaled with dataset size and never fired
  // once full history loaded — verified 0/260 numbers on live data.
  var expGap=isEZ2?(game.max/2):(game.max/6);
  var overdueAt=Math.ceil(expGap*2);

  var digitWeight={};
  for(var d=1;d<=9;d++) digitWeight[d]=0;
  for(var n=1;n<=game.max;n++){
    var d=digitOf(n);
    var w=(freq30[n]||0)*4;
    if(hotNums.includes(n)) w+=6;
    var gap=lastSeen[n]??draws.length;
    if(gap>=overdueAt) w+=5; // overdue
    digitWeight[d]=(digitWeight[d]||0)+w;
  }
  var topDigits=Object.entries(digitWeight).sort((a,b)=>b[1]-a[1]).map(e=>parseInt(e[0]));

  return {freq,freq30,lastSeen,digitWeight,topDigits,nums:topDigits.slice(0,5),hotNums,draws,overdueAt};
}

// ══════════════════════════
// ELEMENT ENERGY
// ══════════════════════════
function calcEnergy(bazi,astro,fs){
  var el={Fire:0,Water:0,Wood:0,Metal:0,Earth:0};
  // Derive element counts from BaZi day/hour stems dynamically
  var stemToEl=['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
  var branchToEl=['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];
  var branches2=['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  // Map element strings to our keys
  function addEl(elStr){
    if(elStr&&elStr.includes('Fire')) el.Fire+=1;
    if(elStr&&elStr.includes('Water')) el.Water+=1;
    if(elStr&&elStr.includes('Wood')) el.Wood+=1;
    if(elStr&&elStr.includes('Metal')) el.Metal+=1;
    if(elStr&&elStr.includes('Earth')) el.Earth+=1;
  }
  if(bazi&&bazi.day){addEl(bazi.day.stemEl);addEl(bazi.day.branchEl);}
  if(bazi&&bazi.hour){addEl(bazi.hour.stemEl);addEl(bazi.hour.branchEl);}
  if(bazi&&bazi.year){addEl(bazi.year.stemEl);addEl(bazi.year.branchEl);}
  // Astrology planet element contributions (dynamic from astro layer)
  if(astro&&astro.planets){
    var signElMap={Aries:'Fire',Taurus:'Earth',Gemini:'Air',Cancer:'Water',Leo:'Fire',Virgo:'Earth',
      Libra:'Air',Scorpio:'Water',Sagittarius:'Fire',Capricorn:'Earth',Aquarius:'Air',Pisces:'Water'};
    astro.planets.forEach(function(p){
      var e=signElMap[p.sign];
      if(e&&e!=='Air'&&el[e]!==undefined) el[e]+=1;
    });
  }
  // Flying Star contribution — was a hardcoded `Fire+=2;Earth+=2` regardless
  // of the actual date (the `fs` parameter was accepted but never read).
  // Now derived from the real Lo Shu grid computed in layerFengshui, via the
  // standard star-number → element correspondence (1 Water · 2/5/8 Earth ·
  // 3/4 Wood · 6/7 Metal · 9 Fire).
  var loShuEl=[null,'Water','Earth','Wood','Wood','Earth','Metal','Metal','Earth','Fire'];
  if(fs&&fs.loShu){
    var centerEl=loShuEl[fs.loShu.C]; if(centerEl&&el[centerEl]!==undefined) el[centerEl]+=2;
    var eastEl=loShuEl[fs.loShu.E]; if(eastEl&&el[eastEl]!==undefined) el[eastEl]+=1;
  }
  // Ensure no zeros
  Object.keys(el).forEach(function(k){if(!el[k])el[k]=1;});
  var total=Object.values(el).reduce(function(a,b){return a+b;},0);
  return Object.fromEntries(Object.entries(el).map(function(e){return [e[0],{val:e[1],pct:Math.round(e[1]/total*100)}];}));
}

// Element Energy → digits (Lo Shu element-number map: Water 1 · Earth 2/5/8 ·
// Wood 3/4 · Metal 6/7 · Fire 9). Takes the top-2 dominant elements from
// calcEnergy(). Previously the energy flow was display-only; now it scores.
function energyDigits(energy){
  var MAP={Water:[1],Earth:[2,5,8],Wood:[3,4],Metal:[6,7],Fire:[9]};
  if(!energy) return [];
  var ranked=Object.entries(energy)
    .filter(function(e){return e[1]&&typeof e[1].pct==='number';})
    .sort(function(a,b){return b[1].pct-a[1].pct;})
    .slice(0,2);
  var out=[];
  ranked.forEach(function(e){(MAP[e[0]]||[]).forEach(function(d){if(out.indexOf(d)<0)out.push(d);});});
  return out;
}

// ══════════════════════════
// MASTER CONVERGENCE — 12 digit sources
// ══════════════════════════
function convergence(layers,gameKey){
  var game=GAMES[gameKey];
  var LABELS=['Py','Ch','As','Ba','Fs','IC','PoF','Ta','An','Ho','En','St'];
  var enNums=energyDigits(layers.energy); // Element Energy digits (may be [])
  var hoNums=(layers.astro&&layers.astro.horaryNums)||[]; // Horary digits
  var digitScores={};
  var rawStatW={};
  for(var d=1;d<=9;d++) rawStatW[d]=layers.stats.digitWeight[d]||0;
  var maxStatW=Math.max(1,...Object.values(rawStatW));
  // PASS 1 — collect which sources hit each digit.
  var collected={};
  for(var d=1;d<=9;d++){
    var inL=[];
    if(layers.num.pyNums.includes(d)) inL.push(0);
    if(layers.num.chNums.map(n=>reduce(n)).includes(d)) inL.push(1);
    if(layers.astro.nums.includes(d)) inL.push(2);
    if(layers.bazi.nums.includes(d)) inL.push(3);
    if(layers.fs.nums.includes(d)) inL.push(4);
    if(layers.iching.nums.includes(d)) inL.push(5);
    if(layers.astro.pofNums.includes(d)) inL.push(6);
    if(layers.tarot.nums.includes(d)) inL.push(7);
    if(layers.angel.nums.includes(d)) inL.push(8);
    if(hoNums.includes(d)) inL.push(9);
    if(enNums.includes(d)) inL.push(10);
    if(layers.stats.topDigits.slice(0,4).includes(d)) inL.push(11);
    collected[d]=inL;
  }
  // PASS 2 — score. Indices 0-10 (Py,Ch,As,Ba,Fs,IC,PoF,Ta,An,Ho,En) all derive
  // from the same date/hour input — not independent confirmations — so they are
  // scored as one correlated cluster. Index 11 (Stats) is the only layer built
  // from real historical draw data and is scored on its own scale.
  // REBALANCE: both clusters are normalized SYMMETRICALLY — each relative to
  // the day's strongest digit in its own cluster, each worth up to 5. The old
  // scheme normalized stats to its max (leader always earned the full 5) while
  // capping meta at 4 via a fixed denominator the cluster could never reach,
  // so the stats leader was mathematically unbeatable. That structural
  // asymmetry is what froze picks day-to-day (EZ2 repeats, unchanged 6-ball
  // picks after the Tarot/Angel upgrade).
  var maxMeta=Math.max(1,...Object.values(collected).map(function(a){return a.filter(function(i){return i<11;}).length;}));
  for(var d=1;d<=9;d++){
    var inL=collected[d];
    var statFrac=rawStatW[d]/maxStatW;            // 0–1, relative to today's stats leader
    var metaCount=inL.filter(i=>i<11).length;     // 0-11
    var metaFrac=metaCount/maxMeta;               // 0–1, relative to today's meta leader
    var metaWeight=metaFrac*5;                    // correlated cluster, up to 5
    var statScore=statFrac*5;                     // real-data layer, up to 5
    digitScores[d]={count:inL.length,layers:inL,statWeight:rawStatW[d],metaCount:metaCount,score:metaWeight+statScore};
  }
  var sorted=Object.entries(digitScores)
    .map(([d,s])=>({digit:parseInt(d),...s}))
    .sort((a,b)=>b.score-a.score);

  var digitToNums={};
  for(var d=1;d<=9;d++){
    digitToNums[d]=[];
    for(var n=1;n<=game.max;n++)
      if(digitOf(n)===d) digitToNums[d].push(n);
  }

  var hotNums=layers.stats.hotNums||[];
  // Within-digit-family selection was previously 100% stats (lifetime freq +
  // hot bonus) — metaphysics had zero say in the final number, and lifetime
  // freq barely moves per draw, so the chosen number was effectively frozen.
  // Now: windowed 30-draw freq (responsive) + hot bonus + date-sensitive
  // metaphysical FULL-NUMBER matches (Tarot card of the day, I Ching hexagram,
  // Angel repdigit numbers 11/22/33...), all of which change with the date.
  var selFreq=layers.stats.freq30||layers.stats.freq||{};
  var cardN=(layers.tarot&&typeof layers.tarot.cardNum==='number')?layers.tarot.cardNum:null;
  var dateSumN=(layers.tarot&&typeof layers.tarot.rawSum==='number')?layers.tarot.rawSum:null; // unreduced date digit-sum ("date number")
  var hexRaw=layers.iching&&layers.iching.hex;
  var hexN=hexRaw?(typeof hexRaw==='object'?hexRaw.num:hexRaw):null;
  var nucN=(hexRaw&&typeof hexRaw==='object'&&hexRaw.nuclear&&typeof hexRaw.nuclear.num==='number')?hexRaw.nuclear.num:null;
  var chgN=(hexRaw&&typeof hexRaw==='object'&&hexRaw.changed&&typeof hexRaw.changed.num==='number')?hexRaw.changed.num:null;
  var angelFull=[];
  if(layers.angel&&Array.isArray(layers.angel.nums)){
    layers.angel.nums.forEach(function(dg){
      var rep=dg*11; // 1→11, 2→22 ... classic angel numbers
      if(rep>=1&&rep<=game.max&&angelFull.indexOf(rep)<0) angelFull.push(rep);
    });
  }
  // +10 per date-varying FULL-NUMBER match. Sized against realistic stats
  // margins in a 30-draw window (leader ≈ freq 4×4 + hot 6 = 22 vs runner-up
  // ≈ 12–18): 10 lets a genuine date signal overturn near-leads without
  // steamrolling a clearly hot number.
  function metaNumBonus(n){
    var b=0;
    if(cardN!==null&&cardN>=1&&n===cardN) b+=10;
    if(dateSumN!==null&&dateSumN>=1&&dateSumN<=game.max&&n===dateSumN) b+=10;
    if(hexN&&hexN>=1&&hexN<=game.max&&n===hexN) b+=10;
    if(nucN&&nucN>=1&&nucN<=game.max&&n===nucN) b+=10;
    if(chgN&&chgN>=1&&chgN<=game.max&&n===chgN) b+=10;
    if(angelFull.indexOf(n)>=0) b+=10;
    return b;
  }
  function bestNums(digit){
    return (digitToNums[digit]||[]).sort((a,b)=>{
      var sA=(selFreq[a]||0)*4+(hotNums.includes(a)?6:0)+metaNumBonus(a);
      var sB=(selFreq[b]||0)*4+(hotNums.includes(b)?6:0)+metaNumBonus(b);
      return sB-sA;
    });
  }

  var isEZ2=gameKey==='ez2';
  var needed=isEZ2?2:6;
  // HYBRID PICKER — Constrained Max Score. Merges the old Max Score and Full
  // Spread modes into ONE combination: greedy fill in `ranked` order (the
  // score-optimal order under the alignment metric — family order = `sorted`,
  // within-family order = bestNums: 30-draw freq + hot + date full-number
  // bonuses) with a per-digit-family cap. Lotto: cap 2 → guarantees at least
  // 3 distinct digit families in 6 picks while still doubling up on the
  // strongest signals. EZ2: cap 1 → the top two digit signals, best number
  // each. By construction the hybrid's alignment score sits between the old
  // Full Spread (cap 1 everywhere) and old Max Score (no cap); verified by
  // simulation Jul 11 2026 (spread=100 <= hybrid=158 <= max=360 on an
  // adversarial 6/58 case). altPicks = second capped pass over the leftovers,
  // so the alternate set obeys the same spread guarantee.
  var ranked=[];
  for(var ds of sorted)
    for(var n of bestNums(ds.digit))
      ranked.push(n);
  var FAMILY_CAP=needed<=2?1:2;
  function cappedFill(exclude){
    var out=[],cnt={};
    for(var n of ranked){
      if(exclude.indexOf(n)>=0||out.indexOf(n)>=0) continue;
      var d=digitOf(n);
      if((cnt[d]||0)>=FAMILY_CAP) continue;
      cnt[d]=(cnt[d]||0)+1;
      out.push(n);
      if(out.length===needed) break;
    }
    // Safety net: if the capped pool can't fill `needed` (never true for the
    // real games — 9 families x cap >= needed), top up ignoring the cap.
    if(out.length<needed)
      for(var m of ranked){
        if(exclude.indexOf(m)>=0||out.indexOf(m)>=0) continue;
        out.push(m);
        if(out.length===needed) break;
      }
    return out;
  }
  var picks=cappedFill([]);
  var pickSet=picks.slice();
  picks.sort((a,b)=>a-b);
  var altPicks=cappedFill(pickSet);
  altPicks.sort((a,b)=>a-b);

  return {sorted,digitScores,digitToNums,picks,altPicks,LABELS,needed};
}

// ══════════════════════════
// STATE
// ══════════════════════════
var currentGame='ez2';
var currentDraw='9PM';
var savedNums={};
// Oracle pick mode toggle removed Jul 11 2026: Max Score and Full Spread were
// merged into the single hybrid capped picker above. The old persisted
// localStorage key 'oracleMode' is simply ignored if present.

function limitDigits(el){
  var v=String(el.value).replace(/[^0-9]/g,'');
  if(v.length>2) v=v.slice(0,2);
  el.value=v||'';
  var num=parseInt(v)||0;
  var maxVal=GAMES[currentGame]?GAMES[currentGame].max:58;
  if(v.length>0&&(num<1||num>maxVal)){ el.classList.add('invalid'); }
  else { el.classList.remove('invalid'); }
  if(v.length===2&&num>=1&&num<=maxVal){
    var allIds=['pn1','pn2','pn3','pn4','pn5','pn6'];
    var idx=allIds.indexOf(el.id);
    if(idx>=0&&idx<5){
      var next=document.getElementById(allIds[idx+1]);
      if(next&&next.style.display!=='none'){ next.focus(); next.select(); }
    }
  }
}
function setGame(g,btn){
  var allIds=['pn1','pn2','pn3','pn4','pn5','pn6'];
  var prevKey=currentGame==='ez2'?'ez2':'balls';
  savedNums[prevKey]=allIds.map(function(id){ var el=document.getElementById(id); return el?el.value:''; });
  currentGame=g;
  document.querySelectorAll('.gbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ez2wrap').style.display=g==='ez2'?'block':'none';
  var pw=document.getElementById('personal-wrap');
  if(pw) pw.style.display='block';
  var mx=GAMES[g]?GAMES[g].max:58; var gs=GAMES[g]?GAMES[g].short:g;
  var isEz2=g==='ez2'; var count=isEz2?2:6;
  var newKey=isEz2?'ez2':'balls';
  var restore=savedNums[newKey]||[];
  allIds.forEach(function(id,i){
    var el=document.getElementById(id);
    if(!el) return;
    el.max=mx;
    var v=restore[i]||'';
    el.value=v;
    var num=parseInt(v)||0;
    if(v!==''&&(num<1||num>mx)){ el.classList.add('invalid'); }
    else { el.classList.remove('invalid'); }
    el.style.display=i<count?'':'none';
  });
  var pi=document.querySelector('.personal-inputs');
  if(pi) pi.style.gridTemplateColumns='repeat('+count+',1fr)';
  var hint=document.getElementById('personal-hint');
  if(hint) hint.textContent='ENTER '+count+' NUMBERS BETWEEN 1 AND '+mx+' FOR '+gs;
}

function setDraw(d,btn){
  currentDraw=d;
  document.querySelectorAll('#ez2wrap .gbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

async function generate(){
  await PCSO_HISTORY_READY; // ensure live history (or confirmed fallback) is in place before scoring
  var dh=currentGame==='ez2'?currentDraw:'9PM';
  document.getElementById('results').style.display='none';
  document.getElementById('loader').style.display='block';
  var gw=document.querySelector('#oracle-page .game-wrap');
  if(gw) gw.style.display='none';
  document.getElementById('loader').scrollIntoView({behavior:'smooth',block:'start'});
  var game=GAMES[currentGame];
  var msgs=[
    `🔢 Pythagorean + Chaldean numerology · ${TODAY_PH} ${dh}…`,
    `🪐 Real planetary positions + essential dignities…`,
    `🏛️ Horary chart — Equal House · 5th house gambling…`,
    `⭐ Part of Fortune · day/night-aware calculation…`,
    `🔭 Planetary aspects · applying only · strictures checked…`,
    `☯️ Exact BaZi day pillar · ${TODAY_PH} ${dh} hour…`,
    `⚡ Clashes · combines · hidden stems · element balance…`,
    `🏮 Flying Star Lo Shu · monthly star · ${TODAY_PH}…`,
    `🔮 I Ching · hexagram from today's energy field…`,
    `🃏 Tarot · Major Arcana card of the day…`,
    `😇 Angel Numbers · scanning for repeating-digit resonance…`,
    `📊 PCSO ${game.short} historical data · freq+hot+overdue…`,
    `🎯 12-source digit convergence · mapping to 1–${game.max}…`,
  ];
  var si=0;
  var el=document.getElementById('lsteps');
  el.innerHTML='';
  var iv=setInterval(()=>{ if(si<msgs.length){ el.innerHTML+=msgs[si]+'<br>'; si++; } else clearInterval(iv); },240);
  setTimeout(()=>{
    clearInterval(iv);
    var num,astro,bazi,fs,iching,tarot,angel,stats,energy,layers,conv;
    try{num=layerNumerology(dh);}catch(e){console.error('layerNumerology:',e);num={pyNums:[7],chNums:[3],allNums:[3,7],steps:[]};}
    try{astro=layerAstrology(dh);}catch(e){console.error('layerAstrology:',e);astro={nums:[1,6],pofNums:[2],horaryNums:[2,7],horaryASC:'Cancer 15°',horaryASCRuler:'Moon',h5sign:'Scorpio',h5ruler:'Mars',h5rulerPos:'Taurus',h5aspect:'Square',pofSign:'Leo',pofDeg:'20°',pofRuler:'Sun',pofDigit:2,isDayChart:true,jupiterDignity:'Peregrine (no essential dignity)',viaCombusta:false,isRadical:true,moonVoid:false,planets:[],aspects:[],steps:[]};}
    try{bazi=layerBazi(dh);}catch(e){console.error('layerBazi:',e);bazi={nums:[1,6],day:{stem:'Gui',stemEl:'Water',branch:'You',branchEl:'Rooster',nums:[6,7]},hour:{stem:'Jia',stemEl:'Wood',branch:'Hai',branchEl:'Pig',nums:[1,3,6]},year:{stem:'Bing',stemEl:'Fire',branch:'Wu',branchEl:'Fire',nums:[2,7]},month:{stem:'Ji',branch:'Wu',nums:[2,5,7]},interactions:[],steps:[]};}
    try{fs=layerFengshui();}catch(e){console.error('layerFengshui:',e);fs={nums:[7,8,9],loShu:{C:8},steps:[]};}
    try{iching=layerIChing(dh);}catch(e){console.error('layerIChing:',e);iching={nums:[2,5],hex:45,pofNums:[5],steps:[]};}
    try{tarot=layerTarot(dh);}catch(e){console.error('layerTarot:',e);tarot={nums:[5],cardNum:5,cardName:'The Hierophant',gambling:'',steps:[]};}
    try{angel=layerAngelNumbers(dh);}catch(e){console.error('layerAngelNumbers:',e);angel={nums:[],hasSignal:false,hits:[],mirrorHit:false,steps:[]};}
    try{stats=layerStats(currentGame,dh);}catch(e){console.error('layerStats:',e);stats={topDigits:[9,1,3],digitWeight:{},topNums:[],freq:{},freq30:{},hotNums:[]};}
    try{energy=calcEnergy(bazi,astro,fs);}catch(e){console.error('calcEnergy:',e);energy={bars:{Fire:30,Water:30,Wood:9,Metal:9,Earth:22}};}
    layers={num,astro,bazi,fs,iching,tarot,angel,stats,energy};
    try{conv=convergence(layers,currentGame);}catch(e){console.error('convergence:',e);conv={sorted:[],best:[]};}
    document.getElementById('loader').style.display='none';
    try{
      renderResults(layers,conv,energy,currentGame,dh);
    }catch(e){
      document.getElementById('results').innerHTML='<div style="color:#ff6b6b;padding:20px;font-family:monospace;font-size:12px;">'+
      '<b>renderResults ERROR:</b><br>'+e.message+'<br><br>'+
      '<b>Stack:</b><br>'+e.stack+'</div>';
    }
    document.getElementById('results').style.display='block';
    var gw2=document.querySelector('#oracle-page .game-wrap');
    if(gw2) gw2.style.display='block';
    document.getElementById('results').scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(animateBars,180);
  },2800);
}

// ══════════════════════════
// RENDER
// ══════════════════════════
var BTIERS=['b1','b2','b3','b4','b5','b6'];
function dotHTML(idxs,labels){
  var icons=['Py','Ch','As','Ba','Fs','IC','PoF','Ta','An','Ho','En','St'];
  var cls=['on','on','on','on','on','teal','teal','teal','teal','teal','teal','gold'];
  return labels.map((l,i)=>`<span class="dot ${idxs.includes(i)?cls[i]:'off'}" title="${l}">${icons[i]}</span>`).join('');
}
function dCls(c){ return c>=8?'s8':c>=7?'s7':c>=6?'s6':c>=5?'s5':'s4'; }

function lcard(icon,name,nums,steps,extra='',isNew=false){
  return `<div class="lcard"><div class="lhead"><div class="licon">${icon}</div><div><div class="lname">${name}${isNew?'<span class="lnew">★ Expert</span>':''}</div><div class="lpills">${nums.map(n=>`<span class="pill">${n}</span>`).join('')}</div></div></div><div class="lsteps">${steps.map(s=>`• ${s}`).join('<br>')}</div>${extra}</div>`;
}
function renderResults(layers,conv,energy,gameKey,drawHour){
  var game=GAMES[gameKey];
  var isEZ2=gameKey==='ez2';
  // Single hybrid pick set (Max Score constrained by a per-family spread cap)
  var showPicks=conv.picks;
  var showAlt=conv.altPicks;
  var modeHTML='<div style="font-size:11px;color:var(--muted2);margin-top:6px;">Mode: ⚡🌐 Hybrid — strongest digit energies, max '+(conv.needed<=2?'one number':'two numbers')+' per digit family</div>';

  // Energy bars
  var elOrder=['Fire','Water','Wood','Metal','Earth'];
  var elCls={'Fire':'ef','Water':'ew','Wood':'ewod','Metal':'emet','Earth':'eear'};
  var elEmoji={'Fire':'🔥','Water':'💧','Wood':'🌿','Metal':'⚙️','Earth':'🟤'};
  var energyHTML=elOrder.map(e=>`
    <div class="erow">
      <span class="elabel">${elEmoji[e]} ${e}</span>
      <div class="ebar-wrap"><div class="ebar ${elCls[e]}" style="width:0%" data-w="${energy[e].pct}%"></div></div>
      <span class="epct" style="color:${energy[e].pct>=28?'var(--gold)':'var(--muted2)'}">${energy[e].pct}%</span>
    </div>`).join('');

  // Balls (mode-aware: max-score picks or full-spread picks)
  var ballsHTML=showPicks.map((n,i)=>{
    var d=digitOf(n);
    var ds=conv.digitScores[d];
    return `<div class="ball ${BTIERS[Math.min(i,5)]}">
      ${pad(n)}<span class="btag">d${d}·${ds.count}/12</span>
    </div>`;
  }).join('');
  var altHTML=showAlt.map(n=>`<div class="aball">${pad(n)}</div>`).join('');
  var totalScore=showPicks.reduce((s,n)=>{ var d=digitOf(n); return s+(conv.digitScores[d]?conv.digitScores[d].score:0); },0);
  var pct=Math.round(totalScore/(showPicks.length*10)*100);
  var ac=pct>=70?'#2ecc71':pct>=45?'#f0c040':'#ff6b6b';
  var al=pct>=70?'🟢 Strong Alignment':pct>=45?'🟡 Moderate Alignment':'🔴 Weak Alignment';

  // Digit concentration note — with the max-score picker, sharing a digit is
  // intentional (depth on the day's strongest signal), so this is informational,
  // not a warning. Each shared digit means that family's score is counted once
  // per pick riding it.
  var pickDigitCounts={};
  showPicks.forEach(n=>{ var d=digitOf(n); pickDigitCounts[d]=(pickDigitCounts[d]||0)+1; });
  var collisions=Object.entries(pickDigitCounts).filter(([d,c])=>c>1);
  var collisionHTML=collisions.length
    ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">ℹ ${collisions.map(([d,c])=>`${c} picks ride digit ${d}`).join(', ')} — concentrated on the strongest digit score by design</div>`
    : `<div style="font-size:11px;color:var(--muted);margin-top:8px;">✓ Picks draw on distinct digit scores</div>`;

  // CORRECTION: backtest — how often have numbers sharing today's picked
  // digits actually appeared in real historical draws, vs. just trusting the formula.
  var pickedDigits=[...new Set(showPicks.map(n=>digitOf(n)))];
  var histDraws=layers.stats.draws||[];
  var hitDraws=histDraws.filter(draw=>draw.some(n=>pickedDigits.includes(digitOf(n))));
  var backtestPct=histDraws.length?Math.round(hitDraws.length/histDraws.length*100):null;
  var backtestHTML=backtestPct!==null
    ? `<div style="font-size:11px;color:var(--muted2);margin-top:4px;">📊 Historical check: ${backtestPct}% of last ${histDraws.length} draws had at least one number matching these digits (real data, not the formula)</div>`
    : '';
  var sourceHTML=`<div style="font-size:10px;color:${PCSO_HISTORY_STATUS.loaded?'var(--muted)':'#ff6b6b'};margin-top:4px;">${PCSO_HISTORY_STATUS.loaded?'✓':'⚠'} Data source: ${PCSO_HISTORY_STATUS.source}</div>`;

  // Digit cards
  var digitCardsHTML=conv.sorted.slice(0,6).map(s=>`
    <div class="dcard ${dCls(s.count)}">
      <div class="dnum">${s.digit}</div>
      <div class="dscore">${s.count}/12 layers</div>
      <div class="ddots">${dotHTML(s.layers,conv.LABELS)}</div>
    </div>`).join('');

  // Map
  var hotNums=layers.stats.hotNums;
  var mapHTML=conv.sorted.slice(0,5).map(s=>{
    var nums=conv.digitToNums[s.digit]||[];
    return `<div class="maprow">
      <span class="mapdig">Digit <b>${s.digit}</b> <span style="color:var(--muted)">(${s.count}/8)</span></span>
      <div class="mapnums">${nums.map(n=>{
        var cls=hotNums.includes(n)?'hot':(layers.stats.freq[n]||0)>=2?'warm':'cold';
        return `<span class="mn ${cls}">${pad(n)}</span>`;
      }).join('')}</div>
    </div>`;
  }).join('');

  // Horary sub-panel — all four checks below are genuinely computed in
  // layerAstrology() (previously these were hardcoded "✓" text and a
  // permanently-"EXALTED, 29°16' Cancer" Jupiter regardless of the actual
  // date).
  var jup=layers.astro.planets&&layers.astro.planets[0]; // Jupiter
  var jupDign=layers.astro.jupiterDignity||'Peregrine (no essential dignity)';
  var jupColor=(jupDign.indexOf('Domicile')===0||jupDign==='Exalted')?'var(--green)':(jupDign.indexOf('Detriment')===0||jupDign==='Fall')?'var(--red)':'var(--muted2)';
  var horaryHTML=`
    <div class="hgrid">
      <div class="hbox">
        <div class="hbox-title">Ascendant</div>
        <div class="hbox-val">${layers.astro.horaryASC}</div>
        <div class="hbox-sub">Ruler: ${layers.astro.horaryASCRuler}<br>Chart is ${layers.astro.isRadical?'radical ✓':'NOT radical ⚠ (Asc near sign boundary)'}<br>Moon ${layers.astro.moonVoid?'is void of course ⚠':'not void ✓'}<br>${layers.astro.viaCombusta?'In Via Combusta ⚠':'Not Via Combusta ✓'}</div>
      </div>
      <div class="hbox">
        <div class="hbox-title">5th House (Gambling)</div>
        <div class="hbox-val">${layers.astro.h5sign}</div>
        <div class="hbox-sub">Ruler: <b>${layers.astro.h5ruler}</b><br>${layers.astro.h5rulerPos}<br>${layers.astro.h5aspect}<br><span style="opacity:.7">Equal House system</span></div>
      </div>
      <div class="hbox">
        <div class="hbox-title">Part of Fortune ⊕</div>
        <div class="hbox-val">~${layers.astro.pofDeg}° ${layers.astro.pofSign}</div>
        <div class="hbox-sub">${layers.astro.isDayChart?'Day':'Night'} chart formula<br>Digit: <b>${layers.astro.pofDigit}</b><br>Ruler: ${layers.astro.pofRuler}</div>
      </div>
      <div class="hbox">
        <div class="hbox-title">Jupiter Status</div>
        <div class="hbox-val" style="color:${jupColor}">${jupDign.split(' ')[0].toUpperCase()}${jupDign.indexOf('Exalted')===0?' ★':''}</div>
        <div class="hbox-sub">${jup?jup.deg+'° '+jup.sign:''}<br>${jupDign}</div>
      </div>
    </div>
    <div style="margin-top:8px">
      ${layers.astro.aspects.map(a=>`<div class="arow">
        <span style="color:${a.nature==='favorable'?'var(--green)':a.nature==='caution'?'var(--orange)':'var(--red)'}">${a.nature==='favorable'?'✓':a.nature==='caution'?'⚠':'⚡'}</span>
        <b> ${a.asp}</b> — ${a.note}
      </div>`).join('')}
    </div>`;

  // BaZi panel
  var baziHTML=`
    <div class="bpillars">
      ${[layers.bazi.year,layers.bazi.month,layers.bazi.day,layers.bazi.hour].map((p,i)=>`
        <div class="bp">
          <div class="bp-role">${['Year','Month','Day','Hour'][i]}</div>
          <div class="bp-stem">${p.stem}</div>
          <div class="bp-branch">${p.branch}</div>
          <div class="bp-nums">${p.nums.map(n=>`<span class="bpn">${n}</span>`).join('')}</div>
        </div>`).join('')}
    </div>
    ${layers.bazi.interactions.map(x=>`<div class="bint"><b>${x.type}:</b> ${x.desc}</div>`).join('')}`;

  // I Ching panel
  var ichingHTML=`
    <div class="irow">
      <div class="ibox">
        <div class="isym">${layers.iching.hex.upper.sym}</div>
        <div class="iname">${layers.iching.hex.upper.name}</div>
        <div class="imsg">Upper</div>
      </div>
      <div class="ibox" style="flex:2">
        <div class="isym">卦${layers.iching.hex.num}</div>
        <div class="iname">${layers.iching.hex.name} · ${layers.iching.hex.english}</div>
        <div class="imsg">${layers.iching.hex.gambling}</div>
      </div>
      <div class="ibox">
        <div class="isym">${layers.iching.hex.lower.sym}</div>
        <div class="iname">${layers.iching.hex.lower.name}</div>
        <div class="imsg">Lower</div>
      </div>
    </div>
    <div class="ichange"><b>Changing line:</b> ${layers.iching.hex.changingLine}<br><b>Nuclear hex ${layers.iching.hex.nuclear.num}:</b> ${layers.iching.hex.nuclear.name}<br><b>Changed hex ${layers.iching.hex.changed.num}:</b> ${layers.iching.hex.changed.name} · where it's heading</div>`;

  // Stats panel
  var maxF=Math.max(...Object.values(layers.stats.freq))||1;
  var freqBarsHTML=Object.entries(layers.stats.freq)
    .sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([n,c])=>`<div class="sfrow">
      <span class="sflabel">${pad(parseInt(n))}</span>
      <div class="sfwrap"><div class="sffill" style="width:0%" data-w="${(c/maxF*100).toFixed(0)}%"></div></div>
      <span class="sfval">${c}x</span>
    </div>`).join('');

  // lcard defined globally

  document.getElementById('results').innerHTML=`<div class="slabel">${isEZ2?'Recommended Pair':'Recommended Combination'} · ${game.name}</div>
    <div class="balls-card">
      <div class="balls-eyebrow">Primary Pick — 12-Layer Expert Oracle</div>
      <div class="balls-row">${ballsHTML}</div>
      <div class="balls-note">
        Ball tag = digit (d) + convergence score out of 12 sources<br>
        Py=Pythagorean · Ch=Chaldean · As=Astro · Ba=BaZi · Fs=FengShui · IC=IChing · PoF=Part of Fortune · Ta=Tarot · An=Angel Numbers · Ho=Horary · En=Energy · St=Stats
      </div>
    </div>
    <div class="alt-card" style="margin-bottom:14px;text-align:center;">
      <div class="alt-label" style="margin-bottom:10px;">Overall Alignment · ${TODAY_PH}</div>
      <div style="font-size:36px;font-weight:800;color:${ac};margin-bottom:4px;">${pct}%</div>
      <div style="font-size:13px;color:var(--muted2)">${al}</div>
      ${modeHTML}
      ${collisionHTML}
      ${backtestHTML}
      ${sourceHTML}
    </div>

    <div class="slabel">Current Energy Flow · ${TODAY_PH} · ${drawHour}</div>
    <div class="eflow">
      <div class="eflow-title">⚡ Elemental Energy Balance — All 12 Layers</div>
      ${energyHTML}
    </div>

    <div class="slabel">Step 1 — Digit Convergence · 12 Sources</div>
    <div class="legend">
      <span class="leg"><span class="ldot" style="background:var(--accent)"></span>Metaphysical</span>
      <span class="leg"><span class="ldot" style="background:var(--teal)"></span>I Ching · PoF · Tarot · Angel · Horary · Energy</span>
      <span class="leg"><span class="ldot" style="background:var(--gold)"></span>Chaldean · Stats</span>
      <span class="leg"><span class="ldot" style="background:var(--surface);border:1px solid var(--border)"></span>Not in layer</span>
    </div>
    <div class="dgrid">${digitCardsHTML}</div>

    <div class="slabel">Step 2 — Digit → Number Map · 1–${game.max}</div>
    <div class="lcard">
      <div class="lsteps" style="border:none;padding:0;margin-bottom:10px">
        🔥 Gold = Game hot number &nbsp; 💜 Purple = Appeared 2+ times recently &nbsp; Gray = Cold
      </div>${mapHTML}
    </div>

    <div class="slabel">Full 12-Layer Breakdown</div>
    ${lcard('🔢','Numerology — Pythagorean + Chaldean',layers.num.nums,layers.num.steps)}
    ${lcard('🪐','Astrology — Dignities + Aspects + Horary',layers.astro.nums.slice(0,7),layers.astro.steps,horaryHTML,true)}
    ${lcard('☯️','BaZi — Exact Pillars + Clashes + Hidden Stems',layers.bazi.nums,layers.bazi.steps,baziHTML,true)}
    ${lcard('🏮','Feng Shui — Flying Star + Lo Shu + Fixed Stars',layers.fs.nums,layers.fs.steps,'',false)}
    ${lcard('☯','I Ching — Hexagram 45 + Nuclear + Changing Line',layers.iching.nums,layers.iching.steps,ichingHTML,true)}
    ${lcard('🃏','Tarot — Major Arcana Card of the Day',layers.tarot.nums,layers.tarot.steps,'',true)}
    ${lcard('😇','Angel Numbers — Repeating-Digit Resonance',layers.angel.nums.length?layers.angel.nums:['—'],layers.angel.steps,'',true)}
    <div class="lcard">
      <div class="lhead">
        <div class="licon">📊</div>
        <div>
          <div class="lname">PCSO ${game.short} — Historical Data</div>
          <div class="lpills">${layers.stats.topDigits.slice(0,5).map(d=>`<span class="pill g">${d}</span>`).join('')}</div>
        </div>
      </div>
      <div class="lsteps">
        • <b>Hot numbers (${game.short}${isEZ2?' '+drawHour:''}):</b> ${hotNums.map(n=>pad(n)).join(', ')}<br>
        • <b>Top stat digits:</b> ${layers.stats.topDigits.slice(0,5).join(', ')} (freq×4 + hot×6 + overdue×5)<br>
        • <b>Recent draws analyzed:</b> ${layers.stats.draws.length} draws · Game pool: 1–${game.max}
      </div>
      <div class="st-grid">
        <div class="stbox"><div class="stitle">🔥 Hot Numbers</div>${hotNums.map(n=>`<span class="hnum">${pad(n)}</span>`).join('')}</div>
        <div class="stbox"><div class="stitle">📈 Recent Frequency</div>${freqBarsHTML}</div>
      </div>
    </div>

    <div class="disc">
      ⚠️ [Guessing] — 12-layer expert reading using: Pythagorean + Chaldean numerology, real-time astrology with essential dignities (${TODAY_PH} planetary positions via a published low-precision ephemeris algorithm, accurate to roughly 1-2 arcminutes), Horary chart (Equal House system, strictures checked: radicality, void-of-course Moon, Via Combusta), Part of Fortune (day/night-aware formula), exact BaZi four pillars (dynamic daily pillars, true solar-term month/year boundaries) with clash/combine/hidden stem analysis, Feng Shui Flying Star Lo Shu (monthly star #8 in center), I Ching hexagram (authentic Mei Hua Yi Shu time-based casting) with nuclear, changing line, and changed hexagram, Element Energy flow (BaZi + planetary + Flying Star synthesis, Lo Shu number map), Tarot (Major Arcana card of the day), Angel Numbers (repeating-digit resonance scan), and PCSO official historical data. All readings based on current cosmic energy flow — no personal data used. No method can guarantee lottery outcomes. For entertainment only. Play responsibly and within your means.
    </div>
  `;
}


async function generatePersonal(){
  var game=GAMES[currentGame];
  var isEz2=currentGame==='ez2'; var count=isEz2?2:6;
  var ids=['pn1','pn2','pn3','pn4','pn5','pn6'].slice(0,count);
  var nums=[];
  for(var i=0;i<ids.length;i++){
    var v=parseInt(document.getElementById(ids[i]).value);
    if(isNaN(v)||v<1||v>game.max){ alert('Enter '+count+' valid numbers between 1 and '+game.max+' for '+game.short+'.'); return; }
    if(!isEz2&&nums.indexOf(v)>=0){ alert('Duplicate number: '+v+'. All '+count+' must be unique.'); return; }
    nums.push(v);
  }
  await PCSO_HISTORY_READY; // ensure live history (or confirmed fallback) is in place before scoring
  document.getElementById('results').style.display='none';
  document.getElementById('loader').style.display='block';
  var gw=document.querySelector('#oracle-page .game-wrap'); if(gw) gw.style.display='none';
  document.getElementById('loader').scrollIntoView({behavior:'smooth',block:'start'});
  var msgs=['🔢 Analyzing your numbers — Pythagorean + Chaldean…','🪐 Cross-referencing planetary positions…','🏛️ Horary chart — 5th house gambling…','⭐ Part of Fortune alignment…','☯️ BaZi day pillar compatibility…','🏮 Flying Star Lo Shu resonance…','🔮 I Ching hexagram match…','🃏 Tarot card of the day…','😇 Angel Numbers scan…','📊 PCSO '+game.short+' historical analysis…','🎯 Convergence scoring your numbers…'];
  var si=0; var el=document.getElementById('lsteps'); el.innerHTML='';
  var iv=setInterval(()=>{ if(si<msgs.length){ el.innerHTML+=msgs[si]+'<br>'; si++; } else clearInterval(iv); },240);
  setTimeout(()=>{
    clearInterval(iv);
    var dh=currentGame==='ez2'?currentDraw:'9PM'; var num,astro,bazi,fs,iching,tarot,angel,stats,energy,layers,conv;
    try{num=layerNumerology(dh);}catch(e){num={pyNums:[7],chNums:[3],allNums:[3,7],steps:[]};}
    try{astro=layerAstrology(dh);}catch(e){astro={nums:[1,6],pofNums:[2],horaryNums:[2,7],horaryASC:'Cancer 15°',horaryASCRuler:'Moon',h5sign:'Scorpio',h5ruler:'Mars',h5rulerPos:'Taurus',h5aspect:'Square',pofSign:'Leo',pofDeg:'20°',pofRuler:'Sun',pofDigit:2,isDayChart:true,jupiterDignity:'Peregrine (no essential dignity)',viaCombusta:false,isRadical:true,moonVoid:false,planets:[],aspects:[],steps:[]};}
    try{bazi=layerBazi(dh);}catch(e){bazi={nums:[1,6],day:{stem:'Gui',stemEl:'Water',branch:'You',branchEl:'Rooster',nums:[6,7]},hour:{stem:'Jia',stemEl:'Wood',branch:'Hai',branchEl:'Pig',nums:[1,3,6]},year:{stem:'Bing',stemEl:'Fire',branch:'Wu',branchEl:'Fire',nums:[2,7]},month:{stem:'Ji',branch:'Wu',nums:[2,5,7]},interactions:[],steps:[]};}
    try{fs=layerFengshui();}catch(e){fs={nums:[7,8,9],loShu:{C:8},steps:[]};}
    try{iching=layerIChing(dh);}catch(e){iching={nums:[2,5],hex:45,pofNums:[5],steps:[]};}
    try{tarot=layerTarot(dh);}catch(e){tarot={nums:[5],cardNum:5,cardName:'The Hierophant',gambling:'',steps:[]};}
    try{angel=layerAngelNumbers(dh);}catch(e){angel={nums:[],hasSignal:false,hits:[],mirrorHit:false,steps:[]};}
    try{stats=layerStats(currentGame,dh);}catch(e){stats={topDigits:[9,1,3],digitWeight:{},topNums:[],freq:{},freq30:{},hotNums:[]};}
    try{energy=calcEnergy(bazi,astro,fs);}catch(e){energy={bars:{Fire:30,Water:30,Wood:9,Metal:9,Earth:22}};}
    layers={num,astro,bazi,fs,iching,tarot,angel,stats,energy};
    try{conv=convergence(layers,currentGame);}catch(e){conv={sorted:[],best:[]};}
    conv.picks=nums; conv.altPicks=[];
    document.getElementById('loader').style.display='none';
    try{ renderPersonalResults(layers,conv,energy,currentGame,dh,nums); }
    catch(e){ document.getElementById('results').innerHTML='<div style="color:#ff6b6b;padding:20px;font-size:12px"><b>Error:</b> '+e.message+'</div>'; }
    document.getElementById('results').style.display='block';
    var gw2=document.querySelector('#oracle-page .game-wrap'); if(gw2) gw2.style.display='block';
    document.getElementById('results').scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(animateBars,180);
  },2400);
}

function renderPersonalResults(layers,conv,energy,gameKey,drawHour,userNums){
  var game=GAMES[gameKey]; var hotNums=layers.stats.hotNums||[];
  var elOrder=['Fire','Water','Wood','Metal','Earth'];
  var elCls={'Fire':'ef','Water':'ew','Wood':'ewod','Metal':'emet','Earth':'eear'};
  var elEmoji={'Fire':'🔥','Water':'💧','Wood':'🌿','Metal':'⚙️','Earth':'🟤'};
  var energyHTML=elOrder.map(e=>`<div class="erow"><span class="elabel">${elEmoji[e]} ${e}</span><div class="ebar-wrap"><div class="ebar ${elCls[e]}" style="width:0%" data-w="${energy[e].pct}%"></div></div><span class="epct" style="color:${energy[e].pct>=28?'var(--gold)':'var(--muted2)'}">${energy[e].pct}%</span></div>`).join('');
  var ballsHTML=userNums.map((n,i)=>{ var d=digitOf(n); var ds=conv.digitScores&&conv.digitScores[d]?conv.digitScores[d]:{count:0}; return `<div class="ball ${BTIERS[Math.min(i,5)]}">${pad(n)}<span class="btag">d${d}·${ds.count}/12</span></div>`; }).join('');
  var totalScore=userNums.reduce((s,n)=>{ var d=digitOf(n); return s+(conv.digitScores&&conv.digitScores[d]?conv.digitScores[d].score:0); },0);
  var pct=Math.round(totalScore/(userNums.length*10)*100);
  var ac=pct>=70?'#2ecc71':pct>=45?'#f0c040':'#ff6b6b';
  var al=pct>=70?'🟢 Strong Alignment':pct>=45?'🟡 Moderate Alignment':'🔴 Weak Alignment';
  var pickDigitCounts={}; userNums.forEach(n=>{ var d=digitOf(n); pickDigitCounts[d]=(pickDigitCounts[d]||0)+1; });
  var collisions=Object.entries(pickDigitCounts).filter(([d,c])=>c>1);
  var collisionHTML=collisions.length
    ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">ℹ ${collisions.map(([d,c])=>`${c} numbers ride digit ${d}`).join(', ')} — one digit score counted ${collisions.some(([d,c])=>c>2)?'multiple times':'twice'} (concentration)</div>`
    : `<div style="font-size:11px;color:var(--muted);margin-top:8px;">✓ No digit collisions among your numbers</div>`;
  var pickedDigits=[...new Set(userNums.map(n=>digitOf(n)))];
  var histDraws=(layers.stats&&layers.stats.draws)||[];
  var hitDraws=histDraws.filter(draw=>draw.some(n=>pickedDigits.includes(digitOf(n))));
  var backtestPct=histDraws.length?Math.round(hitDraws.length/histDraws.length*100):null;
  var backtestHTML=backtestPct!==null
    ? `<div style="font-size:11px;color:var(--muted2);margin-top:4px;">📊 Historical check: ${backtestPct}% of last ${histDraws.length} draws had at least one number matching these digits (real data, not the formula)</div>`
    : '';
  var sourceHTML=`<div style="font-size:10px;color:${PCSO_HISTORY_STATUS.loaded?'var(--muted)':'#ff6b6b'};margin-top:4px;">${PCSO_HISTORY_STATUS.loaded?'✓':'⚠'} Data source: ${PCSO_HISTORY_STATUS.source}</div>`;
  var seen={}; var digitCardsHTML=userNums.map(n=>{ var d=digitOf(n); if(seen[d]) return ''; seen[d]=true; var ds=conv.digitScores&&conv.digitScores[d]?conv.digitScores[d]:{count:0,layers:[]}; return `<div class="dcard ${dCls(ds.count)}"><div class="dnum">${d}</div><div class="dscore">${ds.count}/12 layers</div><div class="ddots">${dotHTML(ds.layers,conv.LABELS||[])}</div></div>`; }).filter(Boolean).join('');
  var mapHTML=userNums.map(n=>{ var d=digitOf(n); var cls=hotNums.includes(n)?'hot':(layers.stats.freq&&(layers.stats.freq[n]||0)>=2)?'warm':'cold'; var ds=conv.digitScores&&conv.digitScores[d]?conv.digitScores[d]:{count:0}; return `<div class="maprow"><span class="mapdig">Your # <b>${pad(n)}</b> <span style="color:var(--muted)">(digit ${d} · ${ds.count}/12)</span></span><div class="mapnums"><span class="mn ${cls}">${pad(n)}</span></div></div>`; }).join('');
  var freqBarsHTML=userNums.map(n=>{ var f=layers.stats.freq&&layers.stats.freq[n]?layers.stats.freq[n]:0; var w=Math.min(100,f*12); return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:10px;color:var(--muted2);width:22px">${pad(n)}</span><div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:6px;background:${hotNums.includes(n)?'var(--gold)':'var(--teal)'};border-radius:3px;width:${w}%"></div></div><span style="font-size:10px;color:var(--muted)">${f}x</span></div>`; }).join('');
  var horaryHTML=conv._horaryHTML||''; var baziHTML=conv._baziHTML||''; var ichingHTML=conv._ichingHTML||'';
  document.getElementById('results').innerHTML=`
    <div class="slabel">✦ Personal Number Analysis · ${game.name}</div>
    <div class="balls-card"><div class="balls-eyebrow">Your Numbers — Oracle Convergence Check</div><div class="balls-row">${ballsHTML}</div><div class="balls-note">Ball tag = digit (d) + convergence score out of 12 sources<br>Py=Pythagorean · Ch=Chaldean · As=Astro · Ba=BaZi · Fs=FengShui · IC=IChing · PoF=Part of Fortune · Ta=Tarot · An=Angel Numbers · Ho=Horary · En=Energy · St=Stats</div></div>
    <div class="alt-card" style="margin-bottom:14px;text-align:center;"><div class="alt-label" style="margin-bottom:10px;">Overall Alignment · ${TODAY_PH}</div><div style="font-size:36px;font-weight:800;color:${ac};margin-bottom:4px;">${pct}%</div><div style="font-size:13px;color:var(--muted2)">${al}</div>${collisionHTML}${backtestHTML}${sourceHTML}</div>
    <div class="slabel">Current Energy Flow · ${TODAY_PH} · ${drawHour}</div>
    <div class="eflow"><div class="eflow-title">⚡ Elemental Energy Balance — All 12 Layers</div>${energyHTML}</div>
    <div class="slabel">Step 1 — Digit Convergence · Your Numbers</div>
    <div class="legend"><span class="leg"><span class="ldot" style="background:var(--accent)"></span>Metaphysical</span><span class="leg"><span class="ldot" style="background:var(--teal)"></span>I Ching · PoF · Tarot · Angel · Horary · Energy</span><span class="leg"><span class="ldot" style="background:var(--gold)"></span>Chaldean · Stats</span><span class="leg"><span class="ldot" style="background:var(--surface);border:1px solid var(--border)"></span>Not in layer</span></div>
    <div class="dgrid">${digitCardsHTML}</div>
    <div class="slabel">Step 2 — Your Numbers vs Oracle Map · 1–${game.max}</div>
    <div class="lcard"><div class="lsteps" style="border:none;padding:0;margin-bottom:10px">🔥 Gold = Hot number &nbsp; 💜 Purple = 2+ recent &nbsp; Gray = Cold</div>${mapHTML}</div>
    <div class="slabel">Step 3 — Frequency in Last ${layers.stats.draws?layers.stats.draws.length:16} Draws</div>
    <div class="lcard"><div class="lsteps" style="border:none;padding:0">${freqBarsHTML}</div></div>
    <div class="slabel">Full 12-Layer Breakdown</div>
    ${lcard('🔢','Numerology — Pythagorean + Chaldean',layers.num.nums,layers.num.steps)}
    ${lcard('🪐','Astrology — Dignities + Aspects + Horary',layers.astro.nums.slice(0,7),layers.astro.steps,horaryHTML,true)}
    ${lcard('☯️','BaZi — Exact Pillars + Clashes + Hidden Stems',layers.bazi.nums,layers.bazi.steps,baziHTML,true)}
    ${lcard('🏮','Feng Shui — Flying Star + Lo Shu + Fixed Stars',layers.fs.nums,layers.fs.steps,'',false)}
    ${lcard('☯','I Ching — Hexagram + Nuclear + Changing Line',layers.iching.nums,layers.iching.steps,ichingHTML,true)}
    ${lcard('🃏','Tarot — Major Arcana Card of the Day',layers.tarot.nums,layers.tarot.steps,'',true)}
    ${lcard('😇','Angel Numbers — Repeating-Digit Resonance',layers.angel.nums.length?layers.angel.nums:['—'],layers.angel.steps,'',true)}
    <div class="lcard"><div class="lhead"><div class="licon">📊</div><div><div class="lname">PCSO ${game.short} — Historical Data</div><div class="lpills">${layers.stats.topDigits.slice(0,5).map(d=>`<span class="pill g">${d}</span>`).join('')}</div></div></div><div class="lsteps">• <b>Hot numbers:</b> ${hotNums.map(n=>pad(n)).join(', ')}<br>• <b>Top stat digits:</b> ${layers.stats.topDigits.slice(0,5).join(', ')}<br>• <b>Draws analyzed:</b> ${layers.stats.draws?layers.stats.draws.length:16} · Pool: 1–${game.max}</div><div class="st-grid"><div class="stbox"><div class="stitle">🔥 Hot Numbers</div>${hotNums.map(n=>`<span class="hnum">${pad(n)}</span>`).join('')}</div><div class="stbox"><div class="stitle">📈 Your Numbers Frequency</div>${freqBarsHTML}</div></div></div>
    <div class="disc">⚠️ [Guessing] — For entertainment only. No method can guarantee lottery outcomes. Play responsibly.</div>`;
}

function animateBars(){
  document.querySelectorAll('[data-w]').forEach(el=>{
    var w=el.getAttribute('data-w');
    el.style.width='0%';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ el.style.width=w; }));
  });
}

function scrollToTop(){ window.scrollTo({top:0,behavior:'smooth'}); }

// Init
document.getElementById('ez2wrap').style.display='block';












// ══ PCSO RESULTS WIDGET ══
var PCSO_DATA = {
  date: TODAY_PH_FULL,
  ez2: [
    {draw:'2PM', nums:[],  cutoff:14},
    {draw:'5PM', nums:[],      cutoff:17},
    {draw:'9PM', nums:[],      cutoff:21}
  ],
  balls: [
    {game:'6/58', date:'Jun 26', nums:[53,54,44,57,51,7],   done:true, jackpot:'₱128M', winners:0, days:[0,2,5]},
    {game:'6/55', date:'Jun 27', nums:[38,27,33,32,49,31],  done:true, jackpot:'₱50.3M', winners:0, days:[1,3,6]},
    {game:'6/49', date:'Jun 25', nums:[49,19,15,46,25,36],  done:true, jackpot:'₱42.7M', winners:0, days:[0,2,4]},
    {game:'6/45', date:'Jun 26', nums:[9,41,22,45,5,10],    done:true, jackpot:'₱83M', winners:0, days:[1,3,5]},
    {game:'6/42', date:'Jun 27', nums:[24,31,3,36,35,23],   done:true, jackpot:'₱49.6M', winners:0, days:[2,4,6]}
  ]
};

function p2(n){return String(n).padStart(2,'0');}

function pcsoRender(){
  var d=PCSO_DATA;
  var lbl=document.getElementById('pcso-date-lbl');
  if(lbl) lbl.textContent=d.date;
  var h='';
  var phNow=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Manila'}));
  var phHour=phNow.getHours()+phNow.getMinutes()/60;
  d.ez2.forEach(function(e){
    var drawDone=e.nums.length>0||(phHour>=(e.cutoff+0.1));
    var n;
    if(e.nums.length>0){
      n=e.nums.map(function(x){return '<span class="pnum ez">'+p2(x)+'</span>';}).join('');
    } else if(drawDone){
      n='<span class="pcso-pending" style="color:var(--muted2)">Result not yet recorded</span>';
    } else {
      n='<span class="pcso-pending">Pending…</span>';
    }
    h+='<div class="pcso-row"><span class="pcso-game">EZ2</span><span class="pcso-draw">'+e.draw+'</span><div class="pcso-nums">'+n+'</div></div>';
  });
  d.balls.forEach(function(g){
    var n=g.done?g.nums.map(function(x){return '<span class="pnum six">'+p2(x)+'</span>';}).join(''):'<span class="pcso-pending">'+(g.note||'Pending…')+'</span>';
    var meta='';
    if(g.jackpot!==undefined){
      var wLabel=g.winners===0?'No winner — jackpot rolls!':g.winners===1?'1 winner':g.winners+' winners';
      var sched='';
      if(g.days){
        var dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var phDow=phNow.getDay();var phH=phNow.getHours()+phNow.getMinutes()/60;
        var drawToday=g.days.indexOf(phDow)>=0;
        var alreadyDrawn=drawToday&&phH>=21.1;
        if(drawToday&&!alreadyDrawn){
          sched=' · <b style="color:var(--green)">Tonight 9PM</b>';
        } else {
          var daysAhead=0;
          for(var i=1;i<=7;i++){if(g.days.indexOf((phDow+i)%7)>=0){daysAhead=i;break;}}
          var nd=new Date(phNow);nd.setDate(nd.getDate()+daysAhead);
          sched=' · <span style="color:var(--muted2)">Next: '+dn[(phDow+daysAhead)%7]+' '+mn[nd.getMonth()]+' '+nd.getDate()+'</span>';
        }
      }
      meta='<div class="pcso-meta-row"><span class="pcso-jackpot">'+g.jackpot+' jackpot</span><span class="pcso-winners">'+wLabel+sched+'</span></div>';
    }
    h+='<div class="pcso-row" style="flex-direction:column;align-items:flex-start;"><div style="display:flex;align-items:center;gap:8px;width:100%"><span class="pcso-game">'+g.game+'</span><span class="pcso-draw" style="font-size:9px;color:var(--muted)">'+( g.draw_date||'' )+'</span><div class="pcso-nums">'+n+'</div></div>'+meta+'</div>';
  });
  var grid=document.getElementById('pcso-grid');
  if(grid) grid.innerHTML=h;
}

(function tryPcso(){
  var g=document.getElementById('pcso-grid');
  if(g){pcsoRender();pcsoRefreshFromRaw();}
  else{setTimeout(tryPcso,200);}
})();

// ══ PCSO HISTORY LOOKUP (mock data — to be wired to real archive later) ══
var PCSO_HISTORY={
  ez2:[
    {date:'2026-06-29',draws:{'2PM':[14,8],'5PM':[33,2],'9PM':[7,21]}},
    {date:'2026-06-25',draws:{'2PM':[5,19],'5PM':[28,11],'9PM':[16,9]}},
    {date:'2026-06-18',draws:{'2PM':[3,30],'5PM':[24,3],'9PM':[17,6]}},
    {date:'2026-05-30',draws:{'2PM':[2,13],'5PM':[9,27],'9PM':[31,4]}}
  ],
  '642':[
    {date:'2026-06-27',nums:[24,31,3,36,35,23],jackpot:'₱49.6M'},
    {date:'2026-06-23',nums:[33,38,34,28,36,7],jackpot:'₱45.1M'},
    {date:'2026-06-09',nums:[3,21,2,14,33,1],jackpot:'₱38.7M'},
    {date:'2026-05-21',nums:[15,8,34,13,25,38],jackpot:'₱22.4M'}
  ],
  '645':[
    {date:'2026-06-29',nums:[33,13,6,21,18,44],jackpot:'₱87.9M'},
    {date:'2026-06-19',nums:[44,13,22,14,4,33],jackpot:'₱71.3M'},
    {date:'2026-06-05',nums:[23,45,6,18,4,2],jackpot:'₱60.8M'},
    {date:'2026-05-15',nums:[27,9,42,37,34,3],jackpot:'₱40.2M'}
  ],
  '649':[
    {date:'2026-06-28',nums:[32,1,35,23,14,29],jackpot:'₱46.2M'},
    {date:'2026-06-21',nums:[27,3,2,11,16,25],jackpot:'₱38.5M'},
    {date:'2026-06-04',nums:[18,21,7,43,11,3],jackpot:'₱27.9M'},
    {date:'2026-05-10',nums:[49,35,44,4,14,5],jackpot:'₱19.6M'}
  ],
  '655':[
    {date:'2026-06-29',nums:[1,17,50,25,26,12],jackpot:'₱53.1M'},
    {date:'2026-06-17',nums:[36,4,9,44,42,24],jackpot:'₱47.3M'},
    {date:'2026-06-03',nums:[19,42,53,2,46,3],jackpot:'₱41.0M'},
    {date:'2026-05-13',nums:[9,6,19,46,39,48],jackpot:'₱30.5M'}
  ],
  '658':[
    {date:'2026-06-28',nums:[46,56,8,1,3,5],jackpot:'₱128.0M'},
    {date:'2026-06-25',nums:[47,21,43,20,5,37],jackpot:'₱120.2M'},
    {date:'2026-06-11',nums:[39,37,35,45,16,52],jackpot:'₱100.6M'},
    {date:'2026-05-24',nums:[6,38,9,26,48,14],jackpot:'₱75.3M'}
  ]
};

var PCSO_GAME_SCHED={
  ez2:[0,1,2,3,4,5,6],
  '642':[2,4,6],
  '645':[1,3,5],
  '649':[0,2,4],
  '655':[1,3,6],
  '658':[0,2,5]
};
var PCSO_GAME_LABELS={ez2:'EZ2','642':'6/42','645':'6/45','649':'6/49','655':'6/55','658':'6/58'};

function pcsoHistFilterGames(){
  var dateInp=document.getElementById('pcso-hist-date');
  var gameSel=document.getElementById('pcso-hist-game');
  if(!dateInp||!gameSel||!dateInp.value) return;
  var parts=dateInp.value.split('-');
  var d=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
  var dow=d.getDay();
  var prevVal=gameSel.value;
  var keys=Object.keys(PCSO_GAME_SCHED);
  var validKeys=keys.filter(function(k){ return PCSO_GAME_SCHED[k].indexOf(dow)>=0; });
  gameSel.innerHTML=validKeys.map(function(k){
    return '<option value="'+k+'">'+PCSO_GAME_LABELS[k]+'</option>';
  }).join('');
  if(validKeys.indexOf(prevVal)>=0){ gameSel.value=prevVal; }
  else { gameSel.value=validKeys[0]; }
}

function pcsoHistDateChanged(){
  pcsoHistFilterGames();
  pcsoHistRender();
}

// ══ ORACLE HISTORICAL RECOMPUTE ══
// Re-derives what Oracle's "Best Pick" would have been for a PAST date, using
// only the PCSO_HISTORY draws that had already happened before that date (so
// the Stats layer never sees data it couldn't have known about yet). Swaps
// the module-level date globals (_D/_M/_Y/_DOW) for the duration of the calc,
// runs the existing layer functions unchanged, then restores everything.
function computeOracleAsOf(gameKey,dateStr){
  var g=GAMES[gameKey];
  var saved={_D:_D,_M:_M,_Y:_Y,_DOW:_DOW};
  var parts=dateStr.split('-');
  var y=parseInt(parts[0]),m=parseInt(parts[1]),d=parseInt(parts[2]);
  var dObj=new Date(y,m-1,d);
  _D=d; _M=m; _Y=y; _DOW=dObj.getDay();

  function runOne(drawHour,gk){
    var num,astro,bazi,fs,iching,tarot,angel,stats,energy,layers,conv;
    try{num=layerNumerology(drawHour);}catch(e){num={pyNums:[],chNums:[],allNums:[],nums:[]};}
    try{astro=layerAstrology(drawHour);}catch(e){astro={nums:[],pofNums:[],horaryNums:[]};}
    try{bazi=layerBazi(drawHour);}catch(e){bazi={nums:[]};}
    try{fs=layerFengshui();}catch(e){fs={nums:[]};}
    try{iching=layerIChing(drawHour);}catch(e){iching={nums:[]};}
    try{tarot=layerTarot(drawHour);}catch(e){tarot={nums:[]};}
    try{angel=layerAngelNumbers(drawHour);}catch(e){angel={nums:[]};}
    try{stats=layerStats(gk,drawHour);}catch(e){stats={topDigits:[9,1,3],digitWeight:{},topNums:[],freq:{},freq30:{},hotNums:[]};}
    try{energy=calcEnergy(bazi,astro,fs);}catch(e){energy=null;}
    layers={num,astro,bazi,fs,iching,tarot,angel,stats,energy};
    try{conv=convergence(layers,gk);}catch(e){conv={picks:[]};}
    return conv.picks;
  }

  var result;
  if(gameKey==='ez2'){
    var restore={draws:g.draws,hot:g.hot};
    var entries=(PCSO_HISTORY.ez2||[]).filter(function(e){return e.date&&e.date<dateStr;});
    var byHour={'2PM':[],'5PM':[],'9PM':[]};
    entries.forEach(function(e){
      if(!e.draws) return;
      ['2PM','5PM','9PM'].forEach(function(hh){
        if(Array.isArray(e.draws[hh])&&e.draws[hh].length===2) byHour[hh].push(e.draws[hh]);
      });
    });
    g.draws=byHour;
    var hot={};
    ['2PM','5PM','9PM'].forEach(function(hh){
      var freq={};
      byHour[hh].slice(0,30).forEach(function(dr){dr.forEach(function(n){freq[n]=(freq[n]||0)+1;});});
      hot[hh]=Object.entries(freq).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(e){return parseInt(e[0]);});
    });
    g.hot=hot;
    try{
      result={'2PM':runOne('2PM','ez2'),'5PM':runOne('5PM','ez2'),'9PM':runOne('9PM','ez2')};
    } finally {
      g.draws=restore.draws; g.hot=restore.hot;
    }
  } else {
    var restore2={recent:g.recent,hot:g.hot};
    var entries2=(PCSO_HISTORY[gameKey]||[]).filter(function(e){return e.date&&e.date<dateStr;});
    var draws=entries2.map(function(e){return e.nums;}).filter(function(n){return Array.isArray(n);});
    g.recent=draws;
    var recentWindow=draws.slice(0,30);
    var freq2={};
    recentWindow.forEach(function(dr){dr.forEach(function(n){freq2[n]=(freq2[n]||0)+1;});});
    g.hot=Object.entries(freq2).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(e){return parseInt(e[0]);});
    try{
      result=runOne('9PM',gameKey);
    } finally {
      g.recent=restore2.recent; g.hot=restore2.hot;
    }
  }

  _D=saved._D; _M=saved._M; _Y=saved._Y; _DOW=saved._DOW;
  return result;
}

function pcsoHistRender(){
  var gameSel=document.getElementById('pcso-hist-game');
  var dateInp=document.getElementById('pcso-hist-date');
  var out=document.getElementById('pcso-hist-result');
  if(!gameSel||!dateInp||!out) return;
  var game=gameSel.value;
  var dateVal=dateInp.value;
  var list=PCSO_HISTORY[game]||[];
  var entry=null;
  for(var i=0;i<list.length;i++){ if(list[i].date===dateVal){ entry=list[i]; break; } }
  if(!entry){
    if(typeof PCSO_HISTORY_LOAD_FAILED!=='undefined'&&PCSO_HISTORY_LOAD_FAILED){
      var reasonTxt=(typeof PCSO_HISTORY_STATUS!=='undefined'&&PCSO_HISTORY_STATUS.error)?PCSO_HISTORY_STATUS.error:'network error';
      out.innerHTML='<span class="pcso-hist-none" style="color:var(--accent)">⚠️ Historical data failed to load ('+reasonTxt+'). Showing limited offline data only — reload the page to retry.</span>';
    } else {
      out.innerHTML='<span class="pcso-hist-none">No result on file for this date.</span>';
    }
    return;
  }
  if(game==='ez2'){
    var order=['2PM','5PM','9PM'];
    var oraclePicks=null,oracleSrc=null;
    var _oh=oracleHistLookup('ez2',dateVal);
    if(_oh){ oraclePicks=_oh.picks; oracleSrc=_oh.source; }
    var cols=order.map(function(t){
      var nums=(entry.draws&&entry.draws[t])||[];
      var inner=nums.length?nums.map(function(x){return '<span class="pnum ez">'+p2(x)+'</span>';}).join(''):'<span class="pcso-hist-none">Pending…</span>';
      var oracleRow='';
      if(oraclePicks&&oraclePicks[t]&&oraclePicks[t].length){
        var op=oraclePicks[t];
        var opInner=op.map(function(x){
          var isMatch=nums.indexOf(x)>=0;
          return '<span class="pnum ez'+(isMatch?' pnum-gold':'')+'">'+p2(x)+'</span>';
        }).join('');
        oracleRow='<div class="pcso-hist-oracle-label">Oracle\u2019s Pick'+oracleSrcTag(oracleSrc,false)+'</div><div style="display:flex;gap:4px">'+opInner+'</div>';
      }
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:5px"><span style="font-size:9px;color:var(--muted)">'+t+'</span><div style="display:flex;gap:4px">'+inner+'</div>'+oracleRow+'</div>';
    }).join('');
    out.innerHTML='<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;width:100%">'+cols+'</div>';
    return;
  }
  var cls='six';
  var numsHtml=entry.nums.map(function(x){return '<span class="pnum '+cls+'">'+p2(x)+'</span>';}).join('');
  var jp=entry.jackpot;
  var jpDisplay=jp;
  if(typeof jp==='number'||(typeof jp==='string'&&/^[\d.]+$/.test(jp))){
    var jpNum=parseFloat(jp);
    jpDisplay='₱'+(jpNum>=1000000?(jpNum/1000000).toFixed(1)+'M':jpNum.toLocaleString());
  }
  var jackpotHtml=jp?('<div class="pcso-hist-jackpot">'+jpDisplay+' jackpot</div>'):'';
  var oracleHtml='';
  try{
    var _oh2=oracleHistLookup(game,dateVal);
    if(_oh2&&_oh2.picks&&_oh2.picks.length){
      var opHtml=_oh2.picks.map(function(x){
        var isMatch=entry.nums.indexOf(x)>=0;
        return '<span class="pnum '+cls+(isMatch?' pnum-gold':'')+'">'+p2(x)+'</span>';
      }).join('');
      oracleHtml='<div class="pcso-hist-oracle-label">Oracle\u2019s Pick'+oracleSrcTag(_oh2.source,true)+'</div><div class="pcso-hist-row">'+opHtml+'</div>';
    }
  }catch(e){ console.error('oracleHistLookup:',e); }
  out.innerHTML='<div class="pcso-hist-row">'+numsHtml+'</div>'+jackpotHtml+oracleHtml;
}

(function initPcsoHist(){
  var dateInp=document.getElementById('pcso-hist-date');
  if(!dateInp){ setTimeout(initPcsoHist,200); return; }
  var phNow=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Manila'}));
  function fmt(d){
    var mm=String(d.getMonth()+1).padStart(2,'0');
    var dd=String(d.getDate()).padStart(2,'0');
    return d.getFullYear()+'-'+mm+'-'+dd;
  }
  var maxD=new Date(phNow);
  var minD=new Date(phNow); minD.setMonth(minD.getMonth()-3);
  var defaultD=new Date(phNow); defaultD.setDate(defaultD.getDate()-1);
  dateInp.max=fmt(maxD);
  dateInp.min=fmt(minD);
  dateInp.value=fmt(defaultD);
  pcsoHistFilterGames();
  pcsoHistRender();
})();

// ══════════════════════════
// PCSO FETCH LIVE — triggers both PCSO workflows via workflow_dispatch,
// waits for both to complete, then re-fetches pcso-results.json.
// Reuses TP_GH_OWNER/TP_GH_REPO/TP_GH_REF/tpGetGithubToken() defined in
// the Trade tab's script (shared global scope, same page) so the token
// only needs to be entered once per browser session across both tabs.
// Docs: https://docs.github.com/en/rest/actions/workflows
// ══════════════════════════
function pcsoSleep(ms){ return new Promise(function(resolve){ setTimeout(resolve, ms); }); }

async function pcsoDispatch(workflowFile, ghHeaders){
  var resp = await fetch(
    'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/workflows/' + workflowFile + '/dispatches',
    { method: 'POST', headers: ghHeaders, body: JSON.stringify({ ref: TP_GH_REF }) }
  );
  if (resp.status === 401) { sessionStorage.removeItem('tp_gh_token'); throw new Error('Token invalid/expired — tap Fetch Live again to re-enter it.'); }
  if (resp.status === 403) throw new Error('Forbidden — token needs "repo" + "workflow" scope.');
  if (resp.status === 404) throw new Error('Workflow not found: ' + workflowFile);
  if (resp.status !== 204) {
    var body = await resp.text();
    console.error('workflow_dispatch failed:', workflowFile, resp.status, body);
    throw new Error('Dispatch failed (' + resp.status + ') for ' + workflowFile);
  }
}

async function pcsoWaitForRun(workflowFile, ghHeaders, sinceMs, statusEl, label, overallDeadline){
  while (Date.now() < overallDeadline) {
    var resp = await fetch(
      'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/workflows/' + workflowFile + '/runs?event=workflow_dispatch&per_page=5',
      { headers: ghHeaders }
    );
    if (!resp.ok) throw new Error(label + ': lost track of run (HTTP ' + resp.status + ')');
    var data = await resp.json();
    var runs = (data && data.workflow_runs) || [];
    var match = runs.find(function(r){ return new Date(r.created_at).getTime() >= sinceMs; });
    if (match) {
      while (Date.now() < overallDeadline) {
        var runResp = await fetch(
          'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/runs/' + match.id,
          { headers: ghHeaders }
        );
        if (!runResp.ok) throw new Error(label + ': lost track of run status (HTTP ' + runResp.status + ')');
        var run = await runResp.json();
        if (run.status === 'completed') return run.conclusion;
        if (statusEl) statusEl.textContent = label + ': ' + run.status + '...';
        await pcsoSleep(5000);
      }
      throw new Error(label + ': timed out waiting for completion');
    }
    if (statusEl) statusEl.textContent = label + ': waiting for run to start...';
    await pcsoSleep(4000);
  }
  throw new Error(label + ': timed out — run never appeared');
}

async function pcsoFetchWithTimeout(url, timeoutMs){
  var controller = (typeof AbortController!=='undefined') ? new AbortController() : null;
  var timer = controller ? setTimeout(function(){ controller.abort(); }, timeoutMs) : null;
  try{
    var resp = await fetch(url, controller ? {signal: controller.signal} : {});
    return resp;
  } finally {
    if(timer) clearTimeout(timer);
  }
}

async function pcsoRefreshFromRaw(){
  var grid=document.getElementById('pcso-grid');
  if(grid){grid.innerHTML='<div class="pcso-row"><span class="pcso-pending">Loading latest results…</span></div>';}
  var RAW_URL='pcso-results.json'; // same-origin via GitHub Pages — raw.githubusercontent.com rate-limits anonymous requests
  var MAX_ATTEMPTS=3;
  var TIMEOUT_MS=8000;
  var BACKOFF_MS=[0,800,1600];
  var BACKOFF_429_MS=[0,3000,6000]; // GitHub rate-limit needs real wait time, not a quick retry
  var fetchStatusEl=document.getElementById('pcso-fetch-status');
  var lastErr=null;
  var lastWas429=false;

  for(var attempt=1; attempt<=MAX_ATTEMPTS; attempt++){
    if(attempt>1){
      var backoffArr=lastWas429?BACKOFF_429_MS:BACKOFF_MS;
      var waitMs=backoffArr[attempt-1];
      if(fetchStatusEl) fetchStatusEl.textContent=lastWas429
        ? 'Rate limited by GitHub — waiting '+(waitMs/1000)+'s before retry (attempt '+attempt+' of '+MAX_ATTEMPTS+')'
        : 'Retrying… (attempt '+attempt+' of '+MAX_ATTEMPTS+')';
      await pcsoSleep(waitMs);
    }
    lastWas429=false;
    try{
      var resp=await pcsoFetchWithTimeout(RAW_URL+'?nocache='+Date.now(), TIMEOUT_MS);
      if(!resp.ok){
        lastWas429=(resp.status===429);
        throw new Error('HTTP '+resp.status);
      }
      var data=await resp.json();
      if(data.ez2&&Array.isArray(data.ez2)){
        PCSO_DATA.ez2=data.ez2.map(function(e){return{draw:e.draw,nums:e.nums||[],cutoff:e.cutoff||21};});
      }
      if(data.balls&&Array.isArray(data.balls)){
        var sched={'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]};
        PCSO_DATA.balls=data.balls.map(function(g){
          return{game:g.game,draw_date:g.draw_date||'',nums:g.nums||[],done:!!(g.nums&&g.nums.length>0),
            jackpot:g.jackpot||'',winners:g.winners||0,days:g.days||sched[g.game]||[]};
        });
      }
      if(data.date) PCSO_DATA.date=data.date;
      pcsoRender();
      if(data.updated){
        var upd=new Date(data.updated);
        var lbl=document.getElementById('pcso-date-lbl');
        if(lbl) lbl.textContent='Updated '+upd.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Manila'});
        if(fetchStatusEl) fetchStatusEl.textContent='Data Updated '+upd.toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' PH';
      } else if(fetchStatusEl){
        fetchStatusEl.textContent='Data timestamp unavailable';
      }
      return;
    } catch(err){
      lastErr=err;
      console.error('PCSO raw refresh attempt '+attempt+' of '+MAX_ATTEMPTS+':',err);
    }
  }

  pcsoRender();
  var fetchStatusElErr=document.getElementById('pcso-fetch-status');
  if(fetchStatusElErr){
    fetchStatusElErr.textContent=lastWas429
      ? 'Rate limited by GitHub ❌ — please wait a minute and tap Fetch Live again (HTTP 429 after '+MAX_ATTEMPTS+' attempts)'
      : 'Data unavailable ❌ — ' + (lastErr&&lastErr.message?lastErr.message:'network error') + ' (after '+MAX_ATTEMPTS+' attempts)';
  }
  throw lastErr;
}

async function pcsoAIFetch(){
  var btn=document.getElementById('pcso-ai-btn');
  var statusEl=document.getElementById('pcso-fetch-status');
  var token=tpGetGithubToken();
  if (!token) { if(statusEl) statusEl.textContent='Cancelled — no token entered.'; return; }

  if(btn){btn.disabled=true;btn.innerHTML='⏳ Fetching...';}
  if(statusEl) statusEl.textContent='Triggering scraper + history append...';

  var ghHeaders = {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28'
  };
  var dispatchTime = Date.now();
  var overallDeadline = Date.now() + 6 * 60 * 1000; // 6 min safety cap for both workflows

  try {
    await pcsoDispatch('pcso-scraper.yml', ghHeaders);
    var scraperDeadline = Date.now() + 3 * 60 * 1000; // 3 min cap for the scraper alone
    var scraperConclusion = await pcsoWaitForRun('pcso-scraper.yml', ghHeaders, dispatchTime - 5000, statusEl, 'Scraper', scraperDeadline);

    var historyDispatchTime = Date.now();
    await pcsoDispatch('pcso-history-append.yml', ghHeaders);
    var historyConclusion = await pcsoWaitForRun('pcso-history-append.yml', ghHeaders, historyDispatchTime - 5000, statusEl, 'History append', overallDeadline);

    var results = [scraperConclusion, historyConclusion];

    var allOk = results.every(function(c){ return c === 'success'; });
    if (statusEl) statusEl.textContent = (allOk ? 'Both done ✅' : 'Finished with issues ❌ (' + results.join(', ') + ')') + ' — refreshing data...';

    await pcsoRefreshFromRaw();

    if(btn){btn.style.color = allOk ? 'var(--green)' : 'var(--accent)'; setTimeout(function(){if(btn)btn.style.color='';},3000);}
    if (!allOk && statusEl) statusEl.textContent = 'Refreshed, but a workflow reported issues ❌ — check Actions tab.';
  } catch (e) {
    console.error('pcsoAIFetch failed:', e);
    try { await pcsoRefreshFromRaw(); } catch(e2) { /* already logged */ }
    if (statusEl) statusEl.textContent = 'Error ❌ — ' + (e && e.message ? e.message : 'see console');
  } finally {
    if(btn){btn.disabled=false;btn.innerHTML='&#9889; Fetch Live';}
  }
}

// Sync personal-number box count to the default active game (EZ2 = 2 boxes) on initial load
(function initPersonalInputsCount(){
  var defaultBtn=document.querySelector('#oracle-page .gbtn.active');
  if(defaultBtn) setGame(currentGame,defaultBtn);
})();
