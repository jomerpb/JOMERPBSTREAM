#!/usr/bin/env python3
"""
PCSO Results Scraper v9
Source: pwedeh.com (daily dated pages)
No 'date' field in balls output entries
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
}

SCHED = {
    '6/58': [0, 2, 5],
    '6/55': [1, 3, 6],
    '6/49': [0, 2, 4],
    '6/45': [1, 3, 5],
    '6/42': [2, 4, 6],
}

MONTHS = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
]


def build_url(dt):
    m = MONTHS[dt.month - 1]
    return f"https://pwedeh.com/lotto-result-{m}-{dt.day}-{dt.year}/"


def parse_nums(text, count, max_val=58):
    """Extract exactly `count` valid lotto numbers, stripping game labels."""
    text = re.sub(r'\d+/\d+', '', text)
    nums = re.findall(r'\b(\d{1,2})\b', text)
    result = [int(n) for n in nums if 1 <= int(n) <= max_val]
    return result[:count] if len(result) >= count else []


def parse(html):
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text(separator='\n')

    ez2_map  = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {}

    # Split on headings (### Section)
    sections = re.split(r'###\s+', text)

    for section in sections:
        if not section.strip():
            continue
        lines = [l.strip() for l in section.split('\n') if l.strip()]
        if not lines:
            continue

        heading = lines[0]
        content = '\n'.join(lines[1:])

        # Skip sections with no results yet
        if 'Waiting' in content or len(lines) < 2:
            continue

        num_line = lines[1]

        # EZ2 / 2D
        if '2D Lotto' in heading:
            draw = None
            if '2:00' in heading: draw = '2PM'
            elif '5:00' in heading: draw = '5PM'
            elif '9:00' in heading: draw = '9PM'
            if draw and not ez2_map[draw]:
                nums = parse_nums(num_line, 2, 31)
                if len(nums) == 2:
                    ez2_map[draw] = nums
                    print(f"  EZ2 {draw}: {nums}")

        # 6-ball games
        for game, label, mx in [
            ('6/58', '6/58', 58), ('6/55', '6/55', 55),
            ('6/49', '6/49', 49), ('6/45', '6/45', 45),
            ('6/42', '6/42', 42),
        ]:
            if label in heading and game not in balls_map:
                nums = parse_nums(num_line, 6, mx)
                if len(nums) == 6:
                    balls_map[game] = nums
                    print(f"  {game}: {nums}")

    return ez2_map, balls_map


def scrape(url):
    print(f"Fetching {url} ...")
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    print(f"HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def build_output(ez2_map, balls_map):
    now_ph = datetime.now(PH_TZ)
    return {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': d, 'nums': ez2_map.get(d, []), 'cutoff': c}
            for d, c in [('2PM', 14), ('5PM', 17), ('9PM', 21)]
        ],
        'balls': [
            {
                'game': gk,
                'nums': balls_map.get(gk, []),
                'done': len(balls_map.get(gk, [])) == 6,
                'jackpot': '',
                'winners': 0,
                'days': SCHED[gk],
            }
            for gk in ['6/58', '6/55', '6/49', '6/45', '6/42']
        ],
    }


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v9 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    ez2_map  = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {}

    url = build_url(now_ph)

    try:
        html = scrape(url)
        ez2_map, balls_map = parse(html)
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")

    output = build_output(ez2_map, balls_map)

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found   = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")


if __name__ == '__main__':
    main()
