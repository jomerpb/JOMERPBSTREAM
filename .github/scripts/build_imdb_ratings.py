#!/usr/bin/env python3
"""Build imdb-ratings.json from IMDb's own published ratings dataset.

WHY THIS EXISTS
---------------
The Stream tab used to print TMDB's `vote_average` on every card. That number
is TMDB's own user poll, and TMDB does not serve IMDb's rating under any
endpoint — measured: `/tv/{id}?append_to_response=external_ids` hands back
`external_ids.imdb_id` and nothing resembling an IMDb score. So showing IMDb
means bringing IMDb's numbers in from somewhere, and IMDb publishes them
itself, free, once a day, at datasets.imdbws.com.

The browser cannot read that file directly (it is a 8.6 MB gzipped TSV of 1.7M
rows, and the host sends no `Access-Control-Allow-Origin`), which is the same
reason the MangaFreak and PCSO pipelines exist: a workflow fetches it, reshapes
it, and commits a JSON the page can fetch from its own origin.

THE ENCODING IS NOT A MICRO-OPTIMISATION
----------------------------------------
The obvious shape — `{"32199328": 66, ...}` — costs 5.50 MB raw / 1.64 MB
gzipped at this vote floor. Sorting the tconsts and storing the *gaps* between
them alongside a parallel array of ratings costs 2.42 MB raw / **0.74 MB
gzipped** for exactly the same 430,439 titles, because a sorted gap list is
mostly single digits and gzip eats it. That is within 7% of a hand-rolled
binary format (0.69 MB) while staying plain JSON that `JSON.parse` reads and a
human can eyeball, so there is no decoder to get wrong beyond a running sum.
Do not "simplify" this back into an object keyed by tconst — it more than
doubles what every phone downloads for zero readability gained.

THE VOTE FLOOR IS LOW; THE TYPE FILTER IS WHAT PAYS FOR IT
----------------------------------------------------------
This file used to keep every IMDb title with 100+ votes. That floor was chosen
as the knee of a coverage/size curve — but the curve was measured with EVERY
title type in the file, and that is what made it expensive. Measured against
IMDb's own dumps:

    5-99 votes : 1,279,165 titles, of which 694,679 are tvEpisode
    100+ votes :   430,618 titles, of which 187,679 are tvEpisode

The page never looks up an episode. It resolves a tconst from TMDB's
/tv/{id}/external_ids or /movie/{id}/external_ids, which answer with the
SERIES or the FILM. So 43.6% of the old file could never be read by anything,
and half of what a lower floor would have added was more of the same.

Excluding the types a card can NEVER show turns the floor from a size decision
back into a correctness one:

    config                       titles   gzip     browse grids covered
    all types,   >=100 votes    430,618   0.74 MB   314/417  (75.3%)
    all types,   >=5   votes  1,709,783   2.61 MB   366/417  (87.8%)
    RATING_TYPES,>=5   votes    807,198   1.35 MB   365/417  (87.5%)   <- in use

Coverage is measured over 417 titles pulled from this app's own surfaces (5
country tabs, popular/top-rated/airing TV, popular/top-rated/upcoming/
now-playing movies). So +12.2 points for +0.61 MB, where dropping the floor
with no type filter costs +1.87 MB to gain ONE more title than this does.

WHICH TYPES ARE EXCLUDED, AND HOW THAT WAS SETTLED
--------------------------------------------------
Only two: tvEpisode (882,358 rated rows) and videoGame (20,227). Both were
checked against TMDB's /find rather than reasoned about — 30 random tconsts of
each, asking whether TMDB returns a card for them at all:

    tvEpisode  0/30 movie_results, 0/30 tv_results (2/30 tv_episode_results)
    videoGame  0/30 anything

This app never builds a card from tv_episode_results, so neither type is
reachable. Between them they are 902,585 rows — 53% of the dump.

short, video and tvShort ARE kept, and that reversed an earlier decision here.
They look as unreachable as episodes from the browse grids, where 0 of 417
titles is one — but Search and the actor filmography grid reach the whole
catalogue. Tested the same way: of 40 random short/video/tvShort tconsts, TMDB
returns a real movie card for **34**. Dropping them would have quietly blanked
badges on those two surfaces, which no browse-grid sample can see. They cost
0.37 MB and they stay.

Regression checked directly rather than assumed: of every tconst in the old
100-vote file, the ones this config drops are 187,610 tvEpisode, 18,861 short*,
8,366 video*, 5,460 videoGame and 486 tvShort* (*now kept — figures are from
the narrow set that was rejected), and exactly ONE movie, tt10489208, which
IMDb itself removed from its ratings dump between two consecutive days. Under
the config actually shipped, **no title of a kept type loses its badge**.

WHY THE OLD FLOOR EXISTED, AND WHAT REPLACES IT
-----------------------------------------------
The 100-vote floor was not only about bytes: it dropped ratings too thin to
mean anything, the same defect that makes TMDB_VOTE_FLOOR refuse a TMDB mean
off nine votes. That concern is real and is now handled differently: IMDb
publishes NOTHING under 5 votes, and unlike TMDB's raw mean an IMDb rating is
already weighted. Measured on the grid this change was asked about, the worst
new entrant is 8.6 off 38 votes sitting fourth; nothing absurd leads. The one
number to watch is that 5 of the 51 titles gained on that sample are rated 8.5+
off fewer than 25 votes, so a thin rating CAN lead a grid — it just no longer
leads it with a 10.0 off a single vote, which is what TMDB_VOTE_FLOOR was
added for. Raise MIN_VOTES to 25 if that is ever judged too loose: it costs 15
of the 51 gained titles and takes the file from 1.35 MB back to 0.81 MB.

The browse index keeps its own, separate floor (BROWSE_MIN_VOTES, still 100).
It backs the Genre/Year/Rating filters and sorts by a vote-weighted score, so
thin titles buy it nothing and it is fetched only when a filter is used.
"""

import gzip
import io
import json
import math
import os
import sys
import urllib.request
from datetime import datetime, timezone

DATASET = 'https://datasets.imdbws.com/title.ratings.tsv.gz'
BASICS = 'https://datasets.imdbws.com/title.basics.tsv.gz'
OUT = 'imdb-ratings.json'
OUT_BROWSE = 'imdb-browse.json'

# The browse index backs the Genre / Year / Min Rating filters, which read
# IMDb's own labelling rather than TMDB's. Restricted to the three types this
# app can actually show — measured, 244 of 244 catalogue titles are one of
# these, so nothing is lost by excluding shorts, episodes and video releases,
# and including them would more than double the file.
BROWSE_TYPES = {'movie': 0, 'tvSeries': 1, 'tvMiniSeries': 2}

# Shrink guard for the browse index; it sits around 189k titles.
BROWSE_FLOOR = 100_000

# The browse index keeps the 100-vote floor it was built with. It is a separate
# file behind the Genre/Year/Rating filters, it ranks by a vote-weighted score
# rather than raw rating, and it is only fetched when a filter is used — none
# of which is true of the ratings file, so the two floors are not one setting.
BROWSE_MIN_VOTES = 100

# Which IMDb title types can ever appear on a card. This excludes exactly two —
# tvEpisode and videoGame — and both were measured against TMDB's /find rather
# than assumed: 0 of 30 each come back as a movie or TV card. Between them they
# are 53% of the rated dump, and excluding them is what pays for the low floor.
# Do NOT also drop short/video/tvShort to save another 0.37 MB; that was tried,
# and 34 of 40 of them ARE reachable through Search and actor filmographies.
RATING_TYPES = {
    'movie', 'tvSeries', 'tvMiniSeries', 'tvMovie', 'tvSpecial',
    # Kept because Search and the actor filmography grid reach past the browse
    # grids: 34 of 40 random short/video/tvShort tconsts come back from TMDB's
    # /find as real movie cards. See the module docstring.
    'short', 'video', 'tvShort',
}

# IMDb publishes no rating at all below 5 votes, so this is "everything IMDb
# will tell us" rather than a threshold with anything below it. See the module
# docstring for why the old 100 stopped being the right number once the type
# filter landed.
MIN_VOTES = 5

# Shrink guard, same contract as scrape_mangafreak.write(): a truncated
# download must never replace a good file. IMDb's set only grows, so anything
# under this floor (or well under what is already committed) is a bad fetch.
# Raised with the type filter: the file now sits near 560k, so the old 250,000
# would have waved through a download that lost half its rows.
FLOOR = 400_000

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def parse(raw_gz, keep=None, min_votes=MIN_VOTES):
    """Return (sorted [(tconst_int, rating_x10)], skipped_count).

    Ratings are stored times ten so the payload carries integers only —
    `7.4` round-trips as `74` and the page divides by ten to print it. Storing
    the float would cost three more bytes per title and reintroduce the
    0.1-precision noise that JSON floats bring with them.

    `keep`, when given, is the set of tconst STRINGS whose title type a card can
    show (see cardable_tconsts). Passing None keeps every type, which is what
    the floor-only tests exercise — but main() always passes the set, because
    without it 43.6% of the rows are episodes nothing can ever look up.
    """
    rows = []
    skipped = 0
    with gzip.open(io.BytesIO(raw_gz), 'rt', encoding='utf-8') as f:
        header = next(f, '')
        if not header.startswith('tconst'):
            raise ValueError(f'unexpected dataset header: {header!r}')
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) != 3:
                skipped += 1
                continue
            tconst, rating, votes = parts
            if keep is not None and tconst not in keep:
                continue
            try:
                v = int(votes)
                if v < min_votes:
                    continue
                # tconst is "tt" + digits. Store the digits as an int so the
                # gap encoding below has something to subtract.
                rows.append((int(tconst[2:]), int(round(float(rating) * 10))))
            except ValueError:
                skipped += 1
                continue
    rows.sort()
    return rows, skipped


def encode(rows):
    """Gap-encode the sorted tconsts into two parallel arrays."""
    gaps = []
    ratings = []
    prev = 0
    for t, r in rows:
        gaps.append(t - prev)
        ratings.append(r)
        prev = t
    return gaps, ratings


def decode(gaps, ratings):
    """Inverse of encode() — the reference the page's own decoder must match."""
    out = {}
    run = 0
    for i, g in enumerate(gaps):
        run += g
        out[run] = ratings[i]
    return out


def read_ratings(raw_gz):
    """{tconst_str: (rating_float, votes)} for every rated title.

    Both outputs need the ratings keyed by the raw tconst string — the browse
    index to join against title.basics, and the ratings file to know which
    tconsts are worth checking a type for — so it is read once and shared.
    """
    out = {}
    with gzip.open(io.BytesIO(raw_gz), 'rt', encoding='utf-8') as f:
        header = next(f, '')
        if not header.startswith('tconst'):
            raise ValueError(f'unexpected dataset header: {header!r}')
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) != 3:
                continue
            try:
                out[p[0]] = (float(p[1]), int(p[2]))
            except ValueError:
                continue
    return out


def cardable_tconsts(raw_gz, ratings):
    """The rated tconsts whose IMDb title type a card can actually show.

    Only the first two columns are parsed — title.basics is ~12M rows and
    splitting all nine of them here costs real seconds for eight fields nobody
    in this function reads. Restricted to tconsts that carry a rating at all,
    so the set stays near 1.7M entries rather than the full catalogue.
    """
    keep = set()
    with gzip.open(io.BytesIO(raw_gz), 'rt', encoding='utf-8') as f:
        header = next(f, '')
        if not header.startswith('tconst'):
            raise ValueError(f'unexpected basics header: {header!r}')
        for line in f:
            p = line.split('\t', 2)
            if len(p) < 2:
                continue
            if p[1] in RATING_TYPES and p[0] in ratings:
                keep.add(p[0])
    return keep


def parse_basics(raw_gz, ratings, min_votes=BROWSE_MIN_VOTES):
    """Join title.basics against the ratings we already parsed.

    Returns (rows, genre_vocabulary) where each row is
    (tconst_int, type_code, year, end_year, genre_bitmask, rating_x10, votes).

    `end_year` is what makes the Status filter real. TMDB's /discover/tv has no
    status parameter at all — measured, the Stream tab was only ever *labelling*
    results "Completed" while filtering nothing — so the only way to answer
    "finished series" is IMDb's own endYear, which it publishes for 70.5% of
    rated TV titles. 0 means the run is still open.

    Genres are stored as a BITMASK over a vocabulary emitted alongside the
    data, not as strings: IMDb uses 27 genre labels, so the whole set fits in
    one integer per title and the page tests membership with a single `&`
    instead of comparing arrays of strings 189,000 times per filter change.
    """
    vocab = {}
    rows = []
    with gzip.open(io.BytesIO(raw_gz), 'rt', encoding='utf-8') as f:
        header = next(f, '')
        if not header.startswith('tconst'):
            raise ValueError(f'unexpected basics header: {header!r}')
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) != 9:
                continue
            tconst, ttype, _pt, _ot, adult, sy, ey, _rt, genres = p
            if ttype not in BROWSE_TYPES or adult == '1':
                continue
            rr = ratings.get(tconst)
            if rr is None or rr[1] < min_votes:
                continue
            mask = 0
            if genres and genres != '\\N':
                for g in genres.split(','):
                    if g not in vocab:
                        vocab[g] = len(vocab)
                    mask |= 1 << vocab[g]
            try:
                year = int(sy)
            except ValueError:
                year = 0
            try:
                end_year = int(ey)
            except ValueError:
                end_year = 0
            try:
                n = int(tconst[2:])
            except ValueError:
                continue
            rows.append((n, BROWSE_TYPES[ttype], year, end_year, mask, rr[0], rr[1]))
    rows.sort()
    order = [g for g, _ in sorted(vocab.items(), key=lambda kv: kv[1])]
    return rows, order


def vote_bucket(v):
    """Votes, coarsened to one byte.

    The page only uses vote counts to rank within a filtered list, so the exact
    figure buys nothing and costs 110 KB gzipped. A log scale keeps the ordering
    that matters (a 400,000-vote title still outranks a 400-vote one) while
    collapsing differences nobody sorts on.
    """
    v = max(1, int(v))
    return min(255, int(math.log2(v) * 8))


def write_browse(path, rows, vocab, *, floor=BROWSE_FLOOR):
    old = load_existing(path)
    old_n = int(old.get('count') or 0)
    new_n = len(rows)
    if new_n < floor or (old_n and new_n < old_n * 0.6):
        print(f'REFUSING to write {path}: got {new_n}, have {old_n} '
              f'(floor {floor}) — keeping the existing file', file=sys.stderr)
        return False

    gaps = []
    prev = 0
    for n, *_ in rows:
        gaps.append(n - prev)
        prev = n
    payload_core = {
        'genres': vocab,
        'd': gaps,
        't': [r[1] for r in rows],
        'y': [r[2] for r in rows],
        # End year, as an OFFSET from the start year, and -1 when the run is
        # still open. A series almost always ends within a few years of
        # starting, so the column is mostly single digits and gzip flattens it,
        # where absolute years would cost four characters apiece.
        'e': [(r[3] - r[2]) if (r[3] and r[2]) else -1 for r in rows],
        'g': [r[4] for r in rows],
        'r': [int(round(r[5] * 10)) for r in rows],
        'v': [vote_bucket(r[6]) for r in rows],
    }
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    changed = any(old.get(k) != v for k, v in payload_core.items())
    payload = {
        'checked': now,
        'updated': now if changed else (old.get('updated') or now),
        'source': BASICS,
        'minVotes': BROWSE_MIN_VOTES,
        'count': new_n,
        **payload_core,
    }
    with open(path, 'w') as f:
        json.dump(payload, f, separators=(',', ':'))
    print(f'{path}: wrote {new_n} titles (was {old_n}), '
          f'{os.path.getsize(path)/1e6:.2f} MB raw, {len(vocab)} genres, changed={changed}')
    return True


def load_existing(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return {}


def write(path, rows, *, floor=FLOOR):
    """Write the payload, carrying `checked`/`updated` the way the PCSO files do.

    `checked` moves on EVERY run, including the ones that find nothing new —
    it is "last fetched". `updated` moves only when a rating actually changed.
    The Stream tab has no freshness label today, but the two stamps cost eight
    bytes and the repo already learned once that deriving "last fetched" from a
    file that is only rewritten on change reports the wrong thing.
    """
    old = load_existing(path)
    old_n = int(old.get('count') or 0)
    new_n = len(rows)

    if new_n < floor or (old_n and new_n < old_n * 0.6):
        print(f'REFUSING to write {path}: got {new_n}, have {old_n} '
              f'(floor {floor}) — keeping the existing file', file=sys.stderr)
        return False

    gaps, ratings = encode(rows)
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')

    changed = (old.get('d') != gaps) or (old.get('r') != ratings)
    payload = {
        'checked': now,
        'updated': now if changed else (old.get('updated') or now),
        'source': DATASET,
        'minVotes': MIN_VOTES,
        'count': new_n,
        'd': gaps,
        'r': ratings,
    }
    with open(path, 'w') as f:
        json.dump(payload, f, separators=(',', ':'))
    size = os.path.getsize(path)
    print(f'{path}: wrote {new_n} titles (was {old_n}), '
          f'{size/1e6:.2f} MB raw, changed={changed}')
    return True


def main():
    # BOTH outputs need title.basics now, so it is fetched before either is
    # written. The ratings file needs it to know a tconst's TYPE — without that
    # the low vote floor would drag in 694,679 tvEpisode rows nothing can look
    # up (see the module docstring) — and the browse index needs it for genres.
    print(f'fetching {DATASET} ...')
    raw = fetch(DATASET)
    print(f'  {len(raw)/1e6:.2f} MB gzipped')
    print(f'fetching {BASICS} ...')
    raw_b = fetch(BASICS)
    print(f'  {len(raw_b)/1e6:.2f} MB gzipped')

    ratings = read_ratings(raw)
    print(f'  {len(ratings)} rated titles in the dump')
    keep = cardable_tconsts(raw_b, ratings)
    print(f'  {len(keep)} of them are a type a card can show')

    rows, skipped = parse(raw, keep)
    print(f'  {len(rows)} titles at >={MIN_VOTES} votes ({skipped} malformed rows skipped)')
    ok = write(OUT, rows)

    brows, vocab = parse_basics(raw_b, ratings)
    print(f'  {len(brows)} browsable titles, {len(vocab)} genres')
    ok_b = write_browse(OUT_BROWSE, brows, vocab)

    return 0 if (ok and ok_b) else 1


if __name__ == '__main__':
    sys.exit(main())
