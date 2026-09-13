#!/usr/bin/env python3
"""Build watch-providers.json — the Streaming filter's option list.

WHY A PIPELINE AND NOT A LIVE CALL
----------------------------------
The repo rule is that ids are never hardcoded, so the Streaming filter cannot
ship a handwritten list of `{"Netflix": 8}`. But the obvious alternative —
having the page call TMDB's /watch/providers at load — gives a list ordered by
TMDB's `display_priority`, which does not reflect how much there is to watch:
measured for the Philippines, that ordering puts FilmBox+, Hayu and Sun Nxt
above HBO Max, which sits **22nd** despite carrying 1,122 TV titles against
FilmBox+'s zero at the flatrate tier.

Ranking them honestly means asking /discover for each provider's catalogue
size, which is 30 calls for TV plus 43 for movies. That is fine once a week in
a workflow and absurd on every page load, so it happens here and the page reads
one small file.

WHAT GETS COUNTED, AND WHY IT IS `flatrate`
-------------------------------------------
Only titles included with a subscription. Without that restriction the list is
led by storefronts rather than services: measured in PH, Apple TV Store reports
**18,845** movies but only **2,071** at the flatrate tier, Plex 11,305 → 935,
Google Play Movies 4,585 → 812. Netflix, Prime Video and HBO Max are unchanged
because they are subscription-only. A filter that answered "what can I watch on
Apple TV" with 16,000 titles you would have to buy individually is not the
question anyone is asking.

A NOTE ABOUT DISNEY+
--------------------
It will not appear for the Philippines, and that is TMDB's data rather than a
bug here. Measured: `with_watch_providers=337&watch_region=PH` returns **16** TV
titles against Netflix's 3,745, and a Disney+ exclusive (The Mandalorian) has no
PH flatrate entry at all while returning "Disney Plus" for US, SG and JP. The
MIN_CATALOGUE floor below drops it for the same reason it drops every other
provider with nothing behind it. If TMDB's PH coverage improves, the next run
picks it up on its own — nothing here names any provider.
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

# The same public key the page uses; this only reads public endpoints.
TMDB_KEY = '06523e121afa0ea9002d8f8f1be31965'
TMDB = 'https://api.themoviedb.org/3'
OUT = 'watch-providers.json'

# Where "available" is judged from. The app's audience is Philippine — the other
# two tabs are PCSO and the PSE — and provider availability is per-country, so
# there is no region-neutral answer to cache.
REGION = 'PH'

# Only titles a subscription already covers. See the module docstring.
MONETIZATION = 'flatrate'

# A provider under this many titles is not worth a checkbox: picking it would
# return a near-empty grid and it pushes the ones people actually subscribe to
# further down the panel.
MIN_CATALOGUE = 100

# Shrink guard, in the same spirit as the other pipelines: a throttled run that
# returns a handful of providers must not replace a good list.
FLOOR = 8


def get(path, **params):
    params['api_key'] = TMDB_KEY
    url = f'{TMDB}{path}?' + urllib.parse.urlencode(params)
    for _ in range(4):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            last = e
    print(f'  WARN: {path} failed: {last}', file=sys.stderr)
    return {}


def catalogue_size(kind, provider_id):
    d = get(f'/discover/{kind}',
            watch_region=REGION,
            with_watch_providers=provider_id,
            with_watch_monetization_types=MONETIZATION)
    return int(d.get('total_results') or 0)


def build_kind(kind):
    provs = get(f'/watch/providers/{kind}', watch_region=REGION).get('results', [])
    print(f'  {kind}: {len(provs)} providers offered in {REGION}')
    if not provs:
        return []

    def one(p):
        return {
            'id': p['provider_id'],
            'name': p['provider_name'],
            'logo': p.get('logo_path') or '',
            'count': catalogue_size(kind, p['provider_id']),
        }

    with ThreadPoolExecutor(max_workers=8) as ex:
        rows = list(ex.map(one, provs))
    kept = [r for r in rows if r['count'] >= MIN_CATALOGUE]
    kept.sort(key=lambda r: -r['count'])
    dropped = len(rows) - len(kept)
    print(f'  {kind}: kept {len(kept)}, dropped {dropped} under {MIN_CATALOGUE} titles')
    return kept


def load_existing(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return {}


def main():
    tv = build_kind('tv')
    movie = build_kind('movie')

    if len(tv) + len(movie) < FLOOR:
        print(f'REFUSING to write {OUT}: only {len(tv) + len(movie)} providers '
              f'survived (floor {FLOOR}) — keeping the existing file', file=sys.stderr)
        return 1

    old = load_existing(OUT)
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    core = {'region': REGION, 'monetization': MONETIZATION,
            'minCatalogue': MIN_CATALOGUE, 'tv': tv, 'movie': movie}
    # `checked` moves every run, `updated` only on a real change — the same two
    # stamps the PCSO files carry, and for the same reason.
    changed = any(old.get(k) != v for k, v in core.items())
    payload = {'checked': now,
               'updated': now if changed else (old.get('updated') or now),
               **core}
    with open(OUT, 'w') as f:
        json.dump(payload, f, separators=(',', ':'))
    print(f'{OUT}: {len(tv)} TV + {len(movie)} movie providers, '
          f'{os.path.getsize(OUT)} bytes, changed={changed}')
    if tv:
        print('  top TV:    ' + ', '.join(f"{r['name']} ({r['count']})" for r in tv[:5]))
    if movie:
        print('  top movie: ' + ', '.join(f"{r['name']} ({r['count']})" for r in movie[:5]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
