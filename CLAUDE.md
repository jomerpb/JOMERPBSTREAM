# JOMERPBSTREAM

Single static site (`index.html` shell) with three unrelated tabs sharing one page. No build step — plain JS/CSS served as-is (e.g. via GitHub Pages).

## File split

- **stream.js** — Anime/TV/Movie streaming tab. TMDB + AniList API client-side. IDs (movie/show/episode) always resolved live from those APIs, never hardcoded.
- **oracle.js** — PCSO lottery "prediction" tab. Numerology/astrology/BaZi/feng-shui/I-Ching/tarot/stats layers converge into number picks (`convergence()`). `GAMES` object at top has hardcoded historical draws as a **fallback only** — overwritten at load by a live fetch of `pcso-history.json` (see `loadPcsoHistoryIntoGames`). `computeOracleAsOf(gameKey, dateStr)` recomputes any past date's pick, used both by the Look Up UI and by `snapshot_oracle.mjs`.
- **trade.js** — PSE stock trading/signals tab. `PSE_ALL_STOCKS` near the top is mock/display seed data only (same fallback pattern as oracle.js's `GAMES`); real data comes from `pse-*.json` files written by the scraper pipelines below.
- **styles.css** — shared styles for all three tabs (not split per-tab).

Each JS file is large and self-contained per tab; don't assume shared modules/imports between them.

## Data pipelines (GitHub Actions)

All workflows in `.github/workflows/` are `workflow_dispatch` (manual) only — repo-wide convention, cron was intentionally removed everywhere **except** these two, which run daily and must stay in this order:

1. `pcso-history-append.yml` (`0 15 * * *` UTC = 23:00 Asia/Manila, after that day's 9PM draws are posted) — appends the day's results to `pcso-history.json`.
2. `oracle-snapshot.yml` (`5 16 * * *` UTC = 00:05 Asia/Manila, before that day's draws) — computes and logs the next day's pick, with the previous day's draws already in place.

The append job's schedule is a deliberate exception: `pcso-history.json` feeds the Oracle tab's "Look Up Past Result" panel, and while it was dispatch-only it routinely ran 2-4 days behind `pcso-results.json` (which powers the "Today's Results" widget), so the two panels disagreed about the same draw. Both jobs remain manually dispatchable; the append script is append-only and never overwrites verified entries, so a scheduled run overlapping a manual "Fetch Live" dispatch cannot corrupt the file.

**PSE** (`edge.pse.com.ph`):
- `pse-scraper.yml` → `pse-scraper/scrape_pse.js` → `pse-history.json`
- `pse-full-scraper.yml` → 4-way sharded matrix, `pse-scraper-full/scrape_pse_full.js` (per shard) → `merge_shards.js` → `pse-full-history.json`
- `pse-live-scraper.yml` → 4-way sharded matrix, `scrape_pse_live.js` (intraday quotes via `stockData.do`, not the settled EOD chart endpoint) → `merge_live_shards.js` → `pse-live-quotes.json`
- `pse-backtest.yml` → read-only, `backtest_pse_signals.py` reads `pse-history.json`/`pse-full-history.json` → writes `pse-backtest.json`. Never touches scraper output.
- Sharded scrapers each independently call `resolveAllIds()` (pages `companyDirectory/search.ax`) to get the full company list, then filter to their own slice — no cross-shard coordination needed.

**PCSO** (`businesslist.ph/lottery`):
- `pcso-scraper.yml` → `.github/scripts/scrape_pcso.py` → `pcso-results.json`
- `pcso-history-append.yml` → `.github/scripts/append_pcso_history.py` → appends to `pcso-history.json`, never overwrites existing entries
- `oracle-snapshot.yml` → `snapshot_oracle.mjs` loads `oracle.js` in a Node `vm` sandbox (same engine as the browser, not reimplemented), calls `computeOracleAsOf()` for every game as-of today (Manila), writes/prepends to `oracle-history.json`. Idempotent per day unless `FORCE_OVERWRITE=1`.

Crypto tab follows the same shape (`crypto-live-scraper.yml` → `crypto-scraper/scrape_crypto_live.py` → `crypto-history.json`/`crypto-live-quotes.json`; `crypto-backtest.yml` read-only) but coins are a fixed curated list of 8 (`COINS` in the scraper) — that one's an intentional exception, not a hardcoding bug.

## Rule: never hardcode ticker symbols / IDs

For PSE, ticker symbols and PSE's internal `cmpy_id`/`security_id` are **always resolved live** by paging PSE's company directory (`resolveAllIds()` in `pse-scraper-full/scrape_pse_full.js`, reused verbatim in `scrape_pse_live.js`) — never maintained as a static list in scraper code. Same principle for stream.js: TMDB/AniList IDs are always looked up via their search/detail APIs, never hardcoded per title.

Frontend-only fallback/mock arrays (`GAMES` in oracle.js, `PSE_ALL_STOCKS` in trade.js) are a separate, intentional exception — display seed data for when the live JSON fetch fails, not part of the scraping pipeline. Don't treat those as violations of this rule, and don't "fix" them by wiring them into the scrapers.
