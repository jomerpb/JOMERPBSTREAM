// ═══════════════════════════════════════════
// TRADE (PSE) — MOCK DATA + SIGNAL ENGINE
// ═══════════════════════════════════════════
const PSE_ALL_STOCKS = [
{sym:'MFC',name:'Manulife Financial Corporation',base:2300.0},
{sym:'SLF',name:'Sun Life Financial Inc.',base:4500.0},
{sym:'ICT',name:'International Container Terminal Services, Inc.',base:898.0},
{sym:'SM',name:'SM Investments Corporation',base:585.0},
{sym:'MER',name:'Manila Electric Company',base:574.0},
{sym:'BDO',name:'BDO Unibank, Inc.',base:116.3},
{sym:'SMPH',name:'SM Prime Holdings, Inc.',base:17.6},
{sym:'BPI',name:'Bank of the Philippine Islands',base:90.8},
{sym:'AP',name:'Aboitiz Power Corporation',base:44.0},
{sym:'FB',name:'San Miguel Food and Beverage, Inc.',base:49.1},
{sym:'VLC',name:'Villar Land Holdings Corp.',base:448.0},
{sym:'MBT',name:'Metropolitan Bank & Trust Company',base:63.0},
{sym:'GLO',name:'Globe Telecom, Inc.',base:1700.0},
{sym:'EMI',name:'Emperador Inc.',base:15.42},
{sym:'AC',name:'Ayala Corporation',base:386.0},
{sym:'DTEL',name:'PLDT Inc.',base:10.26},
{sym:'TEL',name:'PLDT Inc.',base:1083.0},
{sym:'JGS',name:'JG Summit Holdings, Inc.',base:24.35},
{sym:'ALI',name:'Ayala Land, Inc.',base:12.74},
{sym:'AEV',name:'Aboitiz Equity Ventures, Inc.',base:31.5},
{sym:'MYNLD',name:'Maynilad Water Services, Inc.',base:22.85},
{sym:'SMC',name:'San Miguel Corporation',base:67.5},
{sym:'LTG',name:'LT Group, Inc.',base:14.48},
{sym:'SGP',name:'Synergy Grid & Development Phils., Inc.',base:29.5},
{sym:'CBC',name:'China Banking Corporation',base:55.1},
{sym:'JFC',name:'Jollibee Foods Corporation',base:128.0},
{sym:'AREIT',name:'AREIT, Inc.',base:37.95},
{sym:'RCR',name:'RL Commercial REIT, Inc.',base:6.83},
{sym:'PGOLD',name:'Puregold Price Club, Inc.',base:45.9},
{sym:'ACEN',name:'Acen Corporation',base:3.23},
{sym:'MONDE',name:'Monde Nissin Corporation',base:7.0},
{sym:'URC',name:'Universal Robina Corporation',base:55.9},
{sym:'MWC',name:'Manila Water Company, Inc.',base:39.6},
{sym:'DMC',name:'DMCI Holdings, Inc.',base:8.58},
{sym:'SCC',name:'Semirara Mining and Power Corporation',base:26.3},
{sym:'GTCAP',name:'GT Capital Holdings, Inc.',base:477.0},
{sym:'CNPF',name:'Century Pacific Food, Inc.',base:26.8},
{sym:'PTC',name:'Philippine Trust Company',base:90.0},
{sym:'PNB',name:'Philippine National Bank',base:56.0},
{sym:'UBP',name:'Union Bank of the Philippines',base:24.75},
{sym:'PAL',name:'PAL Holdings, Inc.',base:3.0},
{sym:'APX',name:'Apex Mining Co., Inc.',base:14.16},
{sym:'RLC',name:'Robinsons Land Corporation',base:16.3},
{sym:'GSMI',name:'Ginebra San Miguel Inc.',base:268.8},
{sym:'CNVRG',name:'Converge Information and Communications Technology Solutions, Inc.',base:10.2},
{sym:'OGP',name:'OceanaGold (Philippines) Inc.',base:31.3},
{sym:'AGI',name:'Alliance Global Group, Inc.',base:8.0},
{sym:'SPNEC',name:'SP New Energy Corporation',base:1.32},
{sym:'MREIT',name:'MREIT, Inc.',base:13.62},
{sym:'AUB',name:'Asia United Bank Corporation',base:43.95},
{sym:'MEG',name:'Megaworld Corporation',base:1.97},
{sym:'NIKL',name:'Nickel Asia Corporation',base:4.5},
{sym:'RCB',name:'Rizal Commercial Banking Corporation',base:23.4},
{sym:'COSCO',name:'Cosco Capital, Inc.',base:7.94},
{sym:'FGEN',name:'First Gen Corporation',base:15.4},
{sym:'CREC',name:'Citicore Renewable Energy Corporation',base:4.59},
{sym:'RRHI',name:'Robinsons Retail Holdings, Inc.',base:46.55},
{sym:'SEVN',name:'Philippine Seven Corporation',base:32.75},
{sym:'PLUS',name:'DigiPlus Interactive Corp.',base:10.64},
{sym:'SECB',name:'Security Bank Corporation',base:62.2},
{sym:'PX',name:'Philex Mining Corporation',base:7.67},
{sym:'BCOR',name:'Berjaya Philippines Inc.',base:9.5},
{sym:'FDC',name:'Filinvest Development Corporation',base:4.35},
{sym:'FPH',name:'First Philippine Holdings Corporation',base:77.05},
{sym:'PPC',name:'Pryce Corporation',base:15.0},
{sym:'DD',name:'DoubleDragon Corporation',base:11.9},
{sym:'EW',name:'East West Banking Corporation',base:12.28},
{sym:'KEEPR',name:'The Keepers Holdings, Inc.',base:1.86},
{sym:'AT',name:'Atlas Consolidated Mining and Development Corporation',base:7.35},
{sym:'DNL',name:'D&L Industries, Inc.',base:3.64},
{sym:'PSB',name:'Philippine Savings Bank',base:53.0},
{sym:'WLCON',name:'Wilcon Depot, Inc.',base:5.45},
{sym:'CREIT',name:'Citicore Energy REIT Corp.',base:3.41},
{sym:'VVT',name:'Vivant Corporation',base:20.6},
{sym:'ANS',name:'A. Soriano Corporation',base:16.6},
{sym:'FEU',name:'Far Eastern University, Incorporated',base:829.5},
{sym:'TFHI',name:'Top Frontier Investment Holdings, Inc.',base:52.5},
{sym:'PCOR',name:'Petron Corporation',base:2.15},
{sym:'BLOOM',name:'Bloomberry Resorts Corporation',base:1.65},
{sym:'FILRT',name:'Filinvest REIT Corp.',base:2.9},
{sym:'DDMPR',name:'DDMP REIT Inc.',base:1.05},
{sym:'RFM',name:'RFM Corporation',base:5.5},
{sym:'CEB',name:'Cebu Air, Inc.',base:29.35},
{sym:'PSE',name:'The Philippine Stock Exchange, Inc.',base:211.0},
{sym:'DMW',name:'D.M. Wenceslao & Associates, Incorporated',base:4.85},
{sym:'GMAP',name:'GMA Holdings, Inc.',base:4.86},
{sym:'GMA7',name:'GMA Network, Inc.',base:4.82},
{sym:'SPC',name:'SPC Power Corporation',base:10.8},
{sym:'SLI',name:'Sta. Lucia Land, Inc.',base:1.92},
{sym:'DITO',name:'DITO CME Holdings Corp.',base:0.71},
{sym:'FLI',name:'Filinvest Land, Inc.',base:0.68},
{sym:'WEB',name:'PhilWeb Corporation',base:11.78},
{sym:'BNCOM',name:'Bank of Commerce',base:10.52},
{sym:'TOP',name:'Top Line Business Development Corp.',base:1.37},
{sym:'SHNG',name:'Shang Properties, Inc.',base:3.07},
{sym:'SHLPH',name:'Shell Pilipinas Corporation',base:9.05},
{sym:'LPZ',name:'Lopez Holdings Corporation',base:3.8},
{sym:'ROCK',name:'Rockwell Land Corporation',base:2.19},
{sym:'DHI',name:'Dominion Holdings, Inc.',base:6.02},
{sym:'STI',name:'STI Education Systems Holdings, Inc.',base:1.26},
{sym:'VLL',name:'Vista Land & Lifescapes, Inc.',base:0.96},
{sym:'BEL',name:'Belle Corporation',base:1.21},
{sym:'LC',name:'Lepanto Consolidated Mining Company',base:0.19},
{sym:'LCB',name:'Lepanto Consolidated Mining Company',base:0.179},
{sym:'FNI',name:'Global Ferronickel Holdings, Inc.',base:2.24},
{sym:'VMC',name:'Victorias Milling Company, Inc.',base:1.9},
{sym:'CHP',name:'Concreat Holdings Philippines, Inc.',base:0.81},
{sym:'PIZZA',name:'Shakey\'s Pizza Asia Ventures, Inc.',base:6.05},
{sym:'VREIT',name:'VistaREIT, Inc.',base:1.31},
{sym:'AXLM',name:'Axelum Resources Corp.',base:2.61},
{sym:'LBC',name:'LBC Express Holdings, Inc.',base:6.06},
{sym:'STR',name:'Vistamalls, Inc.',base:1.02},
{sym:'UNH',name:'Uniholdings Inc.',base:117.9},
{sym:'DELM',name:'Del Monte Pacific Limited',base:4.5},
{sym:'COL',name:'COL Financial Group, Inc.',base:1.3},
{sym:'MACAY',name:'Macay Holdings, Inc.',base:5.97},
{sym:'PBC',name:'Philippine Bank of Communications',base:16.0},
{sym:'CLI',name:'Cebu Landmasters, Inc.',base:2.19},
{sym:'CPG',name:'Century Properties Group, Inc.',base:0.64},
{sym:'CEU',name:'Centro Escolar University',base:16.5},
{sym:'SSI',name:'SSI Group, Inc.',base:2.24},
{sym:'IMI',name:'Integrated Micro-Electronics, Inc.',base:3.25},
{sym:'MAC',name:'MacroAsia Corporation',base:3.81},
{sym:'ABG',name:'Asiabest Group International Inc.',base:24.0},
{sym:'RCI',name:'Roxas and Company, Inc.',base:2.53},
{sym:'IPO',name:'iPeople, inc.',base:6.7},
{sym:'MWIDE',name:'Megawide Construction Corporation',base:3.39},
{sym:'ALLHC',name:'AyalaLand Logistics Holdings Corp.',base:1.09},
{sym:'GERI',name:'Global-Estate Resorts, Inc.',base:0.59},
{sym:'HI',name:'House of Investments, Inc.',base:4.45},
{sym:'CPM',name:'Century Peak Holdings Corporation',base:2.16},
{sym:'PBB',name:'Philippine Business Bank, Inc.',base:7.41},
{sym:'SBS',name:'SBS Philippines Corporation',base:3.2},
{sym:'PNX',name:'P-H-O-E-N-I-X Petroleum Philippines, Inc.',base:4.17},
{sym:'PXP',name:'PXP Energy Corporation',base:2.36},
{sym:'CIC',name:'Concepcion Industrial Corporation',base:12.36},
{sym:'REDC',name:'Repower Energy Development Corporation',base:7.45},
{sym:'ALHI',name:'Anchor Land Holdings, Inc.',base:4.5},
{sym:'AB',name:'Atok-Big Wedge Co., Inc.',base:1.78},
{sym:'PHN',name:'PHINMA Corporation',base:13.26},
{sym:'LFM',name:'Liberty Flour Mills, Inc.',base:29.7},
{sym:'BC',name:'Benguet Corporation',base:6.2},
{sym:'BCB',name:'Benguet Corporation',base:6.26},
{sym:'EURO',name:'Euro-Med Laboratories Phil., Inc.',base:1.07},
{sym:'ACR',name:'Alsons Consolidated Resources, Inc.',base:0.67},
{sym:'XG',name:'NexGen Energy Corp.',base:2.75},
{sym:'PREIT',name:'Premiere Island Power Reit Corporation',base:1.18},
{sym:'V',name:'Vantage Equities, Inc.',base:0.87},
{sym:'PMPC',name:'Panasonic Manufacturing Philippines Corporation',base:8.42},
{sym:'MRSGI',name:'Metro Retail Stores Group, Inc.',base:1.1},
{sym:'HTI',name:'Haus Talk, Inc.',base:1.4},
{sym:'MVC',name:'Mabuhay Vinyl Corporation',base:5.2},
{sym:'MM',name:'MerryMart Consumer Corp.',base:0.435},
{sym:'ALTER',name:'Alternergy Holdings Corporation',base:0.81},
{sym:'SUN',name:'Suntrust Resort Holdings, Inc.',base:0.425},
{sym:'CDC',name:'Cityland Development Corporation',base:0.6},
{sym:'FCG',name:'Figaro Culinary Group, Inc.',base:0.54},
{sym:'STN',name:'Steniel Manufacturing Corporation',base:1.87},
{sym:'ATN',name:'ATN Holdings, Inc.',base:0.415},
{sym:'ATNB',name:'ATN Holdings, Inc.',base:0.415},
{sym:'APO',name:'Anglo Philippine Holdings Corporation',base:0.92},
{sym:'PRC',name:'Philippine Racing Club, Inc.',base:5.0},
{sym:'OPM',name:'Oriental Petroleum and Minerals Corporation',base:0.014},
{sym:'OPMB',name:'Oriental Petroleum and Minerals Corporation',base:0.013},
{sym:'SGI',name:'Solid Group Inc.',base:1.35},
{sym:'CTS',name:'CTS Global Equity Group, Inc.',base:0.355},
{sym:'CSB',name:'Citystate Savings Bank, Inc.',base:14.8},
{sym:'CAT',name:'Central Azucarera de Tarlac, Inc.',base:9.98},
{sym:'REG',name:'Republic Glass Holdings Corporation',base:3.32},
{sym:'ALCO',name:'Arthaland Corporation',base:0.425},
{sym:'ROX',name:'Roxas Holdings, Inc.',base:1.45},
{sym:'MBC',name:'Manila Broadcasting Company',base:5.53},
{sym:'MA',name:'Manila Mining Corporation',base:0.0071},
{sym:'MAB',name:'Manila Mining Corporation',base:0.0072},
{sym:'UPSON',name:'Upson International Corp.',base:0.7},
{sym:'PRMX',name:'Primex Corporation',base:0.92},
{sym:'PERC',name:'PetroEnergy Resources Corporation',base:3.62},
{sym:'NRCP',name:'National Reinsurance Corporation of the Philippines',base:0.94},
{sym:'ABS',name:'ABS-CBN Corporation',base:2.16},
{sym:'INFRA',name:'Philippine Infradev Holdings Inc.',base:0.32},
{sym:'MARC',name:'Marcventures Holdings, Inc.',base:0.64},
{sym:'EEI',name:'EEI Corporation',base:1.84},
{sym:'APL',name:'Apollo Global Capital, Inc.',base:0.0063},
{sym:'UPM',name:'United Paragon Mining Corporation',base:0.0068},
{sym:'ECVC',name:'East Coast Vulcan Mining Corporation',base:0.26},
{sym:'MAXS',name:'Max\'s Group, Inc.',base:2.19},
{sym:'PAX',name:'Paxys, Inc.',base:2.1},
{sym:'OV',name:'The Philodrill Corporation',base:0.0087},
{sym:'BSC',name:'Basic Energy Corporation',base:0.111},
{sym:'PHC',name:'Philcomsat Holdings Corporation',base:1.6},
{sym:'TFC',name:'PTFC Redevelopment Corporation',base:45.0},
{sym:'BRN',name:'A Brown Company, Inc.',base:0.67},
{sym:'VITA',name:'Vitarich Corporation',base:0.5},
{sym:'IPM',name:'IPM Holdings, Inc.',base:2.18},
{sym:'CA',name:'Concrete Aggregates Corporation',base:53.2},
{sym:'CAB',name:'Concrete Aggregates Corporation',base:54.8},
{sym:'ELI',name:'Empire East Land Holdings, Inc.',base:0.1},
{sym:'LOTO',name:'Pacific Online Systems Corporation',base:1.79},
{sym:'ASLAG',name:'Raslag Corp.',base:0.94},
{sym:'C',name:'Chelsea Logistics and Infrastructure Holdings Corp.',base:0.61},
{sym:'ABA',name:'AbaCore Capital Holdings, Inc.',base:0.305},
{sym:'FRUIT',name:'Fruitas Holdings, Inc.',base:0.65},
{sym:'PHR',name:'PH Resorts Group Holdings, Inc.',base:0.187},
{sym:'PHES',name:'Philippine Estates Corporation',base:0.43},
{sym:'CEI',name:'Crown Equities, Inc.',base:0.082},
{sym:'WPI',name:'Waterfront Philippines, Incorporated',base:0.49},
{sym:'ORE',name:'Oriental Peninsula Resources Group, Inc.',base:0.425},
{sym:'MRC',name:'MRC Allied, Inc.',base:0.76},
{sym:'JOH',name:'Jolliville Holdings Corporation',base:3.98},
{sym:'COAL',name:'Tubig Pilipinas Holdings Inc.',base:0.028},
{sym:'NOW',name:'NOW Corporation',base:0.61},
{sym:'CROWN',name:'Crown Asia Chemicals Corporation',base:1.75},
{sym:'APVI',name:'Altus Property Ventures, Inc.',base:10.2},
{sym:'SRDC',name:'Supercity Realty Development Corporation',base:9.0},
{sym:'WIN',name:'Wellex Industries, Incorporated',base:0.29},
{sym:'FJP',name:'F & J Prince Holdings Corporation',base:2.3},
{sym:'FJPB',name:'F & J Prince Holdings Corporation',base:2.62},
{sym:'RLT',name:'Philippine Realty and Holdings Corporation',base:0.099},
{sym:'HOME',name:'AllHome Corp.',base:0.24},
{sym:'LODE',name:'Lodestar Investment Holdings Corporation',base:0.3},
{sym:'FERRO',name:'Ferronoux Holdings, Inc.',base:2.6},
{sym:'ION',name:'Ionics, Inc.',base:1.06},
{sym:'BKR',name:'Bright Kindle Resources & Investments, Inc.',base:0.57},
{sym:'FOOD',name:'Alliance Select Foods International, Inc.',base:0.34},
{sym:'PHA',name:'Premiere Horizon Alliance Corporation',base:0.142},
{sym:'ALLDY',name:'AllDay Marts, Inc.',base:0.035},
{sym:'KEP',name:'Keppel Philippines Properties, Inc.',base:2.69},
{sym:'TUGS',name:'Harbor Star Shipping Services, Inc.',base:0.87},
{sym:'EGRN',name:'Everwoods Green Resources and Holdings, Inc.',base:0.031},
{sym:'LAND',name:'City & Land Developers, Incorporated',base:0.485},
{sym:'ENEX',name:'ENEX Energy Corp.',base:3.06},
{sym:'LPC',name:'LFM Properties Corporation',base:0.03},
{sym:'DWC',name:'Discovery World Corporation',base:0.86},
{sym:'APC',name:'APC Group, Inc.',base:0.096},
{sym:'PRIM',name:'Prime Media Holdings, Inc.',base:0.74},
{sym:'GREEN',name:'Greenergy Holdings Incorporated',base:0.16},
{sym:'MB',name:'Manila Bulletin Publishing Corporation',base:0.19},
{sym:'FAF',name:'First Abacus Financial Holdings Corporation',base:0.63},
{sym:'IMP',name:'Imperial Resources, Incorporated',base:0.94},
{sym:'FYN',name:'Filsyn Corporation',base:2.9},
{sym:'FYNB',name:'Filsyn Corporation',base:5.0},
{sym:'LSC',name:'Lorenzo Shipping Corporation',base:0.61},
{sym:'X',name:'Xurpas Inc.',base:0.23},
{sym:'IS',name:'Island Information & Technology, Inc.',base:0.114},
{sym:'MEDIC',name:'Medilines Distributors Incorporated',base:0.2},
{sym:'MFIN',name:'Makati Finance Corporation',base:1.92},
{sym:'ACE',name:'Acesite (Phils.) Hotel Corporation',base:1.51},
{sym:'ARA',name:'Araneta Properties, Inc.',base:0.26},
{sym:'T',name:'Tiger World Holdings Corporation',base:0.3},
{sym:'JAS',name:'Jackstones, Inc.',base:2.01},
{sym:'NI',name:'NiHAO Mineral Resources International, Inc.',base:0.49},
{sym:'BALAI',name:'Balai Ni Fruitas, Inc.',base:0.33},
{sym:'ANI',name:'AgriNurture, Inc.',base:0.48},
{sym:'LMG',name:'LMG Corp.',base:0.25},
{sym:'TBGI',name:'Transpacific Broadband Group International, Inc.',base:0.117},
{sym:'IDC',name:'Italpinas Development Corporation',base:0.58},
{sym:'BHI',name:'Boulevard Holdings, Inc.',base:0.028},
{sym:'TECH',name:'Cirtek Holdings Philippines Corporation',base:0.57},
{sym:'ECP',name:'Easycall Communications Philippines, Inc.',base:2.28},
{sym:'BH',name:'BHI Holdings, Inc.',base:680.0},
{sym:'GPH',name:'Grand Plaza Hotel Corporation',base:6.01},
{sym:'FPI',name:'Forum Pacific, Inc.',base:0.275},
{sym:'SPM',name:'Seafront Resources Corporation',base:2.38},
{sym:'DFNN',name:'DFNN, Inc.',base:0.76},
{sym:'MED',name:'Medco Holdings, Inc.',base:0.089},
{sym:'GEO',name:'GEOGRACE Resources Philippines, Inc.',base:0.079},
{sym:'KPPI',name:'Kepwealth Property Phils., Inc.',base:1.28},
{sym:'DIZ',name:'Dizon Copper-Silver Mines, Inc.',base:3.25},
{sym:'PA',name:'Pacifica Holdings, Inc.',base:0.77},
{sym:'MAH',name:'Metro Alliance Holdings & Equities Corp.',base:0.405},
{sym:'MAHB',name:'Metro Alliance Holdings & Equities Corp.',base:1.21},
{sym:'SOC',name:'SOCResources, Inc.',base:0.209},
{sym:'ABSP',name:'ABS-CBN Holdings Corporation',base:2.03},
{sym:'MG',name:'Millennium Global Holdings, Inc.',base:0.066},
{sym:'ZHI',name:'Zeus Holdings, Inc.',base:0.055},
{sym:'I',name:'I-Remit, Inc.',base:0.199},
{sym:'OM',name:'Omico Corporation',base:0.102},
{sym:'SFI',name:'Swift Foods, Inc.',base:0.053},
{sym:'MHC',name:'Mabuhay Holdings Corporation',base:0.105}
];
const BLUE_CHIP_SYMS = ['JFC','SM','ALI','BDO','TEL','ICT','URC','MER'];
let tpCurrentSym = null;

function tpSeed(str){
  let seed=0;
  for(let i=0;i<str.length;i++) seed=(seed*31+str.charCodeAt(i))>>>0;
  return seed;
}
function tpRand(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// ══════════════════════════
// LIVE PSE HISTORY LOADER
// Fetches pse-history.json (produced by the GitHub Actions scraper hitting
// PSE Edge's DisclosureCht.ax endpoint every 15min during trading hours)
// and populates tpLiveSeries per ticker. If the fetch fails, the ticker is
// missing from the file, or the data is stale (>3 days old), tpGetSeries()
// below falls back to the seeded mock generator — the Trade tab always has
// *something* to render, it just may not be live.
//
// Note: the scraper's 'value' field is peso turnover (₱), not share volume —
// PSE Edge's DisclosureCht.ax endpoint doesn't expose share count. It's
// mapped into the 'volume' key here for compatibility with the existing
// stats table, but represents traded value, not share quantity.
// ══════════════════════════
// ══════════════════════════
// MANUAL WORKFLOW REFRESH BUTTON
// Triggers the pse-live-scraper.yml GitHub Actions workflow via the
// REST API's workflow_dispatch endpoint. Requires a Personal Access
// Token with 'repo' + 'workflow' scope, entered by the user at click
// time and kept ONLY in sessionStorage (cleared when the tab/browser
// closes) — never written to this file or committed to the repo.
// Docs: https://docs.github.com/en/rest/actions/workflows
// ══════════════════════════
var TP_GH_OWNER = 'jomerpb';
var TP_GH_REPO = 'JOMERPBSTREAM';
var TP_GH_WORKFLOW = 'pse-live-scraper.yml';
var TP_GH_REF = 'main';

var tpRefreshPollTimer = null;
var tpRefreshTimeoutTimer = null;

function tpGetGithubToken(){
  var t = sessionStorage.getItem('tp_gh_token');
  if (!t) {
    t = window.prompt('Paste your GitHub Personal Access Token (needs "repo" + "workflow" scope).\n\nStored only for this browser session — never saved to the site or the repo.');
    if (t && t.trim()) sessionStorage.setItem('tp_gh_token', t.trim());
  }
  return t ? t.trim() : null;
}

function tpClearRefreshTimers(){
  if (tpRefreshPollTimer) { clearTimeout(tpRefreshPollTimer); tpRefreshPollTimer = null; }
  if (tpRefreshTimeoutTimer) { clearTimeout(tpRefreshTimeoutTimer); tpRefreshTimeoutTimer = null; }
}

function tpFinishRefresh(message){
  tpClearRefreshTimers();
  var btn = document.getElementById('tp-refresh-btn');
  var status = document.getElementById('tp-refresh-status');
  btn.disabled = false;
  btn.classList.remove('tp-refresh-spinning');
  if (message != null) status.textContent = message;
}

async function tpPollRunStatus(runId, ghHeaders, deadline){
  var status = document.getElementById('tp-refresh-status');
  if (Date.now() > deadline) {
    tpFinishRefresh('Still running — check the Actions tab on GitHub for status.');
    return;
  }
  try {
    var resp = await fetch(
      'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/runs/' + runId,
      { headers: ghHeaders }
    );
    if (!resp.ok) { tpFinishRefresh('Lost track of run status ❌ — check the Actions tab.'); return; }
    var run = await resp.json();
    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        await loadPseLiveQuotes();
        tpFinishRefresh(null);
      } else {
        tpFinishRefresh('Run finished with issues ❌ (' + run.conclusion + ') — check Actions tab.');
      }
      return;
    }
    status.textContent = 'Workflow ' + run.status + '... (' + Math.round((deadline - Date.now()) / 1000) + 's left before we stop watching)';
    tpRefreshPollTimer = setTimeout(function(){ tpPollRunStatus(runId, ghHeaders, deadline); }, 5000);
  } catch (e) {
    tpFinishRefresh('Network error while checking status ❌ — ' + e.message);
  }
}

async function tpFindNewRun(ghHeaders, sinceMs, deadline){
  var status = document.getElementById('tp-refresh-status');
  if (Date.now() > deadline) {
    tpFinishRefresh('Triggered, but couldn\'t confirm it started — check the Actions tab.');
    return;
  }
  try {
    var resp = await fetch(
      'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/workflows/' + TP_GH_WORKFLOW + '/runs?event=workflow_dispatch&per_page=5',
      { headers: ghHeaders }
    );
    if (!resp.ok) { tpFinishRefresh('Lost track of the run ❌ — check the Actions tab.'); return; }
    var data = await resp.json();
    var runs = (data && data.workflow_runs) || [];
    var match = runs.find(function(r){ return new Date(r.created_at).getTime() >= sinceMs; });
    if (match) {
      status.textContent = 'Run started — watching for completion...';
      tpPollRunStatus(match.id, ghHeaders, deadline);
    } else {
      status.textContent = 'Waiting for run to appear...';
      tpRefreshPollTimer = setTimeout(function(){ tpFindNewRun(ghHeaders, sinceMs, deadline); }, 4000);
    }
  } catch (e) {
    tpFinishRefresh('Network error while locating run ❌ — ' + e.message);
  }
}

async function tpTriggerRefresh(){
  var btn = document.getElementById('tp-refresh-btn');
  var status = document.getElementById('tp-refresh-status');
  var token = tpGetGithubToken();
  if (!token) { status.textContent = 'Cancelled — no token entered.'; return; }

  btn.disabled = true;
  btn.classList.add('tp-refresh-spinning');
  status.textContent = 'Triggering PSE Live Quote Scraper...';

  var ghHeaders = {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28'
  };
  var dispatchTime = Date.now();

  try {
    var resp = await fetch(
      'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/workflows/' + TP_GH_WORKFLOW + '/dispatches',
      { method: 'POST', headers: ghHeaders, body: JSON.stringify({ ref: TP_GH_REF }) }
    );

    if (resp.status === 204) {
      status.textContent = 'Triggered ✅ — locating the run...';
      var deadline = Date.now() + 5 * 60 * 1000; // 5 min safety cap
      tpRefreshPollTimer = setTimeout(function(){ tpFindNewRun(ghHeaders, dispatchTime - 5000, deadline); }, 2000);
    } else if (resp.status === 401) {
      sessionStorage.removeItem('tp_gh_token');
      tpFinishRefresh('Token invalid/expired ❌ — tap again to re-enter.');
    } else if (resp.status === 403) {
      tpFinishRefresh('Forbidden ❌ — token needs "repo" + "workflow" scope.');
    } else if (resp.status === 404) {
      tpFinishRefresh('Not found ❌ — check workflow file name / repo.');
    } else {
      var body = await resp.text();
      console.error('workflow_dispatch failed:', resp.status, body);
      tpFinishRefresh('Error ' + resp.status + ' ❌ — check console for details.');
    }
  } catch (e) {
    tpFinishRefresh('Network error ❌ — ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// ENGINE REPORT CARD — triggers the pse-backtest.yml workflow (same
// token + dispatch flow as Fetch Live Data), which replays this tab's
// signal engine over the repo's stored history and grades every call
// against what actually happened next. Results land in
// pse-backtest.json, rendered below in plain language. The workflow is
// read-only against the data pipeline: it can't touch the scrapers or
// the history files.
// ══════════════════════════════════════════════════════════════
var TP_GH_BACKTEST_WORKFLOW = 'pse-backtest.yml';
var tpBacktestReloadTimer = null;

async function tpTriggerBacktest(){
  var btn = document.getElementById('tp-backtest-btn');
  var status = document.getElementById('tp-backtest-status') || document.getElementById('tp-refresh-status');
  var token = tpGetGithubToken();
  if (!token) { status.textContent = 'Cancelled — no token entered.'; return; }

  btn.disabled = true;
  status.textContent = 'Triggering signal backtest...';

  var ghHeaders = {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    var resp = await fetch(
      'https://api.github.com/repos/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/actions/workflows/' + TP_GH_BACKTEST_WORKFLOW + '/dispatches',
      { method: 'POST', headers: ghHeaders, body: JSON.stringify({ ref: TP_GH_REF }) }
    );
    if (resp.status === 204) {
      status.textContent = 'Backtest running ✅ — report reloads here in ~3 min.';
      if (tpBacktestReloadTimer) clearTimeout(tpBacktestReloadTimer);
      tpBacktestReloadTimer = setTimeout(function(){
        tpLoadBacktest();
        status.textContent = 'Report card refreshed.';
        btn.disabled = false;
      }, 3 * 60 * 1000);
    } else if (resp.status === 401) {
      sessionStorage.removeItem('tp_gh_token');
      status.textContent = 'Token invalid/expired ❌ — tap again to re-enter.';
      btn.disabled = false;
    } else if (resp.status === 403) {
      status.textContent = 'Forbidden ❌ — token needs "repo" + "workflow" scope.';
      btn.disabled = false;
    } else if (resp.status === 404) {
      status.textContent = 'Workflow not found ❌ — is pse-backtest.yml committed to the repo?';
      btn.disabled = false;
    } else {
      var body = await resp.text();
      console.error('backtest dispatch failed:', resp.status, body);
      status.textContent = 'Error ' + resp.status + ' ❌ — check console.';
      btn.disabled = false;
    }
  } catch (e) {
    status.textContent = 'Network error ❌ — ' + e.message;
    btn.disabled = false;
  }
}

// JUSTIFICATION / REPORT view toggle — mirrors the Stream tab's
// segmented category control. "Justification" shows the reasoning
// card; "Report" shows the engine report card (with its Report Card
// run button inside).
function tpSetView(view, el){
  var btns = document.querySelectorAll('#tp-view-seg .seg-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (el) el.classList.add('active');
  var just = document.getElementById('tp-summary-card');
  var rep = document.getElementById('tp-backtest-card');
  if (just) just.style.display = (view === 'justification') ? '' : 'none';
  if (rep) rep.style.display = (view === 'report') ? '' : 'none';
}

var tpBacktestCollapsed = false;
function tpToggleBacktestBody(){
  tpBacktestCollapsed = !tpBacktestCollapsed;
  var txt = document.getElementById('tp-backtest-text');
  var tag = document.getElementById('tp-backtest-tag');
  if (txt) txt.style.display = tpBacktestCollapsed ? 'none' : 'block';
  if (tag) tag.textContent = 'ENGINE REPORT CARD ' + (tpBacktestCollapsed ? '▸' : '▾');
}

function tpBtStat(st){ return st && st.n ? st : null; }
function tpBtPct(x){ return (x==null) ? '—' : (x>=0?'+':'')+x.toFixed(2)+'%'; }

// Converts the raw confidencePct (how much of the engine's own scoring
// rules agree with each other) into a Setup Quality grade for display.
// Same underlying number as before -- only the label changes. This exists
// because users reasonably read "92%" as "92% chance this trade wins,"
// which isn't what the number measures (see pse-backtest.json: SELL
// confidence80plus hitRatePct was NOT higher than confidenceBelow80,
// i.e. confidence had zero demonstrated predictive value for SELL calls
// as of the last backtest run). Shared by both the PSE and Crypto tabs.
function tpConfidenceGrade(pct){
  if(pct>=90) return 'A+';
  if(pct>=80) return 'A';
  if(pct>=65) return 'B';
  if(pct>=50) return 'C';
  return 'D';
}

// Interpolates each signal's badge color from a light tint (low
// confidence) to the exact solid color already defined in styles.css for
// #trade-page (--green:#22c55e, --red:#ef4444, --amber:#f59e0b) at 100%
// confidence. Returns {text, bg} for inline styling. Base colors are
// hardcoded here to MATCH styles.css exactly -- if those CSS variables
// ever change, this must be updated too or the two will drift apart.
var TP_BADGE_BASE_RGB = {
  BUY:  [34,197,94],   BULL: [34,197,94],
  SELL: [239,68,68],   BEAR: [239,68,68],
  HOLD: [245,158,11],  FLAT: [100,116,139]
};
function tpConfidenceColor(pct, signalType){
  var base = TP_BADGE_BASE_RGB[signalType] || TP_BADGE_BASE_RGB.HOLD;
  var t = 0.2 + 0.8 * Math.max(0, Math.min(100, pct)) / 100; // 0.2 (pale) .. 1.0 (full color) at 100%
  var r = Math.round(255 + (base[0]-255)*t);
  var g = Math.round(255 + (base[1]-255)*t);
  var b = Math.round(255 + (base[2]-255)*t);
  return {
    text: 'rgb('+r+','+g+','+b+')',
    bg:   'rgba('+base[0]+','+base[1]+','+base[2]+',0.15)'
  };
}
// Convenience for small inline tags (gainer list) where a pct might be
// null (trend not yet known for that symbol) -- defaults to 0 (palest
// tint) rather than throwing, since a missing pct shouldn't crash render.
function tpTagStyle(signalType, pct){
  var c = tpConfidenceColor(pct == null ? 0 : pct, signalType);
  return 'color:'+c.text+';background:'+c.bg+';';
}

// Renders pse-backtest.json as plain language a first-time trader can
// follow: what was tested, how often each call was right, how big the
// wins/losses were, whether high-confidence calls earned their %, and
// whether the support/resistance levels actually held when touched.
function tpRenderBacktest(data){
  var el = document.getElementById('tp-backtest-text');
  if (!el) return;
  var parts = [];

  parts.push("What this is: the engine was rewound through this site's own stored PSE price history and made to call BUY / SELL / HOLD using ONLY the data it would have had on each past day — then every call was graded against what the price actually did afterward. "
    + "It graded <b>" + (data.barsGraded||0).toLocaleString() + " signal-days</b> across <b>" + (data.tickersTested||0) + " stocks</b>"
    + (data.dateRange && data.dateRange.from ? " (" + data.dateRange.from + " to " + data.dateRange.to + ")" : "")
    + (data.generatedAt ? ", last run " + data.generatedAt.slice(0,10) : "") + ".");

  var buy2 = tpBtStat(data.signals && data.signals.BUY && data.signals.BUY['2']);
  if (buy2){
    parts.push("<b>BUY signals</b> (" + buy2.n.toLocaleString() + " of them): over the next 2 sessions the stock rose <b>" + buy2.hitRatePct + "%</b> of the time, with an average move of " + tpBtPct(buy2.avgReturnPct) + ". When right it gained " + tpBtPct(buy2.avgWinPct) + " on average; when wrong it lost " + tpBtPct(buy2.avgLossPct!=null?-buy2.avgLossPct:null) + ". Plain reading: anything meaningfully above 50% with wins bigger than losses means the signal has genuinely earned some trust; near 50% means it's closer to a coin flip than it looks.");
  } else {
    parts.push("<b>BUY signals</b>: none occurred in the stored history yet — the engine's BUY bar (oversold momentum inside a real trend) is deliberately hard to clear, so this fills in as more history accumulates.");
  }

  var sell2 = tpBtStat(data.signals && data.signals.SELL && data.signals.SELL['2']);
  if (sell2){
    parts.push("<b>SELL signals</b> (" + sell2.n.toLocaleString() + "): the stock fell within 2 sessions <b>" + sell2.hitRatePct + "%</b> of the time (average move " + tpBtPct(sell2.avgReturnPct!=null?-sell2.avgReturnPct:null) + " for the stock, i.e. that's how much selling would have protected). Same reading rule: well above 50% = trustworthy warning, near 50% = weak warning.");
  } else {
    parts.push("<b>SELL signals</b>: none in the stored history yet — same reason as BUY, the trigger bar is deliberately strict.");
  }

  // Checked for BOTH signal types now, not just BUY -- a prior version
  // only ever validated BUY, which meant a SELL confidence% with zero
  // predictive value could go unflagged indefinitely. See pse-backtest.json:
  // SELL confidence80plus hitRatePct (50.0%) vs confidenceBelow80 (51.4%)
  // is the exact case this used to miss.
  ['BUY','SELL'].forEach(function(sigType){
    var cb = data.confidenceBuckets2d && data.confidenceBuckets2d[sigType];
    if (cb && tpBtStat(cb.confidence80plus) && tpBtStat(cb.confidenceBelow80)){
      var hi = cb.confidence80plus, mid = cb.confidenceBelow80;
      var honest = (hi.hitRatePct > mid.hitRatePct)
        ? "the high-confidence calls really were right more often — the confidence % means something."
        : "the high-confidence calls were NOT more accurate than the ordinary ones — honest takeaway: don't size positions bigger just because the % is bigger, until this improves.";
      parts.push("<b>Does the confidence % mean anything for " + sigType + "?</b> " + sigType + "s at 80%+ confidence were right " + hi.hitRatePct + "% of the time vs " + mid.hitRatePct + "% for lower-confidence " + sigType + "s — " + honest);
    }
  });

  var srS = data.supportResistance && data.supportResistance.support;
  var srR = data.supportResistance && data.supportResistance.resistance;
  if ((srS && srS.touches) || (srR && srR.touches)){
    var bits = [];
    if (srS && srS.touches) bits.push("floors (support) held <b>" + srS.heldPct + "%</b> of the " + srS.touches.toLocaleString() + " times price came back to one");
    if (srR && srR.touches) bits.push("ceilings (resistance) held <b>" + srR.heldPct + "%</b> of " + srR.touches.toLocaleString() + " touches");
    parts.push("<b>Do the Key Levels actually work?</b> On this site's own data: " + bits.join("; ") + ". Anything clearly above 50% means the levels are real behavior on the PSE, not chart folklore — and the exact % tells you how much weight to give them.");
  }

  parts.push("<b>Honest fine print:</b> this grades the past, and the past never guarantees the future — an engine that scored well can still be wrong tomorrow. What the report card is FOR: catching weak spots (a signal type barely beating a coin flip) and telling you which parts of this tab have earned trust on real Philippine market data rather than borrowed studies from other countries. It grows more reliable automatically as every trading day adds bars to the history.");

  el.innerHTML = tpBulletsHTML(parts);
}

async function tpLoadBacktest(){
  var el = document.getElementById('tp-backtest-text');
  if (!el) return;
  var RAW_URL = 'https://raw.githubusercontent.com/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/' + TP_GH_REF + '/pse-backtest.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    tpRenderBacktest(data);
  } catch (e) {
    el.innerHTML = tpBulletsHTML([
      "No report card yet. Tap the <b>Report Card</b> button above to run the first one — it rewinds through this site's stored PSE history, replays every BUY / SELL / HOLD this engine would have called, and grades each one against what the price actually did next. Takes about 2-3 minutes, then the results appear here.",
      "Why it matters: every number on this tab is currently the formula's own opinion of itself. The report card is the only place where those opinions get checked against reality — on Philippine stocks specifically, not borrowed foreign studies."
    ]);
  }
}
tpLoadBacktest();

var tpLiveSeries = {};
var PSE_HISTORY_STATUS = {loaded:false, source:'fallback estimates (live feed unavailable)', error:null};
function tpFormatPH(iso){
  try {
    return new Date(iso).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila', month:'short', day:'numeric',
      hour:'2-digit', minute:'2-digit'
    }) + ' PH';
  } catch(e) { return iso; }
}
async function loadPseHistory(){
  var RAW_URL = 'https://raw.githubusercontent.com/jomerpb/JOMERPBSTREAM/main/pse-history.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    if (!data.tickers) throw new Error('Malformed pse-history.json: missing tickers');
    var loadedCount = 0;
    for (var sym in data.tickers) {
      var entry = data.tickers[sym];
      if (Array.isArray(entry.series) && entry.series.length) {
        tpLiveSeries[sym] = entry.series.map(function(d){
          return {date:d.date, open:d.open, high:d.high, low:d.low, close:d.close, volume:d.value||0};
        });
        loadedCount++;
      }
    }
    var stale = false;
    var ageMs = null;
    if (data.generatedAt) {
      ageMs = Date.now() - new Date(data.generatedAt).getTime();
      stale = ageMs > 1000*60*60*24*3; // >3 days without an update = don't trust it blindly
    }
    PSE_HISTORY_STATUS = {
      loaded: loadedCount>0 && !stale,
      source: loadedCount>0 ? ('live ('+loadedCount+' tickers, updated '+(data.generatedAt||'unknown')+')') : 'fallback estimates (live feed unavailable)',
      error: stale ? 'data is stale (>3 days old)' : null
    };
    console.log('PSE history loaded:', PSE_HISTORY_STATUS.source, PSE_HISTORY_STATUS.error||'');
  } catch(e) {
    PSE_HISTORY_STATUS = {loaded:false, source:'fallback estimates (live feed unavailable)', error:e.message};
    console.warn('PSE history load failed, using mock data:', e.message);
  }
  var disclaimerEl = document.getElementById('tp-disclaimer');
  if(disclaimerEl){
    disclaimerEl.textContent = PSE_HISTORY_STATUS.loaded
      ? 'Live PSE data, refreshed periodically during trading hours via PSE Edge. Historical daily bars — not tick-by-tick real-time. Signals are for decision support only; verify current prices with your broker before trading. Not financial advice.'
      : 'Live feed temporarily unavailable — showing fallback estimates until the PSE Edge data reconnects. Signals are for decision support only; verify current prices with your broker before trading. Not financial advice.';
  }
  var ddElBlue = document.getElementById('tp-dropdown');
  var searchElBlue = document.getElementById('tp-stock-search');
  if(ddElBlue && ddElBlue.classList.contains('open')){
    tpRenderDropdown(searchElBlue ? searchElBlue.value : '');
  }
  tpRenderTopGainers();
  tpRenderWatchlist();
}
var PSE_HISTORY_READY = loadPseHistory();

// Unified series getter: live data when available and fresh, mock fallback otherwise.
// Unified series getter: live blue-chip data (freshest, 15-min cadence)
// first, then live full-market data (all ~283 tickers, ~1 day behind but
// still real), mock fallback only if neither has this ticker yet.
//
// BUG FIX: this used to check ONLY tpLiveSeries (the 8 blue-chip
// tickers) and fall straight to the mock generator for every other
// symbol -- silently, since tpLiveSeriesAll was being loaded in the
// background but never consulted here. That meant RSI/SMA/trend/signal/
// chart for ~275 of 283 tickers were entirely synthetic, and because the
// mock generator always stamps its last bar as the current device date,
// "Last Traded" read "today" for any non-blue-chip stock regardless of
// whether the market had even opened yet. Real per-ticker OHLC data
// (tpLiveSeriesAll) takes priority over mock now, same as everywhere
// else in this file that already reads live data with this fallback
// chain (tpGetPicklistPrice, tpComputeTopGainersFromHistory).
function tpGetSeries(sym, days){
  var live = tpLiveSeries[sym];
  if (Array.isArray(live) && live.length && !PSE_HISTORY_STATUS.error) {
    return live.slice(Math.max(0, live.length - (days+1)));
  }
  var liveAll = tpLiveSeriesAll[sym];
  if (Array.isArray(liveAll) && liveAll.length) {
    return liveAll.slice(Math.max(0, liveAll.length - (days+1)));
  }
  var t = tpFindStock(sym);
  var base = t ? t.base : 100;
  return tpGenSeries(base, days, tpSeed(sym+'-pse-demo'));
}

// ══════════════════════════
// FULL-MARKET LIVE DATA LOADER
// Same pattern as the blue-chip loader above, but for pse-full-history.json
// (all ~283 PSE-listed tickers, produced by the once-daily sharded scraper).
// Blue-chip tickers already have their own 15-min-fresh data via
// tpLiveSeries above and take priority; this is purely for the picklist
// price/arrow on the ~275 non-blue-chip stocks that otherwise have none.
// ══════════════════════════
var tpLiveSeriesAll = {};
var PSE_FULL_HISTORY_STATUS = {loaded:false, tickerCount:0, error:null};
var PSE_FULL_HISTORY_READY = (async function loadPseFullHistory(){
  var RAW_URL = 'https://raw.githubusercontent.com/jomerpb/JOMERPBSTREAM/main/pse-full-history.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    if (!data.tickers) throw new Error('Malformed pse-full-history.json: missing tickers');
    var loadedCount = 0;
    for (var sym in data.tickers) {
      var entry = data.tickers[sym];
      if (Array.isArray(entry.series) && entry.series.length) {
        tpLiveSeriesAll[sym] = entry.series.map(function(d){
          return {date:d.date, open:d.open, high:d.high, low:d.low, close:d.close, volume:d.value||0};
        });
        loadedCount++;
      }
    }
    PSE_FULL_HISTORY_STATUS = {loaded: loadedCount>0, tickerCount: loadedCount, error: null};
    console.log('PSE full-market history loaded:', loadedCount, 'tickers');
  } catch(e) {
    PSE_FULL_HISTORY_STATUS = {loaded:false, tickerCount:0, error:e.message};
    console.warn('PSE full-market history load failed:', e.message);
  }
  // If the picklist is already open when this resolves, refresh it in
  // place so prices/arrows appear without the user needing to retype.
  var ddEl = document.getElementById('tp-dropdown');
  var searchEl = document.getElementById('tp-stock-search');
  if(ddEl && ddEl.classList.contains('open')){
    tpRenderDropdown(searchEl ? searchEl.value : '');
  }
  tpRenderTopGainers();
  tpRenderWatchlist();
})();

// Live same-session quotes (stockData.do, once daily ~4PM Manila — see
// pse-live-scraper.yml). Unlike tpLiveSeriesAll (settled EOD chart bars,
// which run ~1 day behind), this reflects the actual current/most-recent
// trading session, validated directly against pesobility's live board:
// 7/10 top movers matched, 3 to the exact hundredth of a percent. This is
// now the primary source for Top Gainers; tpLiveSeriesAll stays the source
// for the chart, RSI, and SMA, which need a full history, not one snapshot.
var tpLiveQuotes = {};
var PSE_LIVE_QUOTES_STATUS = {loaded:false, tickerCount:0, error:null, generatedAt:null};
async function loadPseLiveQuotes(){
  var RAW_URL = 'https://raw.githubusercontent.com/jomerpb/JOMERPBSTREAM/main/pse-live-quotes.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    if (!data.quotes) throw new Error('Malformed pse-live-quotes.json: missing quotes');
    var loadedCount = 0;
    for (var sym in data.quotes) {
      tpLiveQuotes[sym] = data.quotes[sym];
      loadedCount++;
    }
    PSE_LIVE_QUOTES_STATUS = {loaded: loadedCount>0, tickerCount: loadedCount, error: null, generatedAt: data.generatedAt || null};
    console.log('PSE live quotes loaded:', loadedCount, 'tickers, generatedAt:', data.generatedAt);
  } catch(e) {
    PSE_LIVE_QUOTES_STATUS = {loaded:false, tickerCount:0, error:e.message, generatedAt:null};
    console.warn('PSE live quotes load failed:', e.message);
  }
  var statusEl = document.getElementById('tp-refresh-status');
  if (statusEl) {
    statusEl.textContent = PSE_LIVE_QUOTES_STATUS.generatedAt
      ? 'Data Updated ' + tpFormatPH(PSE_LIVE_QUOTES_STATUS.generatedAt)
      : 'Data unavailable — ' + (PSE_LIVE_QUOTES_STATUS.error || 'no timestamp in file');
  }
  tpRenderTopGainers();
  tpRenderWatchlist();
  if (tpCurrentSym) tpRenderAll(tpCurrentSym);
}
var PSE_LIVE_QUOTES_READY = loadPseLiveQuotes();

// Returns {current, previous, direction} for the picklist price/arrow, or
// null if no live data exists for this symbol yet (blue-chip data takes
// priority since it's fresher; full-market data is the fallback).
// direction: 'up' | 'down' | 'flat' | null (null if only one data point exists)
function tpGetPicklistPrice(sym){
  var lq = tpLiveQuotes[sym];
  if (lq && lq.status === 'Open' && lq.last != null && lq.previousClose) {
    var dir = lq.last > lq.previousClose ? 'up' : (lq.last < lq.previousClose ? 'down' : 'flat');
    return {current: lq.last, previous: lq.previousClose, direction: dir};
  }
  var series = tpLiveSeries[sym] || tpLiveSeriesAll[sym];
  if (!Array.isArray(series) || series.length === 0) return null;
  var current = series[series.length-1].close;
  var previous = series.length >= 2 ? series[series.length-2].close : null;
  var direction = previous == null ? null : (current > previous ? 'up' : (current < previous ? 'down' : 'flat'));
  return {current: current, previous: previous, direction: direction};
}

// ══════════════════════════
// WATCHLIST — localStorage-backed. Each entry: {sym, watchPrice, dir}.
// dir is captured at the moment the watch price is typed in, by comparing
// it against the price at that time: a target ABOVE the then-current price
// means "alert me when it rises to this," a target below means "alert me
// when it falls to this." The HIT check then only needs the latest price.
// ══════════════════════════
var TP_WATCH_KEY = 'tpWatchlist';
function tpGetWatch(){
  try { return JSON.parse(localStorage.getItem(TP_WATCH_KEY) || '[]'); }
  catch(e){ return []; }
}
function tpSaveWatch(list){
  try { localStorage.setItem(TP_WATCH_KEY, JSON.stringify(list)); } catch(e){}
}
function tpIsWatched(sym){ return tpGetWatch().some(function(w){ return w.sym===sym; }); }
function tpWatchLastPrice(sym){
  var info = tpGetPicklistPrice(sym);
  if(info && info.current != null) return info.current;
  try {
    var series = tpGetSeries(sym, 5);
    if(series && series.length) return series[series.length-1].close;
  } catch(e){}
  return null;
}
// Recommended alert levels for a symbol \u2014 seeded from the SAME two
// trigger prices the reasoning card's entry/exit section uses
// (tpTriggerLevels): High alert = the ceiling (buy trigger \u2014 a close
// above it is the event worth acting on), Low alert = the floor (sell
// trigger). Live bar merged in so a freshly-added watch reflects the
// CURRENT session. Best-effort: any failure falls back to empty inputs.
function tpRecommendedBand(sym){
  try {
    var series = tpMergeLiveBar(tpGetSeries(sym, 90), sym);
    if(!series || series.length < 2) return null;
    var sig = tpComputeSignal(series);
    var band = tpProjectedBand(sig);
    var trig = tpTriggerLevels(sig, band);
    if(!trig) return null;
    var hi = parseFloat(tpFmtLvl(trig.res)), lo = parseFloat(tpFmtLvl(trig.sup));
    if(!isFinite(hi) || !isFinite(lo) || hi <= 0 || lo <= 0) return null;
    return { high: hi, low: lo };
  } catch(e){ return null; }
}
function tpToggleWatch(){
  if(!tpCurrentSym) return;
  var list = tpGetWatch();
  var i = list.findIndex(function(w){ return w.sym===tpCurrentSym; });
  if(i >= 0) list.splice(i,1);
  else {
    var band = tpRecommendedBand(tpCurrentSym);
    list.push({
      sym: tpCurrentSym,
      highPrice: band ? band.high : null,
      lowPrice:  band ? band.low  : null
    });
  }
  tpSaveWatch(list);
  tpUpdateWatchBtn();
  tpRenderWatchlist();
}
function tpRemoveWatch(sym){
  tpSaveWatch(tpGetWatch().filter(function(w){ return w.sym!==sym; }));
  tpUpdateWatchBtn();
  tpRenderWatchlist();
}
function tpSetWatchPrice(sym, field, val){
  var list = tpGetWatch();
  var w = list.find(function(x){ return x.sym===sym; });
  if(!w) return;
  var p = parseFloat(val);
  w[field] = (!isFinite(p) || p <= 0) ? null : p;
  tpSaveWatch(list);
  tpRenderWatchlist();
}
// Collapsible cards (Top Gainers, Watchlist) — state persists per card.
function tpToggleCard(key){
  var body = document.getElementById('tp-body-'+key);
  var chev = document.getElementById('tp-chev-'+key);
  if(!body) return;
  var collapsed = body.classList.toggle('collapsed');
  if(chev) chev.classList.toggle('collapsed', collapsed);
  try { localStorage.setItem('tpCardCollapsed-'+key, collapsed ? '1' : '0'); } catch(e){}
}
function tpInitCardCollapse(){
  ['gainers','watch'].forEach(function(key){
    var saved = null;
    try { saved = localStorage.getItem('tpCardCollapsed-'+key); } catch(e){}
    if(saved === '1'){
      var body = document.getElementById('tp-body-'+key);
      var chev = document.getElementById('tp-chev-'+key);
      if(body) body.classList.add('collapsed');
      if(chev) chev.classList.add('collapsed');
    }
  });
}
function tpUpdateWatchBtn(){
  var b = document.getElementById('tp-watch-add');
  if(!b || !tpCurrentSym) return;
  var on = tpIsWatched(tpCurrentSym);
  b.textContent = on ? '\u2713' : '\uFF0B';
  b.classList.toggle('active', on);
  b.title = on ? 'Remove from watchlist' : 'Add to watchlist';
}
function tpRenderWatchlist(){
  var listEl = document.getElementById('tp-watch-list');
  var emptyEl = document.getElementById('tp-watch-empty');
  if(!listEl) return;
  var list = tpGetWatch();
  // One-time migration from the old single-target format: a target that
  // was above the price becomes the High box, below becomes the Low box.
  var migrated = false;
  list.forEach(function(w){
    if(w.watchPrice != null && w.highPrice === undefined && w.lowPrice === undefined){
      if(w.dir === 'below') w.lowPrice = w.watchPrice; else w.highPrice = w.watchPrice;
      delete w.watchPrice; delete w.dir; migrated = true;
    }
    if(w.highPrice === undefined) w.highPrice = null;
    if(w.lowPrice === undefined) w.lowPrice = null;
  });
  if(migrated) tpSaveWatch(list);
  if(emptyEl) emptyEl.style.display = list.length ? 'none' : 'block';
  listEl.innerHTML = list.map(function(w){
    var t = tpFindStock(w.sym);
    var name = t ? t.name : w.sym;
    var last = tpWatchLastPrice(w.sym);
    var lastTxt = last == null ? '\u2014' : '\u20b1' + last.toFixed(2);
    var hitHigh = last != null && w.highPrice != null && last >= w.highPrice;
    var hitLow  = last != null && w.lowPrice  != null && last <= w.lowPrice;
    var hVal = w.highPrice == null ? '' : w.highPrice;
    var lVal = w.lowPrice == null ? '' : w.lowPrice;
    return '<div class="tp-watch-row">'+
      '<div class="tp-watch-name" onclick="tpSelectTicker(\''+w.sym+'\')">'+w.sym+' \u00b7 <small>'+name+'</small></div>'+
      '<div class="tp-watch-inbox tp-watch-lastbox"><span class="tp-watch-inlabel">Last</span>'+
        '<div class="tp-watch-last">'+lastTxt+'</div></div>'+
      '<div class="tp-watch-inbox"><span class="tp-watch-inlabel">High</span>'+
        '<input type="number" step="0.01" min="0" inputmode="decimal" class="tp-watch-input'+(hitHigh?' hit-high':'')+'" placeholder="\u20b1 high" value="'+hVal+'" onchange="tpSetWatchPrice(\''+w.sym+'\', \'highPrice\', this.value)"></div>'+
      '<div class="tp-watch-inbox"><span class="tp-watch-inlabel">Low</span>'+
        '<input type="number" step="0.01" min="0" inputmode="decimal" class="tp-watch-input'+(hitLow?' hit-low':'')+'" placeholder="\u20b1 low" value="'+lVal+'" onchange="tpSetWatchPrice(\''+w.sym+'\', \'lowPrice\', this.value)"></div>'+
      '<button class="tp-watch-remove" onclick="tpRemoveWatch(\''+w.sym+'\')" title="Remove">\u2715</button>'+
    '</div>';
  }).join('');
}

// ══════════════════════════
// TOP GAINERS (market-wide)
// Ranks every PSE_ALL_STOCKS ticker by latest close vs previous close and
// renders the top 10 into the tp-gainers card. Uses live data (blue-chip
// series first, then full-market series) same as the picklist, and falls
// back to the seeded mock series per-ticker when no live data exists yet —
// so the card always has something to show, same philosophy as tpGetSeries.
// ══════════════════════════
// Determines the market's actual most recent two session dates by taking
// the mode (most common date) rather than the max — this is robust against
// a handful of stale/illiquid tickers whose last bar is old, and against
// mock-fallback entries whose date is simply "today" on the local device.
function tpModeDate(dates){
  var counts = {};
  var best = null, bestCount = 0;
  dates.forEach(function(d){
    counts[d] = (counts[d]||0) + 1;
    if (counts[d] > bestCount) { bestCount = counts[d]; best = d; }
  });
  return best;
}

// PRIMARY: uses pse-live-quotes.json (stockData.do snapshot, once daily
// ~4PM Manila). Validated directly against pesobility's live board — 7/10
// top movers matched, 3 to the exact hundredth of a percent — so unlike
// the history-based fallback below, this doesn't need session-date
// filtering: every entry in the file is already the same snapshot moment
// (one uniform "asOf" timestamp), and "Suspended" tickers are filtered out
// by status rather than inferred from stale dates.
// The bearish=true path is currently dormant (the Bearish tab was replaced
// by the trend-engine Bullish tab) but kept intact in case a decliners
// view returns. Pass bearish=true to rank the OTHER end of the snapshot: only
// tickers that actually declined (pct < 0), worst drop first. Same data,
// same filters — just the opposite sort, so Gainers and Bearish can never
// disagree about what "today's session" means.
// Shared by Gainers AND Bullish so both can show a real BULL/BEAR/FLAT
// tag. Requires 50+ REAL history bars (never the tpGenSeries mock) --
// a fabricated series would fabricate a trend call. Returns null when
// there isn't enough real data yet, in which case callers should render
// no tag at all rather than guess.
function tpGetGainerTrend(series){
  if (!Array.isArray(series) || series.length < 50) return null;
  var closes = series.map(function(d){ return d.close; });
  var lastIdx = closes.length - 1;
  var sma20 = tpSMA(closes, 20, lastIdx);
  var sma50 = tpSMA(closes, 50, lastIdx);
  var trend = tpGetTrendState(sma20, sma50);
  return { signal: trend.state, trendConfidencePct: trend.confidencePct };
}

function tpComputeTopGainersFromLive(bearish){
  var candidates = [];
  PSE_ALL_STOCKS.forEach(function(t){
    var q = tpLiveQuotes[t.sym];
    if (!q || q.status !== 'Open' || q.last == null || !q.previousClose) return;
    var trend = tpGetGainerTrend(tpLiveSeries[t.sym] || tpLiveSeriesAll[t.sym]);
    candidates.push({sym: t.sym, name: t.name, price: q.last, pct: q.changePct,
      signal: trend ? trend.signal : null, trendConfidencePct: trend ? trend.trendConfidencePct : null});
  });
  if (bearish) {
    candidates = candidates.filter(function(c){ return c.pct < 0; });
    candidates.sort(function(a,b){ return a.pct - b.pct; });
  } else {
    candidates.sort(function(a,b){ return b.pct - a.pct; });
  }
  return candidates.slice(0, 10);
}

// FALLBACK: used only if pse-live-quotes.json hasn't loaded yet (or failed
// to load) — reconstructs a same-session ranking from the daily OHLC
// history instead, via the mode-date filtering described below. Kept as a
// fallback rather than deleted because tpLiveSeries/tpLiveSeriesAll load
// independently and may resolve before or without the live-quotes file.
function tpComputeTopGainersFromHistory(bearish){
  var candidates = [];
  PSE_ALL_STOCKS.forEach(function(t){
    var series = tpLiveSeries[t.sym] || tpLiveSeriesAll[t.sym];
    var last, prev;
    if (Array.isArray(series) && series.length >= 2) {
      last = series[series.length-1];
      prev = series[series.length-2];
    } else {
      var mock = tpGenSeries(t.base, 2, tpSeed(t.sym+'-pse-demo'));
      last = mock[mock.length-1];
      prev = mock[mock.length-2];
    }
    if (!prev || !prev.close) return;
    var trend = tpGetGainerTrend(series); // real series only -- null if mock was used above
    candidates.push({sym: t.sym, name: t.name, price: last.close, lastDate: last.date, prevDate: prev.date,
      pct: (last.close-prev.close)/prev.close*100,
      signal: trend ? trend.signal : null, trendConfidencePct: trend ? trend.trendConfidencePct : null});
  });

  // Session date = the date most tickers actually last traded on. Excludes
  // stale tickers whose most recent bar is days/weeks old.
  var sessionDate = tpModeDate(candidates.map(function(r){ return r.lastDate; }));
  var sameSession = candidates.filter(function(r){ return r.lastDate === sessionDate; });

  // Previous-session date = the date most of THOSE tickers traded on before
  // that. Excludes tickers that traded today but have a multi-day gap to
  // their prior bar (e.g. PRC: last=06-30 but prev=06-22 — real move, just
  // not a one-day move, so it doesn't belong in a "today's gainers" list).
  var prevSessionDate = tpModeDate(sameSession.map(function(r){ return r.prevDate; }));
  var todayOnly = sameSession.filter(function(r){ return r.prevDate === prevSessionDate; });

  if (bearish) {
    todayOnly = todayOnly.filter(function(r){ return r.pct < 0; });
    todayOnly.sort(function(a,b){ return a.pct - b.pct; });
  } else {
    todayOnly.sort(function(a,b){ return b.pct - a.pct; });
  }
  return todayOnly.slice(0, 10);
}

function tpComputeTopGainers(){
  var live = tpComputeTopGainersFromLive(false);
  return live.length ? live : tpComputeTopGainersFromHistory(false);
}

// TOP BULLISH — the 10 strongest confirmed uptrends on the board, ranked
// by the same SMA20-vs-SMA50 trend engine the detail view uses (see
// tpGetTrendState). This is deliberately NOT the same thing as Gainers:
// Gainers ranks one day's price pop; Bullish ranks sustained trend
// strength, so a stock can lead this list while being flat (or even red)
// today. Only real downloaded history qualifies — no tpGenSeries mock
// fallback here, because a fabricated series would fabricate a trend call.
// Stale tickers (repeated flat prints / no trade in over a week) are
// excluded: an old spike can leave a big SMA gap behind on a stock that
// isn't actually trading, and that's noise, not a trend.
function tpComputeTopBullish(){
  var candidates = [];
  PSE_ALL_STOCKS.forEach(function(t){
    var series = tpLiveSeries[t.sym] || tpLiveSeriesAll[t.sym];
    if (!Array.isArray(series) || series.length < 50) return; // SMA50 needs 50 bars
    var lt = tpLastTradeInfo(series);
    if (lt && (lt.isStale || lt.daysSince > 7)) return;
    var closes = series.map(function(d){ return d.close; });
    var lastIdx = closes.length - 1;
    var sma20 = tpSMA(closes, 20, lastIdx);
    var sma50 = tpSMA(closes, 50, lastIdx);
    var trend = tpGetTrendState(sma20, sma50);
    if (trend.state !== 'BULL') return;
    // Price + today's % change come from the live-quotes snapshot when
    // available (fresher than the EOD history bars), else the last two
    // history closes — same preference order as the picklist.
    var price, pct;
    var q = tpLiveQuotes[t.sym];
    if (q && q.status === 'Open' && q.last != null && q.previousClose) {
      price = q.last;
      pct = q.changePct;
    } else {
      var prev = series[series.length - 2];
      price = closes[lastIdx];
      pct = (prev && prev.close) ? (price - prev.close) / prev.close * 100 : 0;
    }
    candidates.push({sym: t.sym, name: t.name, price: price, pct: pct,
      gapPct: trend.gapPct, trendConfidencePct: trend.confidencePct, signal: 'BULL'});
  });
  // Strongest SMA20/SMA50 separation first — the widest, cleanest gap is
  // the most established uptrend (this is also what drives the trend
  // confidence % on the detail card).
  candidates.sort(function(a,b){ return b.gapPct - a.gapPct; });
  return candidates.slice(0, 10);
}

// ── Market selector (Stocks / Crypto) ──────
// Toggles between the full PSE stocks view and the crypto view.
// Crypto is a placeholder for now; content to be defined later.
var tpMarketMode = 'stocks';
function tpSetMarket(mode){
  if(tpMarketMode === mode) return;
  tpMarketMode = mode;
  try{ localStorage.setItem('tpMarketMode', mode); }catch(e){}
  document.querySelectorAll('#tp-market-seg .tp-gainers-tab').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-market') === mode);
  });
  var sv = document.getElementById('tp-stocks-view');
  var cv = document.getElementById('tp-crypto-view');
  if(sv) sv.style.display = (mode === 'stocks') ? '' : 'none';
  if(cv) cv.style.display = (mode === 'crypto') ? '' : 'none';
}

var tpGainersMode = 'current';
function tpSetGainersMode(mode){
  if(tpGainersMode === mode) return;
  tpGainersMode = mode;
  document.querySelectorAll('#tp-stocks-view .tp-gainers-toggle .tp-gainers-tab').forEach(function(b){
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  tpRenderTopGainers();
  tpRenderWatchlist();
}

function tpRenderTopGainers(){
  var el = document.getElementById('tp-gainers-list');
  var noteEl = document.getElementById('tp-gainers-note');
  if(!el) return;
  var top = tpGainersMode === 'bullish' ? tpComputeTopBullish() : tpComputeTopGainers();
  if(!top.length){
    el.innerHTML = '<div class="tp-gainer-empty">' +
      (tpGainersMode === 'bullish'
        ? (PSE_FULL_HISTORY_STATUS.loaded
            ? 'No stocks currently in a confirmed uptrend \u2014 no ticker has SMA20 above SMA50 by more than the '+TREND_BUFFER_PCT+'% buffer.'
            : 'Waiting for market history data\u2026 trend ranking needs the full OHLC history, which is still loading.')
        : 'No data available') +
      '</div>';
    if(noteEl) noteEl.textContent = '';
    return;
  }
  el.innerHTML = top.map(function(g, i){
    var dir = g.pct >= 0 ? 'up' : 'down';
    var sign = g.pct >= 0 ? '+' : '';
    return '<div class="tp-gainer-row" onmousedown="tpSelectTicker(\''+g.sym+'\')">'+
      '<span class="tp-gainer-rank">'+(i+1)+'</span>'+
      '<div class="tp-gainer-info">'+
        '<div class="tp-gainer-sym">'+g.sym+(g.signal?(' <span class="tp-gainer-tag '+g.signal+'" style="'+tpTagStyle(g.signal, g.trendConfidencePct)+'">'+g.signal+'</span>'):'')+'</div>'+
        '<div class="tp-gainer-name">'+g.name+'</div>'+
      '</div>'+
      '<span class="tp-gainer-price">\u20b1'+g.price.toFixed(2)+'</span>'+
      '<span class="tp-gainer-chg '+dir+'">'+sign+g.pct.toFixed(2)+'%</span>'+
    '</div>';
  }).join('');
  if(noteEl){
    noteEl.textContent = tpGainersMode === 'bullish'
      ? 'The 10 strongest confirmed uptrends by SMA20-vs-SMA50 gap \u2014 the same trend engine as the detail card, not a one-day ranking. A stock can top this list while flat or red today: the % shown is today\u2019s change, but the ORDER is trend strength. Stale or non-trading tickers are excluded.'
      : '';
  }
}
tpRenderTopGainers();
tpRenderWatchlist();
tpInitCardCollapse();

function tpGenSeries(base, days, seed){
  const rnd = tpRand(seed);
  let price = base;
  const out = [];
  const today = new Date();
  for(let i=days;i>=0;i--){
    const drift = (rnd()-0.5) * base * 0.025;
    const open = price;
    const close = Math.max(0.01, open + drift);
    const high = Math.max(open, close) + rnd()*base*0.008;
    const low  = Math.min(open, close) - rnd()*base*0.008;
    const vol  = Math.floor(500000 + rnd()*4500000);
    const d = new Date(today); d.setDate(d.getDate()-i);
    out.push({date:d.toISOString().slice(0,10), open:+open.toFixed(2), high:+high.toFixed(2), low:+Math.max(0.01,low).toFixed(2), close:+close.toFixed(2), volume:vol});
    price = close;
  }
  return out;
}
function tpSMA(closes, period, endIdx){
  if(endIdx+1 < period) return null;
  let sum=0;
  for(let i=endIdx-period+1;i<=endIdx;i++) sum+=closes[i];
  return sum/period;
}
// RSI, Wilder-smoothed — the standard definition (Wilder 1978) that
// brokers and charting platforms display. The previous version used a
// plain average of only the last `period` gains/losses, which drifts a
// few points from broker-chart RSI on the same stock, so the tab could
// say "RSI 28" while the reader's broker showed "RSI 34". This version
// seeds with that simple average over the first `period` changes, then
// applies Wilder's recursive smoothing across the rest of the series —
// so the number here now agrees with the number on a broker chart.
function tpRSI(closes, period){
  if(closes.length < period+1) return null;
  let avgGain=0, avgLoss=0;
  // Seed: simple average of the first `period` day-to-day changes.
  for(let i=1;i<=period;i++){
    const diff = closes[i]-closes[i-1];
    if(diff>=0) avgGain+=diff; else avgLoss-=diff;
  }
  avgGain/=period; avgLoss/=period;
  // Wilder smoothing over every remaining bar in the series.
  for(let i=period+1;i<closes.length;i++){
    const diff = closes[i]-closes[i-1];
    const gain = diff>0 ? diff : 0, loss = diff<0 ? -diff : 0;
    avgGain = (avgGain*(period-1)+gain)/period;
    avgLoss = (avgLoss*(period-1)+loss)/period;
  }
  if(avgLoss===0) return 100;
  const rs=avgGain/avgLoss;
  return +(100-(100/(1+rs))).toFixed(2);
}
// Average absolute day-to-day % move over the trailing `period` sessions.
// This is the same idea as ATR (average true range) but computed off
// closes only, since that's all the mock series guarantees. It's the
// yardstick the 1-2 day outlook uses to size a realistic price band —
// a stock that normally jumps 4% a day gets a wider projected band than
// one that barely moves 0.3% a day, regardless of which way the signal leans.
function tpAvgDailyVolPct(closes, period){
  if(closes.length < period+1) return null;
  let sum=0, n=0;
  for(let i=closes.length-period;i<closes.length;i++){
    const prev=closes[i-1], cur=closes[i];
    if(prev>0){ sum += Math.abs((cur-prev)/prev*100); n++; }
  }
  return n ? sum/n : null;
}
// True ATR (Average True Range), expressed as a % of price. Unlike
// tpAvgDailyVolPct above (close-to-close only, kept as fallback for
// series missing high/low), this uses the FULL bar: True Range is the
// greatest of (high−low), |high−prev close|, |low−prev close| — the
// standard Wilder definition. Why it matters here: a stock that gaps or
// swings hard intraday but closes near its open registers as "calm" in
// close-only math even though anyone trading it lived through the whole
// range. On the PSE, where news gaps are common, close-only volatility
// understates real risk — so the projected band this feeds was
// systematically too narrow on gappy names. Falls back per-bar to
// close-only when a bar lacks high/low data.
function tpATRPct(series, period){
  if(!Array.isArray(series) || series.length < period+1) return null;
  let sum=0, n=0;
  for(let i=series.length-period;i<series.length;i++){
    const cur=series[i], prev=series[i-1];
    if(!cur || !prev || !(prev.close>0)) continue;
    const hi = (cur.high!=null ? cur.high : cur.close);
    const lo = (cur.low !=null ? cur.low  : cur.close);
    const tr = Math.max(hi-lo, Math.abs(hi-prev.close), Math.abs(lo-prev.close));
    sum += tr/prev.close*100; n++;
  }
  return n ? +(sum/n).toFixed(2) : null;
}

// ══════════════════════════════════════════════════════════════
// SUPPORT & RESISTANCE — price levels where this stock has actually
// turned around before. A SUPPORT is a "floor": a price where buyers
// have repeatedly stepped in and stopped a fall. A RESISTANCE is a
// "ceiling": a price where sellers have repeatedly taken over and
// stopped a rise. These aren't magic lines — they exist because real
// pending orders (stop-losses, take-profits) cluster at memorable
// prices, so when the stock returns there, that waiting order flow
// pushes back.
//
// Detection: swing pivots over the supplied series (a bar whose high is
// the highest of its ±SR_PIVOT_WING neighbors = a pivot high; mirror
// logic for pivot lows), then nearby pivots within SR_CLUSTER_PCT of
// each other are merged into one level whose strength = number of
// touches. Levels sitting on a round number (₱50, ₱100, ₱1.00 …) get a
// strength bonus, since retail orders cluster there disproportionately.
// Nearest cluster BELOW current price = support; nearest ABOVE =
// resistance. If pivot detection finds nothing on a side, the 20-day
// low/high stands in as a weaker fallback level.
// ══════════════════════════════════════════════════════════════
const SR_PIVOT_WING = 2;    // bars on each side a pivot must dominate
const SR_CLUSTER_PCT = 1.0; // pivots within 1% merge into one level
function tpRoundStep(price){
  return price>=100 ? 10 : price>=10 ? 1 : price>=1 ? 0.5 : 0.05;
}
function tpIsRoundLevel(level){
  if(!(level>0)) return false;
  const step = tpRoundStep(level);
  const nearest = Math.round(level/step)*step;
  return Math.abs(level-nearest)/level < 0.003;
}
function tpSupportResistance(series){
  if(!Array.isArray(series) || series.length < (SR_PIVOT_WING*2+3)) return null;
  const price = series[series.length-1].close;
  if(!(price>0)) return null;
  const pivots = [];
  // Exclude the newest bars from pivot candidacy (they don't have a full
  // right wing yet), but they still serve as wings for older bars.
  for(let i=SR_PIVOT_WING; i<series.length-SR_PIVOT_WING; i++){
    const hi = series[i].high!=null ? series[i].high : series[i].close;
    const lo = series[i].low !=null ? series[i].low  : series[i].close;
    let isHigh=true, isLow=true;
    for(let w=1; w<=SR_PIVOT_WING; w++){
      const l = series[i-w], r = series[i+w];
      const lh = l.high!=null?l.high:l.close, rh = r.high!=null?r.high:r.close;
      const ll = l.low !=null?l.low :l.close, rl = r.low !=null?r.low :r.close;
      if(lh>hi || rh>hi) isHigh=false;
      if(ll<lo || rl<lo) isLow=false;
    }
    if(isHigh) pivots.push(hi);
    if(isLow)  pivots.push(lo);
  }
  // Cluster pivots within SR_CLUSTER_PCT of each other into levels.
  pivots.sort(function(a,b){ return a-b; });
  const clusters = [];
  pivots.forEach(function(p){
    const last = clusters[clusters.length-1];
    if(last && Math.abs(p-last.sum/last.n)/(last.sum/last.n)*100 <= SR_CLUSTER_PCT){
      last.sum += p; last.n += 1;
    } else {
      clusters.push({sum:p, n:1});
    }
  });
  const levels = clusters.map(function(c){
    const lvl = c.sum/c.n;
    return { level: +lvl.toFixed(lvl<1?4:lvl<10?3:2),
             touches: c.n,
             isRound: tpIsRoundLevel(lvl),
             strength: c.n + (tpIsRoundLevel(lvl)?1:0),
             fallback: false };
  });
  // Nearest support below / resistance above current price. A tiny 0.2%
  // dead zone around the current price avoids calling the price itself
  // a level.
  let support=null, resistance=null;
  levels.forEach(function(L){
    if(L.level < price*0.998 && (!support || L.level > support.level)) support = L;
    if(L.level > price*1.002 && (!resistance || L.level < resistance.level)) resistance = L;
  });
  // Fallback: 20-day extreme as a weak stand-in when no pivot cluster
  // exists on that side (e.g. price at the very top/bottom of its range).
  const tail = series.slice(-20);
  if(!support){
    let mn = Infinity;
    tail.forEach(function(d){ const lo = d.low!=null?d.low:d.close; if(lo<mn) mn=lo; });
    if(isFinite(mn) && mn < price*0.998)
      support = { level:+mn.toFixed(mn<1?4:mn<10?3:2), touches:1, isRound:tpIsRoundLevel(mn), strength:1, fallback:true };
  }
  if(!resistance){
    let mx = -Infinity;
    tail.forEach(function(d){ const hi = d.high!=null?d.high:d.close; if(hi>mx) mx=hi; });
    if(isFinite(mx) && mx > price*1.002)
      resistance = { level:+mx.toFixed(mx<1?4:mx<10?3:2), touches:1, isRound:tpIsRoundLevel(mx), strength:1, fallback:true };
  }
  if(!support && !resistance) return null;
  return { support, resistance };
}
// Volume confirmation — is real trading activity actually behind the
// current trend, or is the SMA20/SMA50 gap just drifting on thin volume?
// This is the concrete fix the technical-analysis research flags for
// standalone SMA-crossover signals: used alone, they whipsaw and throw
// false signals in exactly the situation this catches — volume acts as
// a confirmation filter, the same role it plays in published multi-
// indicator strategies (e.g. ATVMF-style volume filters). Compares the
// latest bar's volume against the average of the PRIOR `period` bars
// (excluding the latest bar itself, so "today vs today" can't happen).
const VOL_CONFIRM_RATIO = 1.2; // 20%+ above the 20-day norm counts as confirmed
function tpVolumeConfirmation(series, period){
  if(!Array.isArray(series) || series.length < period+1) return null;
  const vols = series.map(function(d){ return d.volume||0; });
  const lastVol = vols[vols.length-1];
  const priorVols = vols.slice(vols.length-1-period, vols.length-1);
  const sum = priorVols.reduce(function(a,b){ return a+b; }, 0);
  const avgVol = priorVols.length ? sum/priorVols.length : 0;
  if(avgVol <= 0) return { ratio: null, confirmed: false, avgVol: 0, lastVol: lastVol };
  const ratio = lastVol/avgVol;
  return { ratio: +ratio.toFixed(2), confirmed: ratio >= VOL_CONFIRM_RATIO, avgVol: Math.round(avgVol), lastVol: lastVol };
}

// SMA20-vs-SMA50 trend classification with a buffer band. Raw sign
// comparison flips BULL/BEAR on any crossover, even a ₱0.01 one, causing
// flicker right when a crossover happens (the moment people watch most
// closely). The buffer requires the gap to exceed TREND_BUFFER_PCT of
// price before calling a direction — smaller gaps are genuinely unclear
// and reported as FLAT rather than an unreliable guess.
const TREND_BUFFER_PCT = 0.4;
// Gap size (in %) at which trend confidence maxes out at 100%. Beyond the
// buffer edge, confidence ramps from 0% (right at the buffer) up to 100%
// (at or past this cap) — a bigger, cleaner SMA20/SMA50 separation reads
// as a more confident call.
const TREND_CONF_CAP_PCT = 3;
function tpGetTrendState(sma20, sma50){
  if(sma20==null || sma50==null) return {state:'FLAT', gapPct:null, confidencePct:0};
  const gapPct = (sma20 - sma50) / sma50 * 100;
  const absGap = Math.abs(gapPct);
  let state, confidencePct;
  if(gapPct > TREND_BUFFER_PCT){
    state='BULL';
    confidencePct = Math.round(Math.min(100, (absGap-TREND_BUFFER_PCT)/(TREND_CONF_CAP_PCT-TREND_BUFFER_PCT)*100));
  } else if(gapPct < -TREND_BUFFER_PCT){
    state='BEAR';
    confidencePct = Math.round(Math.min(100, (absGap-TREND_BUFFER_PCT)/(TREND_CONF_CAP_PCT-TREND_BUFFER_PCT)*100));
  } else {
    state='FLAT';
    // Inside the buffer: confidence in "FLAT" is highest at gap=0 and
    // fades toward 0% as the gap nears the buffer edge (about to flip).
    confidencePct = Math.round(Math.max(0, 100 - (absGap/TREND_BUFFER_PCT)*100));
  }
  return {state, gapPct, confidencePct};
}

// Determines when the stock actually last traded and whether the most
// recent print reflects a fresh trade or a stale quote being carried
// forward on thin volume. A flat print — open===high===low===close,
// repeated across several sessions — is the signature of a session
// where no real two-sided trading happened, not of price stability.
// This is what lets the reasoning explain *why* the price hasn't moved,
// instead of just reporting a number.
function tpLastTradeInfo(series){
  if(!series || !series.length) return null;
  const last = series[series.length-1];
  const lastDateObj = new Date(last.date+'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  const daysSince = Math.max(0, Math.round((today - lastDateObj) / 86400000));

  let flatBars = 0;
  for(let i=series.length-1; i>=0; i--){
    const d = series[i];
    const isFlatPrint = d.open===d.high && d.high===d.low && d.low===d.close && d.close===last.close;
    if(isFlatPrint) flatBars++; else break;
  }
  return { date: last.date, daysSince, flatBars, isStale: flatBars>=2, price: last.close };
}

// Parses pse-live-quotes.json's "asOf" field (e.g. "Jul 01, 2026 02:50 PM")
// into a plain YYYY-MM-DD string. Used to keep the "Last Traded" date
// label in sync with the live-quote numbers it's displayed next to --
// without this, the date came from refSeries's OHLC history bar (which
// the code already documents as running up to a day behind) while the
// Open/High/Low/Volume next to it came from this fresher live quote, so
// the two could describe different sessions even though shown together.
const TP_MONTH_MAP = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function tpParseAsOfDate(asOfStr){
  if(!asOfStr) return null;
  const m = /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/.exec(asOfStr);
  if(!m || !(m[1] in TP_MONTH_MAP)) return null;
  const mon = TP_MONTH_MAP[m[1]] + 1;
  const day = parseInt(m[2],10), year = parseInt(m[3],10);
  return year + '-' + (mon<10?'0':'')+mon + '-' + (day<10?'0':'')+day;
}

// BUG FIX (Jul 2026, MWIDE case): the signal engine, projected band, and
// chart all ran purely on the EOD history file, which lags the live quote
// by 1+ sessions (3 sessions when the history workflow hadn't been
// dispatched). Result: the price card showed the live ₱4.09 while
// RSI/SMA/band were computed off a ₱3.87 close from Jun 30 -- the
// "projected high" (₱3.941) sat BELOW the actual live price, and RSI read
// 73.86 (neutral) when the real reading was ~83 (overbought). This helper
// merges the live quote into any OHLC series as its newest bar, so every
// consumer analyzes the same session the price card displays. Runs on
// every render, so pressing Fetch Live Data -> loadPseLiveQuotes() ->
// tpRenderAll() automatically re-analyzes with the fresh quote merged in.
// - lq date newer than last bar  -> append a synthetic bar from the quote
// - lq date same as last bar     -> replace it (live snapshot > stale EOD)
// - lq missing/older/unparseable -> series returned untouched
// volume uses lq.value (peso value) to match the history loaders, which
// map volume:d.value -- keeps tpVolumeConfirmation apples-to-apples.
function tpMergeLiveBar(series, sym){
  var lq = tpLiveQuotes[sym];
  if(!Array.isArray(series) || !series.length || !lq || lq.last == null) return series;
  var lqDate = tpParseAsOfDate(lq.asOf);
  if(!lqDate) return series;
  var lastBar = series[series.length-1];
  if(!lastBar || !lastBar.date || lqDate < lastBar.date) return series;
  var bar = {
    date: lqDate,
    open:  lq.open  != null ? lq.open  : (lq.previousClose != null ? lq.previousClose : lq.last),
    high:  lq.high  != null ? Math.max(lq.high, lq.last) : lq.last,
    low:   lq.low   != null ? Math.min(lq.low,  lq.last) : lq.last,
    close: lq.last,
    volume: lq.value != null ? lq.value : (lq.volume || 0)
  };
  var out = series.slice();
  if(lqDate === lastBar.date) out[out.length-1] = bar;
  else out.push(bar);
  return out;
}

// Rebuilds the lastTrade object off the live quote's own asOf date instead
// of refSeries's (possibly lagging) bar date, when a usable live quote is
// available -- keeps "Last Traded" consistent with the numbers shown
// alongside it. Also guards against a bar dated later than today's actual
// calendar date (which can't be real trading data) by clamping it back to
// the live quote's date, or to today's date, as a defensive fallback.
function tpResolveLastTrade(sig, liveQuote){
  const fallback = sig.lastTrade;
  if(!liveQuote || !liveQuote.asOf) return fallback;
  const lqDate = tpParseAsOfDate(liveQuote.asOf);
  if(!lqDate) return fallback;
  const today = new Date(); today.setHours(0,0,0,0);
  const lqDateObj = new Date(lqDate+'T00:00:00');
  const daysSince = Math.max(0, Math.round((today - lqDateObj) / 86400000));
  return { date: lqDate, daysSince, flatBars: fallback ? fallback.flatBars : 0, isStale: false, price: liveQuote.last };
}

function tpComputeSignal(series){
  const closes = series.map(d=>d.close);
  const lastIdx = closes.length-1;
  const r = tpRSI(closes,14);
  const sma20 = tpSMA(closes,20,lastIdx);
  const sma50 = tpSMA(closes,50,lastIdx);
  const price = closes[lastIdx];
  let score = 0;
  let reasons = [];

  // RSI — 75/25 rather than the textbook 30/70 default, matching PSE's
  // lower liquidity and higher volatility vs developed markets (this
  // project's own earlier research on PSE-specific TA thresholds).
  if(r!==null){
    if(r<25){score+=2;reasons.push('RSI oversold ('+r+') — potential bounce zone');}
    else if(r>75){score-=2;reasons.push('RSI overbought ('+r+') — potential pullback risk');}
    else reasons.push('RSI neutral ('+r+')');
  }

  // Trend via SMA20-vs-SMA50 with a buffer band (see tpGetTrendState) —
  // avoids the signal flipping on a razor-thin crossover. Note: the old
  // "price vs SMA20" check was dropped — it was highly correlated with
  // this trend check (both usually move together), so it was mostly
  // double-counting the same signal rather than adding independent
  // confirmation.
  //
  // Volume confirmation gates how much the trend counts: a real trend
  // backed by above-average volume gets full weight (±1); the same
  // SMA20/SMA50 gap on below-average volume gets half weight (±0.5),
  // since that's exactly the false-signal scenario standalone SMA
  // crossovers are known for (see tpVolumeConfirmation above).
  const trend = tpGetTrendState(sma20, sma50);
  const volConf = tpVolumeConfirmation(series, 20);
  const trendWeight = (volConf && volConf.confirmed) ? 1 : 0.5;
  if(trend.state==='BULL'){
    score+=trendWeight;
    reasons.push('SMA20 above SMA50 by '+trend.gapPct.toFixed(2)+'% — confirmed short-term uptrend'
      + (volConf ? (volConf.confirmed ? ', backed by '+volConf.ratio+'x average volume' : ', but on only '+volConf.ratio+'x average volume — half-weighted') : ''));
  } else if(trend.state==='BEAR'){
    score-=trendWeight;
    reasons.push('SMA20 below SMA50 by '+Math.abs(trend.gapPct).toFixed(2)+'% — confirmed short-term downtrend'
      + (volConf ? (volConf.confirmed ? ', backed by '+volConf.ratio+'x average volume' : ', but on only '+volConf.ratio+'x average volume — half-weighted') : ''));
  } else {
    reasons.push('SMA20 and SMA50 within '+TREND_BUFFER_PCT+'% of each other — trend unclear (flat zone)');
  }

  let signal='HOLD';
  if(score>=2) signal='BUY';
  else if(score<=-2) signal='SELL';

  // Confidence % — how much of the maximum possible score is behind this
  // call. Max score is ±3 (RSI ±2 + trend ±1 at full volume-confirmed
  // weight), so RSI + a volume-backed trend both firing in agreement is
  // what reaches 100%; a single indicator alone, or a volume-unconfirmed
  // trend (±0.5), caps out lower. For HOLD, this instead reads as "how
  // far from a BUY/SELL trigger" — 100% means score is 0 (dead center,
  // maximum indecision), fading toward 0% as it nears the ±2 threshold.
  const MAX_SCORE = 3;
  let confidencePct;
  if(signal==='HOLD'){
    confidencePct = Math.round(Math.max(0, 100 - (Math.abs(score)/2)*100));
  } else {
    confidencePct = Math.round(Math.min(100, (Math.abs(score)/MAX_SCORE)*100));
  }

  // Volatility yardstick for the projected band: true ATR (full-bar
  // high/low range, see tpATRPct) preferred; close-only average as the
  // fallback for series without usable high/low data.
  const atr = tpATRPct(series, 14);
  const volPct = atr!=null ? atr : tpAvgDailyVolPct(closes, 14);

  // Support/resistance levels — these don't vote on the BUY/SELL/HOLD
  // score at all (deliberately: they answer "up to where / down to
  // where", not "which way"). They clip the projected band to realistic
  // levels (tpProjectedBand) and drive the Key Levels row on the card.
  const sr = tpSupportResistance(series);

  return {signal, score, confidencePct, rsi:r, sma20:sma20?+sma20.toFixed(2):null, sma50:sma50?+sma50.toFixed(2):null, price, reasons, trend:trend.state, trendGapPct:trend.gapPct, trendConfidencePct:trend.confidencePct, volPct, sr, volConfirmed: volConf?volConf.confirmed:null, volRatio: volConf?volConf.ratio:null, lastTrade:tpLastTradeInfo(series)};
}

// Picks a variant deterministically per stock (using the existing
// tpSeed/tpRand hash) so the same ticker always reads the same way on
// reload, but different tickers get different phrasing — this is what
// keeps the copy from reading like one template with numbers swapped in.
function tpPick(seedStr, arr){
  return arr[tpSeed(seedStr) % arr.length];
}

// Conversational one-paragraph explanations for the summary card. Each
// scenario (RSI oversold/overbought/neutral/missing, and each signal
// outcome) has several differently-worded takes; which one shows is
// picked per-ticker so two different stocks hitting the same RSI zone
// don't read like copy-paste of each other.
function tpSignalNarrative(sig){
  var sym = tpCurrentSym || 'x';
  var rsiPart;
  if(sig.rsi==null){
    rsiPart = tpPick(sym+'-rsi-na', [
      "This stock hasn't been trading long enough to calculate one of the two things this model checks — a momentum gauge that shows whether buying or selling has gotten overdone lately. So for now, this call is riding entirely on the trend piece below, not on momentum.",
      "There's not enough price history yet to work out that momentum gauge for this stock, so the trend part of the read is doing all the work by itself here."
    ]);
  } else if(sig.rsi < 25){
    rsiPart = tpPick(sym+'-rsi-low', [
      "One of the things this model checks is a momentum gauge — a 0-to-100 scale that tracks how hard people have been buying or selling lately, kind of like a speedometer for the crowd's mood. Right now it just dropped to "+sig.rsi+", well under the 25 mark this model treats as 'sold off too hard, too fast' for stocks on this exchange. Picture a rubber band stretched too far in one direction — that kind of selling pressure usually runs out of steam and snaps back the other way.",
      "That momentum gauge is reading "+sig.rsi+" on this one — deep in what traders call oversold territory, meaning sellers have pushed the price down faster than the recent trading really supports. Stretches like this tend to bounce back within a session or two, the same way a spring pushed down too far tends to spring back up.",
      "The momentum reading here just hit "+sig.rsi+", clearly under the 25 line this model watches. That's not a small dip — it's the kind of overdone selling that tends to attract bargain hunters pretty quickly, since the stock has effectively gotten cheaper faster than the news around it justifies."
    ]);
  } else if(sig.rsi > 75){
    rsiPart = tpPick(sym+'-rsi-high', [
      "One of the things this model checks is a momentum gauge — a 0-to-100 scale that tracks how hard people have been buying or selling lately, like a speedometer for crowd behavior. It just hit "+sig.rsi+", well past the 75 mark this model treats as 'bought up too fast, too hard.' The stock has run further, faster, than its own recent pace really supports, and moves like that tend to give a little back.",
      "That momentum gauge is reading "+sig.rsi+" here — buyers have been piling in aggressively, maybe too aggressively. When this reading gets this hot, the odds start tilting toward a pause or a small pullback rather than more straight-up gains.",
      "The momentum reading on this one just hit "+sig.rsi+", clearly in overbought territory. It's not just that the price is up — it's up more than the recent buying pace can really keep justifying, which is usually when a cooldown shows up."
    ]);
  } else if(sig.rsi >= 65){
    // Near-threshold tier (65–75): previously this fell into the "mid"
    // copy below, which claimed the gauge was "right in the middle of its
    // range" even at 73.86 — 0.14 away from the overbought trigger. Still
    // scores 0 (the 75 line is the scoring boundary), but the wording now
    // says what's actually happening: hot, not yet extreme.
    rsiPart = tpPick(sym+'-rsi-warm', [
      "One of the things this model checks is a momentum gauge — a 0-to-100 scale that tracks how hard people have been buying or selling lately. It's reading "+sig.rsi+" here: warm, and closing in on the 75 line this model treats as 'bought up too fast.' It hasn't crossed it, so momentum isn't scoring against this stock yet — but buyers have clearly been doing most of the pushing lately, and there isn't much runway left before this flips to a pullback warning.",
      "That momentum gauge sits at "+sig.rsi+" — not extreme yet, but noticeably closer to the overbought line at 75 than to neutral ground. This model only changes the score once that line is actually crossed, so the read below still comes from the trend — just know the buying pace is already running hot underneath it.",
      "The momentum reading here is "+sig.rsi+", approaching the 75 overbought threshold without crossing it. Momentum isn't deciding this call — but it's leaning, and a strong session or two from here would tip it into 'stretched' territory."
    ]);
  } else if(sig.rsi <= 35){
    rsiPart = tpPick(sym+'-rsi-cool', [
      "One of the things this model checks is a momentum gauge — a 0-to-100 scale that tracks how hard people have been buying or selling lately. It's reading "+sig.rsi+" here: soft, and drifting toward the 25 line this model treats as 'sold off too hard.' It hasn't crossed it, so momentum isn't scoring in this stock's favor yet — but sellers have clearly had the upper hand lately, and it wouldn't take much more to tip this into bounce-candidate territory.",
      "That momentum gauge sits at "+sig.rsi+" — not extreme yet, but noticeably closer to the oversold line at 25 than to neutral ground. The score only changes once that line is actually crossed, so the read below still comes from the trend — just know the selling pressure is already running heavy underneath it.",
      "The momentum reading here is "+sig.rsi+", approaching the 25 oversold threshold without crossing it. Momentum isn't deciding this call — but another rough session or two would push it into the 'overdone selling' zone this model watches for a snapback."
    ]);
  } else {
    rsiPart = tpPick(sym+'-rsi-mid', [
      "One of the things this model checks is a momentum gauge — a 0-to-100 scale that shows whether buying or selling has gotten overdone. Right now it's sitting at a calm "+sig.rsi+", meaning neither side has pushed too hard in either direction. So this isn't a case of an overstretched rubber band about to snap back — the read below is coming from the trend instead.",
      "That momentum gauge is parked at "+sig.rsi+" — right in the middle of its range. Neither buyers nor sellers have pushed this stock into extreme territory yet, so momentum isn't what's deciding this call.",
      "The momentum reading here is "+sig.rsi+" — nothing extreme either way. Whatever this call ends up being, it's coming from the trend, not from buyers or sellers having gone too far."
    ]);
  }

  var closer;
  var highConf = sig.confidencePct>=90;
  if(sig.signal==='BUY'){
    closer = tpPick(sym+'-close-buy', [
      "Put that together with the trend check below, and this model lands on BUY, with "+sig.confidencePct+"% confidence behind it"+(highConf?" — the momentum gauge and the trend are both pointing the same direction, which is about as clean an agreement as this model ever produces.":" — not every part of the checklist is fully lit up, but there's a genuine lean toward buying here."),
      "Combine that with the trend, and it adds up to a BUY call, "+sig.confidencePct+"% confidence. "+(highConf?"Both things this model looks at — momentum and trend — are backing the same direction, which is a stronger sign than either one alone.":"Not everything is firing at full strength, but the lean toward buying is real, not a coin flip."),
      "That's enough for a BUY, "+sig.confidencePct+"% confidence. "+(highConf?"When the momentum gauge and the trend agree this cleanly, that's the strongest kind of setup this model can flag.":"It's a genuine tilt toward buying — just not the strongest version of one this model can give.")
    ]);
  } else if(sig.signal==='SELL'){
    closer = tpPick(sym+'-close-sell', [
      "Put that together with the trend check below, and this model lands on SELL, "+sig.confidencePct+"% confidence"+(highConf?" — the momentum gauge and the trend are both confirming the same downside story, which is the strongest reading this model can give.":" — the downward pressure is real even without both checks fully agreeing."),
      "Combine that with the trend, and it adds up to SELL, "+sig.confidencePct+"% confidence. "+(highConf?"Momentum and trend are both leaning the same direction against this stock.":"The downside case is genuine, just not backed by every check at once."),
      "That's enough to call SELL, "+sig.confidencePct+"% confidence. "+(highConf?"Both things this model checks are lined up against this stock right now.":"One of the two checks is doing more of the work than the other, but the lean still holds.")
    ]);
  } else {
    closer = tpPick(sym+'-close-hold', [
      "Combine that with the trend below, and this model comes back with HOLD — "+sig.confidencePct+"% confidence in the 'don't trade this right now' call. Neither side has earned a real edge yet, so there's nothing solid to act on.",
      "Net result: HOLD, "+sig.confidencePct+"% confidence. Nothing here — not the momentum gauge, not the trend — is stretched enough in either direction to justify picking a side.",
      "Put together, this lands on HOLD, "+sig.confidencePct+"% confidence. Momentum and trend are basically cancelling each other out at the moment, so there's no clear direction to lean on."
    ]);
  }
  // Returned as an array — each element renders as its own bullet in the
  // summary card, so the momentum read and the verdict don't blur into
  // one wall of text.
  return [rsiPart, closer];
}

function tpTrendNarrative(sig){
  var sym = tpCurrentSym || 'x';
  // Computed once and appended below, rather than baked into every one
  // of the phrasing variants — keeps this in sync with the score logic
  // in tpComputeSignal without needing to edit six strings if the
  // volume-confirmation threshold ever changes.
  var volNote = '';
  if(sig.trend!=='FLAT' && sig.volRatio!=null){
    volNote = sig.volConfirmed
      ? ' Volume backs this up, too — trading is running at '+sig.volRatio+'x the 20-day average, real participation rather than a handful of trades nudging the average around, which is why this trend counts at full weight in the score.'
      : ' One caveat: volume is only '+sig.volRatio+'x the 20-day average right now, lighter than normal — this is exactly the situation where SMA crossovers throw false signals, so this trend is only counted at half weight in the score until real volume shows up behind it.';
  }
  if(sig.trend==='BULL'){
    return [tpPick(sym+'-trend-bull', [
      "The other thing this model checks is the trend — it compares the stock's average price over the last 20 trading days against its average over the last 50. Think of it as a short-term average racing a longer-term average: right now the 20-day average is "+sig.trendGapPct.toFixed(2)+"% above the 50-day one, and that gap is big enough to clear the small "+TREND_BUFFER_PCT+"% buffer this model builds in on purpose, so a random one-day wiggle doesn't get mistaken for a real trend. A gap this size means the recent climb is a genuine uptrend, not a blip — trend confidence sits at "+sig.trendConfidencePct+"%.",
      "This also looks at trend: the average price over the last 20 days versus the average over the last 50. Right now the recent average is running "+sig.trendGapPct.toFixed(2)+"% higher than the older one — well clear of the "+TREND_BUFFER_PCT+"% cushion this model requires before it'll call something a real trend rather than noise. That puts trend confidence at "+sig.trendConfidencePct+"%. In plain terms: this stock has genuinely been climbing lately, not just having one good day.",
      "The trend check compares two averages — one over the last 20 days, one over the last 50 — the same way you'd compare 'how's this stock done lately' against 'how's it done over a longer stretch.' The recent average is "+sig.trendGapPct.toFixed(2)+"% ahead of the longer one here, comfortably past the "+TREND_BUFFER_PCT+"% buffer this model uses to filter out noise. Trend confidence: "+sig.trendConfidencePct+"% — this uptrend has some real legs behind it."
    ]), volNote.trim()].filter(Boolean);
  }
  if(sig.trend==='BEAR'){
    return [tpPick(sym+'-trend-bear', [
      "The other thing this model checks is the trend — it compares the stock's average price over the last 20 trading days against its average over the last 50, like a short-term average racing a longer-term one. Right now the 20-day average has slipped "+Math.abs(sig.trendGapPct).toFixed(2)+"% below the 50-day one, clearing the small "+TREND_BUFFER_PCT+"% buffer this model builds in so a random one-day dip doesn't get read as a trend. A gap this size means the stock has genuinely lost ground lately, not just had a rough afternoon — trend confidence sits at "+sig.trendConfidencePct+"%.",
      "This also looks at trend: the average price over the last 20 days versus the average over the last 50. The recent average is now running "+Math.abs(sig.trendGapPct).toFixed(2)+"% below the older one — well past the "+TREND_BUFFER_PCT+"% cushion this model needs before it calls something a real downtrend instead of noise. Trend confidence: "+sig.trendConfidencePct+"%. In plain terms, this stock has genuinely been sliding, not just wobbling.",
      "The trend check compares the last-20-days average against the last-50-days average, the same way you'd compare recent performance to the bigger picture. Here, the recent average is "+Math.abs(sig.trendGapPct).toFixed(2)+"% behind the longer one, clearing the "+TREND_BUFFER_PCT+"% buffer this model needs before flagging real weakness. Trend confidence: "+sig.trendConfidencePct+"% — this softness looks real, not random."
    ]), volNote.trim()].filter(Boolean);
  }
  return [tpPick(sym+'-trend-flat', [
    "The other thing this model checks is the trend — the stock's average price over the last 20 days versus its average over the last 50. Right now those two averages are sitting within "+TREND_BUFFER_PCT+"% of each other, inside the small buffer this model requires before it'll call a direction one way or the other. Reading a trend into a gap that small would basically be reading tea leaves — so 'flat, no clear trend' is the honest answer here, not a shrug.",
    "This also checks trend by comparing the last-20-days average price against the last-50-days average. They're sitting almost right on top of each other — well inside the "+TREND_BUFFER_PCT+"% cushion this model needs before calling a real trend. There's genuinely nothing to lean on here yet, so the trend stays flat until that gap widens.",
    "The trend check — recent 20-day average versus the longer 50-day average — hasn't separated enough to clear the "+TREND_BUFFER_PCT+"% buffer this model uses to avoid chasing noise. This is a wait-and-see situation, not a coin flip between the stock heading up or down."
  ])];
}

// Shared band math — both the outlook narrative and the overall
// recommendation below cite the same ₱ range, so it's computed once here
// instead of duplicated in two places with room to drift apart.
function tpProjectedBand(sig){
  if(sig.volPct==null || sig.price==null) return null;
  const bias = sig.signal==='BUY' ? 1 : sig.signal==='SELL' ? -1 : 0;
  const conf = (bias===0 ? sig.confidencePct*0.4 : sig.confidencePct) / 100;
  const moveMag = sig.volPct * (0.75 + conf);
  const skew = bias * moveMag * 0.35;
  let high = sig.price * (1 + (moveMag + skew)/100);
  let low = sig.price * (1 - (moveMag - skew)/100);
  // S/R clip: the raw band above is pure volatility math — it has no
  // idea a proven ceiling or floor might sit inside it. If the nearest
  // resistance is closer than the band top, the realistic 1-2 session
  // target IS that resistance (price has to fight through waiting
  // sellers there first); mirror logic for support under the band
  // bottom. The clip can only ever SHRINK the band toward proven
  // levels — it never widens it and never touches the signal itself.
  let clippedHigh=false, clippedLow=false;
  const sr = sig.sr;
  if(sr && sr.resistance && sr.resistance.level > sig.price && high > sr.resistance.level){
    high = sr.resistance.level; clippedHigh = true;
  }
  if(sr && sr.support && sr.support.level < sig.price && low < sr.support.level){
    low = sr.support.level; clippedLow = true;
  }
  if(low >= high){ // degenerate guard: never emit an inverted band
    low = Math.min(low, sig.price*0.999); high = Math.max(high, sig.price*1.001);
  }
  const fmt = n => n < 1 ? n.toFixed(4) : n < 10 ? n.toFixed(3) : n.toFixed(2);
  return { bias, low, high, L: fmt(low), H: fmt(high), vol: sig.volPct.toFixed(2),
           clippedHigh, clippedLow, sr };
}

// ══════════════════════════════════════════════════════════════
// 5-DAY OUTLOOK — day-by-day projected price ranges, rendered inside
// the RECOMMENDATION bullet list (the old standalone 2-DAY OUTLOOK row
// was retired). Same inputs as everything else on the card: the stock's
// own trailing volatility, the signal's confidence, and its proven
// support/resistance levels. Each day's range widens by √day because
// uncertainty compounds with time; the midpoint drifts in the signal's
// direction; and every day's high/low stays clipped at the proven
// ceiling/floor — the same honesty rule tpProjectedBand uses.
// ══════════════════════════════════════════════════════════════
// PSE non-trading days (holidays). 2026 list: Feb 17 confirmed via PSE
// circular CN-2026-0008; remaining dates per published 2026 PH holiday
// calendar (proclamation-based; Eid dates provisional). MAINTENANCE:
// extend this set each new year, and adjust if Malacañang moves a date.
const TP_PSE_HOLIDAYS = new Set([
  '2026-01-01','2026-02-17','2026-04-02','2026-04-03','2026-04-09',
  '2026-05-01','2026-05-20','2026-05-27','2026-06-12','2026-08-21',
  '2026-08-31','2026-11-02','2026-11-30','2026-12-08','2026-12-24',
  '2026-12-25','2026-12-30','2026-12-31'
]);
function tpIsoDate(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function tpNextTradingDays(n){
  const out = []; const d = new Date();
  let guard = 0;
  while(out.length < n && guard++ < 60){
    d.setDate(d.getDate()+1);
    const dow = d.getDay();
    if(dow===0 || dow===6) continue;               // PSE: closed Sat/Sun
    if(TP_PSE_HOLIDAYS.has(tpIsoDate(d))) continue; // PSE: closed on holidays
    out.push(new Date(d.getTime()));
  }
  return out;
}
function tpFmtShortDate(d){
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return M[d.getMonth()]+' '+d.getDate();
}
// Shared small-table renderer for the 5-day outlook (Stocks + Crypto).
// rows: [{d, date, lo, hi, mid}], fmt: price formatter for the market.
function tpOutlookTableHTML(rows, fmt){
  var th = 'text-align:right;padding:3px 6px;border-bottom:1px solid rgba(255,255,255,0.18);font-weight:600;white-space:nowrap;';
  var td = 'text-align:right;padding:3px 6px;border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap;';
  var html = '<table style="width:100%;border-collapse:collapse;margin:6px 0 4px;font-size:0.93em;">'
    + '<tr><th style="'+th+'text-align:left;">Day</th><th style="'+th+'">Low</th><th style="'+th+'">High</th><th style="'+th+'">Most likely</th></tr>';
  rows.forEach(function(r){
    html += '<tr><td style="'+td+'text-align:left;"><b>Day '+r.d+'</b> \u00b7 '+r.date+'</td>'
         + '<td style="'+td+'">'+fmt(r.lo)+'</td>'
         + '<td style="'+td+'">'+fmt(r.hi)+'</td>'
         + '<td style="'+td+'">'+fmt(r.mid)+'</td></tr>';
  });
  return html + '</table>';
}
function tpFiveDayOutlook(sig){
  const band = tpProjectedBand(sig);
  if(!band || !sig.price) return null;
  const price = sig.price;
  const bias = band.bias;
  const conf = (bias===0 ? sig.confidencePct*0.4 : sig.confidencePct) / 100;
  const halfW1 = sig.volPct * (0.75 + conf); // day-1 half-width %, matches tpProjectedBand
  const drift = bias * halfW1 * 0.35;        // per-day directional drift %, same skew factor
  const sr = sig.sr;
  const days = tpNextTradingDays(5);
  const rows = [];
  let clippedHi=false, clippedLo=false, pinnedFrom=0;
  for(let d=1; d<=5; d++){
    const spread = halfW1 * Math.sqrt(d);
    const mid0 = price * (1 + (drift*d)/100);
    let hi = mid0 * (1 + spread/100);
    let lo = mid0 * (1 - spread/100);
    let hiClip=false, loClip=false;
    if(sr && sr.resistance && sr.resistance.level > price && hi > sr.resistance.level){ hi = sr.resistance.level; hiClip = true; clippedHi = true; }
    if(sr && sr.support && sr.support.level < price && lo < sr.support.level){ lo = sr.support.level; loClip = true; clippedLo = true; }
    if(lo >= hi){ lo = Math.min(lo, price*0.999); hi = Math.max(hi, price*1.001); }
    if(hiClip && loClip && !pinnedFrom) pinnedFrom = d;
    const mid = (lo + hi) / 2; // center of the realistic (clipped) range
    rows.push({ d:d, date:tpFmtShortDate(days[d-1]), lo:lo, hi:hi, mid:mid });
  }
  const fmtP = function(n){ return '\u20b1'+tpFmtLvl(n); };
  const allSameMid = rows.every(function(r){ return tpFmtLvl(r.mid)===tpFmtLvl(rows[0].mid); });
  const tbl = tpOutlookTableHTML(rows, fmtP);
  const dirTxt = bias>0
    ? 'with the range drifting higher each day while the BUY case holds'
    : bias<0
      ? 'with the range drifting lower each day while the SELL case holds'
      : 'with no daily drift, since neither side has an edge right now';
  let out = '5-DAY OUTLOOK \u2014 the next 5 actual PSE trading days (weekends and market holidays skipped), built from this stock\'s own '+band.vol+'% average daily swing, the '+sig.confidencePct+'% signal confidence, and its proven floor/ceiling levels. Each day\'s range is a little wider than the last because uncertainty grows with time, '+dirTxt+':'+tbl;
  const notes = [];
  if(clippedHi && sr && sr.resistance) notes.push('highs are capped at the \u20b1'+tpFmtLvl(sr.resistance.level)+' ceiling \u2014 sellers have defended that level before');
  if(clippedLo && sr && sr.support) notes.push('lows are held up at the \u20b1'+tpFmtLvl(sr.support.level)+' floor \u2014 buyers have defended that level before');
  if(allSameMid) notes.push('the \u2018most likely\u2019 value repeats because '+(pinnedFrom ? 'the range is pinned between the floor and ceiling \u2014 it can\'t drift until one of them breaks' : 'there\'s no directional drift in this read \u2014 the center of the range simply stays put'));
  out += (notes.length ? 'Honest note: '+notes.join('; ')+'. ' : '') + 'These are ranges implied by recent behavior, not promises \u2014 one news item can override all five rows.';
  return out;
}

// ══════════════════════════════════════════════════════════════
// ENTRY / EXIT PLAN — the explicit "at what price do I get in, take
// profit, and bail out" bullet inside the RECOMMENDATION. Uses proven
// S/R where it exists, the volatility band as fallback.
// ══════════════════════════════════════════════════════════════
// Shared: the two trigger prices used by both the entry/exit plan and
// the watchlist auto-prefill \u2014 ceiling = buy trigger (High alert),
// floor = sell trigger (Low alert). Proven S/R first, band fallback.
function tpTriggerLevels(sig, band){
  if(!band || !sig.price) return null;
  var sr = sig.sr, price = sig.price;
  var sup = (sr && sr.support && sr.support.level < price) ? sr.support.level : band.low;
  var res = (sr && sr.resistance && sr.resistance.level > price) ? sr.resistance.level : band.high;
  if(!isFinite(sup) || !isFinite(res) || sup <= 0 || res <= 0) return null;
  return { sup: sup, res: res };
}
function tpEntryExitPlan(sig, band){
  const trig = tpTriggerLevels(sig, band);
  if(!trig) return null;
  const price = sig.price;
  const P = tpFmtLvl;
  const sup = trig.sup;
  const res = trig.res;
  // Ceiling (resistance) highlighted green, floor (support) highlighted red.
  const resHi = '<span style="color:var(--green);font-weight:700">\u20b1'+P(res)+'</span>';
  const supHi = '<span style="color:var(--red);font-weight:700">\u20b1'+P(sup)+'</span>';

  if(sig.signal==='BUY'){
    const entryLo = Math.max(sup, price*(1 - sig.volPct/200)); // up to half a normal day's dip
    const stop = sup*0.99;
    const t1 = price + (res - price)*0.5;
    return 'WHERE TO ENTER AND EXIT:<br>' +
      '<b>Entry:</b> anywhere from \u20b1'+P(entryLo)+' up to the current \u20b1'+P(price)+' \u2014 a small dip toward the floor gets a better price, but waiting for a deep discount risks missing the move entirely.<br>' +
      '<b>Take-profit / target:</b> first sell-point around \u20b1'+P(t1)+' (halfway to the ceiling \u2014 a sensible spot to bank part of the gain), final target at the '+resHi+' ceiling, where sellers have stepped in before.<br>' +
      '<b>Stop-loss (exit if wrong):</b> \u20b1'+P(stop)+', just under the '+supHi+' floor \u2014 a close below that means the floor failed and the reason for owning this is gone.';
  }
  if(sig.signal==='SELL'){
    return 'WHERE TO EXIT AND RE-ENTER:<br>' +
      '<b>Exit (sell):</b> at or near the current \u20b1'+P(price)+' \u2014 with a SELL read, waiting for a bounce that may never come usually costs more than acting; any lift toward the '+resHi+' ceiling is a gift exit.<br>' +
      '<b>Re-entry (buy back):</b> the '+supHi+' floor is where the slide would most likely stall first \u2014 the natural place to reconsider buying back in if it holds.<br>' +
      '<b>Invalidation:</b> a close above the '+resHi+' ceiling means this sell read was wrong \u2014 stop waiting for lower prices at that point.';
  }
  // HOLD
  return 'WHERE THE ENTRY/EXIT TRIGGERS SIT:<br>' +
    '<b>Buy trigger:</b> a close above the '+resHi+' ceiling \u2014 that\'s the price proving buyers have won; buying anything below that trigger is guessing.<br>' +
    '<b>Sell trigger:</b> a close below the '+supHi+' floor \u2014 that\'s the floor failing, and the time to be out.<br>' +
    '<b>Between those two prices:</b> no entry, no exit \u2014 everything inside that box is noise, not signal.';
}

// ══════════════════════════════════════════════════════════════
// KEY LEVELS — the support/resistance row on the reasoning card, plus
// the risk-to-reward math. Written for someone who has never traded:
// explains WHAT a floor/ceiling is, WHERE this stock's are, and then
// answers the question every signal quietly skips — "is this trade
// worth what I'd be risking?" — as a single ratio. The R:R uses the
// S/R levels as the realistic target and stop where they exist, and
// the volatility band as the fallback where they don't.
// ══════════════════════════════════════════════════════════════
function tpFmtLvl(n){ return n<1 ? n.toFixed(4) : n<10 ? n.toFixed(3) : n.toFixed(2); }
function tpLevelsNarrative(sig){
  const sr = sig.sr;
  const price = sig.price;
  const band = tpProjectedBand(sig);
  const P = tpFmtLvl;
  if(!sr || (!sr.support && !sr.resistance)){
    return "No reliable support/resistance mapped yet \u2014 needs more trading history before floor and ceiling levels can be trusted.";
  }
  const lines = [];
  if(sr.support){
    lines.push('<b>Support (floor):</b> \u20b1'+P(sr.support.level)
      + (sr.support.fallback ? ' \u2014 month low (backup level, no repeated bounce found)' : ' \u2014 held '+sr.support.touches+'\u00d7 recently')
      + (sr.support.isRound ? ' \u00b7 round number (stickier)' : ''));
  }
  if(sr.resistance){
    lines.push('<b>Resistance (ceiling):</b> \u20b1'+P(sr.resistance.level)
      + (sr.resistance.fallback ? ' \u2014 month high (backup level, no repeated rejection found)' : ' \u2014 rejected '+sr.resistance.touches+'\u00d7 recently')
      + (sr.resistance.isRound ? ' \u00b7 round number (stickier)' : ''));
  }
  if(sr.support && sr.resistance && price){
    const up = ((sr.resistance.level - price)/price*100).toFixed(1);
    const dn = ((price - sr.support.level)/price*100).toFixed(1);
    lines.push('<b>Price now:</b> \u20b1'+P(price)+' \u2014 '+dn+'% above the floor, '+up+'% below the ceiling');
  }
  if(sig.signal==='BUY' && price){
    const target = (sr.resistance && sr.resistance.level > price) ? sr.resistance.level : (band ? band.high : null);
    const stop   = (sr.support && sr.support.level < price)       ? sr.support.level    : (band ? band.low  : null);
    if(target && stop && stop < price){
      const reward = (target - price)/price, risk = (price - stop)/price;
      const rr = risk > 0 ? reward/risk : null;
      if(rr != null){
        lines.push('<b>Risk:Reward on this BUY:</b> '+rr.toFixed(1)+':1 \u2014 '+(
          rr >= 2 ? 'good \u2014 the potential prize is at least double the risk'
          : rr >= 1 ? 'workable but thin \u2014 needs a high hit rate to pay off'
          : 'upside-down \u2014 risking more than the potential gain; a better entry price would fix this'));
      }
    }
  } else if(sig.signal==='SELL' && price){
    const target = (sr.support && sr.support.level < price)       ? sr.support.level    : (band ? band.low  : null);
    const stop   = (sr.resistance && sr.resistance.level > price) ? sr.resistance.level : (band ? band.high : null);
    if(target && stop && stop > price){
      const dp = ((price - target)/price*100).toFixed(1);
      const bp = ((stop - price)/price*100).toFixed(1);
      lines.push('<b>SELL math:</b> \u2248'+dp+'% of downside avoided by selling now vs \u2248'+bp+'% of upside given up if wrong');
    }
  } else if(sr.support && sr.resistance){
    lines.push('<b>On HOLD:</b> set alerts at both levels \u2014 a close outside the box is the only event worth reacting to');
  }
  const levelsText = lines.join('<br>');
  const fiveDay = tpFiveDayOutlook(sig);
  return [levelsText, fiveDay].filter(Boolean);
}

function tpActionPlan(sig, band, aligned, opposed){
  var sym = tpCurrentSym || 'x';

  if(!band){
    return tpPick(sym+'-action-noband', [
      "Practically: there's no reliable price band to trade against yet, so the right move is to watch, not act. An experienced trader would let a few more sessions build before sizing a real position off this ticker.",
      "In practice, this isn't a tradeable setup yet — treat it as one to bookmark and revisit once there's enough price history to size a real target and stop, rather than guessing at levels.",
      "Practically speaking, there's not enough of a track record here to plan an entry or exit around. The move most traders make in this spot is nothing — wait for more bars, then reassess."
    ]);
  }

  const price = sig.price;

  if(sig.signal==='BUY'){
    const target = +band.high, floor = +band.low;
    const gainPct = ((target-price)/price*100);
    const riskPct = ((price-floor)/price*100);
    const rrTxt = riskPct>0 ? (gainPct/riskPct).toFixed(1)+':1' : 'undefined';

    if(aligned && sig.confidencePct>=80){
      return tpPick(sym+'-action-buy-strong',[
        "What this means in practice: this is a spot where an experienced trader would actually buy in, not just watch from the sidelines. If it plays out toward ₱"+band.H+", that's roughly "+gainPct.toFixed(1)+"% of upside from here. If it goes wrong instead and slides to ₱"+band.L+", that's roughly "+riskPct.toFixed(1)+"% downside. Put those side by side and you get a "+rrTxt+" ratio — meaning for every ₱1 you'd be risking, you're looking at roughly ₱"+ (riskPct>0?(gainPct/riskPct).toFixed(1):'—') +" of potential gain, which is generally the kind of math that justifies putting real money behind an idea instead of just a token amount. The usual playbook: buy at or near today's price, set a stop-loss (an automatic sell order) a little under ₱"+band.L+" so you cap the damage if you're wrong, and consider selling part of your position as it nears ₱"+band.H+" instead of holding out for a perfect top.",
        "What this means in practice: this is a legitimate spot to buy, not just a label on a chart. The numbers back it up — roughly "+gainPct.toFixed(1)+"% of room to grow if it reaches ₱"+band.H+", against about "+riskPct.toFixed(1)+"% you'd stand to lose if it instead drops to ₱"+band.L+". That works out to a "+rrTxt+" ratio, meaning the potential reward is worth more than what you'd be risking. A disciplined approach: buy now, set a stop-loss at ₱"+band.L+" to protect yourself, and sell into strength gradually rather than waiting for one perfect exit point."
      ]);
    }
    if(opposed){
      return tpPick(sym+'-action-buy-caution',[
        "What this means in practice: this isn't a spot to go all-in, and it's not really a clean buy point yet either — it's a bet that the stock's overall direction is about to turn around, not proof that it already has. If it works out, you'd gain roughly "+gainPct.toFixed(1)+"% up to ₱"+band.H+"; if it doesn't, you'd risk about "+riskPct.toFixed(1)+"% down to ₱"+band.L+" ("+rrTxt+" ratio) — but that math only pays off if the turnaround actually happens. A more careful approach: either wait for the overall trend to genuinely flip before buying in, or if you do want in now, keep the position small and set a tight stop-loss just under ₱"+band.L+" so a wrong guess doesn't cost much.",
        "What this means in practice: treat this as a small starter position at most, not a full-size bet — the timing isn't confirmed yet, even though the underlying case has some merit. You'd be betting against the stock's current overall direction for roughly "+gainPct.toFixed(1)+"% of potential upside versus "+riskPct.toFixed(1)+"% downside — anyone taking this trade usually keeps it small and treats ₱"+band.L+" as a strict stop-loss, not a soft suggestion."
      ]);
    }
    return tpPick(sym+'-action-buy-moderate',[
      "What this means in practice: this is a 'buy a little and watch' spot, not an all-in one. The setup offers roughly "+gainPct.toFixed(1)+"% of potential upside to ₱"+band.H+" against about "+riskPct.toFixed(1)+"% downside risk to ₱"+band.L+" ("+rrTxt+" ratio). A measured approach: buy a partial position now, and consider adding more if the price keeps confirming the idea over the next session, while keeping a stop-loss around ₱"+band.L+".",
      "What this means in practice: there's a real case here, but it's not fully proven yet, so this calls for a partial position rather than going all-in — roughly "+gainPct.toFixed(1)+"% of potential reward against "+riskPct.toFixed(1)+"% of risk. Most careful traders would wait for one more day of confirmation before committing more money, treating ₱"+band.L+" as the level where the whole idea would need to be reconsidered."
    ]);
  }

  if(sig.signal==='SELL'){
    const target = +band.low, ceiling = +band.high;
    const gainPct = ((price-target)/price*100);
    const riskPct = ((ceiling-price)/price*100);
    const rrTxt = riskPct>0 ? (gainPct/riskPct).toFixed(1)+':1' : 'undefined';

    if(aligned && sig.confidencePct>=80){
      return tpPick(sym+'-action-sell-strong',[
        "What this means in practice: if you're already holding this stock, this is a real point to sell or at least trim your position, not a false alarm to shrug off. If the price drops toward ₱"+band.L+" as expected, that's roughly "+gainPct.toFixed(1)+"% you'd be protecting by selling now versus later. If instead the selling stalls and it bounces to ₱"+band.H+", that's about "+riskPct.toFixed(1)+"% you'd be giving up by having already sold — a "+rrTxt+" ratio that generally favors locking in gains or cutting losses now rather than hoping for a bounce that isn't confirmed. An experienced trader would reduce their position here, or if actively trading, place a protective stop just above ₱"+band.H+".",
        "What this means in practice: this is the kind of setup that calls for actually doing something, not just noting it and waiting. Roughly "+gainPct.toFixed(1)+"% of downside risk you'd be avoiding by selling now to ₱"+band.L+", versus about "+riskPct.toFixed(1)+"% you'd give up if it unexpectedly bounces to ₱"+band.H+" instead ("+rrTxt+" ratio) — the math favors taking action now, since this level of agreement between the checks doesn't show up often."
      ]);
    }
    if(opposed){
      return tpPick(sym+'-action-sell-caution',[
        "What this means in practice: this calls for trimming your position, not selling everything — it's not yet a fully confirmed exit point. You'd be selling into a stock whose overall direction is still pointed up, for roughly "+gainPct.toFixed(1)+"% of potential downside protection against about "+riskPct.toFixed(1)+"% risk that the upward move simply continues to ₱"+band.H+" ("+rrTxt+" ratio). A more careful approach: sell part of the position now to lock in some safety, and let the rest ride with a stop-loss, rather than closing everything based on one warning sign alone.",
        "What this means in practice: worth reducing your position size, not getting out completely — this isn't a confirmed exit point yet. The warning sign is real, but it's fighting an overall trend that's still pointed up — roughly "+gainPct.toFixed(1)+"% downside case versus "+riskPct.toFixed(1)+"% risk of missing further gains up to ₱"+band.H+". Most experienced traders sell part of their position here rather than everything, given the trend hasn't turned yet."
      ]);
    }
    return tpPick(sym+'-action-sell-moderate',[
      "What this means in practice: this is worth trimming rather than holding at full size or dumping everything — a partial move, not an urgent exit signal. Roughly "+gainPct.toFixed(1)+"% of downside case toward ₱"+band.L+" versus about "+riskPct.toFixed(1)+"% risk of a bounce to ₱"+band.H+" ("+rrTxt+" ratio). A measured approach is reducing your position somewhat now and reassessing if the price confirms the move over the next session.",
      "What this means in practice: there's a real case to lighten up here — roughly "+gainPct.toFixed(1)+"% versus "+riskPct.toFixed(1)+"% risk — just not overwhelming enough to call this an urgent sell point. Most traders would treat this as a cue to trim a bit, not to sell in a panic."
    ]);
  }

  // HOLD
  return tpPick(sym+'-action-hold',[
    "What this means in practice: the right move is no move at all — right now isn't a good point to buy or sell in either direction. An experienced trader wouldn't force a trade here. Instead, a useful habit is setting a price alert at ₱"+band.L+" (a break below that would tilt this toward a sell signal) and at ₱"+band.H+" (a break above would tilt this toward a buy signal), then letting the stock actually show its hand before committing any money. Trading now, in either direction, would mean paying for a guess rather than a real signal.",
    "What this means in practice: sit this one out for now. There's no real edge to work with, so the useful thing to do is keep an eye out for the momentum gauge or the trend to break out of this quiet range — a move above ₱"+band.H+" or below ₱"+band.L+" is what would actually change the call and create a real opportunity to act. Putting money in before that happens means trading on noise, not on an actual signal.",
    "What this means in practice: this is a moment to wait, not to trade — neither the current price nor right now is the right moment to act. A disciplined approach is staying in cash on this stock and checking back once the price either clears ₱"+band.H+" or drops below ₱"+band.L+" — either of those would give a genuine reason to act."
  ]);
}

// ══════════════════════════════════════════════════════════════
// OVERALL RECOMMENDATION — the verdict that synthesizes signal + trend
// + outlook into one call, rather than leaving the reader to combine
// three separate readings themselves. Written to sound like an actual
// analyst's closing take: it names what's agreeing, what isn't, and
// what it would take to change the call — then tpActionPlan (below)
// adds the practical layer: next steps, gain/loss math, what an
// experienced trader would typically do, and whether now is actually
// the right entry/exit point — not just a restatement of the badges
// already on screen.
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// MARKET CONTEXT — grounds the recommendation in when the stock actually
// last traded and whether the tape has been genuinely active or just
// carrying forward a stale print. This is what lets the reasoning answer
// "if the price is the same, why?" and "what is the market saying right
// now?" instead of jumping straight to a verdict as if every stock trades
// as actively as a blue chip.
// ══════════════════════════════════════════════════════════════
function tpMarketContextNarrative(sig){
  var sym = tpCurrentSym || 'x';
  const lt = sig.lastTrade;
  if(!lt) return '';
  const dateTxt = tpFmtDate(lt.date);
  const agoTxt = lt.daysSince<=0 ? 'today' : lt.daysSince===1 ? 'yesterday' : lt.daysSince+' days ago';
  const priceTxt = lt.price.toFixed(lt.price<1 ? 4 : 2);

  if(lt.isStale){
    return tpPick(sym+'-market-stale', [
      "Market check first: the last actual trade printed on "+dateTxt+" ("+agoTxt+"), and it's held at exactly ₱"+priceTxt+" for "+lt.flatBars+" straight sessions with zero intraday range each time. That's not the market agreeing the price is right — it's the market barely showing up. A flat print like that usually means too few buyers and sellers are actually crossing to move it, not that supply and demand have found genuine balance.",
      "Worth noting before anything else: there hasn't been a real trade with any intraday movement since "+dateTxt+" ("+agoTxt+"), just the same ₱"+priceTxt+" print repeating for "+lt.flatBars+" sessions running. Thin liquidity like this is exactly why the price looks unchanged — there isn't enough volume changing hands to move it, which also means any order placed here could shift the price more than usual.",
      "The last genuine trade was "+dateTxt+" ("+agoTxt+"), and the tape has simply been carrying that same ₱"+priceTxt+" print forward for "+lt.flatBars+" sessions with no range at all. That's a liquidity gap, not a stability signal — worth treating expected fill price and position size with extra caution on a name trading this thin."
    ]);
  }
  return tpPick(sym+'-market-active', [
    "Market check: this last traded "+dateTxt+" ("+agoTxt+"), with a real intraday range on the tape — the kind of active two-sided trading that gives the read below more weight than it would carry on a thinly-traded name.",
    "This is trading normally right now — last session was "+dateTxt+" ("+agoTxt+"), with genuine intraday movement rather than a single carried-over print, so there's real volume actually behind the price action driving the call below."
  ]);
}

function tpOverallRecommendationVerdict(sig){
  var sym = tpCurrentSym || 'x';
  const band = tpProjectedBand(sig);
  const aligned = (sig.signal==='BUY' && sig.trend==='BULL') || (sig.signal==='SELL' && sig.trend==='BEAR');
  const opposed = (sig.signal==='BUY' && sig.trend==='BEAR') || (sig.signal==='SELL' && sig.trend==='BULL');
  const target = band ? (sig.signal==='BUY' ? band.H : sig.signal==='SELL' ? band.L : null) : null;
  const floor = band ? (sig.signal==='BUY' ? band.L : sig.signal==='SELL' ? band.H : null) : null;

  // Not enough price history to size a band yet — give the directional
  // read without inventing peso levels that don't exist.
  if(!band && sig.signal!=='HOLD'){
    return tpPick(sym+'-rec-noband', [
      "There's a "+sig.signal+" signal here, "+sig.confidencePct+"% confidence — but this stock doesn't have enough trading history yet to put a realistic price on it, so no target range for now. That'll fill in once more sessions are on record. For today, treat the direction (buy or sell) as the useful part, not a specific peso level.",
      sig.signal+" is the read here, "+sig.confidencePct+"% confidence, though this ticker doesn't have enough days of trading yet to project a reliable price range. Worth revisiting once more history builds up."
    ]);
  }

  if(sig.signal==='BUY'){
    if(aligned && sig.confidencePct>=80){
      return tpPick(sym+'-rec-buy-strong', [
        "This is the kind of setup actually worth acting on, not just noting. Both things this model checks — a momentum gauge that had gotten stretched too far on the selling side, and the trend, which is genuinely pointed up — are telling the same story at the same time. "+sig.confidencePct+"% confidence is about as high as this model ever gets, and there's a real price to work with too: ₱"+target+" is where this could realistically head over the next session or two. Nothing is ever guaranteed in the market, but when two separate checks agree this cleanly, that's exactly the kind of setup a trader would take seriously rather than shrug off.",
        "Everything here is pointing the same direction. The stock had been sold off more than it should've been, it's also been climbing on average lately, and both of those agree — that's two separate checks confirming each other, not one lone signal doing all the talking. "+sig.confidencePct+"% confidence, with ₱"+target+" as the level this could reach over the next session or two, and ₱"+floor+" as the point where you'd have to admit the idea was wrong.",
        "When the momentum side and the trend side agree this cleanly, that's the strongest version of a buy signal this model can put out. "+sig.confidencePct+"% confidence, a realistic target near ₱"+target+", and a clear line at ₱"+floor+" where you'd know to step back — this is a setup that comes with an actual plan attached, not just a gut feeling."
      ]);
    }
    if(opposed){
      return tpPick(sym+'-rec-buy-caution', [
        "There's a real buy signal here — "+sig.confidencePct+"% confidence, coming from the stock looking oversold, like it's been sold off more than makes sense. But here's the catch: the trend itself hasn't turned yet, it's still pointed down. So this isn't 'get on board with a stock that's already climbing' — it's a bet that the selling is about to reverse before it continues. If that bet pays off, ₱"+target+" is a realistic level; if the downtrend just keeps going instead, ₱"+floor+" is usually where it shows up first. That's a riskier shape of trade than a normal buy signal, worth keeping any position smaller because of it.",
        "The honest read here: momentum is suggesting a bounce is due, but the bigger trend hasn't actually confirmed that turn yet. "+sig.confidencePct+"% confidence on the momentum side is real, but buying an oversold stock while its trend is still pointed down means you're betting against the current direction, not riding it. ₱"+target+" is achievable if the bounce happens; ₱"+floor+" is the risk if the downtrend simply wins this round."
      ]);
    }
    return tpPick(sym+'-rec-buy-moderate', [
      "This leans toward BUY, "+sig.confidencePct+"% confidence — a genuine lean, just not the strongest version of one. Part of the case is there, part hasn't fully confirmed yet. Over the next session or two this could head toward ₱"+target+", with ₱"+floor+" as roughly where things would look shaky if it stalls out instead.",
      "The case for buying is real here, "+sig.confidencePct+"% confidence, just without every check firing at full strength at once. Worth keeping an eye on for confirmation — a move toward ₱"+target+" would strengthen the idea, while a slide back toward ₱"+floor+" would be a sign to reconsider."
    ]);
  }

  if(sig.signal==='SELL'){
    if(aligned && sig.confidencePct>=80){
      return tpPick(sym+'-rec-sell-strong', [
        "This is a clean sell signal, not a marginal one. The stock looks like it's been bought up more aggressively than it should've been, and on top of that the trend is genuinely pointed down — both checks are agreeing with each other, which is close to the strongest reading this model can produce ("+sig.confidencePct+"% confidence). ₱"+target+" is roughly where the pressure points over the next session or two. If you're holding this stock, this is the kind of double-confirmation that's worth taking seriously rather than hoping it blows over.",
        "Two separate things are pointing the same way here: the stock's been bought up faster than its recent pace can justify, and the trend has genuinely turned down. That agreement gives "+sig.confidencePct+"% confidence — not one weak signal, but two checks lining up. ₱"+target+" is the level this is leaning toward, with ₱"+floor+" as roughly where things would look better if the selling eases up early.",
        "Both things this model checks — momentum and trend — are pointing down together right now, at "+sig.confidencePct+"% confidence. ₱"+target+" is the level worth watching over the next 1-2 sessions, and ₱"+floor+" is roughly where this read would start to look premature."
      ]);
    }
    if(opposed){
      return tpPick(sym+'-rec-sell-caution', [
        "There's a sell signal here, "+sig.confidencePct+"% confidence, coming from the stock looking like it's been bought up too aggressively lately. But the trend is still pointed up — it hasn't actually lost ground yet. This is essentially a bet that the buying runs out of steam before the uptrend does, and that bet doesn't always pay off. ₱"+target+" is the level if it does; ₱"+floor+" is the risk if the uptrend simply keeps going instead.",
        "The honest read: momentum looks stretched on the buying side, but the trend hasn't confirmed a turn yet — it's worth being clear-eyed about that before acting. "+sig.confidencePct+"% confidence on the overbought side is real, but selling into a stock that's still climbing means fighting the current direction, not following it."
      ]);
    }
    return tpPick(sym+'-rec-sell-moderate', [
      "This leans toward SELL, "+sig.confidencePct+"% confidence — a genuine tilt, but not every check is confirming it yet. ₱"+target+" is roughly the level it's pointing toward, ₱"+floor+" is where the case would start to weaken.",
      "The case for selling holds up, "+sig.confidencePct+"% confidence, just without full agreement between the momentum and trend checks. Worth watching rather than acting on immediately — a move toward ₱"+target+" would strengthen it."
    ]);
  }

  // HOLD
  if(sig.confidencePct>=70){
    return tpPick(sym+'-rec-hold-strong', [
      "The honest call here is to do nothing. Neither the momentum gauge nor the trend is stretched enough to give either side a real edge right now — "+sig.confidencePct+"% confidence in that 'don't trade this' read means this isn't caution dressed up as an answer, it's a genuine finding: this stock is sitting quietly in the middle of its own range. Forcing a buy or sell decision here would mean trading a hunch instead of an actual setup.",
      "Nothing about this stock is stretched right now, in either direction, and that's the actual finding — "+sig.confidencePct+"% confidence in HOLD. Knowing that this stock has been trading somewhere between roughly ₱"+(band?band.L:'—')+" and ₱"+(band?band.H:'—')+" lately is more useful right now than forcing a direction that isn't really there.",
      "This is a genuine 'wait and see,' and a fairly confident one at that ("+sig.confidencePct+"%). The momentum gauge is calm, the trend is flat — there's nothing to trade here yet, just normal back-and-forth until one of those two things actually moves."
    ]);
  }
  return tpPick(sym+'-rec-hold-watch', [
    "This is closer to turning into a real buy or sell signal than a typical HOLD is — "+sig.confidencePct+"% confidence in the no-trade call means it's worth checking back on soon rather than ignoring completely. A small shift in momentum or in the trend could flip this into an actual signal.",
    "HOLD, but not a settled one — "+sig.confidencePct+"% confidence here means things are closer to tipping one way or another than to sitting dead center. Worth watching this one over the next session or two rather than writing it off.",
    "This sits on HOLD at "+sig.confidencePct+"% confidence, which is on the lower end for a no-trade call — one of the two things this model checks is closer to flipping than it might look at first glance."
  ]);
}

// Public entry point used by tpRenderAll: leads with the market-activity
// context (last trade date, stale-print detection) so the reader knows
// how much to trust the signal before reading the verdict itself, then
// the verdict + action plan from the core function above.
// ══════════════════════════════════════════════════════════════
// POSITION SIZING — answers "okay, but how MUCH?" in actual pesos.
// Uses a fixed ₱100,000 reference so the numbers are concrete: for a
// BUY it sizes how much of that capital to deploy (scaled by how strong
// the setup is — full-agreement setups earn a bigger allocation, counter-
// trend bets a much smaller one); for a SELL it sizes how much of a
// ₱100,000 position to unload for the same reasons. Scale the numbers
// proportionally for a different capital base (₱50k = halve everything).
// ══════════════════════════════════════════════════════════════
const TP_REF_CAPITAL = 100000;
function tpPesoFmt(n){ return Math.round(n).toLocaleString('en-PH'); }
function tpPositionPlan(sig, band, aligned, opposed){
  const price = sig.price;

  if(sig.signal==='BUY'){
    const pct = (aligned && sig.confidencePct>=80) ? 60 : opposed ? 20 : 40;
    const alloc = TP_REF_CAPITAL * pct/100;
    const cash = TP_REF_CAPITAL - alloc;
    let txt = "How much to buy (on a \u20b1"+tpPesoFmt(TP_REF_CAPITAL)+" reference): deploy about "+pct+"% \u2014 roughly \u20b1"+tpPesoFmt(alloc);
    if(price){
      const shares = Math.floor(alloc/price);
      if(shares>0) txt += ", which buys around "+shares.toLocaleString()+" shares at \u20b1"+price.toFixed(2);
    }
    txt += " \u2014 and keep the other "+(100-pct)+"% (\u20b1"+tpPesoFmt(cash)+") in cash. ";
    txt += (aligned && sig.confidencePct>=80)
      ? "The larger allocation is justified because momentum and trend both agree here; this is the strongest setup shape this model produces, but even then it never puts the full amount at risk on one idea."
      : opposed
        ? "The small allocation is deliberate: this buy is fighting the current downtrend, so only a starter position makes sense until the trend actually turns."
        : "A middle-sized allocation fits a genuine-but-unconfirmed setup \u2014 enough to matter if it works, small enough to add more later once the price confirms.";
    if(band && price){
      const shares = Math.floor(alloc/price);
      const riskPeso = Math.max(0,(price - band.low)) * shares;
      const gainPeso = Math.max(0,(band.high - price)) * shares;
      txt += " In peso terms on that position: roughly \u20b1"+tpPesoFmt(gainPeso)+" of potential gain if it reaches \u20b1"+band.H+", against about \u20b1"+tpPesoFmt(riskPeso)+" of loss if the stop under \u20b1"+band.L+" gets hit.";
    }
    return txt;
  }

  if(sig.signal==='SELL'){
    const pct = (aligned && sig.confidencePct>=80) ? 100 : opposed ? 30 : 50;
    const sellAmt = TP_REF_CAPITAL * pct/100;
    const keepAmt = TP_REF_CAPITAL - sellAmt;
    let txt = "How much to sell (if you hold \u20b1"+tpPesoFmt(TP_REF_CAPITAL)+" of this stock): unload about "+pct+"% \u2014 roughly \u20b1"+tpPesoFmt(sellAmt)+" worth";
    if(price){
      const shares = Math.floor(sellAmt/price);
      if(shares>0) txt += " (around "+shares.toLocaleString()+" shares at \u20b1"+price.toFixed(2)+")";
    }
    txt += pct===100 ? ". " : ", keeping \u20b1"+tpPesoFmt(keepAmt)+" riding with a stop-loss in place. ";
    txt += (aligned && sig.confidencePct>=80)
      ? "A full exit is warranted when momentum and trend both point down together \u2014 that double-confirmation is rare, and hoping it blows over usually costs more than re-buying later if you turn out wrong."
      : opposed
        ? "Only a partial trim makes sense because the overall trend is still pointed up \u2014 you're taking some money off the table on a warning sign, not abandoning a stock that's still climbing."
        : "A half-position sale matches a real-but-unconfirmed sell case: it locks in meaningful protection without fully exiting before the trend has actually broken.";
    if(band && price){
      const downPct = Math.max(0,(price - band.low)/price);
      const protectedPeso = sellAmt * downPct;
      txt += " In peso terms: selling that portion now protects roughly \u20b1"+tpPesoFmt(protectedPeso)+" of value if the price slides to \u20b1"+band.L+" as this read expects.";
    }
    return txt;
  }

  // HOLD
  return "How much to trade (on a \u20b1"+tpPesoFmt(TP_REF_CAPITAL)+" reference): \u20b10 \u2014 keep the full amount in cash for this name. A HOLD means neither buying nor selling has an edge right now, so any peso deployed here would be paying for a guess. If you already own it, this isn't a signal to sell either \u2014 just hold what you have and wait for the levels above to break.";
}

// Public entry point used by tpRenderAll. Returns an ARRAY of bullet
// strings — market context, the verdict itself, the practical action
// plan, and the ₱100,000-reference position sizing — which the summary
// card renders as a bulleted list instead of one dense paragraph.
function tpOverallRecommendation(sig){
  const band = tpProjectedBand(sig);
  const aligned = (sig.signal==='BUY' && sig.trend==='BULL') || (sig.signal==='SELL' && sig.trend==='BEAR');
  const opposed = (sig.signal==='BUY' && sig.trend==='BEAR') || (sig.signal==='SELL' && sig.trend==='BULL');
  const context = tpMarketContextNarrative(sig);
  const verdict = tpOverallRecommendationVerdict(sig);
  const action = tpActionPlan(sig, band, aligned, opposed);
  const entryExit = tpEntryExitPlan(sig, band);
  // "What this means in practice" and the entry/exit prices are one
  // combined practical bullet — the reasoning, then the exact levels.
  const practical = [action, entryExit].filter(Boolean).join('<br><br>');
  const sizing = tpPositionPlan(sig, band, aligned, opposed);
  return [context, verdict, practical, sizing].filter(Boolean);
}

// ── MORE DETAILS toggle — collapses/expands the signal (HOLD/BUY/SELL),
// trend (BULL/BEAR/FLAT) and KEY LEVELS rows on the reasoning card.
// Collapsed by default; prefix is 'tp' (stocks) or 'tc' (crypto). ──
function tpToggleMoreDetails(prefix){
  var box = document.getElementById(prefix+'-more-details');
  var tag = document.getElementById(prefix+'-more-toggle');
  if(!box) return;
  var isOpen = box.style.display !== 'none';
  box.style.display = isOpen ? 'none' : '';
  if(tag) tag.textContent = isOpen ? 'MORE DETAILS \u25b8' : 'MORE DETAILS \u25be';
}

// Renders an array of narrative chunks (or a single string) as a
// bulleted list for the summary card — one <li> per logical point.
function tpBulletsHTML(parts){
  const items = (Array.isArray(parts) ? parts : [parts])
    .filter(function(p){ return p && String(p).trim(); });
  return '<ul class="tp-summary-bullets">' +
    items.map(function(p){ return '<li>'+p+'</li>'; }).join('') +
    '</ul>';
}

const TP_TF_DAYS = {'1W':7,'1M':30,'3M':90,'6M':180,'1Y':365,'2Y':730};
let tpCurrentTF = '3M';
// The canonical "last traded" date — same value Market Stats displays,
// resolved via tpResolveLastTrade (which prefers the fresher live-quote
// asOf date over refSeries's possibly-lagging bar date). The 1D chart
// label reads THIS, not its own independent lookup, so the two can never
// disagree the way they did when the label called tpGetSeries directly.
let tpCurrentLastTradeDate = null;

function tpGenIntraday(base, seed){
  const rnd = tpRand(seed);
  let price = base;
  const out = [];
  const startH=9, startM=30, step=15, totalMin=6*60;
  const count = Math.floor(totalMin/step);
  for(let i=0;i<=count;i++){
    const drift = (rnd()-0.5) * base * 0.006;
    const open = price;
    const close = Math.max(0.01, open+drift);
    const high = Math.max(open,close)+rnd()*base*0.003;
    const low  = Math.min(open,close)-rnd()*base*0.003;
    const vol  = Math.floor(20000+rnd()*180000);
    const mins = startM + i*step;
    const hh = startH + Math.floor(mins/60);
    const mm = mins%60;
    const label = ((hh%12)||12)+':'+String(mm).padStart(2,'0')+(hh<12?'AM':'PM');
    out.push({date:label, open:+open.toFixed(2), high:+high.toFixed(2), low:+Math.max(0.01,low).toFixed(2), close:+close.toFixed(2), volume:vol});
    price = close;
  }
  return out;
}

function tpAggregate(series, targetCount){
  if(series.length<=targetCount) return series;
  const bucketSize = Math.ceil(series.length/targetCount);
  const out=[];
  for(let i=0;i<series.length;i+=bucketSize){
    const chunk = series.slice(i,i+bucketSize);
    if(!chunk.length) continue;
    out.push({
      date: chunk[0].date,
      open: chunk[0].open,
      close: chunk[chunk.length-1].close,
      high: Math.max(...chunk.map(function(d){return d.high;})),
      low: Math.min(...chunk.map(function(d){return d.low;})),
      volume: chunk.reduce(function(s,d){return s+d.volume;},0)
    });
  }
  return out;
}

function tpGetChartSeries(sym, tf){
  const stock = tpFindStock(sym);
  if(!stock) return [];
  if(tf==='1D') return tpGenIntraday(stock.base, tpSeed(sym+'-1d-demo')); // intraday stays mock — PSE Edge's DisclosureCht.ax only returns daily bars
  const days = TP_TF_DAYS[tf] || 90;
  // Same live-bar merge as the signal engine -- without this the reasoning
  // cards would reflect today's session while the chart's last candle
  // stopped at the previous EOD bar.
  const full = tpMergeLiveBar(tpGetSeries(sym, days), sym);
  return tpAggregate(full, 80);
}

function tpRSISeries(closes, period){
  const out = new Array(closes.length).fill(null);
  for(let i=period;i<closes.length;i++){
    out[i] = tpRSI(closes.slice(0,i+1), period);
  }
  return out;
}

function tpTrendSeries(closes){
  const n = closes.length;
  const period = Math.max(3, Math.min(20, Math.floor(n/3)));
  const out = new Array(n).fill(null);
  for(let i=period-1;i<n;i++){
    let sum=0;
    for(let j=i-period+1;j<=i;j++) sum+=closes[j];
    out[i] = sum/period;
  }
  return out;
}

function tpFmtDate(s){
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const p = s.split('-');
    return (+p[1])+'/'+(+p[2])+'/'+p[0].slice(2);
  }
  return s;
}

function tpFmtPeso(n){
  if(n>=1e9) return '₱'+(n/1e9).toFixed(2)+'B';
  if(n>=1e6) return '₱'+(n/1e6).toFixed(2)+'M';
  if(n>=1e3) return '₱'+(n/1e3).toFixed(2)+'K';
  return '₱'+n.toFixed(0);
}

function tpFmtNum(n){
  if(n>=1e9) return (n/1e9).toFixed(2)+'B';
  if(n>=1e6) return (n/1e6).toFixed(2)+'M';
  if(n>=1e3) return (n/1e3).toFixed(2)+'K';
  return String(n);
}

function tpRenderCombinedChart(series){
  const priceCanvas = document.getElementById('tp-canvas-price');
  const volCanvas = document.getElementById('tp-canvas-vol');
  const rsiCanvas = document.getElementById('tp-canvas-rsi');
  if(!priceCanvas || !volCanvas || !rsiCanvas || !series.length) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = priceCanvas.clientWidth || priceCanvas.parentElement.clientWidth;

  function setup(canvas, cssH){
    canvas.width = cssW*dpr; canvas.height = cssH*dpr;
    canvas.style.height = cssH+'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);
    return ctx;
  }

  const priceH=180, volH=54, rsiH=50;
  const pctx = setup(priceCanvas, priceH);
  const vctx = setup(volCanvas, volH);
  const rctx = setup(rsiCanvas, rsiH);

  const n = series.length;
  const slotW = cssW/n;
  const bodyW = Math.max(1.5, slotW*0.55);

  const highs=series.map(function(d){return d.high;}), lows=series.map(function(d){return d.low;});
  const max=Math.max.apply(null,highs), min=Math.min.apply(null,lows);
  const range=(max-min)||1;
  const padTop=8, padBottom=8;
  const usableH=priceH-padTop-padBottom;

  series.forEach(function(d,i){
    const x=i*slotW+slotW/2;
    const yHigh=padTop+(1-(d.high-min)/range)*usableH;
    const yLow=padTop+(1-(d.low-min)/range)*usableH;
    const yOpen=padTop+(1-(d.open-min)/range)*usableH;
    const yClose=padTop+(1-(d.close-min)/range)*usableH;
    const up=d.close>=d.open;
    pctx.strokeStyle = up?'#22c55e':'#ef4444';
    pctx.fillStyle = up?'#22c55e':'#ef4444';
    pctx.lineWidth=1;
    pctx.beginPath(); pctx.moveTo(x,yHigh); pctx.lineTo(x,yLow); pctx.stroke();
    const bodyTop=Math.min(yOpen,yClose);
    const bodyH=Math.max(1,Math.abs(yClose-yOpen));
    pctx.fillRect(x-bodyW/2, bodyTop, bodyW, bodyH);
  });
  const trendVals = tpTrendSeries(series.map(function(d){return d.close;}));
  pctx.strokeStyle = '#f59e0b';
  pctx.lineWidth = 1.5;
  pctx.beginPath();
  let tStarted = false;
  trendVals.forEach(function(v,i){
    if(v===null) return;
    const x = i*slotW + slotW/2;
    const y = padTop + (1-(v-min)/range)*usableH;
    if(!tStarted){ pctx.moveTo(x,y); tStarted=true; } else pctx.lineTo(x,y);
  });
  pctx.stroke();

  pctx.fillStyle='#7a7a88'; pctx.font='9px Inter,sans-serif'; pctx.textAlign='right';
  [max, min+range/2, min].forEach(function(v){
    const y = padTop + (1-(v-min)/range)*usableH;
    pctx.fillText(v.toFixed(2), cssW-2, Math.max(9,Math.min(priceH-2,y+3)));
  });

  const vols = series.map(function(d){return d.volume;});
  const vmax = Math.max.apply(null,vols)||1;
  series.forEach(function(d,i){
    const x=i*slotW+slotW/2;
    const h=(d.volume/vmax)*(volH-6);
    const up=d.close>=d.open;
    vctx.fillStyle = up?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)';
    vctx.fillRect(x-bodyW/2, volH-h-2, bodyW, h);
  });

  const closes = series.map(function(d){return d.close;});
  const rsiVals = tpRSISeries(closes,14);
  rctx.strokeStyle='rgba(122,122,136,0.35)'; rctx.lineWidth=1; rctx.setLineDash([2,2]);
  [30,70].forEach(function(v){
    const y=rsiH-(v/100)*rsiH;
    rctx.beginPath(); rctx.moveTo(0,y); rctx.lineTo(cssW,y); rctx.stroke();
  });
  rctx.setLineDash([]);
  rctx.strokeStyle='#8b5cf6'; rctx.lineWidth=1.5; rctx.beginPath();
  let started=false;
  rsiVals.forEach(function(v,i){
    if(v===null) return;
    const x=i*slotW+slotW/2;
    const y = rsiH-(v/100)*rsiH;
    if(!started){ rctx.moveTo(x,y); started=true; } else rctx.lineTo(x,y);
  });
  rctx.stroke();

  const datesEl = document.getElementById('tp-chart-dates');
  if(datesEl){
    const labelCount = Math.min(5, n);
    let html='';
    for(let k=0;k<labelCount;k++){
      const idx = Math.floor(k*(n-1)/((labelCount-1)||1));
      html += '<span>'+tpFmtDate(series[idx].date)+'</span>';
    }
    datesEl.innerHTML = html;
  }
}

function tpUpdateRangeAndStats(refSeries, sig, liveQuote){
  // liveQuote (from pse-live-quotes.json) is same-day accurate; refSeries's
  // last bar (from pse-full-history.json) can lag by up to a day. Prefer
  // liveQuote for the fields it covers, fall back to refSeries otherwise —
  // SMA20/SMA50 always come from refSeries since they need multi-day history
  // that liveQuote (a single snapshot) doesn't have.
  const last = refSeries[refSeries.length-1];
  const open = (liveQuote && liveQuote.open != null) ? liveQuote.open : last.open;
  const high = (liveQuote && liveQuote.high != null) ? liveQuote.high : last.high;
  const low = (liveQuote && liveQuote.low != null) ? liveQuote.low : last.low;
  const close = (liveQuote && liveQuote.last != null) ? liveQuote.last : last.close;
  // last.volume is peso VALUE, not a share count (see the history-loader
  // comment above tpMergeLiveBar: volume:d.value). Only liveQuote.volume
  // is ever a real share count. Never re-multiply last.volume by price
  // or label it "shares" -- that double-counts pesos as if they were shares.
  const liveValue  = (liveQuote && liveQuote.value  != null) ? liveQuote.value  : null;
  const liveShares = (liveQuote && liveQuote.volume != null) ? liveQuote.volume : null;
  const pesoValue  = liveValue != null ? liveValue : (last.volume || 0);

  document.getElementById('tp-range-low').textContent = low.toFixed(2);
  document.getElementById('tp-range-high').textContent = high.toFixed(2);
  const pct = Math.max(0, Math.min(100, ((close-low)/((high-low)||1))*100));
  document.getElementById('tp-range-marker').style.left = pct+'%';
  document.getElementById('tp-range-fill').style.width = pct+'%';

  document.getElementById('tp-stat-open').textContent = '₱'+open.toFixed(2);
  document.getElementById('tp-stat-high').textContent = '₱'+high.toFixed(2);
  document.getElementById('tp-stat-low').textContent = '₱'+low.toFixed(2);
  document.getElementById('tp-stat-vol').textContent =
    tpFmtPeso(pesoValue) + (liveShares != null ? '  ·  ' + tpFmtNum(liveShares) + ' shares' : '');
  document.getElementById('tp-stat-sma20').textContent = sig.sma20!==null ? '₱'+sig.sma20 : '—';
  document.getElementById('tp-stat-sma50').textContent = sig.sma50!==null ? '₱'+sig.sma50 : '—';

  const lt = sig.lastTrade;
  const ltEl = document.getElementById('tp-stat-lasttrade');
  if(ltEl){
    if(lt){
      const agoTxt = lt.daysSince<=0 ? 'today' : lt.daysSince===1 ? '1 day ago' : lt.daysSince+' days ago';
      ltEl.textContent = tpFmtDate(lt.date) + ' (' + agoTxt + ')' + (lt.isStale ? ' · thin trading' : '');
    } else {
      ltEl.textContent = '—';
    }
  }
}

// The 1D view is a synthesized intraday pattern (tpGenIntraday) — PSE Edge's
// DisclosureCht.ax endpoint only returns daily bars, so there's no real
// intraday feed to draw from. That candle art has never had ANY date on it,
// which reads as "today, live" even when the stock's real last trade was
// days ago. This label ties the mock pattern back to the actual last real
// session so it's never mistaken for live intraday data.
function tpUpdateChartTfDate(sym, tf){
  var el = document.getElementById('tp-chart-tf-date');
  if(!el) return;
  if(tf !== '1D'){ el.style.display = 'none'; el.textContent = ''; return; }
  var lastDate = tpCurrentLastTradeDate;
  el.style.display = 'block';
  el.innerHTML = lastDate
    ? 'Simulated intraday pattern \u2014 reflects last real session: <b>'+tpFmtDate(lastDate)+'</b>'
    : 'Simulated intraday pattern \u2014 session date unavailable';
}

function tpSetTimeframe(tf){
  tpCurrentTF = tf;
  document.querySelectorAll('#tp-stocks-view .tp-tf-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.tf===tf);
  });
  if(tpCurrentSym){
    tpRenderCombinedChart(tpGetChartSeries(tpCurrentSym, tf));
    tpUpdateChartTfDate(tpCurrentSym, tf);
  }
}

function tpFindStock(sym){ return PSE_ALL_STOCKS.find(x=>x.sym===sym); }

async function tpRenderAll(sym){
  const t = tpFindStock(sym);
  if(!t) return;
  tpCurrentSym = sym;
  await PSE_HISTORY_READY;
  // Live quote merged in as the newest bar (see tpMergeLiveBar) so RSI,
  // SMAs, volume confirmation, and the projected band all describe the
  // SAME session as the big price number below -- previously they ran on
  // the EOD file only, which can lag the live quote by 1+ sessions.
  const refSeries = tpMergeLiveBar(tpGetSeries(sym, 90), sym);
  const sig = tpComputeSignal(refSeries);
  const histPrev = refSeries[refSeries.length-2].close;

  // pse-live-quotes.json is same-day accurate (validated against pesobility's
  // live board — see Top Gainers), unlike refSeries's last bar which can lag
  // by up to a day. Prefer it for the displayed price/change whenever it's
  // available for this ticker; sig.trend/sig.signal/SMA still come from
  // refSeries regardless, since those need multi-day history a snapshot
  // can't provide.
  const lq = tpLiveQuotes[sym];
  const liveOk = lq && lq.status === 'Open' && lq.last != null && lq.previousClose;
  sig.lastTrade = tpResolveLastTrade(sig, liveOk ? lq : null);
  tpCurrentLastTradeDate = sig.lastTrade ? sig.lastTrade.date : null;
  const price = liveOk ? lq.last : sig.price;
  const prev = liveOk ? lq.previousClose : histPrev;
  const chg = price - prev;
  const chgPct = (chg/prev*100);

  document.getElementById('tp-name').textContent = t.sym + ' · ' + t.name;
  tpUpdateWatchBtn();
  tpRenderWatchlist();
  document.getElementById('tp-price').textContent = '₱' + price.toFixed(2);
  const chgEl = document.getElementById('tp-chg');
  chgEl.textContent = (chg>=0?'+':'') + chg.toFixed(2) + ' (' + (chgPct>=0?'+':'') + chgPct.toFixed(2) + '%)';
  chgEl.className = 'tp-price-chg ' + (chg>=0?'up':'down');

  const trendArrow = sig.trend==='BULL' ? '\u25B2' : sig.trend==='BEAR' ? '\u25BC' : '\u2014';
  const tpTrendCol = tpConfidenceColor(sig.trendConfidencePct, sig.trend);
  document.getElementById('tp-trend-wrap').innerHTML =
    '<div class="tp-trend-badge ' + sig.trend + '" style="background:' + tpTrendCol.bg + ';color:' + tpTrendCol.text + ';border-color:' + tpTrendCol.text + '">' + trendArrow + ' ' + sig.trendConfidencePct + '% ' + sig.trend + '</div>';

  const tpBadgeCol = tpConfidenceColor(sig.confidencePct, sig.signal);
  document.getElementById('tp-badge-wrap').innerHTML =
    '<div class="tp-signal-badge ' + sig.signal + '" style="background:' + tpBadgeCol.bg + ';color:' + tpBadgeCol.text + ';border-color:' + tpBadgeCol.text + '">' + sig.confidencePct + '% ' + sig.signal + '</div>';

  tpUpdateRangeAndStats(refSeries, sig, liveOk ? lq : null);

  // Conversational one-paragraph explanations. Full bullet-list detail
  // used to live in a Signal Breakdown card further down; that slot is
  // now the market-wide Top Gainers card instead.
  const signalTagEl = document.getElementById('tp-summary-signal-tag');
  signalTagEl.textContent = sig.confidencePct + '% ' + sig.signal;
  signalTagEl.className = 'tp-summary-tag ' + sig.signal;
  { const c = tpConfidenceColor(sig.confidencePct, sig.signal); signalTagEl.style.color = c.text; signalTagEl.style.background = c.bg; }
  document.getElementById('tp-summary-signal-text').innerHTML = tpBulletsHTML(tpSignalNarrative(sig));
  const trendTagEl = document.getElementById('tp-summary-trend-tag');
  trendTagEl.textContent = sig.trendConfidencePct + '% ' + sig.trend;
  trendTagEl.className = 'tp-summary-tag ' + sig.trend;
  { const c = tpConfidenceColor(sig.trendConfidencePct, sig.trend); trendTagEl.style.color = c.text; trendTagEl.style.background = c.bg; }
  document.getElementById('tp-summary-trend-text').innerHTML = tpBulletsHTML(tpTrendNarrative(sig));
  const levelsTagEl = document.getElementById('tp-summary-levels-tag');
  levelsTagEl.textContent = 'KEY LEVELS';
  levelsTagEl.className = 'tp-summary-tag LEVELS';
  document.getElementById('tp-summary-levels-text').innerHTML = tpBulletsHTML(tpLevelsNarrative(sig));

  const recTagEl = document.getElementById('tp-summary-rec-tag');
  recTagEl.textContent = 'RECOMMENDATION';
  recTagEl.className = 'tp-summary-tag ' + sig.signal;
  { const c = tpConfidenceColor(sig.confidencePct, sig.signal); recTagEl.style.color = c.text; recTagEl.style.background = c.bg; }
  document.getElementById('tp-summary-rec-text').innerHTML = tpBulletsHTML(tpOverallRecommendation(sig));

  // Full bullet-list detail previously lived in a Signal Breakdown card
  // here; that slot is now the market-wide Top Gainers card instead.

  const searchInput = document.getElementById('tp-stock-search');
  if(searchInput) searchInput.value = t.name + ' (' + t.sym + ')';

  tpRenderCombinedChart(tpGetChartSeries(sym, tpCurrentTF));
  tpUpdateChartTfDate(sym, tpCurrentTF);
}

async function tpSelectTicker(sym){ if(sym) await tpRenderAll(sym); }

const TP_BLUE_LIST = PSE_ALL_STOCKS.filter(function(t){ return BLUE_CHIP_SYMS.indexOf(t.sym)>=0; })
  .sort(function(a,b){ return a.name.localeCompare(b.name); });
const TP_OTHER_LIST = PSE_ALL_STOCKS.filter(function(t){ return BLUE_CHIP_SYMS.indexOf(t.sym)<0; })
  .sort(function(a,b){ return a.name.localeCompare(b.name); });

function tpOptRow(t, isBlue){
  const star = isBlue ? '<span class="tp-opt-star">\u2605</span>' : '';
  const priceInfo = tpGetPicklistPrice(t.sym);
  let priceHtml = '';
  if(priceInfo){
    const arrowChar = priceInfo.direction==='up' ? '\u25B2' : priceInfo.direction==='down' ? '\u25BC' : '\u2014';
    const arrowClass = priceInfo.direction || 'flat';
    priceHtml = '<span class="tp-opt-price">\u20b1'+priceInfo.current.toFixed(2)+'</span>'+
                '<span class="tp-opt-arrow '+arrowClass+'">'+arrowChar+'</span>';
  }
  return '<div class="tp-opt" data-sym="'+t.sym+'" onmousedown="tpChooseStock(\''+t.sym+'\')">'+
         '<span>'+t.name+' ('+t.sym+')</span>'+star+priceHtml+'</div>';
}

function tpRenderDropdown(query){
  const dd = document.getElementById('tp-dropdown');
  if(!dd) return;
  const q = (query||'').trim().toLowerCase();
  const matches = function(t){
    return !q || t.name.toLowerCase().indexOf(q)>=0 || t.sym.toLowerCase().indexOf(q)>=0;
  };
  const blueMatches = TP_BLUE_LIST.filter(matches);
  const otherMatches = TP_OTHER_LIST.filter(matches);

  if(blueMatches.length===0 && otherMatches.length===0){
    dd.innerHTML = '<div class="tp-opt-empty">No matching PSE stocks</div>';
    return;
  }
  let html = '';
  if(blueMatches.length){
    html += '<div class="tp-optgroup-label">Blue Chips</div>' + blueMatches.map(function(t){ return tpOptRow(t,true); }).join('');
  }
  if(otherMatches.length){
    html += '<div class="tp-optgroup-label">All PH Stocks (A-Z)</div>' + otherMatches.map(function(t){ return tpOptRow(t,false); }).join('');
  }
  dd.innerHTML = html;
}

function tpOpenDropdown(){
  const dd = document.getElementById('tp-dropdown');
  if(!dd) return;
  const input = document.getElementById('tp-stock-search');
  if(input) input.select();
  tpRenderDropdown('');
  dd.classList.add('open');
}

function tpCloseDropdown(){
  const dd = document.getElementById('tp-dropdown');
  if(dd) dd.classList.remove('open');
}

function tpFilterDropdown(query){
  const dd = document.getElementById('tp-dropdown');
  if(dd) dd.classList.add('open');
  tpRenderDropdown(query);
}

function tpChooseStock(sym){
  tpSelectTicker(sym);
  tpCloseDropdown();
}

document.addEventListener('click', function(e){
  const combo = document.querySelector('#trade-page .tp-picklist-group');
  if(combo && !combo.contains(e.target)) tpCloseDropdown();
});

(function initTradePicklist(){
  tpRenderDropdown('');
})();

window.addEventListener('resize', function(){
  if(tpCurrentSym) tpRenderCombinedChart(tpGetChartSeries(tpCurrentSym, tpCurrentTF));
});

// ═══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// TRADE — CRYPTO (LIVE DATA via CoinGecko API)
// Data pipeline: crypto-scraper/scrape_crypto_live.py (run by the
// "Fetch Live Data" button below via workflow_dispatch, same PAT flow
// as the Stocks tab) writes crypto-live-quotes.json (current price/24h
// change/volume snapshot) and crypto-history.json (daily OHLCV series,
// ~365 days per coin). Both are loaded here the same way the Stocks tab
// loads pse-live-quotes.json / pse-history.json — eagerly, at file
// load, from the repo's raw.githubusercontent.com URL, independent of
// whether the Crypto sub-tab has ever been opened.
//
// DATA FIDELITY (see crypto-scraper/scrape_crypto_live.py's docstring
// for the full reasoning): each daily bar carries a "real" flag. The
// trailing ~30 days have genuine high/low wicks (resampled from real
// 4-hour candles); everything older is close-derived (real close price,
// but a zero-wick open/high/low approximation) because CoinGecko's free
// tier doesn't expose real wicks that far back. RSI/SMA/volume-trend
// only consume closes, so they're accurate for the FULL history; ATR
// and support/resistance (which need real wicks) are restricted to the
// real-flagged tail via tcRealTail() — which fully covers ATR's 14-day
// window. This project's own crypto-backtest.json is the empirical
// check on how well the resulting signals actually perform — see the
// Report Card tab.
//
// Reuses pure helpers from the stocks module: tpRand, tpSeed, tpSMA,
// tpRSI, tpRSISeries, tpTrendSeries, tpFmtNum, tpFmtDate, tpToggleCard,
// tpBulletsHTML, tpOutlookTableHTML, tpPick, tpGetGithubToken.
// ═══════════════════════════════════════════════════════════════
const TC_COINS = [
  {sym:'BTC',  id:'bitcoin',                             name:'Bitcoin'},
  {sym:'ETH',  id:'ethereum',                            name:'Ethereum'},
  {sym:'XRP',  id:'ripple',                              name:'XRP'},
  {sym:'BNB',  id:'binancecoin',                         name:'BNB'},
  {sym:'SOL',  id:'solana',                              name:'Solana'},
  {sym:'DOGE', id:'dogecoin',                            name:'Dogecoin'},
  {sym:'TRX',  id:'tron',                                name:'TRON'},
  {sym:'HYPE', id:'hyperliquid',                         name:'Hyperliquid'},
  {sym:'ADA',  id:'cardano',                             name:'Cardano'},
  {sym:'AVAX', id:'avalanche-2',                         name:'Avalanche'},
  {sym:'LINK', id:'chainlink',                           name:'Chainlink'},
  {sym:'DOT',  id:'polkadot',                            name:'Polkadot'},
  {sym:'LTC',  id:'litecoin',                            name:'Litecoin'},
  {sym:'SHIB', id:'shiba-inu',                           name:'Shiba Inu'},
  {sym:'SUI',  id:'sui',                                 name:'Sui'},
  {sym:'TON',  id:'the-open-network',                    name:'Toncoin'},
  {sym:'NEAR', id:'near',                                name:'NEAR Protocol'},
  {sym:'POL',  id:'polygon-ecosystem-token',             name:'Polygon'},
  {sym:'UNI',  id:'uniswap',                             name:'Uniswap'},
  {sym:'ATOM', id:'cosmos',                              name:'Cosmos'},
  {sym:'PAXG', id:'pax-gold',                            name:'PAX Gold'},
  {sym:'YFI',  id:'yearn-finance',                       name:'Yearn Finance'},
  {sym:'AAVE', id:'aave',                                name:'Aave'},
  {sym:'QNT',  id:'quant-network',                       name:'Quant'},
  {sym:'COMP', id:'compound-governance-token',           name:'Compound'},
  {sym:'ETC',  id:'ethereum-classic',                    name:'Ethereum Classic'},
  {sym:'INJ',  id:'injective-protocol',                  name:'Injective'},
  {sym:'ENS',  id:'ethereum-name-service',                name:'Ethereum Name Service'},
  {sym:'KSM',  id:'kusama',                              name:'Kusama'},
  {sym:'ICP',  id:'internet-computer',                   name:'Internet Computer'},
  {sym:'RENDER', id:'render-token',                      name:'Render'},
  {sym:'PENDLE', id:'pendle',                            name:'Pendle'},
  {sym:'AXS',  id:'axie-infinity',                       name:'Axie Infinity'},
  {sym:'FIL',  id:'filecoin',                            name:'Filecoin'},
  {sym:'RAY',  id:'raydium',                             name:'Raydium'},
  {sym:'AKT',  id:'akash-network',                       name:'Akash Network'},
  {sym:'APT',  id:'aptos',                               name:'Aptos'},
  {sym:'TIA',  id:'celestia',                            name:'Celestia'},
  {sym:'ONDO', id:'ondo-finance',                        name:'Ondo'},
  {sym:'LDO',  id:'lido-dao',                            name:'Lido DAO'},
  {sym:'HNT',  id:'helium',                              name:'Helium'},
  {sym:'XTZ',  id:'tezos',                               name:'Tezos'},
  {sym:'SNX',  id:'synthetix-network-token',             name:'Synthetix'},
  {sym:'CRV',  id:'curve-dao-token',                     name:'Curve DAO Token'},
  {sym:'XLM',  id:'stellar',                             name:'Stellar'},
  {sym:'FET',  id:'artificial-superintelligence-alliance', name:'Artificial Superintelligence Alliance'},
  {sym:'WIF',  id:'dogwifhat',                           name:'dogwifhat'},
  {sym:'STX',  id:'stacks',                              name:'Stacks'},
  {sym:'SUSHI', id:'sushi',                              name:'Sushi'},
  {sym:'APE',  id:'apecoin',                             name:'ApeCoin'},
  {sym:'IMX',  id:'immutable-x',                         name:'Immutable'},
  {sym:'KNC',  id:'kyber-network-crystal',               name:'Kyber Network Crystal'},
  {sym:'OP',   id:'optimism',                            name:'Optimism'},
  {sym:'BAL',  id:'balancer',                            name:'Balancer'},
  {sym:'ZRX',  id:'0x',                                  name:'0x'},
  {sym:'ALGO', id:'algorand',                            name:'Algorand'},
  {sym:'BAT',  id:'basic-attention-token',               name:'Basic Attention Token'},
  {sym:'ARB',  id:'arbitrum',                            name:'Arbitrum'},
  {sym:'ENA',  id:'ethena',                              name:'Ethena'},
  {sym:'MANA', id:'decentraland',                        name:'Decentraland'},
  {sym:'CRO',  id:'cronos',                              name:'Cronos'},
  {sym:'SAND', id:'the-sandbox',                         name:'The Sandbox'},
  {sym:'MINA', id:'mina-protocol',                       name:'Mina Protocol'},
  {sym:'KAVA', id:'kava',                                name:'Kava'},
  {sym:'PYTH', id:'pyth-network',                        name:'Pyth Network'},
  {sym:'STRK', id:'starknet',                            name:'Starknet'},
  {sym:'GRT',  id:'the-graph',                           name:'The Graph'},
  {sym:'CHZ',  id:'chiliz',                              name:'Chiliz'},
  {sym:'BLUR', id:'blur',                                name:'Blur'},
  {sym:'LRC',  id:'loopring',                            name:'Loopring'},
  {sym:'ZK',   id:'zksync',                              name:'ZKsync'},
  {sym:'BONK', id:'bonk',                                name:'Bonk'},
  {sym:'PEPE', id:'pepe',                                name:'Pepe'}
];

var tcLiveQuotes = {};        // sym -> {price, change24hPct, high24h, low24h, volume24h, marketCap, asOf}
// Timestamp (client Date.now()) of the last successful DIRECT price refresh
// (straight from CoinGecko, bypassing the GitHub Actions pipeline entirely).
// Kept separate from CRYPTO_HISTORY_STATUS's timestamp so the status line
// can show price-freshness and signal-freshness as two distinct facts.
var tcLastPriceRefreshAt = null;
var TC_PRICE_REFRESH_MS = 5*60*1000; // 5 min — see quota math discussed with the user
var tcPriceRefreshTimer = null;
var tcLiveSeries = {};        // sym -> [{date,open,high,low,close,volume,real}, ...] ascending
var CRYPTO_QUOTES_STATUS = {loaded:false, source:'no live data yet — tap Fetch Live Data', error:null};
var CRYPTO_HISTORY_STATUS = {loaded:false, source:'no live data yet — tap Fetch Live Data', error:null};

var tcSeriesCache = {};       // memoized merged-with-live series per symbol (invalidated on reload)
var tcCurrentSym = null;
var tcCurrentTF = '3M';
// Restored from localStorage so the Gainers/Bullish choice survives a page
// reload — previously this always reset to 'current' on refresh, which is
// why the Bullish filter kept silently reverting to Gainers.
var tcGainersModeVal = (function(){
  try { return localStorage.getItem('tc_gainers_mode') === 'bullish' ? 'bullish' : 'current'; }
  catch(e){ return 'current'; }
})();
var tcInited = false;

function tcFmtPHP(n){
  if(n == null || !isFinite(n)) return '—';
  if(n >= 1000) return '\u20b1' + n.toLocaleString('en-US', {maximumFractionDigits:2, minimumFractionDigits:2});
  if(n >= 1)    return '\u20b1' + n.toFixed(2);
  return '\u20b1' + n.toFixed(4);
}
function tcFmtUSD(n){ return tcFmtPHP(n); } // legacy alias, kept in case any external code still calls this name
function tcFmtPHPBig(n){
  if(n == null || !isFinite(n)) return '—';
  if(n>=1e9) return '\u20b1'+(n/1e9).toFixed(2)+'B';
  if(n>=1e6) return '\u20b1'+(n/1e6).toFixed(2)+'M';
  if(n>=1e3) return '\u20b1'+(n/1e3).toFixed(2)+'K';
  return '\u20b1'+n.toFixed(0);
}
function tcFmtUSDBig(n){ return tcFmtPHPBig(n); } // legacy alias, kept in case any external code still calls this name
function tcFindCoin(sym){ return TC_COINS.find(function(c){return c.sym===sym;}); }

// ══════════════════════════════════════════════════════════════
// LIVE DATA LOADERS — mirror loadPseHistory()/loadPseLiveQuotes() in
// the Stocks module. Run eagerly at file load (not lazily on tab open)
// so data is ready the moment the person switches to Crypto.
// ══════════════════════════════════════════════════════════════
// Mirrors loadPseLiveQuotes()'s "Data Updated ..." status line — called after
// each loader resolves so tc-refresh-status never sits stuck on its initial
// placeholder text once real data (or a real error) comes back.
// Now shows Price and Signals freshness as two distinct facts, since they
// come from two different pipelines with different speeds: Price is the
// direct CoinGecko refresh (tcRefreshLivePriceDirect, every 5 min / on tab
// open); Signals still depend on the GitHub Actions history scraper. Before
// this split, one combined timestamp made it look like the BUY/SELL/HOLD
// badges were as fresh as the price, which isn't true — they're computed
// from crypto-history.json, refreshed only when Fetch Live Data completes.
function tcUpdateRefreshStatusDisplay(){
  var statusEl = document.getElementById('tc-refresh-status');
  if (!statusEl) return;

  var priceText;
  if (tcLastPriceRefreshAt) {
    priceText = 'Price: ' + tpFormatPH(tcLastPriceRefreshAt);
  } else if (CRYPTO_QUOTES_STATUS.loaded) {
    var qts = CRYPTO_QUOTES_STATUS.source.match(/updated ([^)]+)\)/);
    priceText = qts ? 'Price: ' + tpFormatPH(qts[1]) : 'Price: loaded';
  } else if (CRYPTO_QUOTES_STATUS.error) {
    priceText = 'Price: unavailable';
  } else {
    priceText = 'Price: not loaded yet';
  }

  var signalsText;
  if (CRYPTO_HISTORY_STATUS.loaded) {
    var hts = CRYPTO_HISTORY_STATUS.source.match(/updated ([^)]+)\)/);
    signalsText = hts ? 'Signals: ' + tpFormatPH(hts[1]).replace(' PH','') : 'Signals: updated';
  } else if (CRYPTO_HISTORY_STATUS.error) {
    signalsText = 'Signals: unavailable \u2014 ' + CRYPTO_HISTORY_STATUS.error;
  } else {
    signalsText = 'Signals: tap Fetch Live Data above';
  }

  statusEl.textContent = priceText + ' \u00b7 ' + signalsText;
}
// ══════════════════════════════════════════════════════════════
// DIRECT LIVE PRICE REFRESH — bypasses the GitHub Actions pipeline
// entirely. Calls CoinGecko's /coins/markets straight from the browser:
// one batched call for all tracked coins, no PAT, no workflow_dispatch,
// no raw.githubusercontent CDN lag. Only touches price + 24h change —
// history/signals (RSI, SMA, ATR) still come from loadCryptoHistory()
// via the scraper, unaffected by this.
// Uses the keyless public tier deliberately: at a 5-min interval this is
// ~1 call/5min, far under even the 5-15 calls/min keyless limit, so no
// API key needs to be exposed in client-side JS for this feature.
// ══════════════════════════════════════════════════════════════
async function tcRefreshLivePriceDirect(){
  try {
    var ids = TC_COINS.map(function(c){ return c.id; }).join(',');
    var url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=php&ids=' + ids + '&price_change_percentage=24h';
    var resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    var byId = {};
    data.forEach(function(row){ if (row && row.id) byId[row.id] = row; });
    TC_COINS.forEach(function(c){
      var row = byId[c.id];
      if (!row || row.current_price == null) return; // leave existing quote in place on partial data
      tcLiveQuotes[c.sym] = {
        id: c.id, name: c.name,
        price: row.current_price,
        change24hPct: row.price_change_percentage_24h_in_currency != null
          ? row.price_change_percentage_24h_in_currency : row.price_change_percentage_24h,
        high24h: row.high_24h, low24h: row.low_24h,
        volume24h: row.total_volume, marketCap: row.market_cap,
        asOf: row.last_updated
      };
    });
    tcLastPriceRefreshAt = Date.now();
    tcUpdateRefreshStatusDisplay();
    if (tcInited) { tcRenderTop(); tcRenderWatchlist(); if (tcCurrentSym) tcRenderAll(tcCurrentSym); }
  } catch(e) {
    // Silent failure by design — this is a background convenience refresh.
    // The GitHub-Actions-backed "Fetch Live Data" button remains the
    // reliable, user-visible path if this quietly fails (offline, CoinGecko
    // hiccup, etc.), so we don't want an error banner every 5 minutes.
    console.warn('Direct live price refresh failed (will retry next interval):', e.message);
  }
}
function tcStartLivePriceAutoRefresh(){
  tcRefreshLivePriceDirect(); // immediate fetch the moment the Crypto tab opens / page loads
  if (tcPriceRefreshTimer) clearInterval(tcPriceRefreshTimer);
  tcPriceRefreshTimer = setInterval(function(){
    if (document.hidden) return; // paused while tab is backgrounded — saves quota
    tcRefreshLivePriceDirect();
  }, TC_PRICE_REFRESH_MS);
}
document.addEventListener('visibilitychange', function(){
  // Catch up immediately when the person comes back, rather than waiting
  // up to 5 min for the next scheduled tick.
  if (!document.hidden && tcInited) tcRefreshLivePriceDirect();
});
async function loadCryptoLiveQuotes(){
  var RAW_URL = 'https://raw.githubusercontent.com/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/' + TP_GH_REF + '/crypto-live-quotes.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    var quotes = data.quotes || {};
    var count = Object.keys(quotes).length;
    tcLiveQuotes = quotes;
    CRYPTO_QUOTES_STATUS = {
      loaded: count > 0,
      source: count > 0 ? ('live ('+count+' coins, updated '+(data.generatedAt||'unknown')+')') : 'no coins in feed yet',
      error: (data.errors && data.errors.length) ? data.errors.join('; ') : null
    };
    console.log('Crypto live quotes loaded:', CRYPTO_QUOTES_STATUS.source, CRYPTO_QUOTES_STATUS.error||'');
  } catch(e) {
    CRYPTO_QUOTES_STATUS = {loaded:false, source:'no live data yet — tap Fetch Live Data', error:e.message};
    console.warn('Crypto live quotes load failed:', e.message);
  }
  tcSeriesCache = {};
  tcUpdateRefreshStatusDisplay();
  if(tcInited){ tcRenderTop(); tcRenderWatchlist(); if(tcCurrentSym) tcRenderAll(tcCurrentSym); }
}
async function loadCryptoHistory(){
  var RAW_URL = 'https://raw.githubusercontent.com/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/' + TP_GH_REF + '/crypto-history.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    var coins = data.coins || {};
    var loadedCount = 0;
    tcLiveSeries = {};
    for (var sym in coins) {
      var entry = coins[sym];
      if (Array.isArray(entry.series) && entry.series.length) {
        tcLiveSeries[sym] = entry.series;
        loadedCount++;
      }
    }
    var stale = false;
    if (data.generatedAt) {
      var ageMs = Date.now() - new Date(data.generatedAt).getTime();
      stale = ageMs > 1000*60*60*24*3; // >3 days without an update = don't trust it blindly
    }
    CRYPTO_HISTORY_STATUS = {
      loaded: loadedCount>0 && !stale,
      source: loadedCount>0 ? ('live ('+loadedCount+' coins, updated '+(data.generatedAt||'unknown')+')') : 'no coins in feed yet',
      error: stale ? 'data is stale (>3 days old)' : ((data.errors && data.errors.length) ? data.errors.join('; ') : null)
    };
    if (data.generatedAt) tcLastHistoryGeneratedAt = data.generatedAt;
    console.log('Crypto history loaded:', CRYPTO_HISTORY_STATUS.source, CRYPTO_HISTORY_STATUS.error||'');
  } catch(e) {
    CRYPTO_HISTORY_STATUS = {loaded:false, source:'no live data yet — tap Fetch Live Data', error:e.message};
    console.warn('Crypto history load failed:', e.message);
  }
  tcSeriesCache = {};
  var disclaimerEl = document.getElementById('tc-disclaimer');
  if(disclaimerEl){
    disclaimerEl.textContent = CRYPTO_HISTORY_STATUS.loaded
      ? 'Live data from the CoinGecko API. Daily bars — the trailing ~30 days carry real intraday highs/lows; older bars are derived from daily closes only (see Report Card for how the signals have performed). Signals are for decision support only; verify current prices before trading. Not financial advice.'
      : 'No live crypto data yet — tap Fetch Live Data above to pull real prices and history from the CoinGecko API (first run takes a few minutes). Not financial advice.';
  }
  tcUpdateRefreshStatusDisplay();
  if(tcInited){ tcRenderTop(); tcRenderWatchlist(); if(tcCurrentSym) tcRenderAll(tcCurrentSym); }
}
var CRYPTO_QUOTES_READY = loadCryptoLiveQuotes();
var CRYPTO_HISTORY_READY = loadCryptoHistory();

// Live quote as its own newest bar, same idea as tpMergeLiveBar in the
// Stocks module — keeps price card, chart, and signal engine reading
// the same moment in time after "Fetch Live Data" completes. high24h/
// low24h are a rolling 24h window (not a UTC-midnight-aligned session
// like the rest of the series), a minor approximation disclosed here.
function tcMergeLiveBar(series, sym){
  var q = tcLiveQuotes[sym];
  if(!Array.isArray(series) || !series.length || !q || q.price == null) return series;
  var lqDateObj = q.asOf ? new Date(q.asOf) : new Date();
  if(isNaN(lqDateObj.getTime())) return series;
  var lqDate = lqDateObj.toISOString().slice(0,10);
  var lastBar = series[series.length-1];
  if(!lastBar || !lastBar.date || lqDate < lastBar.date) return series;
  var sameDay = lqDate === lastBar.date;
  var bar = {
    date: lqDate,
    open: sameDay ? lastBar.open : lastBar.close,
    high: Math.max(sameDay ? lastBar.high : -Infinity, q.high24h!=null?q.high24h:q.price, q.price),
    low:  Math.min(sameDay ? lastBar.low  :  Infinity, q.low24h!=null?q.low24h:q.price,  q.price),
    close: q.price,
    volume: q.volume24h != null ? q.volume24h : (sameDay ? lastBar.volume : 0),
    real: true
  };
  var out = series.slice();
  if(sameDay) out[out.length-1] = bar; else out.push(bar);
  return out;
}
// Unified series getter: real live history + live quote merged in.
// Returns null (not a fabricated series) if there isn't enough real
// data yet — callers must handle that "no data" state explicitly.
function tcGetSeries(sym){
  if(tcSeriesCache[sym]) return tcSeriesCache[sym];
  var s = tcLiveSeries[sym];
  if(!Array.isArray(s) || s.length < 20) return null;
  var merged = tcMergeLiveBar(s, sym);
  tcSeriesCache[sym] = merged;
  return merged;
}
// Current quote, with graceful fallback to the last stored history bar
// if only crypto-history.json loaded successfully (partial-failure
// resilience — same philosophy as the Stocks tab's layered fallbacks).
function tcGetQuote(sym){
  var q = tcLiveQuotes[sym];
  if(q && q.price != null) return q;
  var s = tcLiveSeries[sym];
  if(Array.isArray(s) && s.length >= 2){
    var last = s[s.length-1], prev = s[s.length-2];
    var chg = prev.close > 0 ? (last.close-prev.close)/prev.close*100 : 0;
    return {price:last.close, change24hPct:chg, high24h:last.high, low24h:last.low,
            volume24h:last.volume, asOf:last.date, derivedFromHistory:true};
  }
  return null;
}

var TC_TF_BARS = {'1D':2,'1W':7,'1M':30,'3M':90,'6M':180,'1Y':365,'2Y':365};
// 1D — synthesized 24-hour intraday pattern anchored to the REAL current
// price and 24h change (CoinGecko's free tier has no true intraday feed,
// same limitation the Stocks tab discloses for its own 1D view via
// tpGenIntraday). Clearly labeled in the UI, not presented as real ticks.
function tcGenIntraday(q){
  var rnd = tpRand(tpSeed((tcCurrentSym||'x') + '-1d-' + (q.asOf||'')));
  var base = q.price;
  var out = [];
  var step = 30, count = Math.floor((24*60)/step);
  var price = base;
  for(var i=0;i<count;i++){
    var drift = (rnd()-0.5) * base * 0.008;
    var open = price;
    var close = Math.max(base*0.0001, open + drift);
    var high = Math.max(open,close) + rnd()*base*0.004;
    var low  = Math.max(base*0.0001, Math.min(open,close) - rnd()*base*0.004);
    var vol  = Math.floor((q.volume24h||1e6) / count * (0.5 + rnd()));
    var mins = i*step, hh = Math.floor(mins/60), mm = mins%60;
    var label = ((hh%12)||12) + ':' + String(mm).padStart(2,'0') + (hh<12?'AM':'PM');
    out.push({date:label, open:open, high:high, low:low, close:close, volume:vol, real:false});
    price = close;
  }
  var f = q.price / out[out.length-1].close;
  out.forEach(function(b){ b.open*=f; b.high*=f; b.low*=f; b.close*=f; });
  return out;
}
function tcGetChartSeries(sym, tf){
  if(tf === '1D'){
    var q = tcGetQuote(sym);
    return q ? tcGenIntraday(q) : null;
  }
  var s = tcGetSeries(sym);
  if(!s) return null;
  var n = TC_TF_BARS[tf] || 90;
  return s.slice(Math.max(0, s.length - n));
}
function tcUpdateChartTfDate(tf){
  var el = document.getElementById('tc-chart-tf-date');
  if(!el) return;
  if(tf !== '1D'){ el.style.display = 'none'; el.textContent = ''; return; }
  var q = tcGetQuote(tcCurrentSym);
  el.style.display = 'block';
  el.innerHTML = q
    ? 'Simulated intraday pattern \u2014 anchored to the live price as of <b>'+tpFmtDate((q.asOf||'').slice(0,10))+'</b>'
    : 'Simulated intraday pattern \u2014 no live price yet';
}

// ══════════════════════════════════════════════════════════════
// SIGNAL ENGINE — a line-for-line port of the Stocks tab's
// tpComputeSignal, recalibrated for crypto's higher baseline
// volatility and 24/7 liquidity. If you change this, also update
// backtest_crypto_signals.py's matching constants/functions, or the
// Report Card will grade an engine that no longer runs.
//   - RSI(14), thresholds 30/70 (classic default; crypto's liquid
//     24/7 majors don't need PSE's illiquidity-tuned 25/75)
//   - SMA20-vs-SMA50 trend, buffer 1.0% / confidence cap at 6% gap
//     (PSE used 0.4%/3% — sized for a market with several times less
//     daily volatility than crypto; a PSE-sized buffer would almost
//     never read FLAT here)
//   - Volume confirmation, 1.2x over prior 20 (same concept as PSE)
//   - True ATR(14) and swing-pivot support/resistance — BOTH
//     restricted to tcRealTail() (see module docstring on data
//     fidelity): only bars with genuine high/low wicks feed these
// ══════════════════════════════════════════════════════════════
const TC_RSI_PERIOD = 14, TC_RSI_OVERSOLD = 30, TC_RSI_OVERBOUGHT = 70;
const TC_TREND_BUFFER_PCT = 1.0, TC_TREND_CONF_CAP_PCT = 6;
const TC_VOL_CONFIRM_RATIO = 1.2, TC_VOL_CONFIRM_PERIOD = 20;
const TC_ATR_PERIOD = 14;
const TC_SR_PIVOT_WING = 2, TC_SR_CLUSTER_PCT = 1.5;
const TC_SIGNAL_THRESHOLD = 2, TC_MAX_SCORE = 3;
const TC_REAL_WINDOW_CAP = 30;

// Bars usable for wick-dependent math: only "real": true bars, taken
// from the end of the series backward, capped. crypto-history.json
// guarantees real bars are contiguous at the end (see the scraper).
function tcRealTail(series, cap){
  cap = cap || TC_REAL_WINDOW_CAP;
  var tail = [];
  for(var i=series.length-1; i>=0; i--){
    if(!series[i].real) break;
    tail.unshift(series[i]);
    if(tail.length >= cap) break;
  }
  return tail;
}
function tcTrendState(sma20, sma50){
  if(sma20==null || sma50==null || !sma50) return {state:'FLAT', gapPct:0, confidencePct:0};
  var gapPct = (sma20-sma50)/sma50*100, absGap = Math.abs(gapPct);
  if(gapPct > TC_TREND_BUFFER_PCT){
    return {state:'BULL', gapPct:gapPct, confidencePct:Math.round(Math.min(100, (absGap-TC_TREND_BUFFER_PCT)/(TC_TREND_CONF_CAP_PCT-TC_TREND_BUFFER_PCT)*100))};
  }
  if(gapPct < -TC_TREND_BUFFER_PCT){
    return {state:'BEAR', gapPct:gapPct, confidencePct:Math.round(Math.min(100, (absGap-TC_TREND_BUFFER_PCT)/(TC_TREND_CONF_CAP_PCT-TC_TREND_BUFFER_PCT)*100))};
  }
  return {state:'FLAT', gapPct:gapPct, confidencePct:Math.round(Math.max(0, 100-(absGap/TC_TREND_BUFFER_PCT)*100))};
}
function tcVolumeConfirmation(series, period){
  period = period || TC_VOL_CONFIRM_PERIOD;
  if(series.length < period+1) return null;
  var vols = series.map(function(b){ return b.volume||0; });
  var lastVol = vols[vols.length-1];
  var prior = vols.slice(vols.length-1-period, vols.length-1);
  var sum = prior.reduce(function(a,b){ return a+b; }, 0);
  var avg = prior.length ? sum/prior.length : 0;
  if(avg<=0) return {ratio:null, confirmed:false};
  var ratio = lastVol/avg;
  return {ratio:+ratio.toFixed(2), confirmed: ratio>=TC_VOL_CONFIRM_RATIO};
}
function tcATRPct(series, period){
  period = period || TC_ATR_PERIOD;
  var bars = tcRealTail(series);
  if(bars.length < period+1) return null;
  var sum=0, n=0;
  for(var i=bars.length-period; i<bars.length; i++){
    var cur=bars[i], prev=bars[i-1];
    if(!prev || !(prev.close>0)) continue;
    var hi = cur.high!=null ? cur.high : cur.close;
    var lo = cur.low!=null ? cur.low : cur.close;
    var tr = Math.max(hi-lo, Math.abs(hi-prev.close), Math.abs(lo-prev.close));
    sum += tr/prev.close*100; n++;
  }
  return n ? +(sum/n).toFixed(2) : null;
}
// Round-number step scaled for crypto's wide price range (BTC ~$60k
// down to sub-cent memecoins) — MUST match round_step() in
// backtest_crypto_signals.py.
function tcRoundStep(price){
  if(price>=100) return 10;
  if(price>=10) return 1;
  if(price>=1) return 0.1;
  if(price>=0.01) return 0.01;
  return 0.001;
}
function tcIsRoundLevel(level){
  if(!(level>0)) return false;
  var step = tcRoundStep(level);
  var nearest = Math.round(level/step)*step;
  return Math.abs(level-nearest)/level < 0.003;
}
function tcSupportResistance(series){
  var bars = tcRealTail(series);
  if(bars.length < (TC_SR_PIVOT_WING*2+3)) return null;
  var price = bars[bars.length-1].close;
  if(!(price>0)) return null;
  var pivots = [];
  for(var i=TC_SR_PIVOT_WING; i<bars.length-TC_SR_PIVOT_WING; i++){
    var hi = bars[i].high!=null ? bars[i].high : bars[i].close;
    var lo = bars[i].low!=null ? bars[i].low : bars[i].close;
    var isHigh=true, isLow=true;
    for(var w=1; w<=TC_SR_PIVOT_WING; w++){
      var l=bars[i-w], r=bars[i+w];
      var lh=l.high!=null?l.high:l.close, rh=r.high!=null?r.high:r.close;
      var ll=l.low!=null?l.low:l.close, rl=r.low!=null?r.low:r.close;
      if(lh>hi||rh>hi) isHigh=false;
      if(ll<lo||rl<lo) isLow=false;
    }
    if(isHigh) pivots.push(hi);
    if(isLow) pivots.push(lo);
  }
  pivots.sort(function(a,b){ return a-b; });
  var clusters = [];
  pivots.forEach(function(p){
    var last = clusters[clusters.length-1];
    if(last && Math.abs(p-last.sum/last.n)/(last.sum/last.n)*100 <= TC_SR_CLUSTER_PCT){
      last.sum += p; last.n += 1;
    } else clusters.push({sum:p, n:1});
  });
  var levels = clusters.map(function(c){
    var lvl = c.sum/c.n;
    return {level:lvl, touches:c.n, isRound:tcIsRoundLevel(lvl), strength:c.n+(tcIsRoundLevel(lvl)?1:0), fallback:false};
  });
  var support=null, resistance=null;
  levels.forEach(function(L){
    if(L.level < price*0.998 && (!support || L.level > support.level)) support = L;
    if(L.level > price*1.002 && (!resistance || L.level < resistance.level)) resistance = L;
  });
  var tail = bars.slice(-20);
  if(!support && tail.length){
    var mn = Infinity;
    tail.forEach(function(d){ var lo=d.low!=null?d.low:d.close; if(lo<mn) mn=lo; });
    if(isFinite(mn) && mn < price*0.998) support = {level:mn, touches:1, isRound:tcIsRoundLevel(mn), strength:1, fallback:true};
  }
  if(!resistance && tail.length){
    var mx = -Infinity;
    tail.forEach(function(d){ var hi=d.high!=null?d.high:d.close; if(hi>mx) mx=hi; });
    if(isFinite(mx) && mx > price*1.002) resistance = {level:mx, touches:1, isRound:tcIsRoundLevel(mx), strength:1, fallback:true};
  }
  if(!support && !resistance) return null;
  return {support:support, resistance:resistance};
}
function tcComputeSignal(series){
  var closes = series.map(function(b){ return b.close; });
  var lastIdx = closes.length-1;
  var r = tpRSI(closes, TC_RSI_PERIOD);
  var sma20 = tpSMA(closes,20,lastIdx);
  var sma50 = tpSMA(closes,50,lastIdx);
  var price = closes[lastIdx];
  var score = 0;
  if(r!=null){
    if(r<TC_RSI_OVERSOLD) score+=2;
    else if(r>TC_RSI_OVERBOUGHT) score-=2;
  }
  var trend = tcTrendState(sma20, sma50);
  var volConf = tcVolumeConfirmation(series, TC_VOL_CONFIRM_PERIOD);
  var trendWeight = (volConf && volConf.confirmed) ? 1 : 0.5;
  if(trend.state==='BULL') score += trendWeight;
  else if(trend.state==='BEAR') score -= trendWeight;
  var signal='HOLD';
  if(score>=TC_SIGNAL_THRESHOLD) signal='BUY';
  else if(score<=-TC_SIGNAL_THRESHOLD) signal='SELL';
  var confidencePct;
  if(signal==='HOLD') confidencePct = Math.round(Math.max(0, 100-(Math.abs(score)/TC_SIGNAL_THRESHOLD)*100));
  else confidencePct = Math.round(Math.min(100, (Math.abs(score)/TC_MAX_SCORE)*100));
  var volPct = tcATRPct(series, TC_ATR_PERIOD);
  var sr = tcSupportResistance(series);
  return {
    signal:signal, score:score, confidencePct:confidencePct, rsi:r,
    sma20: sma20!=null ? +sma20.toFixed(sma20<1?6:2) : null,
    sma50: sma50!=null ? +sma50.toFixed(sma50<1?6:2) : null,
    price:price, trend:trend.state, trendGapPct:trend.gapPct, trendConfidencePct:trend.confidencePct,
    volPct:volPct, sr:sr, volConfirmed: volConf?volConf.confirmed:null, volRatio: volConf?volConf.ratio:null,
    series:series
  };
}
function tcSignal(sym){
  var series = tcGetSeries(sym);
  if(!series) return null;
  return tcComputeSignal(series);
}

// Volatility-based fallback band — same math as the Stocks tab's
// tpProjectedBand, clipped to real S/R where it exists.
function tcProjectedBand(sig){
  if(sig.volPct==null || sig.price==null) return null;
  var bias = sig.signal==='BUY' ? 1 : sig.signal==='SELL' ? -1 : 0;
  var conf = (bias===0 ? sig.confidencePct*0.4 : sig.confidencePct) / 100;
  var moveMag = sig.volPct * (0.75 + conf);
  var skew = bias * moveMag * 0.35;
  var high = sig.price * (1 + (moveMag+skew)/100);
  var low = sig.price * (1 - (moveMag-skew)/100);
  var sr = sig.sr;
  if(sr && sr.resistance && sr.resistance.level > sig.price && high > sr.resistance.level) high = sr.resistance.level;
  if(sr && sr.support && sr.support.level < sig.price && low < sr.support.level) low = sr.support.level;
  if(low >= high){ low = Math.min(low, sig.price*0.999); high = Math.max(high, sig.price*1.001); }
  return {bias:bias, low:low, high:high, vol:sig.volPct};
}
// Shared trigger levels for entry/exit plan + watchlist auto-prefill —
// proven S/R first, ATR-volatility band as fallback.
function tcTriggerLevels(sig){
  var band = tcProjectedBand(sig);
  if(!sig.price) return null;
  var sr = sig.sr, price = sig.price;
  var sup = (sr && sr.support && sr.support.level < price) ? sr.support.level : (band ? band.low : price*0.9);
  var res = (sr && sr.resistance && sr.resistance.level > price) ? sr.resistance.level : (band ? band.high : price*1.1);
  if(!isFinite(sup) || !isFinite(res) || sup<=0 || res<=0) return null;
  return {sup:sup, res:res};
}

// ── Top Crypto Today ──
function tcSetGainersMode(mode){
  if(tcGainersModeVal === mode) return;
  tcGainersModeVal = mode;
  try { localStorage.setItem('tc_gainers_mode', mode); } catch(e){}
  document.querySelectorAll('#tp-crypto-view .tp-gainers-toggle .tp-gainers-tab').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-mode') === mode);
  });
  tcRenderTop();
}
function tcRenderTop(){
  var el = document.getElementById('tc-gainers-list');
  var noteEl = document.getElementById('tc-gainers-note');
  if(!el) return;
  var haveAny = TC_COINS.some(function(c){ return !!tcGetQuote(c.sym); });
  if(!haveAny){
    el.innerHTML = '<div class="tp-gainer-empty">No live crypto data yet \u2014 tap <b>Fetch Live Data</b> above to pull real prices from the CoinGecko API.</div>';
    if(noteEl) noteEl.textContent = '';
    return;
  }
  var rows;
  if(tcGainersModeVal === 'bullish'){
    rows = TC_COINS.map(function(c){
      var q = tcGetQuote(c.sym); if(!q) return null;
      var sig = tcSignal(c.sym);
      return {sym:c.sym, name:c.name, price:q.price, pct:q.change24hPct||0,
              gap: sig?sig.trendGapPct:0, trend: sig?sig.trend:'FLAT', signal: sig?sig.signal:null,
              confidencePct: sig?sig.confidencePct:null};
    }).filter(function(r){ return r && r.trend === 'BULL'; })
      .sort(function(a,b){ return b.gap - a.gap; }).slice(0,10);
  } else {
    rows = TC_COINS.map(function(c){
      var q = tcGetQuote(c.sym); if(!q) return null;
      var sig = tcSignal(c.sym);
      return {sym:c.sym, name:c.name, price:q.price, pct:q.change24hPct||0, signal: sig?sig.signal:null,
              confidencePct: sig?sig.confidencePct:null};
    }).filter(Boolean).sort(function(a,b){ return b.pct - a.pct; }).slice(0,10);
  }
  if(!rows.length){
    el.innerHTML = '<div class="tp-gainer-empty">No coins currently in a confirmed uptrend \u2014 no symbol has SMA20 above SMA50 by more than the '+TC_TREND_BUFFER_PCT+'% buffer.</div>';
    if(noteEl) noteEl.textContent = '';
    return;
  }
  el.innerHTML = rows.map(function(g, i){
    var dir = g.pct >= 0 ? 'up' : 'down';
    var sign = g.pct >= 0 ? '+' : '';
    return '<div class="tp-gainer-row" onmousedown="tcSelectCoin(\''+g.sym+'\')">'+
      '<span class="tp-gainer-rank">'+(i+1)+'</span>'+
      '<div class="tp-gainer-info">'+
        '<div class="tp-gainer-sym">'+g.sym+(g.signal?(' <span class="tp-gainer-tag '+g.signal+'" style="'+tpTagStyle(g.signal, g.confidencePct)+'">'+g.signal+'</span>'):'')+'</div>'+
        '<div class="tp-gainer-name">'+g.name+'</div>'+
      '</div>'+
      '<span class="tp-gainer-price">'+tcFmtUSD(g.price)+'</span>'+
      '<span class="tp-gainer-chg '+dir+'">'+sign+g.pct.toFixed(2)+'%</span>'+
    '</div>';
  }).join('');
  if(noteEl){
    noteEl.textContent = tcGainersModeVal === 'bullish'
      ? 'Coins in a confirmed uptrend ranked by SMA20-vs-SMA50 gap \u2014 same trend engine as the detail card. The % shown is today\u2019s change; the ORDER is trend strength.'
      : 'Live 24h change from the CoinGecko API. Tap a coin for the full signal breakdown.';
  }
}

// ── Watchlist (localStorage, separate key from stocks) ──
function tcGetWatch(){
  try { return JSON.parse(localStorage.getItem('tcWatchlist')||'[]'); } catch(e){ return []; }
}
function tcSaveWatch(list){
  try { localStorage.setItem('tcWatchlist', JSON.stringify(list)); } catch(e){}
}
function tcIsWatched(sym){ return tcGetWatch().some(function(w){return w.sym===sym;}); }
function tcToggleWatch(){
  if(!tcCurrentSym) return;
  var list = tcGetWatch();
  var i = list.findIndex(function(w){return w.sym===tcCurrentSym;});
  if(i >= 0){ list.splice(i,1); }
  else {
    var c = tcFindCoin(tcCurrentSym);
    var sig = tcSignal(tcCurrentSym);
    var trig = sig ? tcTriggerLevels(sig) : null;
    var q = tcGetQuote(tcCurrentSym);
    // Auto-prefill from the SAME real trigger levels the reasoning card
    // uses (proven S/R first, ATR-volatility band as fallback) — no
    // more hardcoded demo pivots.
    var hp = trig ? trig.res : (q ? q.price*1.06 : null);
    var lp = trig ? trig.sup : (q ? q.price*0.94 : null);
    list.push({sym:tcCurrentSym,
      highPrice: hp!=null ? +(hp>=1 ? hp.toFixed(2) : hp.toFixed(4)) : null,
      lowPrice:  lp!=null ? +(lp>=1 ? lp.toFixed(2) : lp.toFixed(4)) : null});
  }
  tcSaveWatch(list);
  tcRenderWatchlist();
  tcUpdateWatchBtn();
}
function tcRemoveWatch(sym){
  tcSaveWatch(tcGetWatch().filter(function(w){return w.sym!==sym;}));
  tcRenderWatchlist();
  tcUpdateWatchBtn();
}
function tcSetWatchPrice(sym, field, val){
  var list = tcGetWatch();
  var w = list.find(function(x){return x.sym===sym;});
  if(!w) return;
  var num = parseFloat(val);
  w[field] = isNaN(num) ? null : num;
  tcSaveWatch(list);
  tcRenderWatchlist();
}
function tcUpdateWatchBtn(){
  var b = document.getElementById('tc-watch-add');
  if(!b || !tcCurrentSym) return;
  var on = tcIsWatched(tcCurrentSym);
  b.textContent = on ? '\u2713' : '\uFF0B';
  b.classList.toggle('on', on);
  b.title = on ? 'Remove from watchlist' : 'Add to watchlist';
}
function tcRenderWatchlist(){
  var listEl = document.getElementById('tc-watch-list');
  var emptyEl = document.getElementById('tc-watch-empty');
  if(!listEl) return;
  var list = tcGetWatch();
  if(emptyEl) emptyEl.style.display = list.length ? 'none' : 'block';
  listEl.innerHTML = list.map(function(w){
    var c = tcFindCoin(w.sym);
    var name = c ? c.name : w.sym;
    var q = tcGetQuote(w.sym);
    var last = q ? q.price : null;
    var lastTxt = last == null ? '\u2014' : tcFmtUSD(last);
    var hitHigh = last != null && w.highPrice != null && last >= w.highPrice;
    var hitLow  = last != null && w.lowPrice  != null && last <= w.lowPrice;
    var hVal = w.highPrice == null ? '' : w.highPrice;
    var lVal = w.lowPrice == null ? '' : w.lowPrice;
    return '<div class="tp-watch-row">'+
      '<div class="tp-watch-name" onclick="tcSelectCoin(\''+w.sym+'\')">'+w.sym+' \u00b7 <small>'+name+'</small></div>'+
      '<div class="tp-watch-inbox tp-watch-lastbox"><span class="tp-watch-inlabel">Last</span>'+
        '<div class="tp-watch-last">'+lastTxt+'</div></div>'+
      '<div class="tp-watch-inbox"><span class="tp-watch-inlabel">High</span>'+
        '<input type="number" step="any" min="0" inputmode="decimal" class="tp-watch-input'+(hitHigh?' hit-high':'')+'" placeholder="\u20b1 high" value="'+hVal+'" onchange="tcSetWatchPrice(\''+w.sym+'\', \'highPrice\', this.value)"></div>'+
      '<div class="tp-watch-inbox"><span class="tp-watch-inlabel">Low</span>'+
        '<input type="number" step="any" min="0" inputmode="decimal" class="tp-watch-input'+(hitLow?' hit-low':'')+'" placeholder="\u20b1 low" value="'+lVal+'" onchange="tcSetWatchPrice(\''+w.sym+'\', \'lowPrice\', this.value)"></div>'+
      '<button class="tp-watch-remove" onclick="tcRemoveWatch(\''+w.sym+'\')" title="Remove">\u2715</button>'+
    '</div>';
  }).join('');
}

// ── Coin picker (combo dropdown, same design as stocks) ──
function tcOptRow(c){
  var q = tcGetQuote(c.sym);
  var dir = !q ? 'flat' : q.change24hPct > 0 ? 'up' : q.change24hPct < 0 ? 'down' : 'flat';
  var arrowChar = dir==='up' ? '\u25B2' : dir==='down' ? '\u25BC' : '\u2014';
  return '<div class="tp-opt" data-sym="'+c.sym+'" onmousedown="tcChooseCoin(\''+c.sym+'\')">'+
         '<span>'+c.name+' ('+c.sym+')</span>'+
         '<span class="tp-opt-price">'+(q?tcFmtUSD(q.price):'\u2014')+'</span>'+
         '<span class="tp-opt-arrow '+dir+'">'+arrowChar+'</span></div>';
}
function tcRenderDropdown(query){
  var dd = document.getElementById('tc-dropdown');
  if(!dd) return;
  var q = (query||'').trim().toLowerCase();
  var matches = TC_COINS.filter(function(c){
    return !q || c.name.toLowerCase().indexOf(q)>=0 || c.sym.toLowerCase().indexOf(q)>=0;
  });
  if(!matches.length){
    dd.innerHTML = '<div class="tp-opt-empty">No matching coins</div>';
    return;
  }
  dd.innerHTML = '<div class="tp-optgroup-label">Major Coins</div>' + matches.map(tcOptRow).join('');
}
function tcOpenDropdown(){
  var dd = document.getElementById('tc-dropdown');
  if(!dd) return;
  var input = document.getElementById('tc-coin-search');
  if(input) input.select();
  tcRenderDropdown('');
  dd.classList.add('open');
}
function tcCloseDropdown(){
  var dd = document.getElementById('tc-dropdown');
  if(dd) dd.classList.remove('open');
}
function tcFilterDropdown(query){
  var dd = document.getElementById('tc-dropdown');
  if(dd) dd.classList.add('open');
  tcRenderDropdown(query);
}
function tcChooseCoin(sym){
  tcSelectCoin(sym);
  tcCloseDropdown();
}
document.addEventListener('click', function(e){
  var combo = document.getElementById('tc-picklist-group');
  if(combo && !combo.contains(e.target)) tcCloseDropdown();
});

// ── Timeframes ──
function tcSetTimeframe(tf){
  tcCurrentTF = tf;
  document.querySelectorAll('#tp-crypto-view .tp-tf-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.tf===tf);
  });
  if(tcCurrentSym){
    var s = tcGetChartSeries(tcCurrentSym, tf);
    if(s) tcRenderChart(s);
    tcUpdateChartTfDate(tf);
  }
}

// ── Justification / Report toggle ──
function tcSetView(view, el){
  var btns = document.querySelectorAll('#tc-view-seg .seg-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (el) el.classList.add('active');
  var just = document.getElementById('tc-summary-card');
  var rep = document.getElementById('tc-report-card');
  if (just) just.style.display = (view === 'justification') ? '' : 'none';
  if (rep) rep.style.display = (view === 'report') ? '' : 'none';
}

// ══════════════════════════════════════════════════════════════
// FETCH LIVE DATA — triggers crypto-live-scraper.yml via
// workflow_dispatch. Same PAT + polling flow as the Stocks tab
// (tpGetGithubToken, shared sessionStorage token — one PAT covers both
// tabs since they dispatch workflows on the same repo).
// ══════════════════════════════════════════════════════════════
var TC_GH_WORKFLOW = 'crypto-live-scraper.yml';
var tcRefreshPollTimer = null;
// Tracks the generatedAt timestamp from the last-loaded crypto-history.json.
// Used to detect when raw.githubusercontent.com is still serving stale/cached
// content after the scraper's commit has already landed (confirmed bug —
// GitHub's own CDN has documented propagation lag independent of the
// ?nocache= query-busting already used below).
var tcLastHistoryGeneratedAt = null;

function tcFinishRefresh(message){
  if(tcRefreshPollTimer){ clearTimeout(tcRefreshPollTimer); tcRefreshPollTimer=null; }
  var btn = document.getElementById('tc-refresh-btn');
  var status = document.getElementById('tc-refresh-status');
  if(btn){ btn.disabled = false; btn.classList.remove('tp-refresh-spinning'); }
  if(status && message != null) status.textContent = message;
}
async function tcPollRunStatus(runId, ghHeaders, deadline, preGeneratedAt){
  var status = document.getElementById('tc-refresh-status');
  if (Date.now() > deadline) { tcFinishRefresh('Still running — check the Actions tab on GitHub for status.'); return; }
  try {
    var resp = await fetch('https://api.github.com/repos/'+TP_GH_OWNER+'/'+TP_GH_REPO+'/actions/runs/'+runId, {headers: ghHeaders});
    if (!resp.ok) { tcFinishRefresh('Lost track of run status \u274c — check the Actions tab.'); return; }
    var run = await resp.json();
    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        // Don't trust the first fetch: raw.githubusercontent.com can still
        // serve the pre-refresh cached copy for a bit after the commit
        // lands. Verify generatedAt actually advanced before saying "Updated".
        if(status) status.textContent = 'Run finished \u2014 confirming fresh data...';
        tcVerifyFreshData(preGeneratedAt, Date.now() + 3*60*1000);
      } else {
        tcFinishRefresh('Run finished with issues \u274c (' + run.conclusion + ') \u2014 check Actions tab.');
      }
      return;
    }
    if(status) status.textContent = 'Workflow ' + run.status + '... (' + Math.round((deadline-Date.now())/1000) + 's left before we stop watching)';
    tcRefreshPollTimer = setTimeout(function(){ tcPollRunStatus(runId, ghHeaders, deadline, preGeneratedAt); }, 5000);
  } catch(e) {
    tcFinishRefresh('Network error while checking status \u274c \u2014 ' + e.message);
  }
}
// Re-fetches crypto-live-quotes.json / crypto-history.json and checks
// whether generatedAt actually moved past what was loaded before this
// refresh started. If raw.githubusercontent.com is still handing back the
// stale cached copy, retries every 6s until it advances or verifyDeadline
// is hit. This is what makes "Updated \u2705" mean the data is actually new,
// not just that the GitHub Actions run finished.
async function tcVerifyFreshData(preGeneratedAt, verifyDeadline){
  var status = document.getElementById('tc-refresh-status');
  await loadCryptoLiveQuotes();
  await loadCryptoHistory();
  var isFresh = tcLastHistoryGeneratedAt && tcLastHistoryGeneratedAt !== preGeneratedAt;
  if (isFresh) {
    tcFinishRefresh(null); // loadCryptoHistory() already called tcUpdateRefreshStatusDisplay() above with the correct split Price/Signals text
    return;
  }
  if (Date.now() > verifyDeadline) {
    tcFinishRefresh('Run finished, but the data still looks old \u274c \u2014 GitHub\u2019s CDN can lag a bit after a push. Try Fetch Live Data again in a minute.');
    return;
  }
  if(status) status.textContent = 'Run finished \u2014 waiting for GitHub\u2019s CDN to catch up...';
  tcRefreshPollTimer = setTimeout(function(){ tcVerifyFreshData(preGeneratedAt, verifyDeadline); }, 6000);
}
async function tcFindNewRun(ghHeaders, sinceMs, deadline, preGeneratedAt){
  var status = document.getElementById('tc-refresh-status');
  if (Date.now() > deadline) { tcFinishRefresh('Triggered, but couldn\'t confirm it started \u2014 check the Actions tab.'); return; }
  try {
    var resp = await fetch('https://api.github.com/repos/'+TP_GH_OWNER+'/'+TP_GH_REPO+'/actions/workflows/'+TC_GH_WORKFLOW+'/runs?event=workflow_dispatch&per_page=5', {headers: ghHeaders});
    if (!resp.ok) { tcFinishRefresh('Lost track of the run \u274c \u2014 check the Actions tab.'); return; }
    var data = await resp.json();
    var runs = (data && data.workflow_runs) || [];
    var match = runs.find(function(r){ return new Date(r.created_at).getTime() >= sinceMs; });
    if (match) {
      if(status) status.textContent = 'Run started \u2014 watching for completion...';
      tcPollRunStatus(match.id, ghHeaders, deadline, preGeneratedAt);
    } else {
      if(status) status.textContent = 'Waiting for run to appear...';
      tcRefreshPollTimer = setTimeout(function(){ tcFindNewRun(ghHeaders, sinceMs, deadline, preGeneratedAt); }, 4000);
    }
  } catch(e) {
    tcFinishRefresh('Network error while locating run \u274c \u2014 ' + e.message);
  }
}
async function tcTriggerRefresh(){
  var btn = document.getElementById('tc-refresh-btn');
  var status = document.getElementById('tc-refresh-status');
  var token = tpGetGithubToken(); // shared PAT with the Stocks tab
  if (!token) { if(status) status.textContent = 'Cancelled \u2014 no token entered.'; return; }

  btn.disabled = true;
  btn.classList.add('tp-refresh-spinning');
  status.textContent = 'Triggering Crypto Live Data Scraper...';

  var ghHeaders = {'Accept':'application/vnd.github+json', 'Authorization':'Bearer '+token, 'X-GitHub-Api-Version':'2022-11-28'};
  var dispatchTime = Date.now();
  var preGeneratedAt = tcLastHistoryGeneratedAt; // snapshot before this refresh, to detect stale CDN responses later
  try {
    var resp = await fetch('https://api.github.com/repos/'+TP_GH_OWNER+'/'+TP_GH_REPO+'/actions/workflows/'+TC_GH_WORKFLOW+'/dispatches',
      {method:'POST', headers:ghHeaders, body: JSON.stringify({ref: TP_GH_REF})});
    if (resp.status === 204) {
      status.textContent = 'Triggered \u2705 \u2014 locating the run... (usually finishes in 2-4 min)';
      var deadline = Date.now() + 8*60*1000; // 8 min safety cap — 8 sequential coin fetches with rate-limit spacing
      tcRefreshPollTimer = setTimeout(function(){ tcFindNewRun(ghHeaders, dispatchTime-5000, deadline, preGeneratedAt); }, 2000);
    } else if (resp.status === 401) {
      sessionStorage.removeItem('tp_gh_token');
      tcFinishRefresh('Token invalid/expired \u274c \u2014 tap again to re-enter.');
    } else if (resp.status === 403) {
      tcFinishRefresh('Forbidden \u274c \u2014 token needs "repo" + "workflow" scope.');
    } else if (resp.status === 404) {
      tcFinishRefresh('Not found \u274c \u2014 is crypto-live-scraper.yml committed to the repo?');
    } else {
      var body = await resp.text();
      console.error('crypto workflow_dispatch failed:', resp.status, body);
      tcFinishRefresh('Error ' + resp.status + ' \u274c \u2014 check console for details.');
    }
  } catch(e) {
    tcFinishRefresh('Network error \u274c \u2014 ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// ENGINE REPORT CARD — triggers crypto-backtest.yml (same token flow),
// which replays the signal engine above over crypto-history.json and
// grades every call against what actually happened next. Read-only
// against the data pipeline. Mirrors the Stocks tab's Report Card.
// ══════════════════════════════════════════════════════════════
var TC_GH_BACKTEST_WORKFLOW = 'crypto-backtest.yml';
var tcBacktestReloadTimer = null;
var tcBacktestCollapsed = false;

function tcToggleBacktestBody(){
  tcBacktestCollapsed = !tcBacktestCollapsed;
  var txt = document.getElementById('tc-report-text');
  var tag = document.getElementById('tc-report-tag');
  if (txt) txt.style.display = tcBacktestCollapsed ? 'none' : 'block';
  if (tag) tag.textContent = 'ENGINE REPORT CARD ' + (tcBacktestCollapsed ? '\u25b8' : '\u25be');
}
async function tcTriggerBacktest(){
  var btn = document.getElementById('tc-backtest-btn');
  var status = document.getElementById('tc-backtest-status');
  var token = tpGetGithubToken();
  if (!token) { if(status) status.textContent = 'Cancelled \u2014 no token entered.'; return; }
  if(btn) btn.disabled = true;
  if(status) status.textContent = 'Triggering signal backtest...';
  var ghHeaders = {'Accept':'application/vnd.github+json', 'Authorization':'Bearer '+token, 'X-GitHub-Api-Version':'2022-11-28'};
  try {
    var resp = await fetch('https://api.github.com/repos/'+TP_GH_OWNER+'/'+TP_GH_REPO+'/actions/workflows/'+TC_GH_BACKTEST_WORKFLOW+'/dispatches',
      {method:'POST', headers:ghHeaders, body: JSON.stringify({ref: TP_GH_REF})});
    if (resp.status === 204) {
      if(status) status.textContent = 'Backtest running \u2705 \u2014 report reloads here in ~1 min.';
      if (tcBacktestReloadTimer) clearTimeout(tcBacktestReloadTimer);
      tcBacktestReloadTimer = setTimeout(function(){
        tcLoadBacktest();
        if(status) status.textContent = 'Report card refreshed.';
        if(btn) btn.disabled = false;
      }, 60*1000);
    } else if (resp.status === 401) {
      sessionStorage.removeItem('tp_gh_token');
      if(status) status.textContent = 'Token invalid/expired \u274c \u2014 tap again to re-enter.';
      if(btn) btn.disabled = false;
    } else if (resp.status === 403) {
      if(status) status.textContent = 'Forbidden \u274c \u2014 token needs "repo" + "workflow" scope.';
      if(btn) btn.disabled = false;
    } else if (resp.status === 404) {
      if(status) status.textContent = 'Workflow not found \u274c \u2014 is crypto-backtest.yml committed?';
      if(btn) btn.disabled = false;
    } else {
      if(status) status.textContent = 'Error ' + resp.status + ' \u274c \u2014 check console.';
      if(btn) btn.disabled = false;
    }
  } catch(e) {
    if(status) status.textContent = 'Network error \u274c \u2014 ' + e.message;
    if(btn) btn.disabled = false;
  }
}
function tcBtStat(st){ return st && st.n ? st : null; }
function tcBtPct(x){ return (x==null) ? '\u2014' : (x>=0?'+':'')+x.toFixed(2)+'%'; }
function tcRenderBacktest(data){
  var el = document.getElementById('tc-report-text');
  if (!el) return;
  var parts = [];
  parts.push("What this is: the engine was rewound through this site's own stored crypto price history and made to call BUY / SELL / HOLD using ONLY the data it would have had on each past day \u2014 then every call was graded against what the price actually did afterward. "
    + "It graded <b>" + (data.barsGraded||0).toLocaleString() + " signal-days</b> across <b>" + (data.coinsTested||0) + " coins</b>"
    + (data.dateRange && data.dateRange.from ? " (" + data.dateRange.from + " to " + data.dateRange.to + ")" : "")
    + (data.generatedAt ? ", last run " + data.generatedAt.slice(0,10) : "") + ".");

  var buy2 = tcBtStat(data.signals && data.signals.BUY && data.signals.BUY['2']);
  if (buy2){
    parts.push("<b>BUY signals</b> (" + buy2.n.toLocaleString() + " of them): over the next 2 calendar days the coin rose <b>" + buy2.hitRatePct + "%</b> of the time, average move " + tcBtPct(buy2.avgReturnPct) + ". When right it gained " + tcBtPct(buy2.avgWinPct) + " on average; when wrong it lost " + tcBtPct(buy2.avgLossPct!=null?-buy2.avgLossPct:null) + ". Well above 50% with wins bigger than losses means the signal has earned some trust; near 50% is closer to a coin flip.");
  } else {
    parts.push("<b>BUY signals</b>: none occurred in the stored history yet \u2014 the engine's BUY bar (oversold momentum inside a real trend) is deliberately hard to clear.");
  }
  var sell2 = tcBtStat(data.signals && data.signals.SELL && data.signals.SELL['2']);
  if (sell2){
    parts.push("<b>SELL signals</b> (" + sell2.n.toLocaleString() + "): the coin fell within 2 calendar days <b>" + sell2.hitRatePct + "%</b> of the time (average move " + tcBtPct(sell2.avgReturnPct!=null?-sell2.avgReturnPct:null) + " for the coin \u2014 that's how much selling would have protected).");
  } else {
    parts.push("<b>SELL signals</b>: none in the stored history yet \u2014 same reason as BUY.");
  }
  // Checked for BOTH signal types now, not just BUY -- mirrors the same
  // fix applied to the PSE tab's tpRenderBacktest, for the same reason:
  // a SELL confidence% with no real predictive value could otherwise go
  // unflagged indefinitely.
  ['BUY','SELL'].forEach(function(sigType){
    var cb = data.confidenceBuckets2d && data.confidenceBuckets2d[sigType];
    if (cb && tcBtStat(cb.confidence80plus) && tcBtStat(cb.confidenceBelow80)){
      var hi = cb.confidence80plus, mid = cb.confidenceBelow80;
      var honest = (hi.hitRatePct > mid.hitRatePct)
        ? "the high-confidence calls really were right more often \u2014 the confidence % means something."
        : "the high-confidence calls were NOT more accurate than the ordinary ones \u2014 honest takeaway: don't size positions bigger just because the % is bigger, until this improves.";
      parts.push("<b>Does the confidence % mean anything for " + sigType + "?</b> " + sigType + "s at 80%+ confidence were right " + hi.hitRatePct + "% of the time vs " + mid.hitRatePct + "% for lower-confidence " + sigType + "s \u2014 " + honest);
    }
  });
  var srS = data.supportResistance && data.supportResistance.support;
  var srR = data.supportResistance && data.supportResistance.resistance;
  if ((srS && srS.touches) || (srR && srR.touches)){
    var bits = [];
    if (srS && srS.touches) bits.push("floors (support) held <b>" + srS.heldPct + "%</b> of the " + srS.touches.toLocaleString() + " times price came back to one");
    if (srR && srR.touches) bits.push("ceilings (resistance) held <b>" + srR.heldPct + "%</b> of " + srR.touches.toLocaleString() + " touches");
    parts.push("<b>Do the Key Levels actually work?</b> On this site's own data: " + bits.join("; ") + ".");
  }
  parts.push("<b>Honest fine print:</b> this grades the past, and the past never guarantees the future. Crypto is far more volatile than the PSE stocks this same engine design was first built for \u2014 treat every number here as a starting point for your own judgement, not an instruction.");
  el.innerHTML = tpBulletsHTML(parts);
}
async function tcLoadBacktest(){
  var el = document.getElementById('tc-report-text');
  if (!el) return;
  var RAW_URL = 'https://raw.githubusercontent.com/' + TP_GH_OWNER + '/' + TP_GH_REPO + '/' + TP_GH_REF + '/crypto-backtest.json';
  try {
    var resp = await fetch(RAW_URL + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json();
    tcRenderBacktest(data);
  } catch(e) {
    el.innerHTML = tpBulletsHTML([
      "No report card yet. Tap the <b>Report Card</b> button above to run the first one \u2014 it rewinds through this site's stored crypto history, replays every BUY / SELL / HOLD this engine would have called, and grades each one against what the price actually did next. Takes about a minute once live data exists.",
      "Needs crypto-history.json to exist first \u2014 tap <b>Fetch Live Data</b> on the Justification tab if you haven't yet."
    ]);
  }
}
tcLoadBacktest();

// ── 5-day outlook — same math shape as the Stocks tab: \u221aday-widening
// ranges, signal-direction drift, clipped at REAL support/resistance
// (or the ATR-volatility band where no proven level exists yet).
// Crypto trades 24/7, so days are calendar days, not trading days. ──
function tcFiveDayOutlook(sig, sup, res){
  var s = sig.series;
  if(!s || s.length < 15 || !sig.price) return null;
  var vol = sig.volPct != null ? sig.volPct : 3;
  var bias = sig.signal==='BUY' ? 1 : sig.signal==='SELL' ? -1 : 0;
  var conf = (bias===0 ? sig.confidencePct*0.4 : sig.confidencePct)/100;
  var halfW1 = vol * (0.75 + conf);
  var drift = bias * halfW1 * 0.35;
  var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var rows = [];
  var base = new Date();
  var pinnedFrom = 0;
  for(var d = 1; d <= 5; d++){
    var dt = new Date(base.getTime() + d*86400000); // 24/7 market: calendar days, no closures
    var spread = halfW1 * Math.sqrt(d);
    var mid0 = sig.price * (1 + (drift*d)/100);
    var hi = mid0 * (1 + spread/100);
    var lo = mid0 * (1 - spread/100);
    var hiClip=false, loClip=false;
    if(hi > res){ hi = res; hiClip = true; }
    if(lo < sup){ lo = sup; loClip = true; }
    if(lo >= hi){ lo = Math.min(lo, sig.price*0.999); hi = Math.max(hi, sig.price*1.001); }
    if(hiClip && loClip && !pinnedFrom) pinnedFrom = d;
    var mid = (lo+hi)/2;
    rows.push({d:d, date:M[dt.getMonth()]+' '+dt.getDate(), lo:lo, hi:hi, mid:mid});
  }
  var allSameMid = rows.every(function(r){ return tcFmtUSD(r.mid)===tcFmtUSD(rows[0].mid); });
  var tbl = tpOutlookTableHTML(rows, tcFmtUSD);
  var dirTxt = bias>0 ? 'with the range drifting higher each day while the BUY case holds'
    : bias<0 ? 'with the range drifting lower each day while the SELL case holds'
    : 'with no daily drift, since neither side has an edge right now';
  var volTxt = sig.volPct != null
    ? "this coin's real trailing ATR(14) of "+vol.toFixed(2)+"% average daily range"
    : "an assumed "+vol.toFixed(2)+"% average daily range (not enough real-wick history yet for a true ATR reading)";
  var out = '5-DAY OUTLOOK \u2014 the next 5 calendar days, since crypto trades 24/7 with no weekend or holiday closures. Built from '+volTxt+', the '+sig.confidencePct+'% signal confidence, and the '+(sig.sr&&(sig.sr.support||sig.sr.resistance)?'proven floor/ceiling levels':'volatility-based floor/ceiling estimate')+'. Ranges widen each day because uncertainty grows with time, '+dirTxt+':'+tbl;
  var notes = ['ranges are clipped at the '+tcFmtUSD(sup)+' floor and '+tcFmtUSD(res)+' ceiling'];
  if(allSameMid) notes.push('the \u2018most likely\u2019 value repeats because '+(pinnedFrom ? 'the range is pinned between the floor and ceiling \u2014 it can\'t drift until one of them breaks' : 'there\'s no directional drift in this read \u2014 the center of the range simply stays put'));
  out += 'Honest note: '+notes.join('; ')+'. These are ranges implied by recent behavior, not promises \u2014 one news event can override all five rows.';
  return out;
}

// ══════════════════════════════════════════════════════════════
// KEY LEVELS + ENTRY/EXIT — real support/resistance narrative with
// honest fallback disclosure, mirroring the Stocks tab's
// tpLevelsNarrative/tpEntryExitPlan (see trade.js lines ~1860-1930).
// ══════════════════════════════════════════════════════════════
function tcFmtLvl(n){ return n<1 ? n.toFixed(4) : n<10 ? n.toFixed(3) : n.toFixed(2); }
function tcLevelsNarrative(sig){
  var sr = sig.sr, price = sig.price, P = tcFmtLvl;
  if(!sr || (!sr.support && !sr.resistance)){
    return 'No reliable support/resistance mapped yet \u2014 needs more real-wick trading history before floor and ceiling levels can be trusted.';
  }
  var lines = [];
  if(sr.support){
    lines.push('<b>Support (floor):</b> \u20b1'+P(sr.support.level)
      + (sr.support.fallback ? ' \u2014 recent low (backup level, no repeated bounce found)' : ' \u2014 held '+sr.support.touches+'\u00d7 recently')
      + (sr.support.isRound ? ' \u00b7 round number (stickier)' : ''));
  }
  if(sr.resistance){
    lines.push('<b>Resistance (ceiling):</b> \u20b1'+P(sr.resistance.level)
      + (sr.resistance.fallback ? ' \u2014 recent high (backup level, no repeated rejection found)' : ' \u2014 rejected '+sr.resistance.touches+'\u00d7 recently')
      + (sr.resistance.isRound ? ' \u00b7 round number (stickier)' : ''));
  }
  if(sr.support && sr.resistance && price){
    var up = ((sr.resistance.level-price)/price*100).toFixed(1);
    var dn = ((price-sr.support.level)/price*100).toFixed(1);
    lines.push('<b>Price now:</b> \u20b1'+P(price)+' \u2014 '+dn+'% above the floor, '+up+'% below the ceiling');
  }
  var band = tcProjectedBand(sig);
  if(sig.signal==='BUY' && price){
    var target = (sr.resistance && sr.resistance.level>price) ? sr.resistance.level : (band?band.high:null);
    var stop = (sr.support && sr.support.level<price) ? sr.support.level : (band?band.low:null);
    if(target && stop && stop<price){
      var reward=(target-price)/price, risk=(price-stop)/price;
      var rr = risk>0 ? reward/risk : null;
      if(rr!=null){
        lines.push('<b>Risk:Reward on this BUY:</b> '+rr.toFixed(1)+':1 \u2014 '+(
          rr>=2 ? 'good \u2014 the potential prize is at least double the risk'
          : rr>=1 ? 'workable but thin \u2014 needs a high hit rate to pay off'
          : 'upside-down \u2014 risking more than the potential gain; a better entry price would fix this'));
      }
    }
  } else if(sig.signal==='SELL' && price){
    var target2 = (sr.support && sr.support.level<price) ? sr.support.level : (band?band.low:null);
    var stop2 = (sr.resistance && sr.resistance.level>price) ? sr.resistance.level : (band?band.high:null);
    if(target2 && stop2 && stop2>price){
      var dp=((price-target2)/price*100).toFixed(1), bp=((stop2-price)/price*100).toFixed(1);
      lines.push('<b>SELL math:</b> \u2248'+dp+'% of downside avoided by selling now vs \u2248'+bp+'% of upside given up if wrong');
    }
  } else if(sr.support && sr.resistance){
    lines.push('<b>On HOLD:</b> set alerts at both levels \u2014 a move outside the box is the only event worth reacting to');
  }
  var levelsText = lines.join('<br>');
  var trig = tcTriggerLevels(sig);
  var fiveDay = trig ? tcFiveDayOutlook(sig, trig.sup, trig.res) : null;
  return [levelsText, fiveDay].filter(Boolean);
}
function tcEntryExitPlan(sig){
  var trig = tcTriggerLevels(sig);
  if(!trig) return null;
  var price = sig.price, P = tcFmtLvl, sup = trig.sup, res = trig.res;
  // Ceiling (resistance) highlighted green, floor (support) highlighted
  // red -- same convention as the Stocks tab's tpEntryExitPlan.
  var resHi = '<span style="color:var(--green);font-weight:700">\u20b1'+P(res)+'</span>';
  var supHi = '<span style="color:var(--red);font-weight:700">\u20b1'+P(sup)+'</span>';
  if(sig.signal==='BUY'){
    var entryLo = Math.max(sup, price*(1 - (sig.volPct||3)/200));
    var stop = sup*0.99;
    var t1 = price + (res-price)*0.5;
    return 'WHERE TO ENTER AND EXIT:<br>' +
      '<b>Entry:</b> from \u20b1'+P(entryLo)+' up to the current \u20b1'+P(price)+' \u2014 a small dip gets a better price, but crypto moves 24/7 and deep-discount waiting often misses the move.<br>' +
      '<b>Take-profit / target:</b> first sell-point near \u20b1'+P(t1)+' (halfway to the ceiling), final target at the '+resHi+' ceiling.<br>' +
      '<b>Stop-loss (exit if wrong):</b> \u20b1'+P(stop)+', just under the '+supHi+' floor \u2014 a close below it means the setup failed.';
  }
  if(sig.signal==='SELL'){
    return 'WHERE TO EXIT AND RE-ENTER:<br>' +
      '<b>Exit (sell):</b> at or near the current \u20b1'+P(price)+' \u2014 any lift toward the '+resHi+' ceiling is a gift exit.<br>' +
      '<b>Re-entry (buy back):</b> the '+supHi+' floor is where a slide would most likely stall first.<br>' +
      '<b>Invalidation:</b> a close above '+resHi+' means this sell read was wrong.';
  }
  return 'WHERE THE ENTRY/EXIT TRIGGERS SIT:<br>' +
    '<b>Buy trigger:</b> a close above the '+resHi+' ceiling.<br>' +
    '<b>Sell trigger:</b> a close below the '+supHi+' floor.<br>' +
    '<b>Between those two prices:</b> no entry, no exit \u2014 everything inside the box is noise.';
}

// ══════════════════════════════════════════════════════════════
// POSITION SIZING (crypto) — mirrors the Stocks tab's tpPositionPlan:
// same \u20b1100,000 reference capital and the same aligned/opposed
// scaling logic (see trade.js ~line 2200). Coin quantities are shown
// to 4 decimals (tcFmtLvl) since crypto buys in fractional units,
// not whole shares.
// ══════════════════════════════════════════════════════════════
function tcPositionPlan(sig, band, aligned, opposed){
  var price = sig.price;
  var sym = tcCurrentSym || 'this coin';

  if(sig.signal==='BUY'){
    var pct = (aligned && sig.confidencePct>=80) ? 60 : opposed ? 20 : 40;
    var alloc = TP_REF_CAPITAL * pct/100;
    var cash = TP_REF_CAPITAL - alloc;
    var txt = "How much to buy (on a \u20b1"+tpPesoFmt(TP_REF_CAPITAL)+" reference): deploy about "+pct+"% \u2014 roughly \u20b1"+tpPesoFmt(alloc);
    if(price){
      var units = alloc/price;
      if(units>0) txt += ", which buys around "+tcFmtLvl(units)+" "+sym+" at \u20b1"+tcFmtLvl(price);
    }
    txt += " \u2014 and keep the other "+(100-pct)+"% (\u20b1"+tpPesoFmt(cash)+") in cash. ";
    txt += (aligned && sig.confidencePct>=80)
      ? "The larger allocation is justified because momentum and trend both agree here; this is the strongest setup shape this model produces, but even then it never puts the full amount at risk on one idea."
      : opposed
        ? "The small allocation is deliberate: this buy is fighting the current downtrend, so only a starter position makes sense until the trend actually turns."
        : "A middle-sized allocation fits a genuine-but-unconfirmed setup \u2014 enough to matter if it works, small enough to add more later once the price confirms.";
    if(band && price){
      var units2 = alloc/price;
      var riskPeso = Math.max(0,(price - band.low)) * units2;
      var gainPeso = Math.max(0,(band.high - price)) * units2;
      txt += " In peso terms on that position: roughly \u20b1"+tpPesoFmt(gainPeso)+" of potential gain if it reaches \u20b1"+tcFmtLvl(band.high)+", against about \u20b1"+tpPesoFmt(riskPeso)+" of loss if the stop under \u20b1"+tcFmtLvl(band.low)+" gets hit.";
    }
    return txt;
  }

  if(sig.signal==='SELL'){
    var pctS = (aligned && sig.confidencePct>=80) ? 100 : opposed ? 30 : 50;
    var sellAmt = TP_REF_CAPITAL * pctS/100;
    var keepAmt = TP_REF_CAPITAL - sellAmt;
    var txtS = "How much to sell (if you hold \u20b1"+tpPesoFmt(TP_REF_CAPITAL)+" of "+sym+"): unload about "+pctS+"% \u2014 roughly \u20b1"+tpPesoFmt(sellAmt)+" worth";
    if(price){
      var unitsS = sellAmt/price;
      if(unitsS>0) txtS += " (around "+tcFmtLvl(unitsS)+" "+sym+" at \u20b1"+tcFmtLvl(price)+")";
    }
    txtS += pctS===100 ? ". " : ", keeping \u20b1"+tpPesoFmt(keepAmt)+" riding with a stop-loss in place. ";
    txtS += (aligned && sig.confidencePct>=80)
      ? "A full exit is warranted when momentum and trend both point down together \u2014 that double-confirmation is rare, and hoping it blows over usually costs more than re-buying later if you turn out wrong."
      : opposed
        ? "Only a partial trim makes sense because the overall trend is still pointed up \u2014 you're taking some money off the table on a warning sign, not abandoning a coin that's still climbing."
        : "A half-position sale matches a real-but-unconfirmed sell case: it locks in meaningful protection without fully exiting before the trend has actually broken.";
    if(band && price){
      var downPct = Math.max(0,(price - band.low)/price);
      var protectedPeso = sellAmt * downPct;
      txtS += " In peso terms: selling that portion now protects roughly \u20b1"+tpPesoFmt(protectedPeso)+" of value if the price slides to \u20b1"+tcFmtLvl(band.low)+" as this read expects.";
    }
    return txtS;
  }

  // HOLD
  return "How much to trade (on a \u20b1"+tpPesoFmt(TP_REF_CAPITAL)+" reference): \u20b10 \u2014 keep the full amount in cash for this coin. A HOLD means neither buying nor selling has an edge right now, so any peso deployed here would be paying for a guess. If you already own it, this isn't a signal to sell either \u2014 just hold what you have and wait for the levels above to break.";
}

// ── Main render ──
function tcSelectCoin(sym){ tcRenderAll(sym); }
function tcRenderAll(sym){
  var c = tcFindCoin(sym);
  if(!c) return;
  tcCurrentSym = sym;
  var input = document.getElementById('tc-coin-search');
  if(input) input.value = c.name + ' (' + c.sym + ')';

  var q = tcGetQuote(sym);
  var sig = tcSignal(sym);

  document.getElementById('tc-name').textContent = c.name + ' (' + c.sym + ')';

  if(!q || !sig){
    // No live data yet for this coin — honest empty state, no fabricated numbers.
    document.getElementById('tc-price').textContent = '\u2014';
    document.getElementById('tc-chg').textContent = '';
    document.getElementById('tc-trend-wrap').innerHTML = '';
    document.getElementById('tc-badge-wrap').innerHTML = '';
    document.getElementById('tc-summary-rec-text').innerHTML = tpBulletsHTML([
      'No live data yet for '+c.name+'. Tap <b>Fetch Live Data</b> above to pull real prices and history from the CoinGecko API \u2014 first run takes a few minutes.'
    ]);
    document.getElementById('tc-summary-rec-tag').textContent = 'NO DATA';
    document.getElementById('tc-summary-rec-tag').className = 'tp-summary-tag';
    ['tc-summary-signal-tag','tc-summary-trend-tag'].forEach(function(id){ var e=document.getElementById(id); if(e){ e.textContent='\u2014'; e.className='tp-summary-tag'; } });
    ['tc-summary-signal-text','tc-summary-trend-text'].forEach(function(id){ var e=document.getElementById(id); if(e) e.textContent='\u2014'; });
    document.getElementById('tc-summary-levels-text').textContent = '\u2014';
    document.getElementById('tc-range-low').textContent = '\u2014';
    document.getElementById('tc-range-high').textContent = '\u2014';
    var fillE=document.getElementById('tc-range-fill'), markE=document.getElementById('tc-range-marker');
    if(fillE) fillE.style.width='0%'; if(markE) markE.style.left='0%';
    ['tc-stat-lasttrade','tc-stat-open','tc-stat-high','tc-stat-low','tc-stat-vol','tc-stat-sma20','tc-stat-sma50'].forEach(function(id){ var e=document.getElementById(id); if(e) e.textContent='\u2014'; });
    tcUpdateWatchBtn();
    return;
  }

  document.getElementById('tc-price').textContent = tcFmtUSD(q.price);
  var chgPct = q.change24hPct || 0;
  var prev = chgPct !== -100 ? q.price / (1 + chgPct/100) : q.price;
  var chgAbs = q.price - prev;
  var chgEl = document.getElementById('tc-chg');
  chgEl.textContent = (chgPct>=0?'+':'') + (q.price>=1 ? chgAbs.toFixed(2) : chgAbs.toFixed(4)) + ' (' + (chgPct>=0?'+':'') + chgPct.toFixed(2) + '%)';
  chgEl.className = 'tp-price-chg ' + (chgPct>=0?'up':'down');

  var trendArrow = sig.trend==='BULL' ? '\u25B2' : sig.trend==='BEAR' ? '\u25BC' : '\u2014';
  var tcTrendCol = tpConfidenceColor(sig.trendConfidencePct, sig.trend);
  document.getElementById('tc-trend-wrap').innerHTML =
    '<div class="tp-trend-badge ' + sig.trend + '" style="background:' + tcTrendCol.bg + ';color:' + tcTrendCol.text + ';border-color:' + tcTrendCol.text + '">' + trendArrow + ' ' + sig.trendConfidencePct + '% ' + sig.trend + '</div>';
  var tcBadgeCol = tpConfidenceColor(sig.confidencePct, sig.signal);
  document.getElementById('tc-badge-wrap').innerHTML =
    '<div class="tp-signal-badge ' + sig.signal + '" style="background:' + tcBadgeCol.bg + ';color:' + tcBadgeCol.text + ';border-color:' + tcBadgeCol.text + '">' + sig.confidencePct + '% ' + sig.signal + '</div>';

  var recEl = document.getElementById('tc-summary-rec-text');
  var actionTxt = sig.signal==='BUY' ? 'accumulating on dips looks reasonable given the current read'
    : sig.signal==='SELL' ? 'trimming exposure or waiting for a reset looks reasonable given the current read'
    : 'staying on the sidelines and letting the trend resolve looks reasonable given the current read';
  var verdictTxt = sig.signal + ' \u2014 ' + actionTxt + '. RSI(14) + SMA20/50 trend (volume-confirmed) + real ATR/support-resistance where the trailing ~30 days of real-wick data allows it.';
  var trig = tcTriggerLevels(sig);
  var entryExitTxt = trig ? tcEntryExitPlan(sig) : 'Not enough data yet to set reliable entry/exit levels.';
  var aligned = (sig.signal==='BUY' && sig.trend==='BULL') || (sig.signal==='SELL' && sig.trend==='BEAR');
  var opposed = (sig.signal==='BUY' && sig.trend==='BEAR') || (sig.signal==='SELL' && sig.trend==='BULL');
  var band = tcProjectedBand(sig);
  var sizingTxt = tcPositionPlan(sig, band, aligned, opposed);
  recEl.innerHTML = tpBulletsHTML([verdictTxt + '<br><br>' + entryExitTxt].concat(sizingTxt ? [sizingTxt] : []));
  var recTag = document.getElementById('tc-summary-rec-tag');
  recTag.textContent = 'RECOMMENDATION';
  recTag.className = 'tp-summary-tag ' + sig.signal;
  { var rc = tpConfidenceColor(sig.confidencePct, sig.signal); recTag.style.color = rc.text; recTag.style.background = rc.bg; }

  var sigTag = document.getElementById('tc-summary-signal-tag');
  sigTag.textContent = sig.confidencePct + '% ' + sig.signal;
  sigTag.className = 'tp-summary-tag ' + sig.signal;
  { var c2 = tpConfidenceColor(sig.confidencePct, sig.signal); sigTag.style.color = c2.text; sigTag.style.background = c2.bg; }
  document.getElementById('tc-summary-signal-text').textContent =
    'RSI(14) is at ' + (sig.rsi!=null ? sig.rsi.toFixed(1) : '\u2014') +
    (sig.rsi>=TC_RSI_OVERBOUGHT ? ' \u2014 overbought territory; momentum is stretched.' :
     sig.rsi<=TC_RSI_OVERSOLD ? ' \u2014 oversold territory; selling pressure looks exhausted.' :
     ' \u2014 neutral zone; neither side has a decisive edge.');

  var trTag = document.getElementById('tc-summary-trend-tag');
  trTag.textContent = sig.trendConfidencePct + '% ' + sig.trend;
  trTag.className = 'tp-summary-tag ' + (sig.trend==='BULL'?'BUY':sig.trend==='BEAR'?'SELL':'HOLD');
  { var trC = tpConfidenceColor(sig.trendConfidencePct, sig.trend); trTag.style.color = trC.text; trTag.style.background = trC.bg; }
  document.getElementById('tc-summary-trend-text').textContent =
    'SMA20 sits ' + (sig.trendGapPct>=0?'+':'') + sig.trendGapPct.toFixed(2) + '% vs SMA50 (buffer '+TC_TREND_BUFFER_PCT+'%) \u2014 ' +
    (sig.trend==='BULL' ? 'a confirmed uptrend'+(sig.volConfirmed?', backed by above-average volume.':', though on below-average volume (half-weighted in the score).') :
     sig.trend==='BEAR' ? 'a confirmed downtrend'+(sig.volConfirmed?', backed by above-average volume.':', though on below-average volume (half-weighted in the score).') :
     'inside the buffer band, so no confirmed trend either way.');

  document.getElementById('tc-summary-levels-text').innerHTML = tpBulletsHTML(tcLevelsNarrative(sig));

  var s = sig.series;
  var lo52 = Math.min.apply(null, s.slice(-365).map(function(b){return b.low;}));
  var hi52 = Math.max.apply(null, s.slice(-365).map(function(b){return b.high;}));
  document.getElementById('tc-range-low').textContent = tcFmtUSD(lo52);
  document.getElementById('tc-range-high').textContent = tcFmtUSD(hi52);
  var posPct = hi52>lo52 ? Math.max(0, Math.min(100, ((q.price-lo52)/(hi52-lo52))*100)) : 50;
  var fill = document.getElementById('tc-range-fill');
  var marker = document.getElementById('tc-range-marker');
  if(fill) fill.style.width = posPct + '%';
  if(marker) marker.style.left = posPct + '%';

  var last = s[s.length-1];
  document.getElementById('tc-stat-lasttrade').textContent = tpFmtDate(last.date) + ' \u00b7 24/7 market' + (last.real===false ? ' (close-derived)' : '');
  document.getElementById('tc-stat-open').textContent = tcFmtUSD(last.open);
  document.getElementById('tc-stat-high').textContent = tcFmtUSD(last.high);
  document.getElementById('tc-stat-low').textContent = tcFmtUSD(last.low);
  document.getElementById('tc-stat-vol').textContent = tcFmtUSDBig(last.volume);
  document.getElementById('tc-stat-sma20').textContent = sig.sma20!=null ? tcFmtUSD(sig.sma20) : '\u2014';
  document.getElementById('tc-stat-sma50').textContent = sig.sma50!=null ? tcFmtUSD(sig.sma50) : '\u2014';

  tcUpdateWatchBtn();
  var chartSeries = tcGetChartSeries(sym, tcCurrentTF);
  if(chartSeries) { try { tcRenderChart(chartSeries); } catch(e) {} }
  tcUpdateChartTfDate(tcCurrentTF);
}

// ── Init (lazy, first time the Crypto tab is opened) ──
function tcInit(){
  if(tcInited) return;
  tcInited = true;
  // Sync the Gainers/Bullish toggle buttons to whatever mode was restored
  // from localStorage — otherwise the buttons show "Gainers" active even
  // when tcGainersModeVal actually restored as 'bullish'.
  document.querySelectorAll('#tp-crypto-view .tp-gainers-toggle .tp-gainers-tab').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-mode') === tcGainersModeVal);
  });
  tcRenderDropdown('');
  tcRenderTop();
  tcRenderWatchlist();
  tcRenderAll('BTC');
  tcStartLivePriceAutoRefresh();
}
(function(){
  var orig = tpSetMarket;
  tpSetMarket = function(mode){
    orig(mode);
    if(mode === 'crypto') tcInit();
  };
})();
window.addEventListener('resize', function(){
  if(tcInited && tcCurrentSym && tpMarketMode === 'crypto'){
    var s = tcGetChartSeries(tcCurrentSym, tcCurrentTF);
    if(s) tcRenderChart(s);
  }
});

function tcRenderChart(series){
  const priceCanvas = document.getElementById('tc-canvas-price');
  const volCanvas = document.getElementById('tc-canvas-vol');
  const rsiCanvas = document.getElementById('tc-canvas-rsi');
  if(!priceCanvas || !volCanvas || !rsiCanvas || !series.length) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = priceCanvas.clientWidth || priceCanvas.parentElement.clientWidth;

  function setup(canvas, cssH){
    canvas.width = cssW*dpr; canvas.height = cssH*dpr;
    canvas.style.height = cssH+'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);
    return ctx;
  }

  const priceH=180, volH=54, rsiH=50;
  const pctx = setup(priceCanvas, priceH);
  const vctx = setup(volCanvas, volH);
  const rctx = setup(rsiCanvas, rsiH);

  const n = series.length;
  const slotW = cssW/n;
  const bodyW = Math.max(1.5, slotW*0.55);

  const highs=series.map(function(d){return d.high;}), lows=series.map(function(d){return d.low;});
  const max=Math.max.apply(null,highs), min=Math.min.apply(null,lows);
  const range=(max-min)||1;
  const padTop=8, padBottom=8;
  const usableH=priceH-padTop-padBottom;

  series.forEach(function(d,i){
    const x=i*slotW+slotW/2;
    const yHigh=padTop+(1-(d.high-min)/range)*usableH;
    const yLow=padTop+(1-(d.low-min)/range)*usableH;
    const yOpen=padTop+(1-(d.open-min)/range)*usableH;
    const yClose=padTop+(1-(d.close-min)/range)*usableH;
    const up=d.close>=d.open;
    pctx.strokeStyle = up?'#22c55e':'#ef4444';
    pctx.fillStyle = up?'#22c55e':'#ef4444';
    pctx.lineWidth=1;
    pctx.beginPath(); pctx.moveTo(x,yHigh); pctx.lineTo(x,yLow); pctx.stroke();
    const bodyTop=Math.min(yOpen,yClose);
    const bodyH=Math.max(1,Math.abs(yClose-yOpen));
    pctx.fillRect(x-bodyW/2, bodyTop, bodyW, bodyH);
  });
  const trendVals = tpTrendSeries(series.map(function(d){return d.close;}));
  pctx.strokeStyle = '#f59e0b';
  pctx.lineWidth = 1.5;
  pctx.beginPath();
  let tStarted = false;
  trendVals.forEach(function(v,i){
    if(v===null) return;
    const x = i*slotW + slotW/2;
    const y = padTop + (1-(v-min)/range)*usableH;
    if(!tStarted){ pctx.moveTo(x,y); tStarted=true; } else pctx.lineTo(x,y);
  });
  pctx.stroke();

  pctx.fillStyle='#7a7a88'; pctx.font='9px Inter,sans-serif'; pctx.textAlign='right';
  [max, min+range/2, min].forEach(function(v){
    const y = padTop + (1-(v-min)/range)*usableH;
    pctx.fillText(v.toFixed(2), cssW-2, Math.max(9,Math.min(priceH-2,y+3)));
  });

  const vols = series.map(function(d){return d.volume;});
  const vmax = Math.max.apply(null,vols)||1;
  series.forEach(function(d,i){
    const x=i*slotW+slotW/2;
    const h=(d.volume/vmax)*(volH-6);
    const up=d.close>=d.open;
    vctx.fillStyle = up?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)';
    vctx.fillRect(x-bodyW/2, volH-h-2, bodyW, h);
  });

  const closes = series.map(function(d){return d.close;});
  const rsiVals = tpRSISeries(closes,14);
  rctx.strokeStyle='rgba(122,122,136,0.35)'; rctx.lineWidth=1; rctx.setLineDash([2,2]);
  [30,70].forEach(function(v){
    const y=rsiH-(v/100)*rsiH;
    rctx.beginPath(); rctx.moveTo(0,y); rctx.lineTo(cssW,y); rctx.stroke();
  });
  rctx.setLineDash([]);
  rctx.strokeStyle='#f7931a'; rctx.lineWidth=1.5; rctx.beginPath();
  let started=false;
  rsiVals.forEach(function(v,i){
    if(v===null) return;
    const x=i*slotW+slotW/2;
    const y = rsiH-(v/100)*rsiH;
    if(!started){ rctx.moveTo(x,y); started=true; } else rctx.lineTo(x,y);
  });
  rctx.stroke();

  const datesEl = document.getElementById('tc-chart-dates');
  if(datesEl){
    const labelCount = Math.min(5, n);
    let html='';
    for(let k=0;k<labelCount;k++){
      const idx = Math.floor(k*(n-1)/((labelCount-1)||1));
      html += '<span>'+tpFmtDate(series[idx].date)+'</span>';
    }
    datesEl.innerHTML = html;
  }
}

// ═══════════ APP INIT (runs last; scripts are deferred in document order) ═══════════
// Restore last-viewed Trade market (stocks/crypto) so a refresh stays on the same view
try{
  if(localStorage.getItem('tpMarketMode') === 'crypto') tpSetMarket('crypto');
}catch(e){}
initFromHash();
