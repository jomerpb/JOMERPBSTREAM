#!/usr/bin/env python3
"""
WebComics slug index.

Same reason the MangaFreak scraper exists: www.webcomicsapp.com sends no
Access-Control-Allow-Origin, so the page cannot read anything from it directly.
Scrape server-side in Actions, commit JSON, let the frontend fetch its own
origin.

Writes ONE file, METADATA ONLY (genre, slug, id — no titles, no covers, no
chapter content):

  webcomics-index.json   every English book URL on the site, so the WebComics
                         reader card can open a title's own page instead of
                         dumping the user on a search page.

Two things about this site make the scrape far cheaper than MangaFreak's:

  * IT PUBLISHES A SITEMAP. robots.txt points at /sitemap.xml, whose
    book_detail1/book_detail2 shards carry every book URL on the site. That is
    2 requests and ~5.5MB against MangaFreak's 402-page A-Z walk, so there is
    no cheap-half/expensive-half split here and no --latest-only flag.

  * THE URL CARRIES ITS OWN GENRE. A book lives at /en/<genre>/<slug>/<id>, and
    the id is an opaque 24-hex key that cannot be derived from a title — which
    is exactly why an index is needed at all. The genre IS recoverable
    (/en/comic/<slug>/<id> 301s to the right one, verified), but it is stored
    anyway: inside an iframe that redirect is a second round trip on every
    open, and the whole entry is one short string either way.

WHAT THIS INDEX IS AND IS NOT WORTH, measured before it was written, because
the honest number matters more than the feature:

WebComics is a licensed platform carrying its own originals, and its catalogue
barely intersects the one the app browses. Against 264 unique AniList manga
(trending + popularity, 3 pages each) only **8 resolved to a WebComics page,
3.0%** — and auditing those 8 rather than counting them caught one outright
wrong (Hunter x Hunter -> "dark-hunter"), which is what the distinct-token gate
in the frontend matcher now rejects.

The obvious suspicion is that the matcher, not the catalogue, is the weak link.
It was tested directly: WebComics' own search endpoint was asked for 18 titles
the matcher missed, with 5 known-present titles as a control. The control
returned 5/5; of the 18, **0 were genuinely present** — 5 returned an empty
search page and 11 returned only unrelated rails ("One Piece" ->
one-night-one-love, "Berserk" -> her-ladyship-s-going-berserk-again). So the
catalogue really is disjoint, and no better matcher would change that.

The index is still worth having: it is 2 requests, and the titles it does
resolve include some of the most-read ones on the platform (Solo Leveling, I Am
The Fated Villain). Everything it cannot resolve falls back to WebComics'
search page, which renders inside the frame — so an unresolved title lands on a
search box in the app rather than a dead end. Do not "improve" the hit rate by
loosening the matcher; that direction produces Hunter x Hunter -> dark-hunter.
"""

import json
import re
import sys
from datetime import datetime, timezone

import requests

BASE = 'https://www.webcomicsapp.com'
SITEMAP = BASE + '/sitemap.xml'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': BASE + '/',
}

# /en/<genre>/<slug>/<24-hex id>. Anchored to /en/ on purpose: the same sitemaps
# carry pt/fr/id/es rows, and those are different translations of the same book
# whose pages this app has no way to ask for.
BOOK_RE = re.compile(r'/en/([a-z0-9-]+)/([a-z0-9-]+)/([0-9a-f]{24})\b')
# Only the shards that hold book detail pages. chapter.xml is an order of
# magnitude larger and holds per-chapter URLs, which this index has no use for.
BOOK_SHARD_RE = re.compile(r'<loc>\s*([^<\s]*book_detail[^<\s]*)\s*</loc>', re.I)

SESSION = requests.Session()


def get(url, tries=3):
    for i in range(tries):
        try:
            r = SESSION.get(url, headers=HEADERS, timeout=60)
            if r.status_code == 200:
                return r.text
        except Exception as e:
            print(f'  {url} attempt {i + 1}: {e}', file=sys.stderr)
    return None


def book_shards():
    """The book_detail shards named by the sitemap index.

    Read from the index rather than hardcoded as book_detail1/2: the site is
    free to add a third shard as the catalogue grows, and a hardcoded pair
    would silently stop seeing new titles instead of failing.
    """
    xml = get(SITEMAP)
    if not xml:
        return []
    return BOOK_SHARD_RE.findall(xml)


def scrape_index():
    shards = book_shards()
    print(f'  sitemap lists {len(shards)} book shard(s)')
    seen, books = set(), []
    for url in shards:
        xml = get(url)
        if not xml:
            print(f'  {url}: FAILED', file=sys.stderr)
            continue
        found = 0
        for genre, slug, book_id in BOOK_RE.findall(xml):
            if book_id in seen:
                continue
            seen.add(book_id)
            books.append(f'{genre}/{slug}/{book_id}')
            found += 1
        print(f'  {url.rsplit("/", 1)[-1]}: {found} new')
    books.sort()
    return books


def write(path, payload, *, floor, label):
    """Never replace a good file with a worse one.

    Same guard, and the same reasoning, as the MangaFreak scraper's: a partial
    scrape (site down, sitemap moved, a rate limit) would otherwise strip the
    reader card of its index and quietly send every title to a search page.
    """
    new_n = len(payload['books'])
    try:
        with open(path) as f:
            old_n = len(json.load(f).get('books', []))
    except Exception:
        old_n = 0
    if new_n < floor or new_n < old_n * 0.6:
        print(f'REFUSING to write {label}: got {new_n}, have {old_n} '
              f'(floor {floor}) — keeping the existing file', file=sys.stderr)
        return False
    with open(path, 'w') as f:
        json.dump(payload, f, separators=(',', ':'))
    print(f'{label}: wrote {new_n} (was {old_n})')
    return True


def main():
    now = datetime.now(timezone.utc).isoformat()
    print('WebComics index:')
    books = scrape_index()
    ok = write('webcomics-index.json',
               {'generatedAt': now, 'source': BASE, 'books': books},
               floor=500, label='webcomics-index.json')
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
