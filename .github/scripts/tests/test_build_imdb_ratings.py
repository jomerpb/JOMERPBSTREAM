#!/usr/bin/env python3
"""Guarantees for the IMDb ratings pipeline.

Four things matter. The dataset parse must honour the vote floor and survive
malformed rows; the gap encoding must round-trip EXACTLY, because a decoder that
drifts by one silently hands every card its neighbour's rating; write() must
never replace a good file with a truncated one; and `checked` must move on every
run while `updated` moves only on a real change — the distinction the PCSO
label already had to learn once.

No network: everything is driven from fixtures.
"""
import importlib.util, io, json, os, sys, gzip, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
spec = importlib.util.spec_from_file_location(
    'bir', os.path.join(ROOT, '.github', 'scripts', 'build_imdb_ratings.py'))
bir = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bir)

fails = []
def check(cond, label, extra=''):
    print(('  PASS  ' if cond else '  FAIL  ') + label + (('  ' + str(extra)) if extra and not cond else ''))
    if not cond:
        fails.append(label)

def gz(text):
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode='wb') as f:
        f.write(text.encode())
    return buf.getvalue()

SAMPLE = '\n'.join([
    'tconst\taverageRating\tnumVotes',
    'tt0000001\t5.7\t2231',      # keep
    'tt0000002\t5.4\t99',        # drop — under the floor
    'tt0000003\t6.5\t100',       # keep — exactly the floor
    'tt32199328\t6.6\t11462',    # keep — Newtopia, the worked example
    'tt0000004\tnot-a-number\t500',   # malformed rating
    'tt0000005\t7.0\tlots',           # malformed votes
    'tt0000006\t9.9',                 # short row
    'tt0000007\t10.0\t1000000',  # keep — top of the scale
]) + '\n'

print('1. parse() honours the vote floor and skips junk')
rows, skipped = bir.parse(gz(SAMPLE))
got = dict(rows)
check(len(rows) == 4, 'kept exactly the 4 rows at/over 100 votes', len(rows))
check(skipped == 3, 'counted the 3 malformed rows', skipped)
check(1 not in [t for t, _ in rows] or got.get(1) == 57, 'tt0000001 -> 5.7 stored as 57', got.get(1))
check(got.get(2) is None, 'the 99-vote row was dropped')
check(got.get(3) == 65, 'the exactly-100-vote row was kept', got.get(3))
check(got.get(32199328) == 66, 'Newtopia -> 6.6 stored as 66', got.get(32199328))
check(got.get(7) == 100, '10.0 survives as 100, not clipped', got.get(7))
check(rows == sorted(rows), 'rows come back sorted by tconst')

print('\n2. a different floor changes what survives')
rows2, _ = bir.parse(gz(SAMPLE), min_votes=5000)
check([t for t, _ in rows2] == [7, 32199328], 'floor 5000 keeps only the two big ones, still sorted',
      [t for t, _ in rows2])

print('\n3. the gap encoding round-trips exactly')
gaps, vals = bir.encode(rows)
check(len(gaps) == len(vals) == len(rows), 'parallel arrays are the same length')
check(all(g > 0 for g in gaps), 'every gap is positive (input was sorted and deduped)')
check(bir.decode(gaps, vals) == dict(rows), 'decode(encode(x)) == x')
# The gap of the first entry IS the first tconst — a decoder that seeds its
# running sum at anything but zero shifts every title by a constant.
check(gaps[0] == rows[0][0], 'first gap equals the first tconst (decoder seeds at 0)', gaps[0])

print('\n4. a big synthetic set round-trips too')
big = sorted((i * 7 + 1, (i % 100) + 1) for i in range(20000))
check(bir.decode(*bir.encode(big)) == dict(big), '20,000 rows survive the round trip')

print('\n5. write() refuses to shrink a good file')
old = os.getcwd()
tmp = tempfile.mkdtemp()
try:
    os.chdir(tmp)
    good = [(i, 70) for i in range(1, 300001)]
    check(bir.write('r.json', good, floor=250_000) is True, 'a full payload writes')
    first = json.load(open('r.json'))
    check(first['count'] == 300000, 'count recorded', first.get('count'))
    check(first['minVotes'] == bir.MIN_VOTES, 'minVotes recorded')

    # A truncated scrape must not land.
    check(bir.write('r.json', good[:100000], floor=250_000) is False,
          'a payload under the floor is refused')
    check(json.load(open('r.json'))['count'] == 300000, 'and the good file is untouched')

    # The guard is `new < old * 0.6`, the same ratio the MangaFreak and
    # WebComics scrapers use. It is a backstop, not the primary defence: a
    # truncated download raises out of gzip before parse() returns a single
    # row, so the case this actually catches is IMDb publishing a materially
    # smaller set. Pin both sides of the line so a future edit cannot quietly
    # loosen it.
    check(bir.write('r.json', [(i, 70) for i in range(1, 179000)], floor=250_000) is False,
          'a payload under 60% of the committed size is refused')
    check(json.load(open('r.json'))['count'] == 300000, 'and the good file is still untouched')
    check(bir.write('r.json', [(i, 70) for i in range(1, 260001)], floor=250_000) is True,
          'a payload at 87% is allowed through (IMDb only ever grows slowly)')
finally:
    os.chdir(old)

print('\n6. checked moves every run, updated only on a real change')
tmp2 = tempfile.mkdtemp()
try:
    os.chdir(tmp2)
    import time
    good = [(i, 70) for i in range(1, 300001)]
    bir.write('s.json', good, floor=250_000)
    first2 = json.load(open('s.json'))
    time.sleep(1.1)
    bir.write('s.json', good, floor=250_000)          # byte-identical rebuild
    second = json.load(open('s.json'))
    check(second['checked'] != first2['checked'], 'checked moved on an unchanged rebuild')
    check(second['updated'] == first2['updated'], 'updated did NOT move', second['updated'])

    time.sleep(1.1)
    bir.write('s.json', good[:-1] + [(300000, 71)], floor=250_000)
    third = json.load(open('s.json'))
    check(third['updated'] != second['updated'], 'updated moved when a rating changed')
finally:
    os.chdir(old)

print('\n7. the committed imdb-ratings.json is real and usable')
p = os.path.join(ROOT, 'imdb-ratings.json')
if os.path.exists(p):
    d = json.load(open(p))
    check(isinstance(d.get('d'), list) and isinstance(d.get('r'), list), 'carries both arrays')
    check(len(d['d']) == len(d['r']) == d['count'], 'arrays agree with count')
    m = bir.decode(d['d'], d['r'])
    check(len(m) == d['count'], 'decodes to the advertised number of titles')
    check(all(1 <= v <= 100 for v in d['r']), 'every rating is within 1..100')
    check(d['count'] > 250_000, f"holds {d['count']} titles")
    # The worked example from the docs, so a bad rebuild is visible here.
    check(m.get(32199328) == 66, 'Newtopia (tt32199328) reads 6.6', m.get(32199328))
else:
    check(False, 'imdb-ratings.json is committed')

print('\n8. parse_basics joins ratings and encodes genres as a bitmask')
BASICS = '\n'.join([
    'tconst\ttitleType\tprimaryTitle\toriginalTitle\tisAdult\tstartYear\tendYear\truntimeMinutes\tgenres',
    'tt0000001\tmovie\tA\tA\t0\t1999\t\\N\t90\tHorror,Thriller',
    'tt0000002\ttvSeries\tB\tB\t0\t2010\t2012\t45\tDrama',
    'tt0000003\tshort\tC\tC\t0\t2001\t\\N\t9\tComedy',      # wrong type
    'tt0000004\tmovie\tD\tD\t1\t2005\t\\N\t80\tHorror',     # adult
    'tt0000005\tmovie\tE\tE\t0\t2003\t\\N\t95\tHorror',     # no rating
    'tt0000006\ttvMiniSeries\tF\tF\t0\t\\N\t\\N\t50\t\\N',  # no year, no genre
]) + '\n'
RAT = {'tt0000001': (7.5, 5000), 'tt0000002': (8.1, 900),
       'tt0000003': (6.0, 500), 'tt0000004': (5.0, 500), 'tt0000006': (6.2, 300)}
brows, vocab = bir.parse_basics(gz(BASICS), RAT)
ids = [r[0] for r in brows]
check(ids == [1, 2, 6], 'kept only rated, non-adult, browsable types', ids)
check(brows == sorted(brows), 'rows come back sorted')
by = {r[0]: r for r in brows}
check(by[1][1] == 0 and by[2][1] == 1 and by[6][1] == 2,
      'movie/tvSeries/tvMiniSeries encode as 0/1/2')
check(by[1][2] == 1999 and by[6][2] == 0, 'a missing startYear becomes 0', by[6][2])
hb, tb = 1 << vocab.index('Horror'), 1 << vocab.index('Thriller')
check(by[1][3] == (hb | tb), 'both genres are set in one bitmask', bin(by[1][3]))
check(by[6][3] == 0, 'a genreless title gets mask 0 and is still kept (it keeps its rating)')
check(by[1][4] == 7.5 and by[1][5] == 5000, 'rating and votes come from the ratings join')

print('\n9. vote buckets keep the ordering that matters')
b100, b1k, b400k = bir.vote_bucket(100), bir.vote_bucket(1000), bir.vote_bucket(400000)
check(b100 < b1k < b400k, 'more votes -> a higher bucket', (b100, b1k, b400k))
check(all(0 <= bir.vote_bucket(v) <= 255 for v in (1, 100, 10**7)), 'every bucket fits in one byte')
check(bir.vote_bucket(0) == bir.vote_bucket(1), 'zero votes does not blow up the log')

print('\n10. the committed imdb-browse.json is real and usable')
pb = os.path.join(ROOT, 'imdb-browse.json')
if os.path.exists(pb):
    d = json.load(open(pb))
    n = d['count']
    check(all(len(d[k]) == n for k in ('d', 't', 'y', 'g', 'r', 'v')),
          'every parallel array matches count')
    check(len(d['genres']) >= 20, f"carries {len(d['genres'])} genre labels")
    check(set(d['t']) <= {0, 1, 2}, 'only the three browsable type codes appear')
    check(all(1 <= x <= 100 for x in d['r']), 'ratings stay within 1..100')
    check(all(g > 0 for g in d['d']), 'gaps are positive, so ids are sorted and unique')
    check(n > 100_000, f'holds {n} browsable titles')
    ty = {}
    for t in d['t']:
        ty[t] = ty.get(t, 0) + 1
    check(ty.get(1, 0) + ty.get(2, 0) > 20_000,
          f"enough TV titles to browse ({ty.get(1,0)+ty.get(2,0)})")
else:
    check(False, 'imdb-browse.json is committed')

print('\n' + '=' * 60)
print(f'{len(fails)} failure(s)' + ('' if not fails else ': ' + ', '.join(fails)))
sys.exit(1 if fails else 0)
