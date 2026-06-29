#!/usr/bin/env python3
"""
PCSO Results Scraper v12
Source: pwedeh.com (dated page → homepage fallback)
Parser: h2/h3-tag based with full heading dump + extended skip phrases
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

SKIP_PHRASES = [
    'waiting', 'not yet', 'pending', 'tba', 'no result',
    'to be', 'available soon', 'check back', 'draw not',
]


def build_urls(dt):
    m = MONTHS[dt.month - 1]
    dated = f"https://pwedeh.com/lotto-result-{m}-{dt.day}-{dt.year}/"
    return [dated, "https://pwedeh.com/"]


def is_pending(text):
    t = text.lower()
    return any(p in t for p in SKIP_PHRASES)


def parse_nums(text, count, max_val=58):
    text = re.sub(r'\d+/\d+', '', text)
    nums = re.findall(r'\b(\d{1,2})\b', text)
    result = [int(n) for n in nums if 1 <= int(n) <= max_val]
    return result[:count] if len(result) >= count else []


def parse(html, url_label):
    soup = BeautifulSoup(html, 'html.parser')
    ez2_map   = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {}

    headings = soup.find_all(['h2', 'h3'])
    print(f"  [{url_label}] {len(headings)} headings — FULL DUMP:")

    for h in headings:
        heading = h.get_text(strip=True)

        # Collect sibling content until next heading
        content_parts = []
        for sib in h.next_siblings:
            if sib.name in ['h2', 'h3']:
                break
            if hasattr(sib, 'get_text'):
                t = sib.get_text(strip=True)
                if t:
                    content_parts.append(t)
            elif isinstance(sib, str) and sib.strip():
                content_parts.append(sib.strip())

        fc = content_parts[0] if content_parts else ''
        print(f"    '{heading[:55]}' → '{fc[:45]}'")

        if not fc or is_pending(fc):
            continue

        # EZ2 / 2D — match any variant
        if re.search(r'2D Lotto|EZ2', heading, re.I):
            draw = None
            if re.search(r'2:00|2PM', heading): draw = '2PM'
            elif re.search(r'5:00|5PM', heading): draw = '5PM'
            elif re.search(r'9:00|9PM', heading): draw = '9PM'
            if draw and not ez2_map[draw]:
                nums = parse_nums(fc, 2, 31)
                if len(nums) == 2:
                    ez2_map[draw] = nums
                    print(f"      -> EZ2 {draw}: {nums}")

        # 6-ball games
        for game, label, mx in [
            ('6/58', '6/58', 58), ('6/55', '6/55', 55),
            ('6/49', '6/49', 49), ('6/45', '6/45', 45),
            ('6/42', '6/42', 42),
        ]:
            if label in heading and game not in balls_map:
                nums = parse_nums(fc, 6, mx)
                if len(nums) == 6:
                    balls_map[game] = nums
                    print(f"      -> {game}: {nums}")

    return ez2_map, balls_map


def merge(ez2_base, balls_base, ez2_new, balls_new):
    for d in ['2PM', '5PM', '9PM']:
        if not ez2_base[d] and ez2_new.get(d):
            ez2_base[d] = ez2_new[d]
    for g in ['6/58', '6/55', '6/49', '6/45', '6/42']:
        if g not in balls_base and g in balls_new:
            balls_base[g] = balls_new[g]
    return ez2_base, balls_base


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
    print(f"\nPCSO Scraper v12 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    ez2_map   = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {}
    urls = build_urls(now_ph)

    for i, url in enumerate(urls):
        try:
            html = scrape(url)
            ez2_new, balls_new = parse(html, f"URL{i+1}")
            ez2_map, balls_map = merge(ez2_map, balls_map, ez2_new, balls_new)

            found = sum(1 for e in ez2_map.values() if e) + \
                    sum(1 for b in balls_map.values() if b)
            if found > 0:
                print(f"  Got {found} results from URL{i+1} — stopping")
                break
        except Exception as e:
            print(f"  URL{i+1} ERROR: {type(e).__name__}: {e}")

    output = build_output(ez2_map, balls_map)

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found   = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")


if __name__ == '__main__':
    main()
