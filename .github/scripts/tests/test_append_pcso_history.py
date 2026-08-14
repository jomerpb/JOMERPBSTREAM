"""Safety tests for the lottopcso second source in append_pcso_history.py.

That file's core promise is append-only: a winning number already on file is
never revised. These tests assert the second source cannot violate it, and --
since merge_entry can add a number but never correct one -- cannot admit a
bad draw that would then be stuck in the file permanently.

Offline: every page is synthetic and no history file is touched, so this makes
no network requests and needs nothing beyond the script's own dependencies.

    python3 .github/scripts/tests/test_append_pcso_history.py

Exits non-zero if any guarantee is violated.
"""
import copy, importlib.util, sys
from datetime import date, timedelta
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / 'append_pcso_history.py'
spec = importlib.util.spec_from_file_location('ah', SCRIPT)
ah = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ah)

TODAY = date(2026, 8, 14)          # a Friday
failures = []


def check(name, ok, detail=''):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail and not ok else ''}")
    if not ok:
        failures.append(name)


def entry(d='2026-08-14', nums=(28, 33, 10, 12, 22, 23), jp=1.0, w=0):
    return {'date': d, 'nums': list(nums), 'jackpot': jp, 'winners': w}


print('\n1. sanity_ok rejects draws that cannot be real')
# 6/58 draws Sun/Tue/Fri. 2026-08-14 is a Friday, 2026-08-13 a Thursday.
check('valid draw accepted', ah.sanity_ok('6/58', entry(), TODAY))
check('wrong count rejected',
      not ah.sanity_ok('6/58', entry(nums=(1, 2, 3)), TODAY))
check('repeated numbers rejected',
      not ah.sanity_ok('6/58', entry(nums=(5, 5, 10, 12, 22, 23)), TODAY))
check('out-of-range rejected (57 in a 6/42)',
      not ah.sanity_ok('6/42', entry(d='2026-08-13', nums=(57, 2, 3, 4, 5, 6)), TODAY))
check('future date rejected',
      not ah.sanity_ok('6/58', entry(d='2026-08-16'), TODAY))
check('non-draw-day rejected (6/58 does not draw Thursday)',
      not ah.sanity_ok('6/58', entry(d='2026-08-13'), TODAY))
check('unparseable date rejected',
      not ah.sanity_ok('6/58', entry(d='not-a-date'), TODAY))

print('\n2. cross_check blocks a source disagreement')
seen = {'6/58': {'2026-08-14': [1, 2, 3, 4, 5, 6]}}
check('conflict rejected', not ah.cross_check('6/58', entry(), seen))
check('agreement accepted (order-insensitive)',
      ah.cross_check('6/58', entry(nums=(23, 22, 12, 10, 33, 28)),
                     {'6/58': {'2026-08-14': [28, 33, 10, 12, 22, 23]}}))
check('unseen date accepted', ah.cross_check('6/58', entry(), {}))

print('\n3. A conflicting entry never reaches the history file')
hist = {'6/58': [entry(nums=(1, 2, 3, 4, 5, 6))]}
before = copy.deepcopy(hist)
ah.apply_lottopcso_entries(hist, {'6/58': entry()}, None, seen, TODAY)
check('history untouched on conflict', hist == before, f'{hist}')

print('\n4. Existing winning numbers are never revised')
hist = {'6/58': [entry(nums=(1, 2, 3, 4, 5, 6), jp=100.0, w=0)]}
ah.apply_lottopcso_entries(hist, {'6/58': entry(jp=999.0, w=7)}, None, {}, TODAY)
check('nums preserved', hist['6/58'][0]['nums'] == [1, 2, 3, 4, 5, 6],
      f"{hist['6/58'][0]['nums']}")
check('non-null jackpot preserved', hist['6/58'][0]['jackpot'] == 100.0,
      f"{hist['6/58'][0]['jackpot']}")

print('\n5. Null jackpot/winners ARE repaired (the intended repair path)')
hist = {'6/58': [{'date': '2026-08-14', 'nums': [28, 33, 10, 12, 22, 23],
                  'jackpot': None, 'winners': None}]}
ah.apply_lottopcso_entries(hist, {'6/58': entry(jp=206672120.91, w=0)}, None, {}, TODAY)
check('jackpot filled at full precision',
      hist['6/58'][0]['jackpot'] == 206672120.91, f"{hist['6/58'][0]['jackpot']}")

print('\n6. A genuinely new draw is added, newest-first order kept')
hist = {'6/58': [entry(d='2026-08-11', nums=(43, 6, 39, 41, 53, 57))]}
ah.apply_lottopcso_entries(hist, {'6/58': entry()}, None, {}, TODAY)
dates = [e['date'] for e in hist['6/58']]
check('added', dates == ['2026-08-14', '2026-08-11'], f'{dates}')

print('\n7. Future-dated EZ2 is rejected')
hist = {'ez2': []}
ah.apply_lottopcso_entries(hist, {}, {'date': '2026-08-20', 'draws': {'2PM': [1, 2]},
                                      'jackpot': 4000, 'winners': None}, {}, TODAY)
check('future ez2 not added', hist['ez2'] == [], f"{hist['ez2']}")

print('\n8. missing_scheduled_dates finds only real absences')
# The result is a UNION over all five games (an archive page covers every game
# drawn that day), so a fully-populated history must yield nothing at all.
LOOKBACK = 3


def full_history(skip=None):
    """Every scheduled draw in the lookback window present, except `skip`."""
    hist = {}
    for game, sched in ah.GAME_SCHED.items():
        if game == 'ez2':
            continue
        hist[game], d, found = [], TODAY, 0
        while found < LOOKBACK:
            if ah.js_weekday(d) in sched:
                found += 1
                if skip != (game, d):
                    hist[game].append({'date': d.isoformat(), 'nums': [1, 2, 3, 4, 5, 6]})
            d -= timedelta(days=1)
    return hist


missing = ah.missing_scheduled_dates(full_history(), TODAY, lookback_draws=LOOKBACK)
check('complete history reports nothing', missing == [], f'{missing}')

hole = (('6/58', date(2026, 8, 11)))
missing = ah.missing_scheduled_dates(full_history(skip=hole), TODAY, lookback_draws=LOOKBACK)
check('single absence reported', missing == [date(2026, 8, 11)], f'{missing}')

print('\n9. Archive URL uses an unpadded day (padded 404s on the real site)')
check('single digit unpadded',
      ah.lottopcso_date_url(date(2026, 8, 5)).endswith('august-5-2026/'),
      ah.lottopcso_date_url(date(2026, 8, 5)))
check('double digit intact',
      ah.lottopcso_date_url(date(2026, 8, 10)).endswith('august-10-2026/'),
      ah.lottopcso_date_url(date(2026, 8, 10)))

print('\n10. Garbage HTML yields nothing rather than junk')
games, ez2 = ah.parse_lottopcso_page('<html><body><p>nope</p></body></html>')
check('no games', games == {}, f'{games}')
check('no ez2', ez2 is None, f'{ez2}')

print('\n11. Jackpot is kept as a raw number, not a display string')
html = ('<table><tr><td>6/58 Ultra Lotto</td><td>August 14, 2026</td></tr>'
        '<tr><td>Winning Combination</td><td>28-33-10-12-22-23</td></tr>'
        '<tr><td>Jackpot Prize</td><td>₱206,672,120.91</td></tr>'
        '<tr><td>Jackpot Winner (6 out of 6)</td><td>*</td></tr></table>')
games, _ = ah.parse_lottopcso_page(html)
check('full precision float', games['6/58']['jackpot'] == 206672120.91,
      f"{games['6/58']['jackpot']!r}")
check("'*' winners parsed as None", games['6/58']['winners'] is None,
      f"{games['6/58']['winners']!r}")

print('\n' + '=' * 60)
print(f'{len(failures)} failure(s)' + (': ' + ', '.join(failures) if failures else ' — all guarantees hold'))
sys.exit(1 if failures else 0)
