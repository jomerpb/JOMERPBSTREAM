#!/usr/bin/env python3
"""Guarantees for the Streaming filter's option list.

Three things matter: a provider with nothing behind it must not get a checkbox;
the list must come back ordered by how much there is to watch, not by TMDB's
display_priority (which puts HBO Max 22nd in PH); and a throttled run must not
replace a good list with a stub.

No network: TMDB is stubbed.
"""
import importlib.util, json, os, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
spec = importlib.util.spec_from_file_location(
    'bwp', os.path.join(ROOT, '.github', 'scripts', 'build_watch_providers.py'))
bwp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bwp)

fails = []
def check(cond, label, extra=''):
    print(('  PASS  ' if cond else '  FAIL  ') + label + (('  ' + str(extra)) if extra and not cond else ''))
    if not cond:
        fails.append(label)

# Deliberately listed worst-first, the way display_priority would hand them over.
# Sized to clear bwp.FLOOR (8 surviving rows) so the shrink guard is exercised
# at its real threshold rather than a lowered one.
CATALOGUE = {('tv', 701): 0, ('tv', 223): 40, ('tv', 8): 3745, ('tv', 1899): 1122,
             ('tv', 119): 1120, ('tv', 337): 16, ('tv', 283): 325, ('tv', 160): 267,
             ('movie', 8): 5195, ('movie', 2): 2071, ('movie', 11): 99,
             ('movie', 119): 3119, ('movie', 1899): 982, ('movie', 160): 358}
PROVIDERS = {
    'tv': [{'provider_id': 701, 'provider_name': 'FilmBox+', 'logo_path': '/f.jpg'},
           {'provider_id': 223, 'provider_name': 'Hayu', 'logo_path': '/h.jpg'},
           {'provider_id': 8, 'provider_name': 'Netflix', 'logo_path': '/n.jpg'},
           {'provider_id': 1899, 'provider_name': 'HBO Max', 'logo_path': '/m.jpg'},
           {'provider_id': 119, 'provider_name': 'Amazon Prime Video'},
           {'provider_id': 337, 'provider_name': 'Disney Plus', 'logo_path': '/d.jpg'},
           {'provider_id': 283, 'provider_name': 'Crunchyroll', 'logo_path': '/c.jpg'},
           {'provider_id': 160, 'provider_name': 'iflix', 'logo_path': '/i.jpg'}],
    'movie': [{'provider_id': 8, 'provider_name': 'Netflix', 'logo_path': '/n.jpg'},
              {'provider_id': 2, 'provider_name': 'Apple TV Store', 'logo_path': '/a.jpg'},
              {'provider_id': 11, 'provider_name': 'MUBI', 'logo_path': '/u.jpg'},
              {'provider_id': 119, 'provider_name': 'Amazon Prime Video', 'logo_path': '/p.jpg'},
              {'provider_id': 1899, 'provider_name': 'HBO Max', 'logo_path': '/m.jpg'},
              {'provider_id': 160, 'provider_name': 'iflix', 'logo_path': '/i.jpg'}],
}
calls = []
def fake_get(path, **params):
    calls.append((path, params))
    if path.startswith('/watch/providers/'):
        return {'results': PROVIDERS[path.rsplit('/', 1)[-1]]}
    if path.startswith('/discover/'):
        kind = path.rsplit('/', 1)[-1]
        return {'total_results': CATALOGUE.get((kind, int(params['with_watch_providers'])), 0)}
    return {}
bwp.get = fake_get

print('1. the list is ranked by catalogue size and floored')
tv = bwp.build_kind('tv')
names = [r['name'] for r in tv]
check(names == ['Netflix', 'HBO Max', 'Amazon Prime Video', 'Crunchyroll', 'iflix'],
      'kept the real services, biggest first', names)
check('FilmBox+' not in names, 'a provider with 0 titles gets no checkbox')
check('Hayu' not in names, 'a provider under MIN_CATALOGUE gets no checkbox')
check('Disney Plus' not in names,
      'Disney+ is dropped on its 16-title catalogue, not by name')
check(all(r['count'] >= bwp.MIN_CATALOGUE for r in tv), 'every kept row clears the floor')
check(tv[0]['logo'] == '/n.jpg', 'the logo path is carried through', tv[0]['logo'])
check(tv[2]['logo'] == '', 'a provider with no logo gets an empty string, not None')

print('\n2. every discover call asks the right question')
disc = [p for p in calls if p[0].startswith('/discover/')]
check(all(d[1].get('watch_region') == bwp.REGION for d in disc),
      'watch_region is always sent — TMDB ignores the provider without it')
check(all(d[1].get('with_watch_monetization_types') == 'flatrate' for d in disc),
      'only subscription titles are counted, never rent/buy')
check(bwp.MONETIZATION == 'flatrate', 'the module default is flatrate')

print('\n3. write refuses a stub and carries the two stamps')
old = os.getcwd(); tmp = tempfile.mkdtemp()
try:
    os.chdir(tmp)
    check(bwp.main() == 0, 'a full run writes')
    first = json.load(open(bwp.OUT))
    check(first['region'] == bwp.REGION and first['monetization'] == 'flatrate',
          'region and monetization are recorded in the payload')
    check([r['name'] for r in first['tv']][:3] == ['Netflix', 'HBO Max', 'Amazon Prime Video'],
          'TV list persisted in order')
    check('MUBI' not in [r['name'] for r in first['movie']],
          'MUBI at 99 titles is below the floor', [r['name'] for r in first['movie']])

    time.sleep(1.1)
    check(bwp.main() == 0, 'an identical rerun writes')
    second = json.load(open(bwp.OUT))
    check(second['checked'] != first['checked'], 'checked moved on an unchanged rerun')
    check(second['updated'] == first['updated'], 'updated did NOT move', second['updated'])

    time.sleep(1.1)
    CATALOGUE[('tv', 8)] = 4000
    check(bwp.main() == 0, 'a run with a changed catalogue writes')
    third = json.load(open(bwp.OUT))
    check(third['updated'] != second['updated'], 'updated moved when a count changed')

    # Everything throttled away: the good file must survive.
    PROVIDERS['tv'] = []; PROVIDERS['movie'] = []
    check(bwp.main() == 1, 'an empty result set exits non-zero')
    kept = json.load(open(bwp.OUT))
    check(len(kept['tv']) == 5, 'and the good file is untouched', len(kept['tv']))
finally:
    os.chdir(old)

print('\n4. the committed watch-providers.json is real and usable')
p = os.path.join(ROOT, 'watch-providers.json')
if os.path.exists(p):
    d = json.load(open(p))
    check(d.get('region') and d.get('monetization') == 'flatrate', 'region + flatrate recorded')
    check(len(d.get('tv', [])) >= 5 and len(d.get('movie', [])) >= 5,
          f"holds {len(d.get('tv', []))} TV and {len(d.get('movie', []))} movie services")
    for kind in ('tv', 'movie'):
        rows = d[kind]
        cs = [r['count'] for r in rows]
        check(cs == sorted(cs, reverse=True), f'{kind} rows are ordered biggest-first')
        check(all(r['count'] >= d['minCatalogue'] for r in rows), f'{kind} rows clear the floor')
        check(all(isinstance(r['id'], int) and r['name'] for r in rows), f'{kind} rows carry an id and a name')
    names = [r['name'] for r in d['tv']]
    check('Netflix' in names, 'Netflix is present for TV', names[:4])
else:
    check(False, 'watch-providers.json is committed')

print('\n' + '=' * 60)
print(f'{len(fails)} failure(s)' + ('' if not fails else ': ' + ', '.join(fails)))
sys.exit(1 if fails else 0)
