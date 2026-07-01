// PSE Edge full-market scraper — resolves cmpy_id/security_id for every
// listed company via the companyDirectory/search.ax endpoint, then fetches
// 1-year OHLC chart data for one shard (subset) of that full list.
//
// Designed to run as N parallel GitHub Actions matrix jobs. Each shard
// independently resolves the full ID list (cheap — 6 requests) then filters
// to its own slice, so shards don't need to coordinate or share state.
// Each shard writes its own output file; a separate merge step combines
// them and commits once, avoiding git conflicts between parallel jobs.
//
// Usage: node scrape_pse_full.js
// Env:   SHARD_INDEX (0-based, required)
//        SHARD_COUNT (total number of shards, required)
//        PSE_LOOKBACK_DAYS (optional, defaults to 365 ~= 1 year)
//        PSE_OUTPUT_PATH (optional, defaults to ./pse-full-shard-<index>.json)

const fs = require('fs');
const path = require('path');

const SHARD_INDEX = parseInt(process.env.SHARD_INDEX, 10);
const SHARD_COUNT = parseInt(process.env.SHARD_COUNT, 10);
if (require.main === module && (Number.isNaN(SHARD_INDEX) || Number.isNaN(SHARD_COUNT))) {
  console.error('FATAL: SHARD_INDEX and SHARD_COUNT env vars are required');
  process.exit(1);
}

const LOOKBACK_DAYS = parseInt(process.env.PSE_LOOKBACK_DAYS || '365', 10);
const OUTPUT_PATH = process.env.PSE_OUTPUT_PATH || path.join(__dirname, `pse-full-shard-${SHARD_INDEX}.json`);

const BASE = 'https://edge.pse.com.ph';
const COMMON_HEADERS = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Origin': BASE,
  'Referer': `${BASE}/companyDirectory/form.do`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
};
const CHART_HEADERS = {
  ...COMMON_HEADERS,
  'Content-Type': 'application/json',
  'Referer': `${BASE}/companyPage/stockData.do`,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatMMDDYYYY(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function chartDateToISO(chartDate) {
  const d = new Date(chartDate);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Parses one page of companyDirectory/search.ax's HTML response, extracting
// {cmpyId, securityId, symbol, companyName, sector, subsector} per row.
// Each row's onclick is cmDetail('<cmpy_id>','<security_id>') — this single
// call gives us both IDs directly, no separate stockData.do lookup needed.
function parseDirectoryPage(html) {
  const rows = [];
  const rowRegex = /<tr>\s*<td><a href="#company" onclick="cmDetail\('(\d+)','(\d+)'\);return false;">([^<]+)<\/a><\/td>\s*<td class="alignC"><a[^>]*>([^<]+)<\/a><\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/g;
  let m;
  while ((m = rowRegex.exec(html)) !== null) {
    rows.push({
      cmpyId: m[1],
      securityId: m[2],
      companyName: m[3].trim(),
      symbol: m[4].trim(),
      sector: m[5].trim(),
      subsector: m[6].trim(),
    });
  }
  return rows;
}

async function fetchDirectoryPage(pageNo) {
  const body = new URLSearchParams({
    pageNo: String(pageNo),
    companyId: '',
    keyword: '',
    sortType: '',
    dateSortType: '',
    cmpySortType: '',
    symbolSortType: '',
    sector: 'ALL',
    subsector: 'ALL',
  });
  const res = await fetch(`${BASE}/companyDirectory/search.ax`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`companyDirectory/search.ax HTTP ${res.status} (page ${pageNo})`);
  return res.text();
}

// Resolves the full company list by paging through search.ax. Stops early
// if a page returns zero rows (defensive — in case total count changes).
async function resolveAllIds() {
  const all = [];
  const MAX_PAGES = 12; // generous ceiling; 283 companies / ~50 per page = 6 pages currently
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchDirectoryPage(page);
    const rows = parseDirectoryPage(html);
    if (rows.length === 0) break;
    all.push(...rows);
    await sleep(1200);
  }
  return all;
}

async function fetchChartData(cmpyId, securityId, startDate, endDate) {
  const res = await fetch(`${BASE}/common/DisclosureCht.ax`, {
    method: 'POST',
    headers: CHART_HEADERS,
    body: JSON.stringify({ cmpy_id: cmpyId, security_id: securityId, startDate, endDate }),
  });
  if (!res.ok) throw new Error(`DisclosureCht.ax HTTP ${res.status} for cmpy_id=${cmpyId}`);
  const json = await res.json();
  if (!Array.isArray(json.chartData)) throw new Error('Unexpected response: missing chartData array');
  return json.chartData;
}

function normalizeAndDedupe(rawChartData) {
  const byDate = new Map();
  for (const row of rawChartData) {
    const isoDate = chartDateToISO(row.CHART_DATE);
    if (!isoDate) continue;
    if (
      typeof row.OPEN !== 'number' ||
      typeof row.HIGH !== 'number' ||
      typeof row.LOW !== 'number' ||
      typeof row.CLOSE !== 'number'
    ) {
      continue;
    }
    byDate.set(isoDate, {
      date: isoDate,
      open: row.OPEN,
      high: row.HIGH,
      low: row.LOW,
      close: row.CLOSE,
      value: typeof row.VALUE === 'number' ? row.VALUE : null,
    });
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Deterministic sharding: sort by symbol first so shard membership is
// stable across runs, then assign by index % SHARD_COUNT.
function selectShard(allTickers, shardIndex, shardCount) {
  const sorted = [...allTickers].sort((a, b) => a.symbol.localeCompare(b.symbol));
  return sorted.filter((_, i) => i % shardCount === shardIndex);
}

async function main() {
  console.log(`Shard ${SHARD_INDEX}/${SHARD_COUNT} — resolving full company list...`);
  const allTickers = await resolveAllIds();
  console.log(`Resolved ${allTickers.length} companies total.`);

  const myShard = selectShard(allTickers, SHARD_INDEX, SHARD_COUNT);
  console.log(`Shard ${SHARD_INDEX} handling ${myShard.length} tickers.`);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - LOOKBACK_DAYS);
  const startStr = formatMMDDYYYY(startDate);
  const endStr = formatMMDDYYYY(endDate);

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph/common/DisclosureCht.ax (full market)',
    shardIndex: SHARD_INDEX,
    shardCount: SHARD_COUNT,
    tickers: {},
  };
  const errors = [];

  for (const t of myShard) {
    try {
      const rawChartData = await fetchChartData(t.cmpyId, t.securityId, startStr, endStr);
      const series = normalizeAndDedupe(rawChartData);
      output.tickers[t.symbol] = {
        cmpyId: t.cmpyId,
        securityId: t.securityId,
        companyName: t.companyName,
        sector: t.sector,
        subsector: t.subsector,
        series,
      };
      console.log(`[${t.symbol}] OK — ${series.length} daily bars`);
    } catch (err) {
      console.error(`[${t.symbol}] FAILED — ${err.message}`);
      errors.push({ symbol: t.symbol, error: err.message });
    }
    await sleep(1500);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Succeeded: ${Object.keys(output.tickers).length}/${myShard.length}`);
  if (errors.length) console.log('Failures:', JSON.stringify(errors, null, 2));
}

module.exports = { parseDirectoryPage, normalizeAndDedupe, chartDateToISO, formatMMDDYYYY, selectShard };

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
