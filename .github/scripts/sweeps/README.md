# Oracle configuration sweeps — how many 4-number hits can any combination reach?

The question this answers: **across every 6-ball game, which combination of the
Oracle's calculations lands the most 4-of-6 results against the draws that
actually happened?** It was asked directly, so it was searched directly — hard,
and then checked hard.

Read the answer together with the standing rule in `CLAUDE.md` ("the Oracle tab
is STATISTICS, not prediction"). Nothing here is a reason to change the engine,
and nothing here was used to change it. **The shipped engine is untouched.**

## The graded universe

Every real 6-ball draw in `pcso-history.json`: **926 draws** over 432 dates,
2025-05-13 to 2026-08-19.

| game | draws | chance mean matches | expected 4+ |
|------|------:|--------------------:|------------:|
| 6/42 | 184 | 0.857 | 0.34 |
| 6/45 | 185 | 0.800 | 0.26 |
| 6/49 | 185 | 0.735 | 0.18 |
| 6/55 | 189 | 0.655 | 0.12 |
| 6/58 | 183 | 0.621 | 0.09 |
| **all** | **926** | **0.733** | **0.99** |

A six-number pick against a six-number draw averages `36 / pool` matches. Over
all 926 draws, chance expects **about one** 4-or-better result in total.

The **shipped configuration** scores: matches `410 / 376 / 126 / 14 / 0 / 0 / 0`
for 0..6, mean **0.724**, and **zero** 4-or-better. That is one 4+ short of
chance, i.e. exactly chance.

## What was varied

Four dimensions, all inside `convergence()`'s selection stage:

| dimension | values |
|---|---|
| **source subset** | any of the 11 convergence sources `Py Ch As Ba Fs IC PoF Ta An Ho En` — 2047 non-empty subsets |
| **family cap** | 1, 2 (shipped), 3, 6 numbers per digit family |
| **within-family rotation** | 8 named rules, then a 72-point coefficient grid, then a free per-digit offset |
| **full-number bonus** | the `metaNumBonus` +10 on / off |
| **family order** | strongest digit families first (shipped) or weakest first |

## What the search found

| stage | configurations | graded picks | best 4+ | 5/6 | 6/6 |
|---|---:|---:|---:|---:|---:|
| 1 — named rotations | 131,008 | 121M | **8** | 2,744 events | 0 |
| 2 — rotation grid + reversed order | 2,358,144 | 2.18B | **8** | 42,680 events | 6,498 events |
| 3 — basin-hopping, free rotation | 5.5M evaluations | — | **12** | not tracked | not tracked |

The ceiling, fitting all 926 draws:

```
sources=[Ch,As,Ba,Fs,IC,Ta,An,Ho]  cap=3  order=asc  rot=[2,1,1,5,1,2,6,2,2]
12 four-matches   mean 0.771   (chance 0.733)
```

Per game it lands 3 on 6/42, 2 on 6/45, 5 on 6/49, 2 on 6/55 and **0 on 6/58** —
the shape of noise, not of a method: the biggest pool contributes nothing, and
5 of the 12 sit in one game.

## The 6/6s, and why they are not a result

Stage 2 records **6,498 configurations that hit a 6/6**. Counted as distinct
results, that is **two**, both verified against `pcso-history.json`:

```
6,480 configurations  ->  6/49, 2026-05-19 — drawn 04-05-14-35-44-49
   18 configurations  ->  6/58, 2026-01-30 — drawn 02-43-44-45-49-57
```

Those configurations are not one configuration in disguise — they span 7 of the
72 rotation rules, both caps 1 and 2, and both bonus settings — but every one of
them uses the reversed family order, and on those two dates they all collapse
onto the same pick. Their mean match rate across all 926 draws is **0.738**
against a chance 0.733, and the best 4+ count any of them reaches is 6. Two
lucky picks, counted 6,498 times.

This is the exact failure mode `CLAUDE.md` warns about, and it bites twice:
report the distinct count, and count it over the *whole* set. A first pass here
sampled 4,000 of the 6,498 and reported one distinct result; the second one is
in the 2,498 it did not look at.

## Does any of it survive?

**Walk-forward holdout** — split at 2026-01-03, 463 draws each side, pick the
winner on the older half, then score it on the unseen half:

| search | 4+ in training | 4+ on unseen | unoptimised field |
|---|---:|---:|---:|
| stage 1, top 100 | 4.30 | 0.82 | 0.64 |
| stage 2, top 100 | 5.30 | 0.69 | 0.70 |
| stage 3, 20 independent runs | 8.75 | **0.55** | 0.74 |

The harder the optimiser works in training, the *worse* it does on draws it has
not seen. Stage 3 fits nearly nine 4-matches in training and comes out **below a
randomly chosen configuration** on the unseen half.

**Null calibration** — the identical 131,008-configuration search, run 100 times
with the date to winning-numbers link shuffled inside each game, so that no
configuration can carry any information:

```
best 4+ found per run:  min 5   median 7   mean 7.00   max 10

runs reaching  6 or better:  99/100
runs reaching  7 or better:  70/100
runs reaching  8 or better:  26/100
runs reaching  9 or better:   4/100
runs reaching 10 or better:   1/100
```

The real search found **8**. Pure noise finds 7 as a matter of routine and
reaches 8 about a quarter of the time. The "winning combination" is what a
search of that size returns from data with nothing in it.

## Is the best-found combination better than the shipped one?

No. Asked directly, and tested directly: give the **same optimiser the same
budget on shuffled data**, where the date carries no information about the draw,
and it does just as well.

```
RESTARTS=150, real draws                  ceiling = 12
RESTARTS=150, SHUFFLE=21 (meaningless)    ceiling = 13
RESTARTS=150, SHUFFLE=22 (meaningless)    ceiling = 13
RESTARTS=150, SHUFFLE=23 (meaningless)    ceiling = 13
```

The noise runs beat the real one. Reproduce with `SHUFFLE=<n>` on `climb.mjs`.

Three more readings point the same way:

- **The mean barely moves.** Against the exact hypergeometric model for these
  926 draws (expected total 678.9 matches, s.d. 23.1), the shipped engine scores
  **z = -0.39** and the 12-hit ceiling **z = +1.52**. A configuration that really
  read the draws better would lift the whole distribution; this one only
  rearranges near-misses into the tail it was told to maximise.
- **It would be a miracle only if chosen in advance.** For a combination fixed
  before seeing the draws, 12 four-or-better results is a 1-in-1.4-billion event
  (Poisson, lambda = 0.988). It was not fixed in advance — it was selected
  *because* it hit, out of millions of candidates.
- **It reads the date less, not more.** The shipped engine emits **901 distinct
  picks across 926 game-dates** — a genuinely different reading almost every
  draw. The 12-hit ceiling recycles **140**. The optimiser did not find a sharper
  reading; it found a narrow rotation of number sets that happened to land on
  this particular history.

## Why the numbers rise anyway

Because search effort buys in-sample hits and nothing else. A configuration that
emits few distinct picks gets many chances at the same lucky number set — the
stage-3 ceiling emits only **140 distinct picks across 926 game-dates**, the
stage-2 leader 429. Counting configurations is not counting evidence.

## The tools

Run in this order from the repo root. Everything is read-only with respect to
the site; outputs land next to the scripts and are gitignored.

```
node   .github/scripts/sweeps/extract.mjs     # real layers, sandboxed -> readings.json
node   .github/scripts/sweeps/validate.mjs    # MUST pass before trusting anything below
node --max-old-space-size=6144 .github/scripts/sweeps/grid.mjs        # stage 1  (~10s)
MODE=stage2 node --max-old-space-size=6144 .github/scripts/sweeps/grid.mjs   # stage 2  (~90s)
node --max-old-space-size=6144 .github/scripts/sweeps/climb.mjs       # stage 3  (~7min)
node   .github/scripts/sweeps/regrade.mjs     # re-grade the winner from pcso-history.json
RUNS=100 node --max-old-space-size=6144 .github/scripts/sweeps/null.mjs     # ~13min
```

Two guards exist because both caught real errors during this work:

- **`validate.mjs`** proves the parameterised picker reproduces
  `computeOracleAsOf()` on **926/926** game-dates at the shipped configuration.
  A sweep built on a picker that is not the real picker measures nothing.
- **`regrade.mjs`** and `climb.mjs`'s self-check rebuild a configuration's picks
  and score them straight from `pcso-history.json`. An earlier coordinate-ascent
  bug reverted an improved offset to a stale value, so the climber reported a
  score its own returned configuration did not have — 12 claimed, 11 real. The
  re-grade is what exposed it.

## The answer, plainly

The best combination found is the stage-3 ceiling above, at **12 of 926**. It is
not better than the shipped engine at anything except fitting draws it was shown.
On unseen draws it is worse than picking a configuration at random, and the same
optimiser on deliberately meaningless data reaches **13**. Lottery draws are
independent random events; no arrangement of these layers changes that.
