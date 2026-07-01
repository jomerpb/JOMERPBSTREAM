// Combines N shard output files (pse-full-shard-0.json .. pse-full-shard-N.json)
// into a single pse-full-history.json. Run after all shard jobs complete.
//
// Usage: node merge_shards.js <shard-dir> <output-path> <shard-count>

const fs = require('fs');
const path = require('path');

function mergeShards(shardDir, shardCount) {
  const merged = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph/common/DisclosureCht.ax (full market, merged from shards)',
    tickers: {},
  };
  const shardSummaries = [];

  for (let i = 0; i < shardCount; i++) {
    const shardPath = path.join(shardDir, `pse-full-shard-${i}.json`);
    if (!fs.existsSync(shardPath)) {
      console.warn(`WARNING: shard file missing: ${shardPath} — skipping`);
      shardSummaries.push({ shard: i, status: 'missing', count: 0 });
      continue;
    }
    const shardData = JSON.parse(fs.readFileSync(shardPath, 'utf8'));
    const symbols = Object.keys(shardData.tickers || {});
    for (const sym of symbols) {
      merged.tickers[sym] = shardData.tickers[sym];
    }
    shardSummaries.push({ shard: i, status: 'ok', count: symbols.length });
  }

  return { merged, shardSummaries };
}

if (require.main === module) {
  const [shardDir, outputPath, shardCountArg] = process.argv.slice(2);
  if (!shardDir || !outputPath || !shardCountArg) {
    console.error('Usage: node merge_shards.js <shard-dir> <output-path> <shard-count>');
    process.exit(1);
  }
  const { merged, shardSummaries } = mergeShards(shardDir, parseInt(shardCountArg, 10));
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
  console.log('Shard summary:', JSON.stringify(shardSummaries, null, 2));
  console.log(`Merged ${Object.keys(merged.tickers).length} tickers total -> ${outputPath}`);
}

module.exports = { mergeShards };
