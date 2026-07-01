// PSE Edge scraper — fetches OHLC chart data via the internal
// DisclosureCht.ax endpoint for a static set of pre-resolved tickers,
// dedupes by date, and writes a normalized JSON file matching the
// Trade tab's expected shape.
//
// Usage: node scrape_pse.js
// Env:   PSE_LOOKBACK_DAYS (optional, defaults to 730 ~= 2 years)
//        PSE_OUTPUT_PATH (optional, defaults to ./pse-history.json)

const fs = require('fs');
const path = require('path');

// Manually resolved via browser (cmpy_id/security_id from PSE Edge's
// stockData.do page for each ticker's common-share listing).
// Fill in the rest — JFC confirmed live.
const TICKER_IDS = {
  JFC: { cmpyId: '86', securityId: '158' },
  SM:  { cmpyId: '112', securityId: '314' },
  ALI: { cmpyId: '180', securityId: '293' },
  BDO: { cmpyId: '260', securityId: '468' },
  TEL: { cmpyId: '6', securityId: '134' },
  ICT: { cmpyId: '83', securityId: '142' },
  URC: { cmpyId: '124', securityId: '167' },
  MER: { cmpyId: '118', securityId: '137' },
};

const LOOKBACK_DAYS = parseInt(process.env.PSE_LOOKBACK_DAYS || '730', 10);
const OUTPUT_PATH = process.env.PSE_OUTPUT_PATH || path.join(__dirname, 'pse-history.json');

const BASE = 'https://edge.pse.com.ph';
const COMMON_HEADERS = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'Origin': BASE,
  'Referer': `${BASE}/companyPage/stockData.do`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
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
  // "Jul 01, 2025 00:00:00" -> "2025-07-01"
  const d = new Date(chartDate);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Fetch OHLC chart data for a resolved ticker.
async function fetchChartData(cmpyId, securityId, startDate, endDate) {
  const res = await fetch(`${BASE}/common/DisclosureCht.ax`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify({
      cmpy_id: cmpyId,
      security_id: securityId,
      startDate,
      endDate,
    }),
  });
  if (!res.ok) throw new Error(`DisclosureCht.ax HTTP ${res.status} for cmpy_id=${cmpyId}`);
  const json = await res.json();
  if (!Array.isArray(json.chartData)) throw new Error('Unexpected response: missing chartData array');
  return json.chartData;
}

// Dedupe by date (raw response can contain duplicate CHART_DATE rows —
// observed live) and normalize field names to match tpGenSeries shape.
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
      continue; // skip malformed rows rather than poison the series
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

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - LOOKBACK_DAYS);

  const startStr = formatMMDDYYYY(startDate);
  const endStr = formatMMDDYYYY(endDate);

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph/common/DisclosureCht.ax',
    tickers: {},
  };
  const errors = [];

  for (const [symbol, ids] of Object.entries(TICKER_IDS)) {
    if (!ids.cmpyId || !ids.securityId) {
      console.warn(`[${symbol}] SKIPPED — cmpy_id/security_id not yet filled in`);
      errors.push({ symbol, error: 'IDs not configured' });
      continue;
    }
    try {
      console.log(`[${symbol}] cmpy_id=${ids.cmpyId} security_id=${ids.securityId} fetching chart data...`);
      const rawChartData = await fetchChartData(ids.cmpyId, ids.securityId, startStr, endStr);
      const series = normalizeAndDedupe(rawChartData);

      output.tickers[symbol] = {
        cmpyId: ids.cmpyId,
        securityId: ids.securityId,
        series,
      };
      console.log(`[${symbol}] OK — ${series.length} daily bars`);
    } catch (err) {
      console.error(`[${symbol}] FAILED — ${err.message}`);
      errors.push({ symbol, error: err.message });
    }
    await sleep(2000); // politeness delay between tickers
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Succeeded: ${Object.keys(output.tickers).length}/${Object.keys(TICKER_IDS).length}`);
  if (errors.length) {
    console.log('Failures:', JSON.stringify(errors, null, 2));
  }
}

module.exports = { normalizeAndDedupe, chartDateToISO, formatMMDDYYYY };

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
