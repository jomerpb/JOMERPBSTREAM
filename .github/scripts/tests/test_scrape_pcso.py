"""Safety tests for the lottopcso second-source merge in scrape_pcso.py.

Each test asserts a property that must hold for that second source to be
unable to degrade a result businesslist.ph already reported correctly.

Offline: every fetch is stubbed and every page is synthetic, so this makes no
network requests and needs nothing beyond the scraper's own dependencies.

    python3 .github/scripts/tests/test_scrape_pcso.py

Exits non-zero if any guarantee is violated.
"""
import copy, importlib.util, sys
from datetime import date
from pathlib import Path

SCRAPER = Path(__file__).resolve().parent.parent / 'scrape_pcso.py'
spec = importlib.util.spec_from_file_location('sp', SCRAPER)
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)

TODAY = date(2026, 8, 14)


def mk_html(games=(), ez2_date=None, ez2_draws=()):
    """Build a page in lottopcso's real table shape (verified against live HTML)."""
    parts = []
    for name, when, combo, jp in games:
        parts.append(
            f'<table><tr><td>{name}</td><td>{when}</td></tr>'
            f'<tr><td>Winning Combination</td><td>{combo}</td></tr>'
            f'<tr><td>Jackpot Prize</td><td>{jp}</td></tr>'
            f'<tr><td>Jackpot Winner (6 out of 6)</td><td>*</td></tr></table>')
    if ez2_date:
        rows = ''.join(f'<tr><td>{t}</td><td>{c}</td></tr>' for t, c in ez2_draws)
        parts.append(f'<table><tr><td>2D Lotto</td><td>{ez2_date}</td></tr>{rows}</table>')
    # A non-result table, to prove the parser skips what isn't a game result.
    parts.append('<table><tr><td>Prize Amount</td><td>Where to claim?</td></tr></table>')
    return ''.join(parts)


def run(html_or_exc, balls, ez2):
    """Run merge with fetch stubbed; returns mutated (balls, ez2)."""
    balls, ez2 = copy.deepcopy(balls), copy.deepcopy(ez2)
    def fake_fetch(url, headers=None):
        if isinstance(html_or_exc, Exception):
            raise html_or_exc
        return html_or_exc
    orig, sp.fetch = sp.fetch, fake_fetch
    try:
        sp.merge_lottopcso(ez2, balls, TODAY)
    finally:
        sp.fetch = orig
    return balls, ez2


CURRENT = {'6/58': {'nums': [1, 2, 3, 4, 5, 6], 'jackpot': '₱200.0M',
                    'draw_date': 'August 14, 2026', 'winners': 0}}
EMPTY_EZ2 = {'2PM': [], '5PM': [], '9PM': []}
FULL_EZ2 = {'2PM': [20, 30], '5PM': [8, 25], '9PM': [22, 12]}

failures = []


def check(name, ok, detail=''):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail and not ok else ''}")
    if not ok:
        failures.append(name)


print('\n1. No-op when businesslist is already current')
html = mk_html([('6/58 Ultra Lotto', 'August 14, 2026', '01-02-03-04-05-06', '₱200,000,000.00')],
               'August 14, 2026', [('2:00 PM', '20-30'), ('5:00 PM', '08-25'), ('9:00 PM', '22-12')])
b, e = run(html, CURRENT, FULL_EZ2)
check('balls untouched', b == CURRENT, f'{b}')
check('ez2 untouched', e == FULL_EZ2, f'{e}')

print('\n2. Same-day source DISAGREEMENT keeps businesslist numbers')
html = mk_html([('6/58 Ultra Lotto', 'August 14, 2026', '11-22-33-44-55-56', '₱200,000,000.00')])
b, _ = run(html, CURRENT, EMPTY_EZ2)
check('verified nums preserved', b['6/58']['nums'] == [1, 2, 3, 4, 5, 6], f"{b['6/58']['nums']}")

print('\n3. Older lottopcso draw never overrides a newer businesslist draw')
html = mk_html([('6/58 Ultra Lotto', 'August 11, 2026', '11-22-33-44-55-56', '₱190,000,000.00')])
b, _ = run(html, CURRENT, EMPTY_EZ2)
check('newer businesslist kept', b == CURRENT, f'{b}')

print('\n4. Newer lottopcso draw IS adopted when businesslist lags')
stale = {'6/58': {'nums': [1, 2, 3, 4, 5, 6], 'jackpot': '₱200.0M',
                  'draw_date': 'August 11, 2026', 'winners': 0}}
html = mk_html([('6/58 Ultra Lotto', 'August 14, 2026', '28-33-10-12-22-23', '₱206,672,120.91')])
b, _ = run(html, stale, EMPTY_EZ2)
check('adopted newer draw', b['6/58']['nums'] == [28, 33, 10, 12, 22, 23], f"{b['6/58']}")
check('jackpot reformatted', b['6/58']['jackpot'] == '₱206.7M', f"{b['6/58']['jackpot']}")
check('no private _date leaked', '_date' not in b['6/58'], f"{list(b['6/58'])}")
check('schema keys unchanged', set(b['6/58']) == set(CURRENT['6/58']), f"{set(b['6/58'])}")

print("\n5. EZ2 from a NON-today page is never merged (would fabricate today's draw)")
html = mk_html(ez2_date='August 13, 2026',
               ez2_draws=[('2:00 PM', '11-12'), ('5:00 PM', '13-14'), ('9:00 PM', '15-16')])
_, e = run(html, CURRENT, EMPTY_EZ2)
check('stale EZ2 rejected', e == EMPTY_EZ2, f'{e}')

print('\n6. EZ2 fills only slots businesslist left pending')
html = mk_html(ez2_date='August 14, 2026',
               ez2_draws=[('2:00 PM', '99-99'), ('9:00 PM', '22-12')])
partial = {'2PM': [20, 30], '5PM': [], '9PM': []}
_, e = run(html, CURRENT, partial)
check('existing 2PM preserved', e['2PM'] == [20, 30], f"{e['2PM']}")
check('pending 9PM filled', e['9PM'] == [22, 12], f"{e['9PM']}")
check('undrawn 5PM left empty', e['5PM'] == [], f"{e['5PM']}")

print('\n7. Fetch failure leaves everything untouched')
b, e = run(RuntimeError('network down'), CURRENT, FULL_EZ2)
check('balls untouched', b == CURRENT)
check('ez2 untouched', e == FULL_EZ2)

print('\n8. Garbage HTML leaves everything untouched')
b, e = run('<html><body><p>nothing here</p></body></html>', CURRENT, FULL_EZ2)
check('balls untouched', b == CURRENT)
check('ez2 untouched', e == FULL_EZ2)

print('\n9. Out-of-range numbers rejected (6/42 cannot contain 57)')
html = mk_html([('6/42 Lotto', 'August 14, 2026', '57-02-03-04-05-06', '₱31,000,000.00')])
b, _ = run(html, {'6/42': {'nums': [], 'jackpot': '', 'draw_date': '', 'winners': 0}}, EMPTY_EZ2)
check('bad draw not adopted', b['6/42']['nums'] == [], f"{b['6/42']['nums']}")

print('\n10. Blank jackpot backfilled on a tie, numbers untouched')
noj = {'6/58': {'nums': [1, 2, 3, 4, 5, 6], 'jackpot': '',
                'draw_date': 'August 14, 2026', 'winners': 0}}
html = mk_html([('6/58 Ultra Lotto', 'August 14, 2026', '01-02-03-04-05-06', '₱206,672,120.91')])
b, _ = run(html, noj, EMPTY_EZ2)
check('jackpot filled', b['6/58']['jackpot'] == '₱206.7M', f"{b['6/58']['jackpot']}")
check('nums untouched', b['6/58']['nums'] == [1, 2, 3, 4, 5, 6])

print('\n' + '=' * 60)
print(f'{len(failures)} failure(s)' + (': ' + ', '.join(failures) if failures else ' — all guarantees hold'))
sys.exit(1 if failures else 0)
