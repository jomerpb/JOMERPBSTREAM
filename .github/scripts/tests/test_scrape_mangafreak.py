#!/usr/bin/env python3
"""Guarantees for the MangaFreak scraper.

Two things matter here. The parsers must survive the real page shape, and
write() must never replace a good committed file with a worse one — a partial
scrape would otherwise silently empty the Manga tab's Latest feed or strip the
Read button of the index it needs to link to a manga directly.

No network: the parsers are driven from fixtures.
"""
import importlib.util, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
spec = importlib.util.spec_from_file_location(
    'mf', os.path.join(ROOT, '.github', 'scripts', 'scrape_mangafreak.py'))
mf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mf)

fails = []
def check(cond, label, extra=''):
    print(('  PASS  ' if cond else '  FAIL  ') + label + (('  ' + str(extra)) if extra and not cond else ''))
    if not cond:
        fails.append(label)

LATEST_FIXTURE = '''
<div class="latest_releases_item">
  <div class="latest_releases_image ongoing_pic">
    <img src="https://images.mangafreak.me/mini_images/star_wars_lost_stars/55x85">
  </div>
  <div class="latest_releases_info">
    <a href="/Manga/Star_Wars_Lost_Stars"><strong>Star Wars Lost Stars</strong></a>
    <div><div><a href="/Read1_Star_Wars_Lost_Stars_38">Star Wars Lost Stars 38</a></div></div>
  </div>
  <div class="latest_releases_time">Today</div>
</div>
<div class="latest_releases_item">
  <div class="latest_releases_image ongoing_pic">
    <img src="https://images.mangafreak.me/mini_images/berserk/55x85">
  </div>
  <div class="latest_releases_info">
    <a href="/Manga/Berserk"><strong>Berserk</strong></a>
    <div><div><a href="/Read1_Berserk_386">Berserk 386</a></div></div>
  </div>
  <div class="latest_releases_time">Yesterday</div>
</div>
'''

INDEX_FIXTURE = '''
<a class="n_p" href="/Mangalist/All/2">2</a><a class="last_p" href="/Mangalist/All/402">&raquo;</a>
<div class="list_item">
  <div class="list_image"><a href="/Manga/Solo_Leveling"><img src="x"></a></div>
  <div class="list_item_info"><a href="/Manga/Solo_Leveling">Solo Leveling</a></div>
</div>
<div class="list_item">
  <div class="list_image"><a href="/Manga/Naruto"><img src="x"></a></div>
  <div class="list_item_info"><a href="/Manga/Naruto">Naruto</a></div>
</div>
'''

print('1. Latest Releases parsing')
mf.LATEST_PAGES = 1
mf.get = lambda url, tries=3: LATEST_FIXTURE
items = mf.scrape_latest()
check(len(items) == 2, 'both rows parsed', len(items))
first = items[0] if items else {}
check(first.get('title') == 'Star Wars Lost Stars', 'title', first.get('title'))
check(first.get('slug') == 'Star_Wars_Lost_Stars', 'slug taken from the /Manga/ link', first.get('slug'))
check('images.mangafreak.me' in first.get('cover', ''), 'cover url', first.get('cover'))
check(first.get('chapter') == 'Star Wars Lost Stars 38', 'newest chapter', first.get('chapter'))
check(first.get('chapterUrl', '').startswith('https://'), 'chapter url is absolute', first.get('chapterUrl'))
check(first.get('when') == 'Today', 'relative time', first.get('when'))
check(items[1].get('when') == 'Yesterday', 'second row is independent', items[1].get('when'))

print('\n2. Index parsing')
mf.get = lambda url, tries=3: INDEX_FIXTURE
check(mf.index_page_count() == 402, 'page count read from the pager', mf.index_page_count())
slugs = mf.scrape_index_page(1)
check('Solo_Leveling' in slugs and 'Naruto' in slugs, 'slugs extracted')
check(all('/' not in s for s in slugs), 'slugs carry no path separators')

print('\n3. write() refuses to make a committed file worse')
old = os.getcwd()
tmp = tempfile.mkdtemp()
os.chdir(tmp)
try:
    good = {'slugs': [f's{i}' for i in range(1000)]}
    check(mf.write('idx.json', good, floor=100, label='idx') is True, 'writes a healthy payload')
    check(len(json.load(open('idx.json'))['slugs']) == 1000, 'payload landed on disk')

    tiny = {'slugs': [f's{i}' for i in range(50)]}
    check(mf.write('idx.json', tiny, floor=100, label='idx') is False, 'refuses a payload under the floor')
    check(len(json.load(open('idx.json'))['slugs']) == 1000, 'and leaves the good file untouched')

    shrunk = {'slugs': [f's{i}' for i in range(400)]}   # 40% of 1000, under the 60% bar
    check(mf.write('idx.json', shrunk, floor=100, label='idx') is False, 'refuses a big shrink vs the existing file')
    check(len(json.load(open('idx.json'))['slugs']) == 1000, 'existing file still intact')

    grown = {'slugs': [f's{i}' for i in range(1200)]}
    check(mf.write('idx.json', grown, floor=100, label='idx') is True, 'accepts growth')
    check(len(json.load(open('idx.json'))['slugs']) == 1200, 'growth landed')

    check(mf.write('fresh.json', {'items': [1] * 40}, floor=30, label='items') is True,
          'a file that does not exist yet is written when it clears the floor')
finally:
    os.chdir(old)

# ── 4. --latest-only writes the feed and leaves the index alone ──
# The hourly schedule runs this mode. If it ever started rebuilding the index it
# would walk 402 pages 23 times a day for no reason; if it stopped writing the
# feed, the whole point of the hourly job would be gone. Both directions matter,
# so both are asserted. No network: the two scrapers are stubbed.
print('\n4. --latest-only mode')
old = os.getcwd()
tmp = tempfile.mkdtemp()
os.chdir(tmp)
real_latest, real_index, real_argv = mf.scrape_latest, mf.scrape_index, sys.argv
index_calls = []
try:
    mf.scrape_latest = lambda: [{'title': f't{i}', 'slug': f's{i}'} for i in range(60)]
    mf.scrape_index  = lambda: (index_calls.append(1), [f'x{i}' for i in range(2000)])[1]

    # Seed an index file so a skipped rebuild is distinguishable from a wipe.
    with open('mangafreak-index.json', 'w') as f:
        json.dump({'generatedAt': 'seed', 'source': 'x', 'slugs': ['keep']}, f)

    sys.argv = ['scrape_mangafreak.py', '--latest-only']
    mf.main()
    check(index_calls == [], 'latest-only never walks the 402-page index')
    check(len(json.load(open('mangafreak-latest.json'))['items']) == 60, 'latest-only still writes the feed')
    check(json.load(open('mangafreak-index.json'))['slugs'] == ['keep'],
          'latest-only leaves the committed index untouched')

    # And the full run — the daily 06:00 job — still does both halves.
    sys.argv = ['scrape_mangafreak.py']
    mf.main()
    check(index_calls == [1], 'a full run does walk the index')
    check(len(json.load(open('mangafreak-index.json'))['slugs']) == 2000, 'a full run rewrites the index')
    check(len(json.load(open('mangafreak-latest.json'))['items']) == 60, 'a full run still writes the feed too')
finally:
    mf.scrape_latest, mf.scrape_index, sys.argv = real_latest, real_index, real_argv
    os.chdir(old)

print('\n' + '=' * 60)
print(f'{len(fails)} failure(s)' + ('' if not fails else ': ' + ', '.join(fails)))
sys.exit(1 if fails else 0)
