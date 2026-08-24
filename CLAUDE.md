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
3. **Regression — everything else still works.** Run the whole suite (about
   50 seconds, and what `.github/workflows/tests.yml` runs on every push):

   ```
   node   .github/scripts/tests/test_oracle_layers.mjs      # layers do what they claim
   node   .github/scripts/tests/test_oracle_pick.mjs        # pick shape, scorer, schedule, palette, jackpot
   node   .github/scripts/tests/test_snapshot_oracle.mjs    # the daily oracle-history.json writer
   python3 .github/scripts/tests/test_sphere_palette.py     # styles.css still matches its generator
   python3 .github/scripts/tests/test_scrape_pcso.py
   python3 .github/scripts/tests/test_append_pcso_history.py
   ```

   The Python ones need `beautifulsoup4` installed or they cannot even import.
   For any change under the Oracle engine also re-run `snapshot_oracle.mjs` with
   `FORCE_OVERWRITE=1` against a *copy* of the repo, diffing its picks against
   the committed `oracle-history.json`. Identical output proves the daily
   pipeline is unaffected. Never point this lane at the real
   `oracle-history.json` — `test_snapshot_oracle.mjs` does this on a temp copy
   and asserts the real file is untouched.

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
- **oracle.js** — PCSO lottery "prediction" tab. Numerology/astrology/BaZi/feng-shui/I-Ching/tarot/Monte-Carlo layers converge into number picks (`convergence()`); the stats layer is display-only. `GAMES` object at top has hardcoded historical draws as a **fallback only** — overwritten at load by a live fetch of `pcso-history.json` (see `loadPcsoHistoryIntoGames`). `computeOracleAsOf(gameKey, dateStr)` recomputes any date's pick — past or future — from only the draws dated strictly before it; used by `snapshot_oracle.mjs` and by both Oracle date pickers. Its return shape (bare picks array; `{'2PM':[],'5PM':[],'9PM':[]}` for EZ2) is what the snapshot script logs, so don't change it.

The Oracle tab has **two** date pickers, deliberately distinct, and the split is the point — don't merge them or duplicate one into the other:

- **"Look Up Past Result"** is anchored on a *draw*: capped at today, renders nothing unless `PCSO_HISTORY` has that date, one game at a time, and it's the only place that shows actual winning numbers, gold match highlighting and match counts, and the only place that prints a *confirmed* jackpot. Each game is stacked like the pick panel: head line (`.opick-head` — name, source tag, then the confirmed jackpot inline), winning numbers, Oracle's pick, then one caption underneath carrying the label, the score **and**, once the pick actually paid, what PCSO owes for it (`Oracle's Pick · 3 of 6 matched · Balik Taya ₱30`). That last clause comes from `PCSO_PRIZE_TIERS` / `pcsoHistPrizeHTML`, and the whole scoring half turns glowing green (`.pcso-hist-score.win`, `.pcso-hist-prize`) instead of gold at 3+. The name used to be a left column beside the numbers, which is why the row needed a fixed-width lead, a min-height tuned to one chip and an empty slot spacer for EZ2 — all three are gone, and the chips take the full card width.

  The tier figures are PCSO's own published matrix, one per game, read off each game's page on `pcso.gov.ph` — **not** a single table shared across games: the 3-match fixed prize alone runs ₱20 / ₱30 / ₱50 / ₱60 / ₱100 from 6/42 up to 6/58. Two of the tiers are **pools, not per-ticket amounts**: PCSO pays the 5-match and 4-match categories as a fixed sum "to be shared equally per standard bet", so a draw with 698 four-match winners pays each of them a few hundred pesos. `pcso-history.json` carries a winner count for the *jackpot* only, so the per-ticket figure for those two is unknowable here — hence "You won a share of ₱1.3M" rather than a number the data cannot support. Don't "fix" that wording into a flat payout. The 6-match line uses the draw's **confirmed** jackpot from the entry, falling back to the game's published minimum only when the entry has no figure. EZ2 is excluded on purpose — this panel scores it across all three of the day's draws at once, so no single draw exists for a tier to attach to, and its prize is fixed rather than tiered.
- **"Oracle Pick For Any Date"** (`oraclePickRender`) is anchored on the *date*: no game selector at all — it lists **every** game scheduled that weekday (`oracleGamesOnDate`, 6-ball ascending then EZ2 last) with just its picked numbers, for any date out to +2 years. Each game block is **stacked**, not inline: one head line (`.opick-head` — name, source tag, caret and the jackpot clause, all on the game's own line), then the spheres — both inside the `<summary>`, so the whole block is still the toggle that opens the reading. Stacking is what makes room for the clause and hands the spheres the width the inline lead used to hold; the EZ2 `.oracle-pick-slot` spacer went with it, since there is no centre line to align to above the spheres.

  The jackpot line (`oraclePickJackpotHTML`) carries the amount over from the previous play: that jackpot if the draw had no winner, otherwise the game's reset amount, which `pcsoHistResetJackpot` reads out of the history (the jackpot of the first draw after the most recent won one) rather than hardcoding it — PCSO has raised these over time (6/58 went 49.5M → 75M), so the historical minimum is the wrong number. Shown **only** for a 6-ball draw dated today..+`ORACLE_PICK_JACKPOT_DAYS` (7) that has no result on file yet: never on a past date, never further out (every draw in between moves the figure), never for a draw already on file, and never for EZ2 — its prize is fixed, not a rollover. The wording states the fact it is derived from ("No winner on Aug 14, so ₱15.0M rolls over.") rather than asserting a jackpot for a draw that hasn't happened; the confirmed figure shows up in Look Up Result once `pcso-history.json` has the draw. Both panels put the amount itself in `.opick-amt` (the confirmed jackpot's green bold) inside a muted `.opick-jackpot` clause — one helper, so estimate and confirmed cannot drift apart.

  **Sphere alignment is load-bearing.** Spheres cap at `--ball-max` (56px), so a 6-ball row stops short of its container and centres, while EZ2's three columns split the full width — left alone, EZ2's outer spheres sit ~12px wider per side. Both number groups are therefore capped at `6 × --ball-max + 5 × --ball-gap` and centred, and **every** gap inside a game row comes off `--ball-gap`. Change one without the other and EZ2 stops lining up column-for-column. Look Up Result is deliberately *not* capped: its `.pnum` chips have no max-width, so its rows already agree.

  **Sphere colour is `game × position`, not position alone** (`.osph-0`..`.osph-35`, generated by `.github/scripts/gen_sphere_palette.py`). 6 games × 6 positions = 36 distinct colours, so a colour cannot repeat within a line, within a game, or on a day — the densest day (Tuesday) shows 4 games / 24 spheres. Keyed on the game itself rather than its slot in that day's list, so a game keeps its own six on every date. Within a row the hues sit a full 60° apart (red/yellow/green/cyan/blue/magenta) so neighbours are different *colours*, not shades; each game rotates that wheel 10° — which is exactly what keeps all 36 distinct, since 0,10,20,30,40,50 are distinct mod 60 — and carries its own lightness/saturation. Text colour per sphere is picked by measured WCAG contrast, weakest 4.7:1. The shared `b1`..`b6` tiers are untouched: Run Expert still uses them, and `oraclePickBalls` falls back to them when no game is passed. EZ2 renders three two-sphere columns through three calls, so it passes an `offset` (0/2/4) — without it every column restarted at position 0 and EZ2 showed only two colours, alternating.

Both prefer the immutable `oracle-history.json` entry over a live recompute, tagged 📌 recorded vs ↻ recomputed.

A third panel, **"Analyze My Own Personal Numbers"** (`<details id="personal-card">`), is collapsed by default and contains everything the personal analysis needs: the game selector (`#gameGrid`), `#ez2wrap`, the six inputs (`#personal-wrap`), the ANALYZE MY NUMBERS button, and the `#loader`/`#results` it renders into. Those elements are no longer page-level — code that reaches for `#gameGrid` or `#results` is reaching inside that card.

**One scorer, two surfaces.** The alignment percentage is `oracleAlignment(nums, digitScores, meaning, poolMax)` — digit convergence ×0.70 blended with meaning capture ×0.30 — and both the Oracle Pick panel and Analyze My Numbers call it. It exists because they drifted: the pick panel blended both halves while the personal view reported the digit half alone, so identical numbers read 54% in one place and 67% in the other. Never re-inline either half; and per the statistics rule above, never tune the two weights for hit rate.

**The digit half is measured against what the POOL allows** (`oracleDigitIdeal`),
not against a flat `nums.length * 10`. This matters because digit families are
finite and unequal: digit 1's family holds 5 numbers in 6/42 but 7 in 6/58, so a
six-number set can sit entirely on the day's strongest digit in 6/58 and
physically cannot in 6/42. Scored against the flat maximum the digit half came
out **identical for every 6-ball game on a date — 730 of 730 dates measured** —
because the picker takes two numbers from each of the same top three families
whatever the pool, leaving both numerator and denominator pool-blind. Two games
on one day then printed the same overall percentage on ~70% of dates, which
reads as a bug and wasted the 70% weight. With the pool ceiling in place they
differ on ~75% of dates instead, and **the picks themselves are untouched —
verified identical on 2514/2514 game-dates.**

Note what the ceiling cannot be: normalising against the best total achievable
*under the picker's own spread cap* pins the figure to exactly 100% every time
(measured 428/428), because the pick IS the argmax of that score. The ceiling
has to ignore the cap — it asks "how close is this pick to the best expression
of today's digit reading this pool allows", and the spread rule is precisely
what costs it the remainder.

**`index.html` cache-busts its assets by query string** (`oracle.js?v=…`, `styles.css?v=…`). Bump the version whenever you change those files — `index.html` itself is unversioned, so shipping new markup against a stale cached script silently produces dead controls.
- **trade.js** — PSE stock trading/signals tab. `PSE_ALL_STOCKS` near the top is mock/display seed data only (same fallback pattern as oracle.js's `GAMES`); real data comes from `pse-*.json` files written by the scraper pipelines below.
- **styles.css** — shared styles for all three tabs (not split per-tab).

Each JS file is large and self-contained per tab; don't assume shared modules/imports between them.

## Data pipelines (GitHub Actions)

All workflows in `.github/workflows/` are `workflow_dispatch` (manual) only — repo-wide convention, cron was intentionally removed everywhere **except** these two, which run daily and must stay in this order:

1. `pcso-history-append.yml` (`0 15 * * *` UTC = 23:00 Asia/Manila, after that day's 9PM draws are posted) — appends the day's results to `pcso-history.json`.
2. `oracle-snapshot.yml` (`5 16 * * *` UTC = 00:05 Asia/Manila, before that day's draws) — computes and logs the next day's pick, with the previous day's draws already in place.

`tests.yml` is a third exception to the manual-only convention, in a different
direction: it has **no cron**, but it runs on every push and pull request. The
convention removed *scheduled* runs; a test suite that only runs when someone
remembers is the reason a broken engine could reach the two scheduled jobs
above unnoticed. Don't convert it to `workflow_dispatch` only.

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

- `'St'` is gone from the convergence cluster. (The list is 12 again, but
  because `'MC'` was **added** — see the Monte Carlo section below — not
  because `'St'` came back. Read the count from `ORACLE_LABELS.length`, never
  by typing a number.)
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

- **`oracle-history.json` spans multiple engines.** Entries logged before this
  change were produced by the stats engine; the element-map fix below moved the
  picks again. They are immutable and stay as they are — never regenerate them.
  A past date shows 📌 recorded (whichever engine wrote it) while a live
  recompute of the same date now returns something different. That is expected,
  not a bug. The entry for 2026-08-19 is the last one written by the pre-fix
  element map; everything from the next scheduled run on is the current engine.
- The composition `(star + d) * pool` was selected over four simpler ones by
  measuring 120 dates for *presentation* only — over that window it was the only
  one where no two same-day games produced identical picks. **That "never" does
  not hold on a wider window:** swept over 2024-2028 it collides on **20 of 1827
  multi-6-ball dates (1.09%)** — e.g. 2026-04-06 has 6/45 and 6/55 both on
  `[2,12,15,20,24,39]`. It is still the best of the five measured, and the rate
  is low enough to leave alone; `test_oracle_pick.mjs` bounds it at 3% rather
  than asserting a zero that was never true. Never tune it for hit rate.

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
size cancels. `numScore` is still exported on a 0..38 scale (the old within-family
ceiling, kept so the metaphysical `+10` bonuses were never silently re-tuned against
it) — but nothing in the engine consumes it any more, since the pick is history-free.

**Do not "clean up" `layerStats` by deleting the z-score math.** It looks dead and
is not, twice over: `topDigits` is displayed on Run Expert as "Top stat digits" and
sits at the end of the whole chain (recZ/gapZ → numScore → family means →
digitWeight → topDigits), and `recZ`/`gapZ`/`numScore`/`halfLife`/`wRecency`/
`wOverdue` are the interface test 2 in `test_oracle_layers.mjs` uses to recompute the
documented 0.65/0.35 blend and prove the original double-count has not returned.
Only four exports genuinely had no reader anywhere in the repo — `freq30` (whose own
comment still claimed it was "used for SCORING"), `lastSeen`, `overdueAt` and a
`nums` alias for `topDigits` — and those are gone.

`layerNumerology`'s Chaldean half previously scored three fixed words and therefore
emitted `[3,7]` on **every** date (verified constant across 4,032 date/hour
combinations) — a dead input that `convergence()` counted as an independent source
forever. It now also includes the Chaldean values of the weekday and month names, so
it varies with the date being read.

## Two fixes worth not re-breaking

- **Flying Star annual number wrapped only one way.** `9-((fsYear-2024)%9)` was
  guarded by `if(annualStar<=0)annualStar+=9`, but JavaScript's `%` keeps the
  sign of the dividend, so years *before* the 2024 anchor overshot the top of
  the range and the guard never fired: 2023 → 10, 2022 → 11, 2020 → 13. The
  Oracle Pick picker's min is `2020-01-01`, so this rendered on the live page as
  "Annual Flying Star 2022 = #11", and because `convergence()` only scans digits
  1..9 the annual star silently dropped out of every reading before Lichun 2024.
  Now `(((8-(fsYear-2024))%9)+9)%9+1`. The period is derived too (20-year blocks
  from 1864) instead of hardcoded to "Period 9 (2024-2043)", and the step labels
  quote the **solar** year and solar month the values actually come from rather
  than the Gregorian ones. The old line's unsourced "active: 2,7,9" claim was
  dropped rather than propagated into other periods. Test 10 bounds every
  annual/monthly/palace star to 1..9 across 2018-2045.
- **`computeOracleAsOf` restored the date globals outside `try/finally`.** Each
  layer call inside `runOne` is guarded, but the code around it is not — an
  unknown game key or a missing `PCSO_HISTORY` bucket after a failed fetch threw
  before the restore line, leaving `_D/_M/_Y/_DOW` pinned to the looked-up date
  for the rest of the page session, so every later render silently computed for
  the wrong day. `oracleDateReading` always did this correctly; the two now
  match, as `computeOracleAsOf`'s own comment already claimed. Test 5 covers the
  happy path, test 12 the throwing one.

`reduce()` is also now the closed-form digital root (`n%9`, 0→9) instead of a
String-split/parseInt walk — 931ms → 26ms over 2M calls, which is the sweeps and
the snapshot job, not the browser. Keep the `Number.isInteger` guard: the old
version fell through to `9` for NaN/undefined/floats and callers rely on getting
a digit back, not a NaN that poisons every comparison downstream. Test 11 pins
it to the old implementation on every integer in -50..20000.

## Rule: one element→number scheme per table

**There are two legitimate schemes and they are not interchangeable.**

- **He Tu 生成數** — the numbers attached to the Five Elements themselves:
  Water 1/6, Fire 2/7, Wood 3/8, Metal **4/9**, Earth 5(/10). Used by
  `layerBazi` (stem and branch element numbers) and `layerIChing` (trigram
  element numbers). Element→digit is a bijection over 1..9 under this scheme.
- **Lo Shu palace numbers** — the nine-square: Water 1, Earth 2/5/8, Wood 3/4,
  Metal **6/7**, Fire 9. Used by `layerFengshui` (it *is* the grid) and by
  `calcEnergy`/`energyDigits`, which read elements back out of that grid.

Both tables in the first group used to **mix the two**: Water/Fire/Wood were He
Tu, but Metal was written `[6,7]` and Chou/Wei Earth `[2,5]` — Lo Shu values.
No scheme puts 4 or 9 anywhere in that mixture, so `layerBazi` and `layerIChing`
were each **structurally incapable of emitting digit 4 or digit 9** — measured
0% of 1096 dates, both layers, both digits — while 6 and 7 were paid by two
elements at once.

That was not cosmetic. It starved two of nine digit families all the way to the
pick: digit 4 took **1.7%** of all picks against a uniform 11.1%, digit 9
**5.5%**, and **31 was never once picked in 6/49 across three years of dates**
(measured over 2,348 six-ball game-dates). Unifying both tables on He Tu moved
**46.6% of picks**, brought digit 4 to 6.2% and digit 9 to 13.4%, cut the
family-imbalance χ² from 4372 to 2793, and left **no unreachable number in any
pool**. Test 9 in `test_oracle_layers.mjs` pins both layers to full 1..9
coverage and asserts every number in every pool is reachable, so a future edit
cannot quietly re-mix them.

The remaining imbalance is a different, known thing — see the note on constant
sources below. Do not "fix" it by re-tuning weights for hit rate.

## Known: five digits carry a permanent vote

Measured over 1461 dates, for the 9PM draw that every 6-ball game uses, three
sources emit the same digit on **every single date**: `Py` always emits **9**
(the draw hour), `Ch` always emits **3 and 7** (the fixed words PCSO and LOTTO),
and `Ba` always emits **1 and 6** (the 9PM hour branch is always Hai → Water).
Every other layer's always-set is empty.

This is a *consequence of the layers being correct*, not a defect: the hour
really is 9, the reading really is about PCSO, and the 9PM hour pillar really is
Hai. (The Monte Carlo layer's always-set is empty too — verified over 1,461
dates — as a fair simulation's would be.) It is recorded here because it
explains the residual shape of the pick
distribution (families 1/3/6/7 lead, 8 trails) and so that nobody "discovers" it
again and treats it as a bug. Changing it means changing what a layer claims to
read, which is a design decision, not a fix.

Related, and also known: the metaphysical sources are **slots, not independent
generators**. `As`, `PoF` and `Ho` all come from one ephemeris call, and `En` is
computed *from* `Ba`/`As`/`Fs` — its digits coincide with Astrology 70%, BaZi
53%, Feng Shui 36%. `convergence()` already normalises against the day's own
leader rather than treating every hit as an independent confirmation, which is
the main mitigation. Do not "fix" this by weighting `En` **up**; if it is ever
regrouped, the derived source should count for less than its parents, not the
same.

## The Monte Carlo layer is a CONTROL ARM, not a twelfth opinion

`layerMonteCarlo(drawHour, gameKey)` is the twelfth convergence source (`'MC'`,
always last in `ORACLE_LABELS`). It simulates `MONTE_CARLO_TRIALS` (2,000)
complete draws of that game from a **fair** pool — every number 1..max equally
likely, `k` per trial, drawn without replacement, exactly the draw PCSO runs —
and emits the two digit families that came out furthest above their own
expectation.

**Its output is sampling noise by construction, and that is the entire point.**
The Oracle tab is a statistics exercise (see the rule above). This layer is its
control: a source known to carry zero information, scored by `convergence()` on
exactly the same footing as the eleven metaphysical ones, so the comparison the
tab exists to make can actually be made. It is not a prediction aid and the card
on the page says so in its own text. Never re-present it as one, and never tune
it.

Four things about it are load-bearing:

- **The pool is FLAT, not weighted by the day's reading.** The obvious version
  of this layer samples numbers weighted by the day's digit scores. That version
  is circular: it re-samples the other layers' votes and hands back the leader
  they already named, dressed as an independent opinion, raising that family's
  score without adding one bit of new input. Don't "improve" it that way.
- **It is history-free and deterministic**, like the rest of the pick. Never
  `Math.random`: the seed is an avalanche hash of (date, draw hour, pool,
  picks-per-draw) — all dated or structural, no draw result anywhere — so a date
  simulates the same draws on every page load, in the browser and in
  `snapshot_oracle.mjs`, forever. Including the pool in the seed means two games
  on one day simulate their *own* draw rather than sharing one.
- **Families are standardised, never counted raw.** Digit families are unequal
  and pool-dependent (digit 1 holds 5 numbers in 6/42 and 7 in 6/58), so ranking
  by raw count would just rank by family size — a structural artefact wearing a
  reading's clothes. Each family's per-trial count is
  Hypergeometric(pool, familySize, k), so the layer publishes the exact z-score
  and a p-value from it. Measured over a year of dates x 9 families x 6 games,
  the z's come out mean 0.000, sd 0.99-1.01, 4.7-5.2% beyond 1.96σ — i.e. the
  published figure is the true one. Test 13 pins all of it.
- **The simulation loop is hand-inlined against locals on purpose.** The
  readable version (a mulberry32 closure, `Array.indexOf` dedupe, `digitOf()`
  per number) measured **11.0 ms per call** inside a Node `vm` context against
  **0.88 ms** for the inlined one, on byte-identical output — every global reach
  in that sandbox goes through the context's global proxy, and this loop runs
  `trials * k` times per pick. Test 13 reproduces the stream from an independent
  mulberry32 and demands the same counts, so the inlining cannot drift.

**More trials do not sharpen it.** The z-score's denominator grows as √N, so
raising the trial count shrinks the excess toward zero while the ranking of the
nine families stays exactly as arbitrary. There is no N at which this converges
on an answer; it converges on "no family is special", which is the true answer.
`MONTE_CARLO_TRIALS` is set for a stable sample the snapshot job and the test
sweeps can afford — never tuned for output.

### What adding it actually did (measured, both engines, same harness)

- **Picks moved on 36.4% of game-dates** (2,395 of 6,576 over 2024-2026, all six
  games; 11.3% of individual numbers). Per game: 6/42 32.8%, 6/45 32.2%,
  6/49 28.8%, 6/55 34.0%, 6/58 30.6%, EZ2 60.0%.
- **Hit rate did not move off chance, which is the finding.** Walk-forward over
  every draw on file (934 six-ball draws): mean matches **0.7248 → 0.7281**, a
  change of +0.0032 against a standard error of 0.0346 — **0.09σ**, i.e. nothing.
  The chance baseline for these five pools is 0.734. EZ2: 0.1219 → 0.1189
  against a chance baseline of 4/31 = 0.1290. Zero 6/6 before, zero after; the
  3-match count went 14 → 13.
- **No new unreachable numbers** in any pool, and the digit-family share of
  picks is essentially unchanged (largest family 23.3% → 22.9%, smallest
  4.0% → 4.2%). The known family imbalance is the constant-source effect
  documented above; a noise source neither causes nor cures it.
- **Same-day collisions dropped**, a presentation win: two 6-ball games printing
  identical picks fell from **1.42% to 0.60%** of multi-6-ball dates over
  2024-2028 (test 8's bound is 3%). Per-game seeding is why.

Read that list in the right order: a source with **provably no information**
moved a third of the picks and left the hit rate exactly where it was. That is
the tab's own thesis, now measurable on the page rather than only asserted in
this file.

**`oracle-history.json` now spans one more engine.** Entries logged before this
change came from the 11-source engine; they are immutable and stay as they are —
never regenerate them. A past date will show 📌 recorded (whatever engine wrote
it) while a live recompute returns something different. Expected, for the same
reason the history-free and element-map changes were.

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
