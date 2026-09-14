#!/usr/bin/env python3
"""Guarantees for the KissKH scraper.

Four things matter. The sitemap parse must take the post shards and nothing
else. The episode regex must be ANCHORED, because the site publishes split
parts ("-episode-36-1") that an unanchored match would file as episode 36 and
point the player at the wrong page. The grouping must keep a show findable
whether or not its slug carries a year, and must not lose the second slug when
one show uses both `-ep-` and `-episode-`. And write() must never replace a
good committed file with a worse one.

No network: everything is driven from fixtures.
"""
import importlib.util, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
spec = importlib.util.spec_from_file_location(
    'kk', os.path.join(ROOT, '.github', 'scripts', 'scrape_kisskh.py'))
kk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kk)

fails = []
def check(cond, label, extra=''):
    print(('  PASS  ' if cond else '  FAIL  ') + label + (('  ' + str(extra)) if extra and not cond else ''))
    if not cond:
        fails.append(label)

SITEMAP_INDEX = '''<?xml version="1.0"?>
<sitemapindex><sitemap><loc>https://kisskh.space/wp-sitemap-posts-post-1.xml</loc></sitemap>
<sitemap><loc>https://kisskh.space/wp-sitemap-posts-post-2.xml</loc></sitemap>
<sitemap><loc>https://kisskh.space/wp-sitemap-posts-page-1.xml</loc></sitemap>
<sitemap><loc>https://kisskh.space/wp-sitemap-taxonomies-category-1.xml</loc></sitemap>
<sitemap><loc>https://kisskh.space/wp-sitemap-users-1.xml</loc></sitemap></sitemapindex>'''

SHARD1 = '''<?xml version="1.0"?><urlset>
<url><loc>https://kisskh.space/a-bona-fide-killer-2026-ep-1/</loc></url>
<url><loc>https://kisskh.space/a-bona-fide-killer-2026-ep-2/</loc></url>
<url><loc>https://kisskh.space/a-bona-fide-killer-2026-ep-3/</loc></url>
<url><loc>https://kisskh.space/the-way-home-episode-8/</loc></url>
<url><loc>https://kisskh.space/the-way-home-2024-ep-10/</loc></url>
<url><loc>https://kisskh.space/love-song-in-winter-episode-36-1/</loc></url>
<url><loc>https://kisskh.space/i-am-the-secret-in-your-heart-2024/</loc></url>
</urlset>'''
SHARD2 = '''<?xml version="1.0"?><urlset>
<url><loc>https://kisskh.space/a-bona-fide-killer-2026-ep-5/</loc></url>
<url><loc>https://kisskh.space/squid-game-season-2-2024-ep-1/</loc></url>
</urlset>'''

print('1. the sitemap index yields the post shards and nothing else')
shards = kk.post_shards(SITEMAP_INDEX)
check(len(shards) == 2, 'two post shards', shards)
check(all('posts-post' in s for s in shards), 'pages/taxonomies/users are not scraped', shards)

print('\n2. the episode regex is anchored')
check(kk.EP_RE.match('a-bona-fide-killer-2026-ep-3').group(3) == '3', 'a normal episode parses')
check(kk.EP_RE.match('love-song-in-winter-episode-36-1') is None,
      'a SPLIT PART is skipped, not filed as episode 36')
check(kk.EP_RE.match('i-am-the-secret-in-your-heart-2024') is None, 'a show page is not an episode')
m = kk.EP_RE.match('the-way-home-episode-8')
check(m and m.group(2) == 'episode', 'the -episode- form is recognised as such')

print('\n3. run-length ranges')
check(kk.ranges([1, 2, 3, 7, 8]) == [[1, 3], [7, 8]], 'runs collapse', kk.ranges([1, 2, 3, 7, 8]))
check(kk.ranges([5]) == [[5, 5]], 'a lone episode is its own range')
check(kk.ranges([3, 1, 2]) == [[1, 3]], 'input order does not matter')
big = list(range(1, 51))
flat = [n for a, b in kk.ranges(big) for n in range(a, b + 1)]
check(flat == big, 'ranges round-trip losslessly')

print('\n4. grouping')
real_get = kk.get
pages = {kk.SITEMAP: SITEMAP_INDEX,
         'https://kisskh.space/wp-sitemap-posts-post-1.xml': SHARD1,
         'https://kisskh.space/wp-sitemap-posts-post-2.xml': SHARD2}
kk.get = lambda u, tries=3: pages.get(u, '')
try:
    shows, total = kk.scrape()
finally:
    kk.get = real_get
check(total == 7, 'seven episode urls seen', total)
check('a-bona-fide-killer' in shows, 'the year is stripped from the GROUP key', sorted(shows))
check(shows['a-bona-fide-killer'][0][0] == 'a-bona-fide-killer-2026',
      'but kept in the slug that gets built', shows['a-bona-fide-killer'])
check(shows['a-bona-fide-killer'][0][3] == [[1, 3], [5, 5]], 'the gap at episode 4 is preserved',
      shows['a-bona-fide-killer'][0][3])
way = shows.get('the-way-home', [])
check(len(way) == 2, 'one show using BOTH tokens keeps both entries', way)
check({e[1] for e in way} == {0, 1}, 'and they are marked as different tokens', way)
check(any(e[2] == 0 for e in way) and any(e[2] == 2024 for e in way),
      'year 0 records "no year in the slug"', way)
check('squid-game-season-2' in shows, 'a later season is its own show key', sorted(shows))

print('\n5. write() never replaces a good file with a worse one')
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, 'kisskh-index.json')
    good = {'generatedAt': 'x', 'source': 'y', 'shows': {f's{i}': [] for i in range(1000)}}
    check(kk.write(p, good, floor=400, label='t') is True, 'a full scrape writes')
    thin = {'generatedAt': 'x', 'source': 'y', 'shows': {f's{i}': [] for i in range(100)}}
    check(kk.write(p, thin, floor=400, label='t') is False, 'a scrape under the floor is refused')
    check(len(json.load(open(p))['shows']) == 1000, 'and the good file is untouched')
    half = {'generatedAt': 'x', 'source': 'y', 'shows': {f's{i}': [] for i in range(500)}}
    check(kk.write(p, half, floor=400, label='t') is False,
          'a scrape over the floor but far under the previous run is refused too')

print('\n6. the committed index is real and usable')
idx = os.path.join(ROOT, 'kisskh-index.json')
if os.path.exists(idx):
    d = json.load(open(idx))
    shows = d.get('shows', {})
    check(len(shows) > 400, f'committed index holds {len(shows)} shows')
    entries = [e for v in shows.values() for e in v]
    check(all(isinstance(e, list) and len(e) == 4 for e in entries), 'every entry is [slug, kind, year, ranges]')
    check(all(e[1] in (0, 1) for e in entries), 'kind is only 0 or 1')
    check(all(e[2] == 0 or 1900 < e[2] < 2100 for e in entries), 'year is 0 or plausible')
    check(all(a <= b for e in entries for a, b in e[3]), 'no inverted range')
    # the group key must be reachable from the slug, or the frontend cannot look it up
    bad = [k for k, v in shows.items() for e in v if not e[0].startswith(k)]
    check(not bad, 'every slug starts with its group key', bad[:3])
    eps = sum(b - a + 1 for e in entries for a, b in e[3])
    check(eps > 10000, f'{eps} episodes addressable')
else:
    check(False, 'kisskh-index.json is committed')

print('\n' + '=' * 60)
print(f'{len(fails)} failure(s)' + ('' if not fails else ': ' + ', '.join(fails)))
sys.exit(1 if fails else 0)
