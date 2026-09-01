#!/usr/bin/env python3
"""
PCSO Results Scraper v20
- Consolidated page: EZ2 today only + 6-ball nums (today/yesterday fallback)
- Individual game pages: jackpot + draw_date (handles div-based structure on GHA)
- Numbers in div as concatenated pairs: '4656080103 05NUMERICAL ORDER' -> [46,56,8,1,3,5]
- v20: lottopcso.com read as a second opinion, merged newest-draw-wins (see
  the SECOND SOURCE block below). Output schema is unchanged.
"""

import json, re, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta

PH_TZ = timezone(timedelta(hours=8))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.businesslist.ph/lottery',
}

CONSOLIDATED_URL = 'https://www.businesslist.ph/lottery/pcso-lotto-results-today'

BALL_PAGES = {
    '6/58': ('https://www.businesslist.ph/lottery/result/ultra-lotto-658', 58),
    '6/55': ('https://www.businesslist.ph/lottery/result/grand-lotto-655', 55),
    '6/49': ('https://www.businesslist.ph/lottery/result/superlotto-649', 49),
    '6/45': ('https://www.businesslist.ph/lottery/result/megalotto-645', 45),
    '6/42': ('https://www.businesslist.ph/lottery/result/lotto-642', 42),
}

SCHED = {
    '6/58': [0, 2, 5],
    '6/55': [1, 3, 6],
    '6/49': [0, 2, 4],
    '6/45': [1, 3, 5],
    '6/42': [2, 4, 6],
}


def fetch(url, headers=None):
    r = requests.get(url, headers=headers or HEADERS, timeout=20)
    r.raise_for_status()
    print(f"  {url.split('/')[-1] or url} → HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def format_jackpot(raw):
    try:
        v = float(raw.replace(',', '').strip())
        return f'₱{v/1_000_000:.1f}M' if v >= 1_000_000 else f'₱{v:,.0f}'
    except:
        return raw


def extract_ball_nums(text, max_val):
    """Split concatenated number string into 2-digit pairs.
    e.g. '4656080103 05NUMERICAL ORDER' → [46,56,8,1,3,5]
    """
    digits_only = re.sub(r'\D', '', text)
    if len(digits_only) == 12:
        pairs = [int(digits_only[i:i+2]) for i in range(0, 12, 2)]
        if all(1 <= n <= max_val for n in pairs):
            return pairs
    return []


def parse_ez2_cell(text):
    """EZ2 cell: '2PM   21   24      5PM   27   30      9PM   ?   ?'"""
    ez2 = {'2PM': [], '5PM': [], '9PM': []}
    parts = re.split(r'\b(2PM|5PM|9PM)\b', text)
    current = None
    for part in parts:
        part = part.strip()
        if part in ('2PM', '5PM', '9PM'):
            current = part
        elif current:
            nums = [int(n) for n in re.findall(r'\b(\d{1,2})\b', part)
                    if 1 <= int(n) <= 31]
            if len(nums) == 2:
                ez2[current] = nums
            current = None
    return ez2


def parse_consolidated(html):
    """Parse consolidated page — EZ2 today only, 6-ball nums today+yesterday."""
    soup = BeautifulSoup(html, 'html.parser')
    MAX_VAL = {'6/58': 58, '6/55': 55, '6/49': 49, '6/45': 45, '6/42': 42}
    ez2_today = {'2PM': [], '5PM': [], '9PM': []}
    balls_today, balls_yest = {}, {}
    current_section = None

    for tag in soup.find_all(['h2', 'table']):
        if tag.name == 'h2':
            txt = tag.get_text(strip=True)
            if 'Today' in txt:       current_section = 'today'
            elif 'Yesterday' in txt: current_section = 'yesterday'
            else:                    current_section = None

        elif tag.name == 'table' and current_section in ('today', 'yesterday'):
            for row in tag.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 3: continue
                gc = cells[1].get_text(strip=True)
                nc = cells[2].get_text(separator=' ', strip=True)

                if '2D' in gc:
                    if current_section == 'today':
                        ez2_today = parse_ez2_cell(nc)
                else:
                    for g, mx in MAX_VAL.items():
                        if g in gc:
                            text = re.sub(r'\b(2PM|5PM|9PM)\b', '', nc)
                            nums = [int(n) for n in re.findall(r'\b(\d{1,2})\b', text)
                                    if 1 <= int(n) <= mx]
                            if len(nums) == 6:
                                if current_section == 'today' and g not in balls_today:
                                    balls_today[g] = nums
                                elif current_section == 'yesterday' and g not in balls_yest:
                                    balls_yest[g] = nums

    return ez2_today, balls_today, balls_yest


def parse_individual(html, max_val):
    """Get nums + jackpot + draw_date from individual game page.
    Handles GHA div structure: numbers are concatenated in a single div.
    Today first, yesterday fallback.
    """
    soup = BeautifulSoup(html, 'html.parser')

    for section in ['Today', 'Yesterday']:
        h2 = None
        for h in soup.find_all('h2'):
            if section in h.get_text(strip=True):
                h2 = h
                break
        if not h2:
            continue

        nums, jackpot, draw_date, winners = [], '', '', 0

        for sib in h2.next_siblings:
            if hasattr(sib, 'name') and sib.name == 'h2':
                break
            if not hasattr(sib, 'name') or not sib.name:
                continue
            t = sib.get_text(strip=True)
            if not t:
                continue

            # Date: 'Sunday | June 28, 2026'
            m_dt = re.search(r'(\w+\s+\d+,\s*\d{4})', t)
            if m_dt:
                draw_date = m_dt.group(1)
                continue

            # Jackpot + winners: 'JACKPOT: 128,000,000 - WINNERS: 0'
            m_jp = re.search(r'JACKPOT[:\s]*([0-9,]+(?:\.\d+)?)', t, re.I)
            if m_jp:
                jackpot = format_jackpot(m_jp.group(1))
                m_w = re.search(r'WINNERS?[:\s]*(\d+)', t, re.I)
                if m_w:
                    winners = int(m_w.group(1))
                continue

            # Numbers — concatenated 2-digit pairs in a div
            if not nums:
                nums = extract_ball_nums(t, max_val)

        if len(nums) == 6:
            return {'nums': nums, 'jackpot': jackpot, 'draw_date': draw_date, 'winners': winners}

    return {'nums': [], 'jackpot': '', 'draw_date': '', 'winners': 0}


# ── SECOND SOURCE: lottopcso.com ─────────────────────────────────────────
# businesslist.ph routinely lags on same-day 9PM draws. Measured 2026-08-14 at
# 21:55 PH it served 6/58 as Aug 11 and 6/45 as Aug 12 — both Friday draw days
# it had simply not published — and EZ2 9PM as pending, while lottopcso.com
# already carried all three. lottopcso is therefore read as a second opinion.
#
# Trust basis: sampled against the verified pcso-history.json for 2026-08-10,
# 2026-08-05 and 2026-07-28, the two sources agreed exactly on winning numbers
# AND jackpot for all five games (7/7 dated entries).
#
# Merge rule is deliberately conservative — newer draw date wins, a tie keeps
# businesslist's numbers and only backfills fields it left blank. So when
# businesslist is current this whole step is a no-op and the output is
# identical to v19's.

LOTTOPCSO_URL = 'https://www.lottopcso.com/'

LOTTOPCSO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

GAME_TOKENS = ('6/58', '6/55', '6/49', '6/45', '6/42')

DRAW_TIME_RE = re.compile(r'^(\d{1,2}):(\d{2})\s*(AM|PM)$', re.I)
COMBINATION_RE = re.compile(r'^\d{1,2}(-\d{1,2})+$')


def parse_page_date(text):
    """'August 14, 2026' -> date(2026, 8, 14). None if it isn't a date."""
    for fmt in ('%B %d, %Y', '%b. %d, %Y', '%b %d, %Y'):
        try:
            return datetime.strptime((text or '').strip(), fmt).date()
        except ValueError:
            continue
    return None


def format_page_date(d):
    """date -> 'August 4, 2026', matching the unpadded style already emitted."""
    return d.strftime('%B %d, %Y').replace(' 0', ' ')


def parse_lottopcso(html):
    """Read lottopcso's homepage tables. Returns (ez2_or_None, balls_by_game).

    Each game is a 2-column table whose header row is (game name, draw date):
        ['6/58 Ultra Lotto', 'August 14, 2026']
        ['Winning Combination', '28-33-10-12-22-23']
        ['Jackpot Prize', '₱206,672,120.91']
        ['Jackpot Winner (6 out of 6)', '*']      <- '*' means not yet published
    2D Lotto instead lists one row per draw time: ['2:00 PM', '20-30'].
    """
    soup = BeautifulSoup(html, 'html.parser')
    balls, ez2 = {}, None

    for table in soup.find_all('table'):
        rows = [[c.get_text(' ', strip=True) for c in tr.find_all(['td', 'th'])]
                for tr in table.find_all('tr')]
        rows = [r for r in rows if r]
        # Non-result tables (prize claiming, jackpot summaries, winner lists)
        # don't have a (name, date) header pair and fall out here.
        if not rows or len(rows[0]) != 2:
            continue
        draw_date = parse_page_date(rows[0][1])
        if not draw_date:
            continue

        title = rows[0][0]
        pairs = [(r[0].strip(), r[1].strip()) for r in rows[1:] if len(r) == 2]

        if title.startswith('2D Lotto'):
            draws = {}
            for label, value in pairs:
                m = DRAW_TIME_RE.match(label)
                if not m or not COMBINATION_RE.match(value):
                    continue
                nums = [int(x) for x in value.split('-')]
                if len(nums) == 2 and all(1 <= n <= 31 for n in nums):
                    draws[f'{int(m.group(1))}{m.group(3).upper()}'] = nums
            if draws and (ez2 is None or draw_date > ez2['date']):
                ez2 = {'date': draw_date, 'draws': draws}
            continue

        game = next((t for t in GAME_TOKENS if t in title), None)
        if not game:
            continue
        max_val = int(game.split('/')[1])

        nums, jackpot, winners = [], '', None
        for label, value in pairs:
            low = label.lower()
            if low.startswith('winning combination') and COMBINATION_RE.match(value):
                cand = [int(x) for x in value.split('-')]
                if len(cand) == 6 and all(1 <= n <= max_val for n in cand):
                    nums = cand
            elif low.startswith('jackpot prize') and re.search(r'\d', value):
                jackpot = format_jackpot(re.sub(r'[^\d.]', '', value))
            elif low.startswith('jackpot winner') and winners is None:
                digits = re.sub(r'\D', '', value.split('(')[0])
                winners = int(digits) if digits else None

        if not nums:
            continue
        if game not in balls or draw_date > balls[game]['_date']:
            balls[game] = {
                'nums': nums,
                'jackpot': jackpot,
                # winners is coerced to 0 (not None) so the JSON schema stays
                # exactly what v19 emitted and the frontend already reads.
                'winners': winners if winners is not None else 0,
                'draw_date': format_page_date(draw_date),
                '_date': draw_date,
            }

    return ez2, balls


def merge_lottopcso(ez2_map, balls_map, today_ph):
    """Fold lottopcso's reading into the businesslist results, in place."""
    try:
        print('\nFetching lottopcso.com (second source) ...')
        alt_ez2, alt_balls = parse_lottopcso(fetch(LOTTOPCSO_URL, LOTTOPCSO_HEADERS))
    except Exception as e:
        print(f'  lottopcso ERROR: {type(e).__name__}: {e} — keeping businesslist data as-is')
        return

    for game, alt in alt_balls.items():
        cur = balls_map.get(game) or {}
        cur_date = parse_page_date(cur.get('draw_date'))

        if not cur.get('nums'):
            reason = 'businesslist had no draw'
        elif cur_date is None:
            # businesslist fell back to undated consolidated numbers; an
            # explicitly dated draw is strictly more informative than that.
            reason = 'businesslist entry undated'
        elif alt['_date'] > cur_date:
            reason = f"newer than businesslist's {cur['draw_date']}"
        else:
            # Same draw (or ours is newer): never touch verified numbers,
            # just fill in anything businesslist left blank.
            if cur_date == alt['_date'] and not cur.get('jackpot') and alt['jackpot']:
                cur['jackpot'] = alt['jackpot']
                print(f"  {game}: filled blank jackpot {alt['jackpot']}")
            continue

        balls_map[game] = {k: v for k, v in alt.items() if k != '_date'}
        print(f"  {game}: using lottopcso {alt['draw_date']} {alt['nums']} ({reason})")

    if not alt_ez2:
        return
    # Guard: only ever merge EZ2 when the page is showing TODAY. Without this
    # a pending 9PM slot would be backfilled with yesterday's numbers.
    if alt_ez2['date'] != today_ph:
        print(f"  EZ2: skipped — lottopcso shows {alt_ez2['date']}, not today ({today_ph})")
        return
    for hour, nums in alt_ez2['draws'].items():
        if hour in ez2_map and not ez2_map.get(hour):
            ez2_map[hour] = nums
            print(f'  EZ2 {hour}: {nums} (businesslist still pending)')


def build_output(ez2_map, balls_map):
    now_ph = datetime.now(PH_TZ)
    return {
        # This script rewrites the whole file every run, so both stamps are the
        # same moment here. `checked` exists so the page can read one field name
        # across both PCSO files — pcso-history.json is append-only and there
        # the two genuinely differ. See save_history() in append_pcso_history.py.
        'updated': now_ph.isoformat(),
        'checked': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': d, 'nums': ez2_map.get(d, []), 'cutoff': c}
            for d, c in [('2PM', 14), ('5PM', 17), ('9PM', 21)]
        ],
        'balls': [
            {
                'game':      gk,
                'nums':      balls_map[gk]['nums'],
                'done':      len(balls_map[gk]['nums']) == 6,
                'jackpot':   balls_map[gk]['jackpot'],
                'draw_date': balls_map[gk]['draw_date'],
                'winners':   balls_map[gk].get('winners', 0),
                'days':      SCHED[gk],
            }
            for gk in ['6/58', '6/55', '6/49', '6/45', '6/42']
        ],
    }


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v20 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    ez2_map   = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {g: {'nums': [], 'jackpot': '', 'draw_date': '', 'winners': 0} for g in BALL_PAGES}

    # Step 1 — Consolidated page
    try:
        print("Fetching consolidated page ...")
        html = fetch(CONSOLIDATED_URL)
        ez2_map, balls_today, balls_yest = parse_consolidated(html)
        ez2_found = sum(1 for v in ez2_map.values() if v)
        print(f"  EZ2: {ez2_map}")
        print(f"  Balls today: {list(balls_today.keys())} | Yesterday: {list(balls_yest.keys())}")
    except Exception as e:
        print(f"  Consolidated ERROR: {type(e).__name__}: {e}")
        balls_today, balls_yest = {}, {}

    # Step 2 — Individual pages (jackpot + draw_date + confirm nums)
    print("\nFetching individual game pages ...")
    for game, (url, max_val) in BALL_PAGES.items():
        try:
            html = fetch(url)
            info = parse_individual(html, max_val)

            if info['nums']:
                balls_map[game] = info
            else:
                # Fallback to consolidated nums if individual page has no draw
                nums = balls_today.get(game) or balls_yest.get(game) or []
                balls_map[game] = {'nums': nums, 'jackpot': '', 'draw_date': ''}

            if balls_map[game]['nums']:
                print(f"  {game}: {balls_map[game]['nums']} | {balls_map[game]['jackpot']} | {balls_map[game]['draw_date']}")
            else:
                print(f"  {game}: no draw today or pending")

        except Exception as e:
            print(f"  {game} ERROR: {type(e).__name__}: {e}")
            nums = balls_today.get(game) or balls_yest.get(game) or []
            balls_map[game] = {'nums': nums, 'jackpot': '', 'draw_date': ''}

    # Step 3 — second opinion (never overrides a same-day businesslist draw)
    merge_lottopcso(ez2_map, balls_map, now_ph.date())

    output = build_output(ez2_map, balls_map)

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found   = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")


if __name__ == '__main__':
    main()
