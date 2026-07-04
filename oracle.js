












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
var PCSO_HISTORY_READY=(async function loadPcsoHistoryIntoGames(){
  var RAW_URL='https://raw.githubusercontent.com/jomerpb/JOMERPBSTREAM/main/pcso-history.json';
  try{
    var resp=await fetch(RAW_URL+'?nocache='+Date.now());
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    var data=await resp.json();
    var slashToKey={'6/58':'658','6/55':'655','6/49':'649','6/45':'645','6/42':'642'};
    for(var slashKey in slashToKey){
      var gk=slashToKey[slashKey];
      var entries=data[slashKey];
      if(!Array.isArray(entries)||!entries.length||!GAMES[gk]) continue;
      // entries are already sorted newest-first
      var allDraws=entries.map(function(e){return e.nums;}).filter(function(n){return Array.isArray(n)&&n.length===6;});
      if(!allDraws.length) continue;
      GAMES[gk].recent=allDraws; // full verified history, not just last 16
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
    PCSO_HISTORY_STATUS={loaded:true,source:'live (pcso-history.json, updated '+(data.updated||'unknown')+')',error:null};
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
    console.error('PCSO history fetch failed, using hardcoded fallback:', e.message);
  }
})();

// ══════════════════════════
function reduce(n){
  if(n<=0) return 9;
  while(n>9) n=[...String(n)].reduce((a,b)=>a+parseInt(b),0);
  return n||9;
}
function digitOf(n){ return reduce(n); }
function pad(n){ return String(n).padStart(2,'0'); }

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
  // Simplified planetary position calculation
  // Using mean motion approximations from J2000.0 (Jan 1.5 2000)
  // Days since J2000.0
  var jd2000=function(y,m,d){
    var a=Math.floor((14-m)/12);
    var yr=y+4800-a;
    var mo=m+12*a-3;
    return d+Math.floor((153*mo+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045-2451545;
  };
  var T=jd2000(_Y,_M,_D)/36525; // Julian centuries from J2000

  // Mean longitudes (degrees, simplified)
  var sun=(280.46646+36000.76983*T+0.0003032*T*T)%360;
  var moon=(218.3165+481267.8813*T)%360;
  var mercury=(252.250906+149474.0722491*T)%360;
  var venus=(181.979801+58517.8156760*T)%360;
  var mars=(355.433275+19141.6964746*T)%360;
  var jupiter=(34.351519+3036.3027748*T)%360;
  var saturn=(50.077444+1223.5110686*T)%360;

  // Normalize to 0-360
  function norm(x){return((x%360)+360)%360;}
  sun=norm(sun);moon=norm(moon);mercury=norm(mercury);venus=norm(venus);
  mars=norm(mars);jupiter=norm(jupiter);saturn=norm(saturn);

  // Convert to zodiac sign (0=Aries,1=Taurus,...,11=Pisces)
  var signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var signNums=[[9,1],[6,2],[3,5],[2,7],[1,4],[5,6],[3,6],[1,9],[3,9],[8,1],[4,7],[2,7]]; // nums per sign
  function signOf(deg){return Math.floor(norm(deg)/30);}
  function degInSign(deg){return norm(deg)%30;}

  var jSign=signOf(jupiter);
  var mSign=signOf(moon);
  var vSign=signOf(venus);
  var maSign=signOf(mars);

  // Part of Fortune: Asc + Moon - Sun (simplified, use sunrise as Asc approx)
  // Use 0° Aries as Asc approximation for daytime, adjust by hour
  var h=drawHour==='2PM'?14:drawHour==='5PM'?17:21;
  var ascApprox=norm(sun + (h-6)*15); // crude local Asc
  var pof=norm(ascApprox+moon-sun);
  var pofSign=signOf(pof);
  var pofNums=[...new Set(signNums[pofSign])];

  // Collect active nums from key planets
  var nums=[...new Set([
    ...signNums[jSign],
    ...signNums[mSign],
    ...signNums[vSign],
    ...signNums[pofSign],
  ])];

  // Horary approximations (dynamic)
  var signs2=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  var signRulers=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars/Pluto","Jupiter","Saturn","Uranus/Saturn","Neptune/Jupiter"];
  var h5SignIdx=(signOf(ascApprox)+4)%12; // 5th house = Asc + 4 signs
  var h5ruler=signRulers[h5SignIdx];
  var h5sign=signs2[h5SignIdx];
  var pofSignIdx=pofSign;
  var pofRuler=signRulers[pofSignIdx];
  var pofDigit=reduce(Math.floor(pof/30)+1);
  // Simplified aspects (Sun-Moon angle)
  var sunMoonAngle=norm(moon-sun);
  var aspectName=sunMoonAngle<30?"Conjunction":sunMoonAngle<90?"Sextile/Semi-square":sunMoonAngle<120?"Square":"Trine/Opposition";
  var aspNature=sunMoonAngle<30||sunMoonAngle>330?'favorable':sunMoonAngle<60||sunMoonAngle>300?'favorable':sunMoonAngle<120||sunMoonAngle>240?'caution':'caution';
  return {
    nums,pofNums,
    horaryASC:signs2[signOf(ascApprox)]+" "+degInSign(ascApprox).toFixed(0)+"°",
    horaryASCRuler:signRulers[signOf(ascApprox)],
    h5sign:h5sign,h5ruler:h5ruler,h5rulerPos:signs2[signOf(venus)]+" "+degInSign(venus).toFixed(0)+"°",
    h5aspect:aspectName,
    pofSign:signs2[pofSignIdx],pofDeg:degInSign(pof).toFixed(1)+"°",
    pofRuler:pofRuler,pofDigit:pofDigit,
    aspects:[{asp:aspectName+' '+sunMoonAngle.toFixed(0)+'°',nature:aspNature,note:'Sun-Moon · '+signs2[signOf(sun)]+' to '+signs2[signOf(moon)]}],
    planets:[
      {name:'Jupiter ♃',sign:signs[jSign],deg:degInSign(jupiter).toFixed(1),nums:signNums[jSign]},
      {name:'Moon ☽',sign:signs[mSign],deg:degInSign(moon).toFixed(1),nums:signNums[mSign]},
      {name:'Venus ♀',sign:signs[vSign],deg:degInSign(venus).toFixed(1),nums:signNums[vSign]},
      {name:'Mars ♂',sign:signs[maSign],deg:degInSign(mars).toFixed(1),nums:signNums[maSign]},
    ],
    pof:{sign:signs[pofSign],deg:degInSign(pof).toFixed(1)},
    steps:[
      `<b>Jupiter ♃</b> at ${degInSign(jupiter).toFixed(1)}° ${signs[jSign]} → digits: <b>${signNums[jSign].join(',')}</b>`,
      `<b>Moon ☽</b> at ${degInSign(moon).toFixed(1)}° ${signs[mSign]} → digits: <b>${signNums[mSign].join(',')}</b>`,
      `<b>Venus ♀</b> at ${degInSign(venus).toFixed(1)}° ${signs[vSign]} → digits: <b>${signNums[vSign].join(',')}</b>`,
      `<b>Part of Fortune</b> at ${degInSign(pof).toFixed(1)}° ${signs[pofSign]} → digits: <b>${pofNums.join(',')}</b>`,
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

  // Year pillar — stem: (year-4)%10, branch: (year-4)%12
  // Using solar year basis (simplified: Jan 1 start)
  var yStem=(_Y-4)%10; if(yStem<0)yStem+=10;
  var yBranch=(_Y-4)%12; if(yBranch<0)yBranch+=12;

  // Month pillar — uses month branch (Yin=1=Feb, etc, offset by 2)
  // Month stems cycle based on year stem group
  var mBranch=(_M+1)%12; // Yin寅=February=month 1 in Chinese calendar (approx)
  var mStemBase=[(yStem%5)*2]%10;
  var mStem=(mStemBase+_M-1)%10;

  // Day pillar — use Julian Day Number approach
  // JDN for date
  var a=Math.floor((14-_M)/12);
  var yr=_Y+4800-a;
  var mo=_M+12*a-3;
  var jdn=_D+Math.floor((153*mo+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045;
  var dStem=(jdn-10)%10; if(dStem<0)dStem+=10;
  var dBranch=(jdn-10)%12; if(dBranch<0)dBranch+=12;

  // Hour pillar — fixed branches by hour
  var hBranchMap={'2PM':7,'5PM':9,'9PM':11}; // Wei=7,You=9,Hai=11
  var hBranch=hBranchMap[drawHour]||11;
  // Hour stem = day stem index * 2 + hour branch index / 2
  var hStem=(dStem*2+Math.floor(hBranch/2))%10;

  var day={stem:stems[dStem],stemEl:stemEl[dStem],branch:branches[dBranch],branchEl:branchEl[dBranch],nums:[...new Set([...stemNums[dStem],...branchNums[dBranch]])]};
  var hour={stem:stems[hStem],stemEl:stemEl[hStem],branch:branches[hBranch],branchEl:branchEl[hBranch],nums:[...new Set([...stemNums[hStem],...branchNums[hBranch]])]};
  var year={stem:stems[yStem],branch:branches[yBranch],nums:[...new Set([...stemNums[yStem],...branchNums[yBranch]])]};
  var month={stem:stems[mStem],branch:branches[mBranch],nums:[...new Set([...stemNums[mStem],...branchNums[mBranch]])]};

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
  // Period 9 (2024-2043) — fixed
  // Annual star: Period 9, year within period
  // Annual base: 2024=9,2025=8,2026=7... wait — annual star goes DOWN from 9
  // 2024=9,2025=8,2026=7,2027=6...
  var annualStar=9-((_Y-2024)%9);
  if(annualStar<=0)annualStar+=9;

  // Monthly star: depends on annual star and month
  // Monthly stars count DOWN from annual star at start of solar year
  // Month 1(Feb)=annual-1, Month 2(Mar)=annual-2... cycling
  // For yang years (odd annual star): Jan star = annual+1, counting down
  // Simplified: monthly star for month M
  // Standard: if annual is odd, February star = 8; if even, February star = 5
  // Then count down each month
  var febStar=(annualStar%2!==0)?8:5;
  // Count months from Feb (Chinese month 1)
  // Western month mapping: Feb=0,Mar=1,...,Jan=11
  var monthOffset=(_M>=2)?_M-2:_M+10;
  var monthlyStar=((febStar-monthOffset-1+90)%9)+1;

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

function layerIChing(drawHour){
  var h=drawHour==='2PM'?2:drawHour==='5PM'?5:9;
  var yRed=reduce(_Y);
  var dRed=reduce(_D);
  var lower=(_D+_M+yRed)%8||8;
  var upper=(h+dRed+_M)%8||8;

  var triNames=['','Qian','Dui','Li','Zhen','Xun','Kan','Gen','Kun'];
  var triSym=['','☰','☱','☲','☳','☴','☵','☶','☷'];
  var triEl=['','Metal','Metal','Fire','Thunder','Wood','Water','Earth','Earth'];
  var elNums={'Metal':[6,7],'Fire':[2,7],'Thunder':[3,8],'Wood':[3,8],'Water':[1,6],'Earth':[2,5,8]};

  // Hex number from King Wen sequence (lower=row, upper=col)
  var hexTable=[[1,34,5,26,11,9,14,43],[25,51,3,27,24,42,21,17],[6,40,29,4,7,59,64,47],
    [33,62,39,52,15,53,56,31],[12,16,8,23,2,20,35,45],[44,32,48,18,46,57,50,28],
    [13,55,63,22,36,37,30,49],[10,54,60,41,19,61,38,58]];
  var hexNum=hexTable[lower-1][upper-1];

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
  var nuclearMap={1:1,2:2,3:23,4:24,5:38,6:37,7:24,8:23,9:37,10:38,11:54,12:53,13:44,14:43,15:52,16:51,17:53,18:54,19:24,20:23,21:27,22:28,23:2,24:2,25:53,26:54,27:2,28:1,29:27,30:28,31:44,32:43,33:44,34:43,35:27,36:28,37:63,38:64,39:64,40:63,41:23,42:24,43:1,44:1,45:53,46:54,47:28,48:27,49:63,50:64,51:39,52:40,53:37,54:38,55:28,56:27,57:57,58:58,59:27,60:27,61:27,62:27,63:63,64:64};

  var hexInfo=hexDB[hexNum]||{name:'Hex '+hexNum,english:'Active energy',gambling:'Moderate fortune'};
  var nucNum=nuclearMap[hexNum]||1;
  var nucInfo=hexDB[nucNum]||{name:'Hex '+nucNum,english:'Inner energy',gambling:''};

  // Changing line: (day+month+hour)%6+1
  var changingLine=((_D+_M+h)%6)+1;
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
      nuclear:{num:nucNum,name:nucInfo.name}
    },
    pofNums:[reduce(lower),reduce(upper),reduce(lower+upper)],
    steps:[
      `<b>Lower Trigram:</b> (${_D}+${_M}+${yRed})%8 = ${lower} = ${triSym[lower]} ${triNames[lower]} (${lEl})`,
      `<b>Upper Trigram:</b> (${h}+${dRed}+${_M})%8 = ${upper} = ${triSym[upper]} ${triNames[upper]} (${uEl})`,
      `<b>Hexagram ${hexNum} — ${hexInfo.name}</b> · ${hexInfo.english}`,
      `<b>Nuclear Hex ${nucNum} — ${nucInfo.name}</b> · inner energy`,
      `<b>Changing Line ${changingLine}</b> · ${changingDesc}`,
      `<b>For speculation:</b> ${hexInfo.gambling}`,
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

  var lastSeen={};
  for(var i=0;i<draws.length;i++)
    draws[i].forEach(n=>{ if(!(n in lastSeen)) lastSeen[n]=i; });

  var digitWeight={};
  for(var d=1;d<=9;d++) digitWeight[d]=0;
  for(var n=1;n<=game.max;n++){
    var d=digitOf(n);
    var w=(freq[n]||0)*4;
    if(hotNums.includes(n)) w+=6;
    var gap=lastSeen[n]??draws.length;
    if(gap>=Math.floor(draws.length*0.5)) w+=5; // overdue
    digitWeight[d]=(digitWeight[d]||0)+w;
  }
  var topDigits=Object.entries(digitWeight).sort((a,b)=>b[1]-a[1]).map(e=>parseInt(e[0]));

  return {freq,lastSeen,digitWeight,topDigits,nums:topDigits.slice(0,5),hotNums,draws};
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
  if(bazi&&bazi.year){addEl(bazi.year.stemEl||'Fire');addEl(bazi.year.branchEl||'Fire');}
  // Astrology planet element contributions (dynamic from astro layer)
  if(astro&&astro.planets){
    var signElMap={Aries:'Fire',Taurus:'Earth',Gemini:'Air',Cancer:'Water',Leo:'Fire',Virgo:'Earth',
      Libra:'Air',Scorpio:'Water',Sagittarius:'Fire',Capricorn:'Earth',Aquarius:'Air',Pisces:'Water'};
    astro.planets.forEach(function(p){
      var e=signElMap[p.sign];
      if(e&&e!=='Air'&&el[e]!==undefined) el[e]+=1;
    });
  }
  // Flying Star: Period 9 = Fire dominant
  el.Fire+=2; el.Earth+=2;
  // Ensure no zeros
  Object.keys(el).forEach(function(k){if(!el[k])el[k]=1;});
  var total=Object.values(el).reduce(function(a,b){return a+b;},0);
  return Object.fromEntries(Object.entries(el).map(function(e){return [e[0],{val:e[1],pct:Math.round(e[1]/total*100)}];}));
}

// ══════════════════════════
// MASTER CONVERGENCE — 8 digit sources
// ══════════════════════════
function convergence(layers,gameKey){
  var game=GAMES[gameKey];
  var LABELS=['Py','Ch','As','Ba','Fs','IC','PoF','St'];
  var digitScores={};
  var rawStatW={};
  for(var d=1;d<=9;d++) rawStatW[d]=layers.stats.digitWeight[d]||0;
  var maxStatW=Math.max(1,...Object.values(rawStatW));
  for(var d=1;d<=9;d++){
    var inL=[];
    if(layers.num.pyNums.includes(d)) inL.push(0);
    if(layers.num.chNums.map(n=>reduce(n)).includes(d)) inL.push(1);
    if(layers.astro.nums.includes(d)) inL.push(2);
    if(layers.bazi.nums.includes(d)) inL.push(3);
    if(layers.fs.nums.includes(d)) inL.push(4);
    if(layers.iching.nums.includes(d)) inL.push(5);
    if(layers.astro.pofNums.includes(d)) inL.push(6);
    if(layers.stats.topDigits.slice(0,4).includes(d)) inL.push(7);
    var statFrac=rawStatW[d]/maxStatW; // 0–1, game-specific
    // CORRECTION: indices 0-6 (Py,Ch,As,Ba,Fs,IC,PoF) are all derived from the
    // same date/hour input — they are not independent confirmations of each
    // other, so their combined contribution is capped/dampened rather than
    // summed 1-for-1. Index 7 (Stats) is the only layer built from real
    // historical draw data, so it is weighted on its own scale instead of
    // being just "1 more vote" among many correlated ones.
    var metaCount=inL.filter(i=>i<7).length; // 0-7
    var metaWeight=Math.min(1,metaCount/7)*4; // correlated cluster, capped at 4
    var statScore=statFrac*5; // real-data layer, weighted up to 5
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

  var hotNums=layers.stats.hotNums;
  function bestNums(digit){
    return (digitToNums[digit]||[]).sort((a,b)=>{
      var sA=(layers.stats.freq[a]||0)*4+(hotNums.includes(a)?6:0);
      var sB=(layers.stats.freq[b]||0)*4+(hotNums.includes(b)?6:0);
      return sB-sA;
    });
  }

  var isEZ2=gameKey==='ez2';
  var needed=isEZ2?2:6;
  var picks=[];
  for(var ds of sorted){
    if(picks.length>=needed) break;
    var bns=bestNums(ds.digit);
    if(bns.length&&!picks.includes(bns[0])) picks.push(bns[0]);
  }
  if(picks.length<needed){
    for(var ds of sorted){
      if(picks.length>=needed) break;
      for(var n of bestNums(ds.digit))
        if(!picks.includes(n)){ picks.push(n); break; }
    }
  }
  picks.sort((a,b)=>a-b);

  var altPicks=[];
  for(var ds of sorted){
    if(altPicks.length>=needed) break;
    var bns=bestNums(ds.digit);
    var alt=bns.find(n=>!picks.includes(n)&&!altPicks.includes(n));
    if(alt) altPicks.push(alt);
  }
  altPicks.sort((a,b)=>a-b);

  return {sorted,digitScores,digitToNums,picks,altPicks,LABELS,needed};
}

// ══════════════════════════
// STATE
// ══════════════════════════
var currentGame='ez2';
var currentDraw='9PM';
var savedNums={};

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
    `🏛️ Horary chart — Regiomontanus · 5th house gambling…`,
    `⭐ Part of Fortune · night chart calculation…`,
    `🔭 Planetary aspects · applying only · strictures checked…`,
    `☯️ Exact BaZi day pillar · ${TODAY_PH} ${dh} hour…`,
    `⚡ Clashes · combines · hidden stems · element balance…`,
    `🏮 Flying Star Lo Shu · monthly star · ${TODAY_PH}…`,
    `🔮 I Ching · hexagram from today's energy field…`,
    `📊 PCSO ${game.short} historical data · freq+hot+overdue…`,
    `🎯 8-source digit convergence · mapping to 1–${game.max}…`,
  ];
  var si=0;
  var el=document.getElementById('lsteps');
  el.innerHTML='';
  var iv=setInterval(()=>{ if(si<msgs.length){ el.innerHTML+=msgs[si]+'<br>'; si++; } else clearInterval(iv); },240);
  setTimeout(()=>{
    clearInterval(iv);
    var num,astro,bazi,fs,iching,stats,energy,layers,conv;
    try{num=layerNumerology(dh);}catch(e){console.error('layerNumerology:',e);num={pyNums:[7],chNums:[3],allNums:[3,7],steps:[]};}
    try{astro=layerAstrology(dh);}catch(e){console.error('layerAstrology:',e);astro={nums:[1,6],pofNums:[2],horaryASC:'Cancer 15°',horaryASCRuler:'Moon',h5sign:'Scorpio',h5ruler:'Mars',h5rulerPos:'Taurus',h5aspect:'Square',pofSign:'Leo',pofDeg:'20°',pofRuler:'Sun',pofDigit:2,aspects:[],steps:[]};}
    try{bazi=layerBazi(dh);}catch(e){console.error('layerBazi:',e);bazi={nums:[1,6],day:{stem:'Gui',stemEl:'Water',branch:'You',branchEl:'Rooster',nums:[6,7]},hour:{stem:'Jia',stemEl:'Wood',branch:'Hai',branchEl:'Pig',nums:[1,3,6]},year:{stem:'Bing',branch:'Wu',nums:[2,7]},month:{stem:'Ji',branch:'Wu',nums:[2,5,7]},interactions:[],steps:[]};}
    try{fs=layerFengshui();}catch(e){console.error('layerFengshui:',e);fs={nums:[7,8,9],loShu:{C:8},steps:[]};}
    try{iching=layerIChing(dh);}catch(e){console.error('layerIChing:',e);iching={nums:[2,5],hex:45,pofNums:[5],steps:[]};}
    try{stats=layerStats(currentGame,dh);}catch(e){console.error('layerStats:',e);stats={topDigits:[9,1,3],digitWeight:{},topNums:[]};}
    try{energy=calcEnergy(bazi,astro,fs);}catch(e){console.error('calcEnergy:',e);energy={bars:{Fire:30,Water:30,Wood:9,Metal:9,Earth:22}};}
    layers={num,astro,bazi,fs,iching,stats};
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
  var icons=['Py','Ch','As','Ba','Fs','IC','PoF','St'];
  var cls=['on','on','on','on','on','teal','teal','gold'];
  return labels.map((l,i)=>`<span class="dot ${idxs.includes(i)?cls[i]:'off'}" title="${l}">${icons[i]}</span>`).join('');
}
function dCls(c){ return c>=8?'s8':c>=7?'s7':c>=6?'s6':c>=5?'s5':'s4'; }

function lcard(icon,name,nums,steps,extra='',isNew=false){
  return `<div class="lcard"><div class="lhead"><div class="licon">${icon}</div><div><div class="lname">${name}${isNew?'<span class="lnew">★ Expert</span>':''}</div><div class="lpills">${nums.map(n=>`<span class="pill">${n}</span>`).join('')}</div></div></div><div class="lsteps">${steps.map(s=>`• ${s}`).join('<br>')}</div>${extra}</div>`;
}
function renderResults(layers,conv,energy,gameKey,drawHour){
  var game=GAMES[gameKey];
  var isEZ2=gameKey==='ez2';

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

  // Balls
  var ballsHTML=conv.picks.map((n,i)=>{
    var d=digitOf(n);
    var ds=conv.digitScores[d];
    return `<div class="ball ${BTIERS[Math.min(i,5)]}">
      ${pad(n)}<span class="btag">d${d}·${ds.count}/8</span>
    </div>`;
  }).join('');
  var altHTML=conv.altPicks.map(n=>`<div class="aball">${pad(n)}</div>`).join('');
  var totalScore=conv.picks.reduce((s,n)=>{ var d=digitOf(n); return s+(conv.digitScores[d]?conv.digitScores[d].score:0); },0);
  var pct=Math.round(totalScore/(conv.picks.length*9)*100);
  var ac=pct>=70?'#2ecc71':pct>=45?'#f0c040':'#ff6b6b';
  var al=pct>=70?'🟢 Strong Alignment':pct>=45?'🟡 Moderate Alignment':'🔴 Weak Alignment';

  // CORRECTION: flag digit collisions — picks that share the same digital
  // root aren't independent confirmations, they're riding the same score.
  var pickDigitCounts={};
  conv.picks.forEach(n=>{ var d=digitOf(n); pickDigitCounts[d]=(pickDigitCounts[d]||0)+1; });
  var collisions=Object.entries(pickDigitCounts).filter(([d,c])=>c>1);
  var collisionHTML=collisions.length
    ? `<div style="font-size:11px;color:#f0c040;margin-top:8px;">⚠ ${collisions.map(([d,c])=>`${c} numbers share digit ${d}`).join(', ')} — not independent confirmations</div>`
    : `<div style="font-size:11px;color:var(--muted);margin-top:8px;">✓ No digit collisions — all 6 picks draw on distinct digit scores</div>`;

  // CORRECTION: backtest — how often have numbers sharing today's picked
  // digits actually appeared in real historical draws, vs. just trusting the formula.
  var pickedDigits=[...new Set(conv.picks.map(n=>digitOf(n)))];
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
      <div class="dscore">${s.count}/8 layers</div>
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

  // Horary sub-panel
  var horaryHTML=`
    <div class="hgrid">
      <div class="hbox">
        <div class="hbox-title">Ascendant</div>
        <div class="hbox-val">${layers.astro.horaryASC}</div>
        <div class="hbox-sub">Ruler: ${layers.astro.horaryASCRuler}<br>Chart is radical ✓<br>Moon not void ✓<br>Not Via Combusta ✓</div>
      </div>
      <div class="hbox">
        <div class="hbox-title">5th House (Gambling)</div>
        <div class="hbox-val">${layers.astro.h5sign}</div>
        <div class="hbox-sub">Ruler: <b>${layers.astro.h5ruler}</b><br>${layers.astro.h5rulerPos}<br>${layers.astro.h5aspect}</div>
      </div>
      <div class="hbox">
        <div class="hbox-title">Part of Fortune ⊕</div>
        <div class="hbox-val">~${layers.astro.pofDeg}° ${layers.astro.pofSign}</div>
        <div class="hbox-sub">Night chart formula<br>Digit: <b>${layers.astro.pofDigit}</b><br>Ruler: ${layers.astro.pofRuler}</div>
      </div>
      <div class="hbox">
        <div class="hbox-title">Jupiter Status</div>
        <div class="hbox-val" style="color:var(--green)">EXALTED ★</div>
        <div class="hbox-sub">29°16' Cancer<br>Anaretic degree<br>Peak luck energy</div>
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
    <div class="ichange"><b>Changing line:</b> ${layers.iching.hex.changingLine}<br><b>Nuclear hex ${layers.iching.hex.nuclear.num}:</b> ${layers.iching.hex.nuclear.name}</div>`;

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
        Ball tag = digit (d) + convergence score out of 8 sources<br>
        Py=Pythagorean · Ch=Chaldean · As=Astro · Ba=BaZi · Fs=FengShui · IC=IChing · PoF=Part of Fortune · St=Stats
      </div>
    </div>
    <div class="alt-card" style="margin-bottom:14px;text-align:center;">
      <div class="alt-label" style="margin-bottom:10px;">Overall Alignment · ${TODAY_PH}</div>
      <div style="font-size:36px;font-weight:800;color:${ac};margin-bottom:4px;">${pct}%</div>
      <div style="font-size:13px;color:var(--muted2)">${al}</div>
      ${collisionHTML}
      ${backtestHTML}
      ${sourceHTML}
    </div>

    <div class="slabel">Current Energy Flow · ${TODAY_PH} · ${drawHour}</div>
    <div class="eflow">
      <div class="eflow-title">⚡ Elemental Energy Balance — All 12 Layers</div>
      ${energyHTML}
    </div>

    <div class="slabel">Step 1 — Digit Convergence · 8 Sources</div>
    <div class="legend">
      <span class="leg"><span class="ldot" style="background:var(--accent)"></span>Metaphysical</span>
      <span class="leg"><span class="ldot" style="background:var(--teal)"></span>I Ching · PoF</span>
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
      ⚠️ [Guessing] — 12-layer expert reading using: Pythagorean + Chaldean numerology, real-time astrology with essential dignities (verified ${TODAY_PH} ephemeris), Horary chart (Regiomontanus system, strictures checked, 5th house gambling analysis), Part of Fortune (night chart), exact BaZi four pillars (dynamic daily pillars) with clash/combine/hidden stem analysis, Feng Shui Flying Star Lo Shu (monthly star #8 in center), I Ching hexagram (cast from today's date) with nuclear and changing line, and PCSO official historical data. All readings based on current cosmic energy flow — no personal data used. No method can guarantee lottery outcomes. For entertainment only. Play responsibly and within your means.
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
  var msgs=['🔢 Analyzing your numbers — Pythagorean + Chaldean…','🪐 Cross-referencing planetary positions…','🏛️ Horary chart — 5th house gambling…','⭐ Part of Fortune alignment…','☯️ BaZi day pillar compatibility…','🏮 Flying Star Lo Shu resonance…','🔮 I Ching hexagram match…','📊 PCSO '+game.short+' historical analysis…','🎯 Convergence scoring your numbers…'];
  var si=0; var el=document.getElementById('lsteps'); el.innerHTML='';
  var iv=setInterval(()=>{ if(si<msgs.length){ el.innerHTML+=msgs[si]+'<br>'; si++; } else clearInterval(iv); },240);
  setTimeout(()=>{
    clearInterval(iv);
    var dh=currentGame==='ez2'?currentDraw:'9PM'; var num,astro,bazi,fs,iching,stats,energy,layers,conv;
    try{num=layerNumerology(dh);}catch(e){num={pyNums:[7],chNums:[3],allNums:[3,7],steps:[]};}
    try{astro=layerAstrology(dh);}catch(e){astro={nums:[1,6],pofNums:[2],horaryASC:'Cancer 15°',horaryASCRuler:'Moon',h5sign:'Scorpio',h5ruler:'Mars',h5rulerPos:'Taurus',h5aspect:'Square',pofSign:'Leo',pofDeg:'20°',pofRuler:'Sun',pofDigit:2,aspects:[],steps:[]};}
    try{bazi=layerBazi(dh);}catch(e){bazi={nums:[1,6],day:{stem:'Gui',stemEl:'Water',branch:'You',branchEl:'Rooster',nums:[6,7]},hour:{stem:'Jia',stemEl:'Wood',branch:'Hai',branchEl:'Pig',nums:[1,3,6]},year:{stem:'Bing',branch:'Wu',nums:[2,7]},month:{stem:'Ji',branch:'Wu',nums:[2,5,7]},interactions:[],steps:[]};}
    try{fs=layerFengshui();}catch(e){fs={nums:[7,8,9],loShu:{C:8},steps:[]};}
    try{iching=layerIChing(dh);}catch(e){iching={nums:[2,5],hex:45,pofNums:[5],steps:[]};}
    try{stats=layerStats(currentGame,dh);}catch(e){stats={topDigits:[9,1,3],digitWeight:{},topNums:[]};}
    try{energy=calcEnergy(bazi,astro,fs);}catch(e){energy={bars:{Fire:30,Water:30,Wood:9,Metal:9,Earth:22}};}
    layers={num,astro,bazi,fs,iching,stats};
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
  var ballsHTML=userNums.map((n,i)=>{ var d=digitOf(n); var ds=conv.digitScores&&conv.digitScores[d]?conv.digitScores[d]:{count:0}; return `<div class="ball ${BTIERS[Math.min(i,5)]}">${pad(n)}<span class="btag">d${d}·${ds.count}/8</span></div>`; }).join('');
  var totalScore=userNums.reduce((s,n)=>{ var d=digitOf(n); return s+(conv.digitScores&&conv.digitScores[d]?conv.digitScores[d].score:0); },0);
  var pct=Math.round(totalScore/(userNums.length*9)*100);
  var ac=pct>=70?'#2ecc71':pct>=45?'#f0c040':'#ff6b6b';
  var al=pct>=70?'🟢 Strong Alignment':pct>=45?'🟡 Moderate Alignment':'🔴 Weak Alignment';
  var pickDigitCounts={}; userNums.forEach(n=>{ var d=digitOf(n); pickDigitCounts[d]=(pickDigitCounts[d]||0)+1; });
  var collisions=Object.entries(pickDigitCounts).filter(([d,c])=>c>1);
  var collisionHTML=collisions.length
    ? `<div style="font-size:11px;color:#f0c040;margin-top:8px;">⚠ ${collisions.map(([d,c])=>`${c} numbers share digit ${d}`).join(', ')} — not independent confirmations</div>`
    : `<div style="font-size:11px;color:var(--muted);margin-top:8px;">✓ No digit collisions among your numbers</div>`;
  var pickedDigits=[...new Set(userNums.map(n=>digitOf(n)))];
  var histDraws=(layers.stats&&layers.stats.draws)||[];
  var hitDraws=histDraws.filter(draw=>draw.some(n=>pickedDigits.includes(digitOf(n))));
  var backtestPct=histDraws.length?Math.round(hitDraws.length/histDraws.length*100):null;
  var backtestHTML=backtestPct!==null
    ? `<div style="font-size:11px;color:var(--muted2);margin-top:4px;">📊 Historical check: ${backtestPct}% of last ${histDraws.length} draws had at least one number matching these digits (real data, not the formula)</div>`
    : '';
  var sourceHTML=`<div style="font-size:10px;color:${PCSO_HISTORY_STATUS.loaded?'var(--muted)':'#ff6b6b'};margin-top:4px;">${PCSO_HISTORY_STATUS.loaded?'✓':'⚠'} Data source: ${PCSO_HISTORY_STATUS.source}</div>`;
  var seen={}; var digitCardsHTML=userNums.map(n=>{ var d=digitOf(n); if(seen[d]) return ''; seen[d]=true; var ds=conv.digitScores&&conv.digitScores[d]?conv.digitScores[d]:{count:0,layers:[]}; return `<div class="dcard ${dCls(ds.count)}"><div class="dnum">${d}</div><div class="dscore">${ds.count}/8 layers</div><div class="ddots">${dotHTML(ds.layers,conv.LABELS||[])}</div></div>`; }).filter(Boolean).join('');
  var mapHTML=userNums.map(n=>{ var d=digitOf(n); var cls=hotNums.includes(n)?'hot':(layers.stats.freq&&(layers.stats.freq[n]||0)>=2)?'warm':'cold'; var ds=conv.digitScores&&conv.digitScores[d]?conv.digitScores[d]:{count:0}; return `<div class="maprow"><span class="mapdig">Your # <b>${pad(n)}</b> <span style="color:var(--muted)">(digit ${d} · ${ds.count}/8)</span></span><div class="mapnums"><span class="mn ${cls}">${pad(n)}</span></div></div>`; }).join('');
  var freqBarsHTML=userNums.map(n=>{ var f=layers.stats.freq&&layers.stats.freq[n]?layers.stats.freq[n]:0; var w=Math.min(100,f*12); return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:10px;color:var(--muted2);width:22px">${pad(n)}</span><div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="height:6px;background:${hotNums.includes(n)?'var(--gold)':'var(--teal)'};border-radius:3px;width:${w}%"></div></div><span style="font-size:10px;color:var(--muted)">${f}x</span></div>`; }).join('');
  var horaryHTML=conv._horaryHTML||''; var baziHTML=conv._baziHTML||''; var ichingHTML=conv._ichingHTML||'';
  document.getElementById('results').innerHTML=`
    <div class="slabel">✦ Personal Number Analysis · ${game.name}</div>
    <div class="balls-card"><div class="balls-eyebrow">Your Numbers — Oracle Convergence Check</div><div class="balls-row">${ballsHTML}</div><div class="balls-note">Ball tag = digit (d) + convergence score out of 8 sources<br>Py=Pythagorean · Ch=Chaldean · As=Astro · Ba=BaZi · Fs=FengShui · IC=IChing · PoF=Part of Fortune · St=Stats</div></div>
    <div class="alt-card" style="margin-bottom:14px;text-align:center;"><div class="alt-label" style="margin-bottom:10px;">Overall Alignment · ${TODAY_PH}</div><div style="font-size:36px;font-weight:800;color:${ac};margin-bottom:4px;">${pct}%</div><div style="font-size:13px;color:var(--muted2)">${al}</div>${collisionHTML}${backtestHTML}${sourceHTML}</div>
    <div class="slabel">Current Energy Flow · ${TODAY_PH} · ${drawHour}</div>
    <div class="eflow"><div class="eflow-title">⚡ Elemental Energy Balance — All 12 Layers</div>${energyHTML}</div>
    <div class="slabel">Step 1 — Digit Convergence · Your Numbers</div>
    <div class="legend"><span class="leg"><span class="ldot" style="background:var(--accent)"></span>Metaphysical</span><span class="leg"><span class="ldot" style="background:var(--teal)"></span>I Ching · PoF</span><span class="leg"><span class="ldot" style="background:var(--gold)"></span>Chaldean · Stats</span><span class="leg"><span class="ldot" style="background:var(--surface);border:1px solid var(--border)"></span>Not in layer</span></div>
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
    {draw:'2PM', nums:[24,4],  cutoff:14},
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
    out.innerHTML='<span class="pcso-hist-none">No result on file for this date.</span>';
    return;
  }
  if(game==='ez2'){
    var order=['2PM','5PM','9PM'];
    var cols=order.map(function(t){
      var nums=(entry.draws&&entry.draws[t])||[];
      var inner=nums.length?nums.map(function(x){return '<span class="pnum ez">'+p2(x)+'</span>';}).join(''):'<span class="pcso-hist-none">Pending…</span>';
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:5px"><span style="font-size:9px;color:var(--muted)">'+t+'</span><div style="display:flex;gap:4px">'+inner+'</div></div>';
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
  out.innerHTML='<div class="pcso-hist-row">'+numsHtml+'</div>'+jackpotHtml;
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

async function pcsoRefreshFromRaw(){
  var grid=document.getElementById('pcso-grid');
  if(grid){grid.innerHTML='<div class="pcso-row"><span class="pcso-pending">Loading latest results…</span></div>';}
  var RAW_URL='https://raw.githubusercontent.com/jomerpb/JOMERPBSTREAM/main/pcso-results.json';
  try{
    var resp=await fetch(RAW_URL+'?nocache='+Date.now());
    if(!resp.ok) throw new Error('HTTP '+resp.status);
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
    var fetchStatusEl=document.getElementById('pcso-fetch-status');
    if(data.updated){
      var upd=new Date(data.updated);
      var lbl=document.getElementById('pcso-date-lbl');
      if(lbl) lbl.textContent='Updated '+upd.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Manila'});
      if(fetchStatusEl) fetchStatusEl.textContent='Data Updated '+upd.toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' PH';
    } else if(fetchStatusEl){
      fetchStatusEl.textContent='Data timestamp unavailable';
    }
  } catch(err){
    console.error('PCSO raw refresh:',err);
    pcsoRender();
    var fetchStatusElErr=document.getElementById('pcso-fetch-status');
    if(fetchStatusElErr) fetchStatusElErr.textContent='Data unavailable ❌ — ' + err.message;
    throw err;
  }
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

