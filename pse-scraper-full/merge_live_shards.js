// Combines N live-quote shard files (pse-live-shard-0.json .. pse-live-shard-N.json)
// into a single pse-live-quotes.json. Run after all shard jobs complete.
//
// Usage: node merge_live_shards.js <shard-dir> <output-path> <shard-count>

const fs = require('fs');
const path = require('path');

function mergeLiveShards(shardDir, shardCount) {
  const merged = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph/companyPage/stockData.do (live quotes, merged from shards)',
    quotes: {},
  };
  const shardSummaries = [];
  const allErrors = [];

  for (let i = 0; i < shardCount; i++) {
    const shardPath = path.join(shardDir, `pse-live-shard-${i}.json`);
    if (!fs.existsSync(shardPath)) {
      console.warn(`WARNING: shard file missing: ${shardPath} — skipping`);
      shardSummaries.push({ shard: i, status: 'missing', count: 0 });
      continue;
    }
    const shardData = JSON.parse(fs.readFileSync(shardPath, 'utf8'));
    const symbols = Object.keys(shardData.quotes || {});
    for (const sym of symbols) {
      merged.quotes[sym] = shardData.quotes[sym];
    }
    if (Array.isArray(shardData.errors) && shardData.errors.length) {
      allErrors.push(...shardData.errors);
    }
    shardSummaries.push({ shard: i, status: 'ok', count: symbols.length });
  }

  merged.errors = allErrors;
  return { merged, shardSummaries };
}

if (require.main === module) {
  const [shardDir, outputPath, shardCountArg] = process.argv.slice(2);
  if (!shardDir || !outputPath || !shardCountArg) {
    console.error('Usage: node merge_live_shards.js <shard-dir> <output-path> <shard-count>');
    process.exit(1);
  }
  const { merged, shardSummaries } = mergeLiveShards(shardDir, parseInt(shardCountArg, 10));
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
  console.log('Shard summary:', JSON.stringify(shardSummaries, null, 2));
  console.log(`Merged ${Object.keys(merged.quotes).length} tickers total -> ${outputPath}`);
  if (merged.errors.length) console.log(`${merged.errors.length} per-ticker failures recorded in output.errors`);
}

module.exports = { mergeLiveShards };
