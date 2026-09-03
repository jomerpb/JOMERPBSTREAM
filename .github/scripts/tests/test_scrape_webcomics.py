#!/usr/bin/env python3
"""Guarantees for the WebComics scraper.

Three things matter here. The sitemap parse must pick the right shards and the
right rows out of a multi-language sitemap; write() must never replace a good
committed file with a worse one; and the /en/ anchor must hold, because the
same shards carry pt/fr/id/es rows for the same books and those are pages this
app cannot ask for.

No network: everything is driven from fixtures.
"""
import importlib.util, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
spec = importlib.util.spec_from_file_location(
    'wc', os.path.join(ROOT, '.github', 'scripts', 'scrape_webcomics.py'))
wc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wc)

fails = []
def check(cond, label, extra=''):
    print(('  PASS  ' if cond else '  FAIL  ') + label + (('  ' + str(extra)) if extra and not cond else ''))
    if not cond:
        fails.append(label)

SITEMAP_INDEX = '''<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <sitemap><loc>https://www.webcomicsapp.com/sitemap_data/category.xml</loc></sitemap>
   <sitemap><loc>https://www.webcomicsapp.com/sitemap_data/book_detail1.xml</loc></sitemap>
   <sitemap><loc>https://www.webcomicsapp.com/sitemap_data/book_detail2.xml</loc></sitemap>
   <sitemap><loc>https://www.webcomicsapp.com/sitemap_data/chapter.xml</loc></sitemap>
</sitemapindex>'''

SHARD_1 = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://www.webcomicsapp.com/en/fantasy/solo-leveling/6887312562661d31bc3c2952</loc></url>
  <url><loc>https://www.webcomicsapp.com/pt/fantasy/solo-leveling/6887312562661d31bc3c2952</loc></url>
  <url><loc>https://www.webcomicsapp.com/fr/fantasy/solo-leveling/6887312562661d31bc3c2952</loc></url>
  <url><loc>https://www.webcomicsapp.com/en/action/a-collapsing-world/63d3d4e462661d22f8238a97</loc></url>
  <url><loc>https://www.webcomicsapp.com/en/genres</loc></url>
</urlset>'''

# Deliberately repeats one id from shard 1 — the real shards overlap.
SHARD_2 = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://www.webcomicsapp.com/en/drama/kingdom/6077fbe98c252b4b5b3d5424</loc></url>
  <url><loc>https://www.webcomicsapp.com/en/fantasy/solo-leveling/6887312562661d31bc3c2952</loc></url>
</urlset>'''

FETCHED = []
def fake_get(url, tries=3):
    FETCHED.append(url)
    if url.endswith('/sitemap.xml'):
        return SITEMAP_INDEX
    if url.endswith('book_detail1.xml'):
        return SHARD_1
    if url.endswith('book_detail2.xml'):
        return SHARD_2
    return None

real_get = wc.get
wc.get = fake_get

print('\n1. the sitemap index picks book shards and nothing else')
shards = wc.book_shards()
check(len(shards) == 2, 'exactly the two book_detail shards', shards)
check(all('book_detail' in s for s in shards), 'no category/chapter/static shards', shards)
check(not any('chapter' in s for s in shards),
      'chapter.xml is skipped — it is an order of magnitude larger and holds no book pages')

print('\n2. the parse keeps English books, deduped, and drops everything else')
FETCHED.clear()
books = wc.scrape_index()
check(len(books) == 3, 'three unique books', books)
check('fantasy/solo-leveling/6887312562661d31bc3c2952' in books, 'genre/slug/id shape kept')
check(sum(1 for b in books if 'solo-leveling' in b) == 1,
      'a book repeated across shards is stored once')
check(not any(b.startswith(('pt/', 'fr/')) for b in books),
      'pt/fr rows are dropped — those are translations this app cannot open', books)
check(not any('genres' in b for b in books), 'non-book /en/ URLs are not matched', books)
check(books == sorted(books), 'output is sorted, so a re-run with no change is a no-op diff')

print('\n3. a book id must be a real 24-hex key')
one_off = '''<urlset>
  <url><loc>https://www.webcomicsapp.com/en/drama/too-short/6077fbe98c252b4b5b3d54</loc></url>
  <url><loc>https://www.webcomicsapp.com/en/drama/not-hex/6077fbe98c252b4b5b3d54zz</loc></url>
  <url><loc>https://www.webcomicsapp.com/en/drama/good-one/6077fbe98c252b4b5b3d5499</loc></url>
</urlset>'''
wc.get = lambda url, tries=3: SITEMAP_INDEX if url.endswith('/sitemap.xml') else (
    one_off if url.endswith('book_detail1.xml') else '<urlset></urlset>')
only = wc.scrape_index()
check(only == ['drama/good-one/6077fbe98c252b4b5b3d5499'],
      'a short id and a non-hex id are both rejected', only)
wc.get = fake_get

print('\n4. write() refuses to replace a good file with a worse one')
old = os.getcwd()
tmp = tempfile.mkdtemp()
os.chdir(tmp)
try:
    with open('webcomics-index.json', 'w') as f:
        json.dump({'books': ['a/b/' + 'a' * 24] * 3000}, f)

    ok = wc.write('webcomics-index.json', {'books': ['x/y/' + 'b' * 24] * 100},
                  floor=500, label='shrunk')
    check(ok is False, 'a run returning 100 against 3000 committed is refused')
    check(len(json.load(open('webcomics-index.json'))['books']) == 3000,
          'and the committed file is left exactly as it was')

    ok = wc.write('webcomics-index.json', {'books': ['x/y/' + 'b' * 24] * 400},
                  floor=500, label='below floor')
    check(ok is False, 'a run below the absolute floor is refused even on a fresh checkout')

    ok = wc.write('webcomics-index.json', {'books': ['x/y/' + 'b' * 24] * 3100},
                  floor=500, label='good')
    check(ok is True, 'a healthy run writes')
    check(len(json.load(open('webcomics-index.json'))['books']) == 3100, 'and it really replaced the file')

    print('\n5. main() exits non-zero when the write is refused, so CI cannot go green on a bad scrape')
    with open('webcomics-index.json', 'w') as f:
        json.dump({'books': ['a/b/' + 'a' * 24] * 3000}, f)
    wc.get = lambda url, tries=3: SITEMAP_INDEX if url.endswith('/sitemap.xml') else '<urlset></urlset>'
    try:
        wc.main()
        check(False, 'main() raised SystemExit on a refused write')
    except SystemExit as e:
        check(e.code == 1, 'main() exits 1 on a refused write', e.code)
    check(len(json.load(open('webcomics-index.json'))['books']) == 3000,
          'and still did not touch the committed index')
finally:
    wc.get = real_get
    os.chdir(old)

print('\n6. the committed index is real and usable')
idx = os.path.join(ROOT, 'webcomics-index.json')
if os.path.exists(idx):
    d = json.load(open(idx))
    books = d.get('books', [])
    check(len(books) > 500, f'committed index holds {len(books)} books')
    check(all(b.count('/') == 2 for b in books), 'every entry is genre/slug/id')
    ids = [b.rsplit('/', 1)[-1] for b in books]
    check(len(set(ids)) == len(ids), 'no duplicate ids')
    check(all(len(i) == 24 for i in ids), 'every id is 24 chars')
else:
    check(False, 'webcomics-index.json is committed')

print('\n' + '=' * 60)
print(f'{len(fails)} failure(s)' + ('' if not fails else ': ' + ', '.join(fails)))
sys.exit(1 if fails else 0)
