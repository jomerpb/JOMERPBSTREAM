# JOMERPBSTREAM

Single static site (`index.html` shell) with three unrelated tabs sharing one page. No build step — plain JS/CSS served as-is (e.g. via GitHub Pages).

## Rule: run three simulations before giving a final answer or code

**Standing instruction from the repo owner — applies to every session and every
task. Do not skip it because a change "looks trivial"; the changes that shipped
broken this repo all looked trivial.**

Nothing is presented as finished — no "done", no "verified", no final code —
until it has been exercised **three independent ways**. One passing check is a
guess with extra steps. The three lanes catch different classes of failure, so
run all three, not the same one three times:

1. **Logic — headless engine run.** Load the real file in a Node `vm` sandbox
   with a stubbed DOM (the pattern in `snapshot_oracle.mjs` / a scratch harness)
   and assert on actual output values. Confirms the code computes what it claims
   in isolation. This lane cannot see markup, CSS, or how the page loads.
2. **Reality — the real page in a real browser.** Serve the repo
   (`python3 -m http.server`) and drive it with Playwright + the pre-installed
   Chromium (`executablePath: '/opt/pw-browsers/chromium-*/chrome-linux/chrome'`).
   Click and type as a user does, screenshot it, and **read the screenshot**.
   Assert zero `pageerror`/console errors and no horizontal overflow at 320px.
   This is the lane that catches dead controls, unstyled markup, empty
   dropdowns, and stale-asset problems — the ones a unit test will never see.
3. **Regression — everything else still works.** Run
   `node .github/scripts/tests/test_oracle_layers.mjs`, and for any change under
   the Oracle engine re-run `snapshot_oracle.mjs` with `FORCE_OVERWRITE=1`
   against a *copy* of the repo, diffing its picks against the committed
   `oracle-history.json`. Identical output proves the daily pipeline is
   unaffected. Never point this lane at the real `oracle-history.json`.

Then, before claiming it is live: **verify the deployed state, not the intent.**
Confirm the commits are actually on `main` (`git fetch` first — a merged PR only
carries the commits that existed when it was merged) and, when it matters,
`curl` the published page and check the asset versions it really serves.

Report what each lane did and what it returned. If a lane genuinely cannot run,
say which one and why — do not quietly drop it to two.

## Rule: always close with an explicit status

**Standing instruction from the repo owner.** Every reply that finishes a piece
of work ends by saying, in plain words, which of exactly two states it is in.
Never leave it implicit, and never let a wall of verification results stand in
for the answer.

- **DONE** — merged and confirmed live. Only say this after checking the
  *deployed* page (`curl` the site, read the asset version, grep the served file
  for the new code). Pushing is not done. Opening a PR is not done. A green test
  run is not done.
- **NEEDS A PR / NEEDS YOUR MERGE** — the work is finished, verified and pushed,
  but it is now waiting on a decision only the repo owner can make. Say so
  outright and name the PR number, e.g. "Needs your merge: PR #20."

Anything else — a question, a blocked step, a choice to make — is stated the
same way: name what is needed and from whom.

The reason this rule exists: work was repeatedly reported as complete when it
was only pushed, and the owner went looking at a live site that had not changed.
When in doubt, check the deployment and say which of the two states it is in.

## File split

- **stream.js** — Anime/TV/Movie streaming tab. TMDB + AniList API client-side. IDs (movie/show/episode) always resolved live from those APIs, never hardcoded.
- **oracle.js** — PCSO lottery "prediction" tab. Numerology/astrology/BaZi/feng-shui/I-Ching/tarot/stats layers converge into number picks (`convergence()`). `GAMES` object at top has hardcoded historical draws as a **fallback only** — overwritten at load by a live fetch of `pcso-history.json` (see `loadPcsoHistoryIntoGames`). `computeOracleAsOf(gameKey, dateStr)` recomputes any date's pick — past or future — from only the draws dated strictly before it; used by `snapshot_oracle.mjs` and by both Oracle date pickers. Its return shape (bare picks array; `{'2PM':[],'5PM':[],'9PM':[]}` for EZ2) is what the snapshot script logs, so don't change it.

The Oracle tab has **two** date pickers, deliberately distinct, and the split is the point — don't merge them or duplicate one into the other:

- **"Look Up Past Result"** is anchored on a *draw*: capped at today, renders nothing unless `PCSO_HISTORY` has that date, one game at a time, and it's the only place that shows actual winning numbers, gold match highlighting and match counts, and the only place that prints a *confirmed* jackpot. Each game is stacked like the pick panel: head line (`.opick-head` — name, source tag, then the confirmed jackpot inline), winning numbers, Oracle's pick, then one caption underneath carrying the label **and** the score (`Oracle's Pick · 1 of 6 matched`). The name used to be a left column beside the numbers, which is why the row needed a fixed-width lead, a min-height tuned to one chip and an empty slot spacer for EZ2 — all three are gone, and the chips take the full card width.
- **"Oracle Pick For Any Date"** (`oraclePickRender`) is anchored on the *date*: no game selector at all — it lists **every** game scheduled that weekday (`oracleGamesOnDate`, 6-ball ascending then EZ2 last) with just its picked numbers, for any date out to +2 years. Each game block is **stacked**, not inline: one head line (`.opick-head` — name, source tag, caret and the jackpot clause, all on the game's own line), then the spheres — both inside the `<summary>`, so the whole block is still the toggle that opens the reading. Stacking is what makes room for the clause and hands the spheres the width the inline lead used to hold; the EZ2 `.oracle-pick-slot` spacer went with it, since there is no centre line to align to above the spheres.

  The jackpot line (`oraclePickJackpotHTML`) carries the amount over from the previous play: that jackpot if the draw had no winner, otherwise the game's reset amount, which `pcsoHistResetJackpot` reads out of the history (the jackpot of the first draw after the most recent won one) rather than hardcoding it — PCSO has raised these over time (6/58 went 49.5M → 75M), so the historical minimum is the wrong number. Shown **only** for a 6-ball draw dated today..+`ORACLE_PICK_JACKPOT_DAYS` (7) that has no result on file yet: never on a past date, never further out (every draw in between moves the figure), never for a draw already on file, and never for EZ2 — its prize is fixed, not a rollover. The wording states the fact it is derived from ("No winner on Aug 14, so ₱15.0M rolls over.") rather than asserting a jackpot for a draw that hasn't happened; the confirmed figure shows up in Look Up Result once `pcso-history.json` has the draw. Both panels put the amount itself in `.opick-amt` (the confirmed jackpot's green bold) inside a muted `.opick-jackpot` clause — one helper, so estimate and confirmed cannot drift apart.

  **Sphere alignment is load-bearing.** Spheres cap at `--ball-max` (56px), so a 6-ball row stops short of its container and centres, while EZ2's three columns split the full width — left alone, EZ2's outer spheres sit ~12px wider per side. Both number groups are therefore capped at `6 × --ball-max + 5 × --ball-gap` and centred, and **every** gap inside a game row comes off `--ball-gap`. Change one without the other and EZ2 stops lining up column-for-column. Look Up Result is deliberately *not* capped: its `.pnum` chips have no max-width, so its rows already agree.

  **Sphere colour is `game × position`, not position alone** (`.osph-0`..`.osph-35`, generated by `.github/scripts/gen_sphere_palette.py`). 6 games × 6 positions = 36 distinct colours, so a colour cannot repeat within a line, within a game, or on a day — the densest day (Tuesday) shows 4 games / 24 spheres. Keyed on the game itself rather than its slot in that day's list, so a game keeps its own six on every date. Within a row the hues sit a full 60° apart (red/yellow/green/cyan/blue/magenta) so neighbours are different *colours*, not shades; each game rotates that wheel 10° — which is exactly what keeps all 36 distinct, since 0,10,20,30,40,50 are distinct mod 60 — and carries its own lightness/saturation. Text colour per sphere is picked by measured WCAG contrast, weakest 4.7:1. The shared `b1`..`b6` tiers are untouched: Run Expert still uses them, and `oraclePickBalls` falls back to them when no game is passed. EZ2 renders three two-sphere columns through three calls, so it passes an `offset` (0/2/4) — without it every column restarted at position 0 and EZ2 showed only two colours, alternating.

Both prefer the immutable `oracle-history.json` entry over a live recompute, tagged 📌 recorded vs ↻ recomputed.

A third panel, **"Analyze My Own Personal Numbers"** (`<details id="personal-card">`), is collapsed by default and contains everything the personal analysis needs: the game selector (`#gameGrid`), `#ez2wrap`, the six inputs (`#personal-wrap`), the ANALYZE MY NUMBERS button, and the `#loader`/`#results` it renders into. Those elements are no longer page-level — code that reaches for `#gameGrid` or `#results` is reaching inside that card.

**One scorer, two surfaces.** The alignment percentage is `oracleAlignment(nums, digitScores, meaning, poolMax)` — digit convergence ×0.70 blended with meaning capture ×0.30 — and both the Oracle Pick panel and Analyze My Numbers call it. It exists because they drifted: the pick panel blended both halves while the personal view reported the digit half alone, so identical numbers read 54% in one place and 67% in the other. Never re-inline either half; and per the statistics rule above, never tune the two weights for hit rate.

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

## Rule: the pick is HISTORY-FREE

**Standing instruction from the repo owner.** The Oracle's pick is computed from
the date alone. `layerStats` still runs and its frequency/hot/overdue figures are
still *displayed* on the Run Expert page as reference information, but nothing it
produces reaches `convergence()` any more. Concretely:

- `LABELS` is 11 sources, not 12 — `'St'` is gone from the convergence cluster.
- Digit-family score is the metaphysical cluster alone, normalised to the day's
  own leader (`inL.length / maxMeta * 10`).
- **Within-family selection** — the job stats used to do — is now a rotation
  driven by the reading: `offset(d) = ((star + d) * pool + hex + dnum) mod k`,
  where `star` is the Flying Star in digit *d*'s own Lo Shu palace, `pool` is the
  game's max, `hex` the Mei Hua hexagram number, `dnum` the unreduced date
  number. `metaNumBonus` (+10) still overrides it for full-number matches.

Why it matters: a pick for a future date no longer moves as new draws land.
Verified — 50 recomputes with draws injected produce 0 changes, and picks are
identical with the entire draw history deleted.

Two consequences to keep in mind:

- **`oracle-history.json` spans two engines.** Entries logged before this change
  were produced by the stats engine; they are immutable and stay as they are. A
  past date shows 📌 recorded (old engine) while a live recompute of the same
  date now returns something different. That is expected, not a bug.
- The composition `(star + d) * pool` was selected over four simpler ones by
  measuring 120 dates for *presentation* only — it is the only one that never
  makes two same-day games produce identical picks. Never tune it for hit rate.

The `offset` formula is a **house rule**, documented as such in the code: the
ingredients are authentic and dated, but no tradition prescribes combining them
this way.

## Oracle scoring internals (rebuilt — see git history for the audit)

**(Historical — this describes `layerStats` itself, which still computes these figures for display but no longer feeds the pick; see the history-free rule above.)** `layerStats` no longer uses the original `freq30*4 + hot*6 + overdue*5` summed per
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

## Astro engine: epoch, and the lunar calendar

**The ephemeris epoch was off by one day.** Every constant in the astro engine is
quoted from Paul Schlyter, whose day number `d` is referred to **2000 Jan 0.0
(JD 2451543.5)** — not to J2000.0 (JD 2451545.0), which is 1.5 days later.
`astroDayNumber` subtracted 2451545 while its own comment called the result
"Schlyter's `d`", so the whole ephemeris ran exactly **1.000 day behind**. Cost in
mean motion: **Moon ~13.2°** (nearly half a zodiac sign), Mercury ~4.1°, Venus
~1.6°, Sun ~1.0°, Mars ~0.5°. Confirmed three ways — Schlyter's own published
day-number formula (off by −1.000 at every date tested), 13 consecutive new moons
against Meeus (all 1.00 day late), and the March 2026 equinox (engine said
2026-03-21 14:33 UT; true value 2026-03-20 14:46 UT). Fixed to `jdn-2451544`;
the equinox now lands 13 min off, inside Schlyter's stated accuracy. Covered by
test 7 in `test_oracle_layers.mjs`, which pins it to Schlyter's formula directly
so it cannot drift back.

**`layerIChing` casts on the real lunar date.** Mei Hua Yi Shu's 年月日時起卦法
takes the *lunar* month and day; the layer used to feed it the Gregorian ones and
disclosed that as a simplification. `chineseLunarDate()` now does the conversion
from the engine's own Sun/Moon longitudes — new-moon search for month starts, the
winter-solstice month as month 11, and the leap month as the first month of the
sui with no zhongqi, numbered after the month it follows. Over 2026 the lunar day
and the Gregorian day agree on **0 of 365 dates**, so this was never cosmetic.

Known limit, asserted in test 8 rather than papered over: Schlyter's Moon is
~1-2 arcmin, i.e. new-moon timing good to **±26 min** (mean error +0.6 min, over
730 lunations 1990-2050 against Meeus). When a new moon falls within ~15 min of
local midnight the month start can land on the wrong civil day — **2 of 730
lunations, 0.3%**. 2030-02-03 00:08 CST is one of them, so the engine puts
Chinese New Year 2030 one day early. That is the ephemeris's resolution, not a
logic error; don't special-case it.

The year branch stays on the **Lichun-based solar year** that `layerBazi`/
`layerFengshui` use — one of the two live conventions, and it keeps the three
layers agreeing with each other. Leap-month numbering (take the preceding
month's number) is likewise one school of several; both are house choices,
documented as such in the code.

Together these moved **94.3% of picks** over a 120-date × 5-game sweep (64.4% of
individual numbers), which widens the 📌 recorded vs ↻ recomputed gap on past
dates. That is expected, for the same reason the history-free change was.

**`fairDraws` in `test_oracle_layers.mjs` is seeded.** It used `Math.random`, and
the fair-data family-bias check is a tolerance test: measured on unmodified main
the gap wandered from −4.87 to +4.39 against a limit of 6, so CI went red at
random with nothing wrong. It now uses a fixed-seed mulberry32.

## Rule: never hardcode ticker symbols / IDs

For PSE, ticker symbols and PSE's internal `cmpy_id`/`security_id` are **always resolved live** by paging PSE's company directory (`resolveAllIds()` in `pse-scraper-full/scrape_pse_full.js`, reused verbatim in `scrape_pse_live.js`) — never maintained as a static list in scraper code. Same principle for stream.js: TMDB/AniList IDs are always looked up via their search/detail APIs, never hardcoded per title.

Frontend-only fallback/mock arrays (`GAMES` in oracle.js, `PSE_ALL_STOCKS` in trade.js) are a separate, intentional exception — display seed data for when the live JSON fetch fails, not part of the scraping pipeline. Don't treat those as violations of this rule, and don't "fix" them by wiring them into the scrapers.
