#!/usr/bin/env python3
"""
MangaFreak scraper.

Exists because ww3.mangafreak.me sends no Access-Control-Allow-Origin, so the
page cannot read anything from it directly — every request from
https://jomerpb.github.io is discarded by the browser. Same shape as the PCSO
and PSE pipelines: scrape server-side in Actions, commit JSON, let the frontend
fetch its own origin.

Writes two files, both METADATA ONLY (titles, slugs, cover URLs, chapter
numbers) — no chapter content is fetched or stored:

  mangafreak-latest.json  the Latest Releases feed, for the Manga tab's
                          "Latest" sub-tab.
  mangafreak-index.json   every slug in the site's A-Z list, so the Read
                          button can link to /Manga/<Slug> directly instead
                          of dumping the user on a search page.

The index is slugs only. A slug round-trips to a title well enough to match
against ("Swordmasters_Youngest_Son" -> "swordmasters youngest son"), and
storing titles as well would roughly double a file every visitor downloads.

The two halves cost wildly different amounts, which is why `--latest-only`
exists. Measured against the live site: the Latest feed is 4 requests and
**0.9s**; the A-Z index is 402 pages and **~54s**. A once-a-day run was leaving
the "Latest" tab up to 24 hours behind, and that feed turns over fast enough for
it to matter -- 57 of 119 rows (48%) were new within 14 hours of a scrape. So
the cheap half runs hourly on its own and the expensive half stays daily,
instead of hammering 402 pages 24 times a day to refresh 4.
"""

import json, re, sys, time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

BASE = 'https://ww3.mangafreak.me'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': BASE + '/',
}

LATEST_PAGES = 4      # 30 items per page
INDEX_WORKERS = 6     # polite: the A-Z list is ~400 pages
SESSION = requests.Session()


def get(url, tries=3):
    for i in range(tries):
        try:
            r = SESSION.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass
        time.sleep(1.5 * (i + 1))
    return None


def scrape_latest():
    """Latest Releases: title, slug, cover, newest chapter, and how long ago."""
    items, seen = [], set()
    for page in range(1, LATEST_PAGES + 1):
        html = get(f'{BASE}/Latest_Releases/{page}')
        if not html:
            print(f'  latest page {page}: FAILED', file=sys.stderr)
            continue
        soup = BeautifulSoup(html, 'html.parser')
        rows = soup.select('.latest_releases_item')
        for row in rows:
            link = row.select_one('.latest_releases_info a[href^="/Manga/"]')
            if not link:
                continue
            slug = link['href'].split('/Manga/', 1)[1].strip('/')
            if not slug or slug in seen:
                continue
            seen.add(slug)
            img = row.select_one('img')
            ch = row.select_one('.latest_releases_info a[href^="/Read"]')
            when = row.select_one('.latest_releases_time')
            items.append({
                'title':   link.get_text(strip=True),
                'slug':    slug,
                'cover':   (img.get('src') or '') if img else '',
                'chapter': ch.get_text(strip=True) if ch else '',
                'chapterUrl': (BASE + ch['href']) if ch and ch.get('href') else '',
                'when':    when.get_text(strip=True) if when else '',
            })
        print(f'  latest page {page}: {len(rows)} rows, {len(items)} kept')
    return items


def index_page_count():
    html = get(f'{BASE}/Mangalist/All/1')
    if not html:
        return 0
    nums = [int(n) for n in re.findall(r'/Mangalist/All/(\d+)"', html)]
    return max(nums) if nums else 0


def scrape_index_page(page):
    html = get(f'{BASE}/Mangalist/All/{page}')
    if not html:
        return []
    return re.findall(r'href="/Manga/([^"/?#]+)"', html)


def scrape_index():
    total = index_page_count()
    if not total:
        print('  index: could not read page count', file=sys.stderr)
        return []
    print(f'  index: {total} pages')
    slugs, seen = [], set()
    with ThreadPoolExecutor(max_workers=INDEX_WORKERS) as pool:
        for i, batch in enumerate(pool.map(scrape_index_page, range(1, total + 1)), 1):
            for s in batch:
                if s not in seen:
                    seen.add(s)
                    slugs.append(s)
            if i % 50 == 0:
                print(f'    ...{i}/{total} pages, {len(slugs)} slugs')
    return slugs


def write(path, payload, *, floor, label):
    """Never replace a good file with a worse one.

    A partial scrape (site down, layout changed, a rate limit) would otherwise
    silently empty the Latest tab or strip the Read button of its index. If the
    new payload is materially smaller than what is already committed, keep the
    old file and fail loudly instead.
    """
    key = 'items' if 'items' in payload else 'slugs'
    new_n = len(payload[key])
    try:
        with open(path) as f:
            old_n = len(json.load(f).get(key, []))
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
    # --latest-only skips the 402-page index walk. The hourly job passes it; the
    # daily one does not, so the index still gets refreshed once a day.
    latest_only = '--latest-only' in sys.argv
    now = datetime.now(timezone.utc).isoformat()

    print('Latest Releases:')
    latest = scrape_latest()
    ok_latest = write('mangafreak-latest.json',
                      {'generatedAt': now, 'source': BASE, 'items': latest},
                      floor=30, label='mangafreak-latest.json')

    ok_index = True
    if latest_only:
        print('Manga index: skipped (--latest-only)')
    else:
        print('Manga index:')
        slugs = scrape_index()
        ok_index = write('mangafreak-index.json',
                         {'generatedAt': now, 'source': BASE, 'slugs': slugs},
                         floor=1000, label='mangafreak-index.json')

    if not (ok_latest and ok_index):
        sys.exit(1)


if __name__ == '__main__':
    main()
