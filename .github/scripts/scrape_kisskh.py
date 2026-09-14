#!/usr/bin/env python3
"""
KissKH slug index.

Exists for the same reason the MangaFreak and WebComics scrapers do:
kisskh.space sends no Access-Control-Allow-Origin, so the page cannot read
anything from it directly. Scrape server-side in Actions, commit JSON, let the
frontend fetch its own origin.

Writes ONE file, METADATA ONLY (slugs and episode numbers — no titles beyond
what the slug already is, no covers, no video):

  kisskh-index.json   every episode URL on the site, grouped by show, so the
                      Stream tab's KissKH server can turn a TMDB title and
                      episode number into the page that carries the player.

WHY AN INDEX AT ALL — the slug cannot be guessed. Measured over all 26,448
episode URLs the sitemap lists:

  * 25,563 use `-ep-N` and 302 use `-episode-N`, and **53 shows use BOTH**, so
    the token cannot even be settled per show.
  * 24,049 carry a year and 1,816 do not.
  * A wrong slug answers HTTP 404 — and kisskh sends no CORS headers, so the
    page cannot read that status. Guessing would frame "Page not found" with
    no way to detect it. The index is what makes a miss knowable BEFORE a
    frame is pointed anywhere.

WHAT THE INDEX IS WORTH, measured before it was written, because the honest
number matters more than the feature. Exact-title match against TMDB's own
surfaces, scripted titles only (Reality/Talk/News/Documentary excluded — a
drama site does not carry Inkigayo or SNL Korea, and leaving them in read 28%
instead of 43%):

  K-drama, scripted   34/80  (43%)   — of those, 23 complete, 11 partial
  C-drama              3/60  ( 5%)
  J-drama              1/60  ( 2%)
  All popular TV       0/60  ( 0%)

So this is a Korean-drama accelerator, not a general-purpose source, and a
title it cannot resolve must fall through to the ordinary server chain rather
than dead-end. Do not "improve" the hit rate by loosening the matcher — the
frontend gate is deliberately exact for the reason scrape_webcomics.py
documents at length (Hunter x Hunter -> "dark-hunter").

THE SCRAPE IS CHEAP: WordPress publishes wp-sitemap.xml, whose post shards
carry every episode URL. That is one request for the index plus one per shard
— 15 in total today — against MangaFreak's 402-page A-Z walk. The shard list
is read from the sitemap rather than hardcoded, so a shard added as the
catalogue grows is picked up instead of silently missed.
"""

import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = 'https://kisskh.space'
SITEMAP = f'{BASE}/wp-sitemap.xml'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')

LOC_RE = re.compile(r'<loc>([^<]+)</loc>')
# Only the post shards carry episodes; pages/taxonomies/users do not.
POST_SHARD_RE = re.compile(r'wp-sitemap-posts-post-\d+\.xml$')
# <base>-ep-12 / <base>-episode-12. Anchored, so a split part ("-episode-36-1")
# is skipped rather than mis-read as episode 36.
EP_RE = re.compile(r'^(.+?)-(ep|episode)-(\d+)$')
YEAR_RE = re.compile(r'-((?:19|20)\d{2})$')

KIND = {'ep': 0, 'episode': 1}


def get(url, tries=3):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode('utf-8', 'replace')
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            if attempt == tries - 1:
                print(f'  {url}: {e}', file=sys.stderr)
    return ''


def post_shards(xml):
    """Read the shard list out of the sitemap index, never hardcode it."""
    return [u for u in LOC_RE.findall(xml) if POST_SHARD_RE.search(u)]


def ranges(nums):
    """[1,2,3,7,8] -> [[1,3],[7,8]].

    Episode lists are nearly always contiguous, so runs are what makes the
    file small: 26,448 episode numbers collapse to a few thousand pairs.
    """
    out = []
    for n in sorted(nums):
        if out and n == out[-1][1] + 1:
            out[-1][1] = n
        else:
            out.append([n, n])
    return out


def scrape():
    index_xml = get(SITEMAP)
    if not index_xml:
        return {}, 0
    shards = post_shards(index_xml)
    print(f'  sitemap lists {len(shards)} post shard(s)')

    # base slug -> {kind -> set(episode numbers)}
    found = {}
    total = 0
    for url in shards:
        xml = get(url)
        if not xml:
            print(f'  {url}: FAILED', file=sys.stderr)
            continue
        n = 0
        for loc in LOC_RE.findall(xml):
            slug = loc.replace(f'{BASE}/', '').strip('/')
            m = EP_RE.match(slug)
            if not m:
                continue
            base, kind, num = m.group(1), m.group(2), int(m.group(3))
            found.setdefault(base, {}).setdefault(kind, set()).add(num)
            n += 1
        total += n
        print(f'  {url.rsplit("/", 1)[-1]}: {n} episode urls')

    # Group by the title alone, so a show is findable whether or not its slug
    # carries a year — the frontend has the year from TMDB and uses it to pick
    # between entries, but must not need it to find them.
    shows = {}
    for base, kinds in found.items():
        title = YEAR_RE.sub('', base)
        year = YEAR_RE.search(base)
        for kind, eps in kinds.items():
            shows.setdefault(title, []).append(
                [base, KIND[kind], int(year.group(1)) if year else 0, ranges(eps)])
    for entries in shows.values():
        # Most episodes first: where a show appears twice, the fuller entry is
        # the one worth trying before the other.
        entries.sort(key=lambda e: -sum(b - a + 1 for a, b in e[3]))
    return shows, total


def write(path, payload, *, floor, label):
    """Never replace a good file with a worse one.

    Same guard and the same reasoning as the MangaFreak and WebComics
    scrapers': a partial scrape (site down, sitemap moved, a rate limit) would
    otherwise strip the KissKH server of its index and turn every title into a
    miss, silently.
    """
    new_n = len(payload['shows'])
    try:
        with open(path) as f:
            old_n = len(json.load(f).get('shows', {}))
    except Exception:
        old_n = 0
    if new_n < floor or new_n < old_n * 0.6:
        print(f'REFUSING to write {label}: got {new_n} shows, have {old_n} '
              f'(floor {floor}) — keeping the existing file', file=sys.stderr)
        return False
    with open(path, 'w') as f:
        json.dump(payload, f, separators=(',', ':'))
    print(f'{label}: wrote {new_n} shows (was {old_n})')
    return True


def main():
    now = datetime.now(timezone.utc).isoformat()
    print('KissKH index:')
    shows, total = scrape()
    print(f'  {total} episode urls across {len(shows)} shows')
    ok = write('kisskh-index.json',
               {'generatedAt': now, 'source': BASE, 'shows': shows},
               floor=400, label='kisskh-index.json')
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
