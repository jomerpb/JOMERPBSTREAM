# JOMERPBSTREAM

Single static site (`index.html` shell) with three unrelated tabs sharing one page. No build step — plain JS/CSS served as-is (e.g. via GitHub Pages).

## File split

- **stream.js** — Anime/TV/Movie streaming tab. TMDB + AniList API client-side. IDs (movie/show/episode) always resolved live from those APIs, never hardcoded.
- **oracle.js** — PCSO lottery "prediction" tab. Numerology/astrology/BaZi/feng-shui/I-Ching/tarot/stats layers converge into number picks (`convergence()`). `GAMES` object at top has hardcoded historical draws as a **fallback only** — overwritten at load by a live fetch of `pcso-history.json` (see `loadPcsoHistoryIntoGames`). `computeOracleAsOf(gameKey, dateStr)` recomputes any date's pick — past or future — from only the draws dated strictly before it; used by `snapshot_oracle.mjs` and by both Oracle date pickers. Its return shape (bare picks array; `{'2PM':[],'5PM':[],'9PM':[]}` for EZ2) is what the snapshot script logs, so don't change it.

The Oracle tab has **two** date pickers, deliberately distinct, and the split is the point — don't merge them or duplicate one into the other:

- **"Look Up Past Result"** is anchored on a *draw*: capped at today, renders nothing unless `PCSO_HISTORY` has that date, one game at a time, and it's the only place that shows actual winning numbers, gold match highlighting and match counts.
- **"Oracle Pick For Any Date"** (`oraclePickRender`) is anchored on the *date*: no game selector at all — it lists **every** game scheduled that weekday (`oracleGamesOnDate`, 6-ball ascending then EZ2 last) with just its picked numbers, for any date out to +2 years.

Both prefer the immutable `oracle-history.json` entry over a live recompute, tagged 📌 recorded vs ↻ recomputed.

**`index.html` cache-busts its assets by query string** (`oracle.js?v=…`, `styles.css?v=…`). Bump the version whenever you change those files — `index.html` itself is unversioned, so shipping new markup against a stale cached script silently produces dead controls.
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

## Rule: the Oracle tab is STATISTICS, not prediction

**Standing instruction from the repo owner — do not re-litigate this in future sessions.**

The Oracle tab is a statistics exercise. Its calculations exist to be **run against
historical draws and checked for matching winning numbers** — measuring how a given
configuration scored against draws that already happened. It is **not** a prediction
tool and is not to be presented, tuned, or defended as one.

What this means in practice:

- **Judge the layers on correctness, not on hit rate.** A formula is "good" when it
  faithfully implements what it claims (real Mei Hua Yi Shu casting, the true King Wen
  hexagram table, the classical Flying Star month rule, a coherent statistical score) —
  not when it produces more matches. Fix bugs because they are bugs.
- **Match counts are a function of search effort, not engine quality.** Measured this
  repo, walk-forward, on its own `pcso-history.json`: every configuration lands at the
  chance baseline of **~0.73 average matches per 6-ball draw**. An exhaustive sweep of
  all 256 layer subsets (~212,000 graded picks) produced **zero 6/6**. A later sweep of
  ~22,000 scoring configurations produced 629 5/6 results and still zero 6/6 — and a
  split-sample test settled it: the best configuration found on the oldest 414 draws
  scored **0.860 in training and 0.728 on 415 unseen draws**, i.e. it collapsed to
  chance. Any "winning" configuration found by searching is overfitting, by
  construction.
- **Never present a dredged hit as validation.** When asked to hunt for 5/6 or 6/6,
  it is fine to run the search and report what turns up, but report the distinct-result
  count alongside the raw count — e.g. one run hit a target of 100 5/6 results that
  turned out to be **only 2 distinct picks**, repeated across configs that produce
  identical output.
- Lottery draws are independent random events. No layer here — metaphysical or
  statistical ("hot", "overdue", frequency) — carries information about the next draw.
  Say so plainly if the question comes up; don't hedge and don't oversell.

## Oracle scoring internals (rebuilt — see git history for the audit)

`layerStats` no longer uses the original `freq30*4 + hot*6 + overdue*5` summed per
digit family. That formula had three defects: `hotNums` and `freq30` were the *same*
30-draw computation scored twice; weights were summed over unequal digital-root
families (digits 1-4 carried a structural +17%..+25% edge); and "hot" and "overdue"
are contradictory rules that were both paid. It now uses one exponentially-decayed
recency signal (half-life 15 draws) plus a gap signal, both standardised as z-scores
against a fair draw, blended at an explicit 0.65/0.35, and **averaged** per family so
size cancels. `convergence()`'s `bestNums()` consumes the resulting `numScore`
(scaled 0..38 to preserve the metaphysical `+10` bonuses' relative weight) instead of
re-applying `freq30*4 + hot*6`.

`layerNumerology`'s Chaldean half previously scored three fixed words and therefore
emitted `[3,7]` on **every** date (verified constant across 4,032 date/hour
combinations) — a dead input that `convergence()` counted as an independent source
forever. It now also includes the Chaldean values of the weekday and month names, so
it varies with the date being read.

## Rule: never hardcode ticker symbols / IDs

For PSE, ticker symbols and PSE's internal `cmpy_id`/`security_id` are **always resolved live** by paging PSE's company directory (`resolveAllIds()` in `pse-scraper-full/scrape_pse_full.js`, reused verbatim in `scrape_pse_live.js`) — never maintained as a static list in scraper code. Same principle for stream.js: TMDB/AniList IDs are always looked up via their search/detail APIs, never hardcoded per title.

Frontend-only fallback/mock arrays (`GAMES` in oracle.js, `PSE_ALL_STOCKS` in trade.js) are a separate, intentional exception — display seed data for when the live JSON fetch fails, not part of the scraping pipeline. Don't treat those as violations of this rule, and don't "fix" them by wiring them into the scrapers.
