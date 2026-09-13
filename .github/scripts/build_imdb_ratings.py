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

THE VOTE FLOOR IS A FEATURE, NOT A SIZE HACK
--------------------------------------------
MIN_VOTES drops titles nobody has rated enough for the rating to mean anything.
That is the same defect this whole change is fixing: measured on a 247-title
sample of the app's own catalogue, TMDB served "Peloton — 9.0" off a single
vote, against IMDb's 4.3 from 12. A 100-vote floor keeps 430,439 titles and
still covers 93.1% of that sample; dropping the floor to 0 would add 1.28M
mostly-unrated titles to buy 2.4 points of coverage and take the file to 6.20 MB
gzipped. Raising it to 1000 saves 0.30 MB and costs 15 points of coverage.
100 is the measured knee.
"""

import gzip
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

DATASET = 'https://datasets.imdbws.com/title.ratings.tsv.gz'
OUT = 'imdb-ratings.json'

# See the module docstring — the knee of the coverage/size curve, not a guess.
MIN_VOTES = 100

# Shrink guard, same contract as scrape_mangafreak.write(): a truncated
# download must never replace a good file. IMDb's set only grows, so anything
# under this floor (or well under what is already committed) is a bad fetch.
FLOOR = 250_000

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def parse(raw_gz, min_votes=MIN_VOTES):
    """Return (sorted [(tconst_int, rating_x10)], skipped_count).

    Ratings are stored times ten so the payload carries integers only —
    `7.4` round-trips as `74` and the page divides by ten to print it. Storing
    the float would cost three more bytes per title and reintroduce the
    0.1-precision noise that JSON floats bring with them.
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
    print(f'fetching {DATASET} ...')
    raw = fetch(DATASET)
    print(f'  {len(raw)/1e6:.2f} MB gzipped')
    rows, skipped = parse(raw)
    print(f'  {len(rows)} titles at >={MIN_VOTES} votes ({skipped} malformed rows skipped)')
    if not write(OUT, rows):
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
