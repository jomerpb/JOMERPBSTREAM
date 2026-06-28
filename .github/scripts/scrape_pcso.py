#!/usr/bin/env python3
"""
PCSO Results Scraper v6
Uses PCSOLotto-Webscraper to query pcso.gov.ph directly
"""

import json, sys
from datetime import datetime, timezone, timedelta, date

PH_TZ = timezone(timedelta(hours=8))

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v6 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    # Import with full error message
    try:
        from PCSOLotto import PCSOLotto
        print("PCSOLotto import: OK")
    except Exception as e:
        print(f"PCSOLotto import FAILED: {type(e).__name__}: {e}")
        sys.exit(1)

    lotto = PCSOLotto()

    # Try results for last 2 days
    today = date.today()
    yesterday = today - timedelta(days=1)
    start = (today - timedelta(days=2)).strftime('%Y/%m/%d')
    end = today.strftime('%Y/%m/%d')

    print(f"Fetching {start} to {end}...")
    try:
        raw = lotto.results(start_date=start, end_date=end)
        print(f"Got result type: {type(raw)}")
        if raw:
            print(f"Keys ({len(raw)}): {list(raw.keys())[:10]}")
            # Print first few entries
            for k, v in list(raw.items())[:5]:
                print(f"  {repr(k)}: {repr(v)}")
        else:
            print("Result is empty/None")
    except Exception as e:
        print(f"results() ERROR: {type(e).__name__}: {e}")
        # Try results_default_pcso as fallback
        try:
            print("Trying results_default_pcso()...")
            raw = lotto.results_default_pcso()
            print(f"Got: {type(raw)}")
            if raw:
                for k, v in list(raw.items())[:5]:
                    print(f"  {repr(k)}: {repr(v)}")
        except Exception as e2:
            print(f"FALLBACK ERROR: {type(e2).__name__}: {e2}")
            raw = None

    if not raw:
        print("No data obtained - saving empty json")
        output = {
            'updated': now_ph.isoformat(),
            'date': now_ph.strftime('%B %d, %Y').replace(' 0',' '),
            'ez2': [{'draw':'2PM','nums':[],'cutoff':14},
                    {'draw':'5PM','nums':[],'cutoff':17},
                    {'draw':'9PM','nums':[],'cutoff':21}],
            'balls': [{'game':g,'date':'Unknown','nums':[],'done':False,
                       'jackpot':'','winners':0,'days':d}
                      for g,d in [('6/58',[0,2,5]),('6/55',[1,3,6]),
                                  ('6/49',[0,2,4]),('6/45',[1,3,5]),('6/42',[2,4,6])]]
        }
        with open('pcso-results.json','w') as f:
            json.dump(output,f,indent=2)
        return

    # Parse EZ2
    ez2 = {}
    month_abbr = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    for key, val in raw.items():
        key_str = str(key)
        if 'EZ2' in key_str or '2D' in key_str:
            draw = None
            if '2PM' in key_str or '2:00' in key_str: draw = '2PM'
            elif '5PM' in key_str or '5:00' in key_str: draw = '5PM'
            elif '9PM' in key_str or '9:00' in key_str: draw = '9PM'
            if draw and val:
                try:
                    nums_raw = val if isinstance(val, list) else val.get('winning_numbers', val.get('nums', []))
                    if nums_raw:
                        nums = [int(str(n).strip()) for n in nums_raw[:2]]
                        if all(1 <= n <= 31 for n in nums):
                            ez2[draw] = nums
                            print(f"  EZ2 {draw}: {nums}")
                except Exception as e:
                    print(f"  EZ2 parse error: {e}")

    # Parse 6-ball
    balls = {}
    sched = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}
    ball_keys = {
        '6/58': ['Ultra Lotto 6/58', '6/58'],
        '6/55': ['Grand Lotto 6/55', '6/55'],
        '6/49': ['Super Lotto 6/49', '6/49'],
        '6/45': ['Mega Lotto 6/45', '6/45'],
        '6/42': ['Lotto 6/42', '6/42'],
    }

    for gk, aliases in ball_keys.items():
        for key, val in raw.items():
            if any(a in str(key) for a in aliases) and gk not in balls:
                try:
                    nums_raw = val if isinstance(val, list) else val.get('winning_numbers', val.get('nums', []))
                    if nums_raw and len(nums_raw) >= 6:
                        nums = [int(str(n).strip()) for n in nums_raw[:6]]
                        draw_date = '' if isinstance(val, list) else str(val.get('draw_date', val.get('date', '')))
                        dl = 'Unknown'
                        if draw_date:
                            try:
                                if '/' in draw_date:
                                    p = draw_date.split('/')
                                    dl = month_abbr[int(p[0])] + ' ' + str(int(p[1]))
                            except: pass
                        jp_raw = '' if isinstance(val, list) else val.get('jackpot', '')
                        jp = ''
                        if jp_raw:
                            try:
                                v = float(str(jp_raw).replace(',','').replace('\u20b1','').strip())
                                if v >= 1_000_000: jp = f'\u20b1{v/1_000_000:.1f}M'
                            except: pass
                        winners = 0 if isinstance(val, list) else int(val.get('winners', 0) or 0)
                        balls[gk] = {'nums':nums,'date':dl,'jackpot':jp,'winners':winners}
                        print(f"  {gk} ({dl}): {nums}")
                except Exception as e:
                    print(f"  {gk} parse error: {e}")

    # Build output
    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0',' '),
        'ez2': [{'draw':d,'nums':ez2.get(d,[]),'cutoff':c} for d,c in [('2PM',14),('5PM',17),('9PM',21)]],
        'balls': [{'game':gk,'date':balls.get(gk,{}).get('date','Unknown'),
                   'nums':balls.get(gk,{}).get('nums',[]),
                   'done':len(balls.get(gk,{}).get('nums',[]))==6,
                   'jackpot':balls.get(gk,{}).get('jackpot',''),
                   'winners':balls.get(gk,{}).get('winners',0),
                   'days':sched[gk]} for gk in ['6/58','6/55','6/49','6/45','6/42']]
    }

    with open('pcso-results.json','w',encoding='utf-8') as f:
        json.dump(output,f,indent=2,ensure_ascii=False)

    ez2_found = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")

if __name__ == '__main__':
    main()
