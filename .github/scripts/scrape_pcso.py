#!/usr/bin/env python3
"""
PCSO Results Scraper v5
Uses PCSOLotto-Webscraper pip package which directly queries pcso.gov.ph
This bypasses all CDN/Cloudflare blocking issues
"""

import json, re
from datetime import datetime, timezone, timedelta

PH_TZ = timezone(timedelta(hours=8))

def reduce_num(n):
    """Convert number string to padded int"""
    return int(n)

def main():
    now_ph = datetime.now(PH_TZ)
    ph_hour = now_ph.hour
    print(f"\nPCSO Scraper v5 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    try:
        from PCSOLotto import PCSOLotto
        lotto = PCSOLotto()
    except ImportError:
        print("ERROR: PCSOLotto package not found")
        return

    # Fetch results - use yesterday for earlier runs, today for night run
    # results_latest() covers last 3 days - most reliable
    print("Fetching from pcso.gov.ph...")
    try:
        raw = lotto.results_latest()
        print(f"Got {len(raw)} game entries")
        print("Keys:", list(raw.keys())[:8])
    except Exception as e:
        print(f"ERROR: {e}")
        # Fallback: try yesterday
        try:
            raw = lotto.results_yesterday()
            print(f"Fallback yesterday: {len(raw)} entries")
        except Exception as e2:
            print(f"FALLBACK ERROR: {e2}")
            return

    print("\nRaw data:")
    for k, v in raw.items():
        print(f"  {k}: {v}")

    # Parse EZ2
    ez2 = {}
    ez2_map = {
        'EZ2 Lotto 2PM': '2PM',
        'EZ2 Lotto 5PM': '5PM', 
        'EZ2 Lotto 9PM': '9PM',
        '2D Lotto 2PM': '2PM',
        '2D Lotto 5PM': '5PM',
        '2D Lotto 9PM': '9PM',
    }
    for key, draw in ez2_map.items():
        if key in raw and raw[key]:
            entry = raw[key]
            nums_raw = entry.get('winning_numbers', entry.get('nums', []))
            if nums_raw and len(nums_raw) >= 2:
                try:
                    nums = [int(str(n).strip()) for n in nums_raw[:2]]
                    if all(1 <= n <= 31 for n in nums):
                        ez2[draw] = nums
                except: pass

    # Parse 6-ball games
    ball_map = {
        'Ultra Lotto 6/58': '6/58',
        'Grand Lotto 6/55': '6/55',
        'Super Lotto 6/49': '6/49',
        'Mega Lotto 6/45': '6/45',
        'Lotto 6/42': '6/42',
        '6/58': '6/58',
        '6/55': '6/55',
        '6/49': '6/49',
        '6/45': '6/45',
        '6/42': '6/42',
    }
    balls = {}
    sched = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}
    month_abbr = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    for key, game_key in ball_map.items():
        if game_key in balls: continue
        if key in raw and raw[key]:
            entry = raw[key]
            nums_raw = entry.get('winning_numbers', entry.get('nums', []))
            if nums_raw and len(nums_raw) >= 6:
                try:
                    nums = [int(str(n).strip()) for n in nums_raw[:6]]
                    # Get draw date
                    draw_date = entry.get('draw_date', entry.get('date', ''))
                    date_label = 'Unknown'
                    if draw_date:
                        try:
                            if '/' in str(draw_date):
                                parts = str(draw_date).split('/')
                                if len(parts) == 3:
                                    m, d, y = int(parts[0]), int(parts[1]), int(parts[2])
                                    date_label = month_abbr[m] + ' ' + str(d)
                            elif '-' in str(draw_date):
                                parts = str(draw_date).split('-')
                                if len(parts) == 3:
                                    y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                                    date_label = month_abbr[m] + ' ' + str(d)
                        except: pass
                    # Jackpot
                    jp_raw = entry.get('jackpot', entry.get('jackpot_amount', ''))
                    jackpot = ''
                    if jp_raw:
                        try:
                            jp_val = float(str(jp_raw).replace(',','').replace('\u20b1','').replace('P','').strip())
                            if jp_val >= 1_000_000:
                                jackpot = f'\u20b1{jp_val/1_000_000:.1f}M'
                        except: pass
                    winners = int(entry.get('winners', entry.get('jackpot_winners', 0)) or 0)
                    balls[game_key] = {'nums':nums,'date':date_label,'jackpot':jackpot,'winners':winners}
                except Exception as e:
                    print(f"  Error parsing {key}: {e}")

    print(f"\nEZ2 parsed: {ez2}")
    print(f"Balls parsed: {list(balls.keys())}")

    # Build output
    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': d, 'nums': ez2.get(d, []), 'cutoff': c}
            for d, c in [('2PM',14), ('5PM',17), ('9PM',21)]
        ],
        'balls': [
            {
                'game': gk,
                'date': balls.get(gk, {}).get('date', 'Unknown'),
                'nums': balls.get(gk, {}).get('nums', []),
                'done': len(balls.get(gk, {}).get('nums', [])) == 6,
                'jackpot': balls.get(gk, {}).get('jackpot', ''),
                'winners': balls.get(gk, {}).get('winners', 0),
                'days': sched[gk]
            }
            for gk in ['6/58', '6/55', '6/49', '6/45', '6/42']
        ]
    }

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\n{'='*50}")
    print(f"Saved pcso-results.json")
    print(f"EZ2: {ez2_found}/3 | Balls: {balls_found}/5")

if __name__ == '__main__':
    main()
