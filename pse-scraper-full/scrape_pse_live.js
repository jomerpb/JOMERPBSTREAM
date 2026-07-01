// PSE Edge LIVE quote scraper — hits companyPage/stockData.do (a live,
// intraday quote page: Last Traded Price, Previous Close, Change%, Volume,
// etc.) for one shard (subset) of the full company list. This is a
// different endpoint from DisclosureCht.ax (used by scrape_pse_full.js),
// which only carries settled end-of-day chart bars and — confirmed via two
// same-day test runs, hours apart, with identical results — does not
// publish today's bar until at least the next business day. stockData.do
// is what actually updates during the trading session.
//
// Reuses resolveAllIds()/parseDirectoryPage()/selectShard() verbatim from
// scrape_pse_full.js so both scrapers stay in lockstep on cmpy_id/security_id
// — kept as a separate copy (not a shared import) to match this repo's
// existing convention of each scraper script being self-contained.
//
// Usage: node scrape_pse_live.js
// Env:   SHARD_INDEX (0-based, required)
//        SHARD_COUNT (total number of shards, required)
//        PSE_OUTPUT_PATH (optional, defaults to ./pse-live-shard-<index>.json)

const fs = require('fs');
const path = require('path');

const SHARD_INDEX = parseInt(process.env.SHARD_INDEX, 10);
const SHARD_COUNT = parseInt(process.env.SHARD_COUNT, 10);
if (require.main === module && (Number.isNaN(SHARD_INDEX) || Number.isNaN(SHARD_COUNT))) {
  console.error('FATAL: SHARD_INDEX and SHARD_COUNT env vars are required');
  process.exit(1);
}

const OUTPUT_PATH = process.env.PSE_OUTPUT_PATH || path.join(__dirname, `pse-live-shard-${SHARD_INDEX}.json`);

const BASE = 'https://edge.pse.com.ph';
const DIRECTORY_HEADERS = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Origin': BASE,
  'Referer': `${BASE}/companyDirectory/form.do`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
};
// stockData.do is a normal page load, not an XHR call — headers match that
// (no X-Requested-With / JSON content-type).
const PAGE_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': `${BASE}/companyDirectory/form.do`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Copied verbatim from scrape_pse_full.js — see that file for notes. ──
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
    headers: DIRECTORY_HEADERS,
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`companyDirectory/search.ax HTTP ${res.status} (page ${pageNo})`);
  return res.text();
}

async function resolveAllIds() {
  const all = [];
  const MAX_PAGES = 12;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchDirectoryPage(page);
    const rows = parseDirectoryPage(html);
    if (rows.length === 0) break;
    all.push(...rows);
    await sleep(1200);
  }
  return all;
}

function selectShard(allTickers, shardIndex, shardCount) {
  const sorted = [...allTickers].sort((a, b) => a.symbol.localeCompare(b.symbol));
  return sorted.filter((_, i) => i % shardCount === shardIndex);
}
// ── End verbatim copy. ──

// Extracts the raw inner text of the <td> that immediately follows a given
// <th>Label</th> — every field on the stockData.do page follows this exact
// pattern, and each label is unique on the page, so this one function
// covers Status, Last Traded Price, Open, High, Low, Volume, Value,
// Average Price, and Previous Close and Date. Tested against a real
// captured AUB response before being used here.
function extractLabeled(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('<th>' + escaped + '</th>\\s*<td[^>]*>([\\s\\S]*?)</td>', 'i');
  const m = html.match(re);
  return m ? m[1].replace(/&nbsp;/g, ' ').trim() : null;
}

function toNumber(raw) {
  if (raw == null) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Change/%change are computed here from Last Traded Price vs Previous
// Close rather than parsed from the page's own "down 0.100 (0.19%)" text —
// that text mixes an "up"/"down" word, &nbsp; entities, and inconsistent
// spacing around the parens, which is more fragile to parse reliably than
// just re-deriving the same two numbers ourselves.
function parseStockDataPage(html) {
  const companyName = (html.match(/<p style="margin-top:0px;">([^<]*)<\/p>/) || [])[1] || null;
  const asOf = (html.match(/As of ([^<]+?)\s*<\/span>/) || [])[1] || null;
  const status = extractLabeled(html, 'Status');

  const last = toNumber(extractLabeled(html, 'Last Traded Price'));
  const open = toNumber(extractLabeled(html, 'Open'));
  const high = toNumber(extractLabeled(html, 'High'));
  const low = toNumber(extractLabeled(html, 'Low'));
  const volume = toNumber(extractLabeled(html, 'Volume'));
  const value = toNumber(extractLabeled(html, 'Value'));
  const avgPrice = toNumber(extractLabeled(html, 'Average Price'));

  let previousClose = null, previousCloseDate = null;
  const prevRaw = extractLabeled(html, 'Previous Close and Date');
  if (prevRaw) {
    const m = prevRaw.match(/([\d,.\-]+)\s*\(([^)]+)\)/);
    if (m) { previousClose = toNumber(m[1]); previousCloseDate = m[2].trim(); }
  }

  const change = (last != null && previousClose != null) ? +(last - previousClose).toFixed(4) : null;
  const changePct = (last != null && previousClose) ? +((last - previousClose) / previousClose * 100).toFixed(4) : null;

  return { companyName, asOf, status, last, open, high, low, volume, value, avgPrice, previousClose, previousCloseDate, change, changePct };
}

async function fetchStockData(cmpyId, securityId) {
  const url = `${BASE}/companyPage/stockData.do?cmpy_id=${cmpyId}&security_id=${securityId}`;
  const res = await fetch(url, { method: 'GET', headers: PAGE_HEADERS });
  if (!res.ok) throw new Error(`stockData.do HTTP ${res.status} for cmpy_id=${cmpyId}`);
  return res.text();
}

async function main() {
  console.log(`Live shard ${SHARD_INDEX}/${SHARD_COUNT} — resolving full company list...`);
  const allTickers = await resolveAllIds();
  console.log(`Resolved ${allTickers.length} companies total.`);

  const myShard = selectShard(allTickers, SHARD_INDEX, SHARD_COUNT);
  console.log(`Shard ${SHARD_INDEX} handling ${myShard.length} tickers.`);

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph/companyPage/stockData.do (live quotes)',
    shardIndex: SHARD_INDEX,
    shardCount: SHARD_COUNT,
    quotes: {},
  };
  const errors = [];

  for (const t of myShard) {
    try {
      const html = await fetchStockData(t.cmpyId, t.securityId);
      const parsed = parseStockDataPage(html);
      if (parsed.last == null) {
        console.log(`[${t.symbol}] no Last Traded Price found (likely not traded / suspended) — recording anyway`);
      }
      output.quotes[t.symbol] = {
        cmpyId: t.cmpyId,
        securityId: t.securityId,
        companyName: t.companyName || parsed.companyName,
        ...parsed,
      };
      console.log(`[${t.symbol}] OK — last=${parsed.last} prevClose=${parsed.previousClose} chg%=${parsed.changePct}`);
    } catch (err) {
      console.error(`[${t.symbol}] FAILED — ${err.message}`);
      errors.push({ symbol: t.symbol, error: err.message });
    }
    await sleep(1500);
  }

  output.errors = errors; // unlike scrape_pse_full.js, persisted into the file itself — not just console logs — so partial failures are visible without digging through Actions run logs.

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Succeeded: ${Object.keys(output.quotes).length}/${myShard.length}`);
  if (errors.length) console.log('Failures:', JSON.stringify(errors, null, 2));
}

module.exports = { parseStockDataPage, extractLabeled, toNumber, parseDirectoryPage, selectShard };

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
