#!/usr/bin/env python3
"""
PCSO Scraper v6
"""

import json
from datetime import datetime, timedelta, timezone

from PCSOLotto import PCSOLotto

OUTPUT_FILE  = "pcso_results.json"
PH_TZ_OFFSET = 8

def ph_now():
    return datetime.now(timezone.utc) + timedelta(hours=PH_TZ_OFFSET)

def main():
    now   = ph_now()
    end   = now
    start = now - timedelta(days=3)

    start_str = start.strftime("%Y/%m/%d")
    end_str   = end.strftime("%Y/%m/%d")

    print(f"PCSO Scraper v6 — {now.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)
    print(f"Fetching {start_str} to {end_str}...")

    lotto   = PCSOLotto()
    results = None

    try:
        results = lotto.results(start_date=start_str, end_date=end_str)
        print("results() OK")
    except Exception as e:
        print(f"results() ERROR: {e}")
        print("Trying results_default_pcso()...")
        try:
            results = lotto.results_default_pcso()
            print("results_default_pcso() OK")
        except Exception as e2:
            print(f"FALLBACK ERROR: {e2}")

    if results:
        output = {
            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S PHT"),
            "source":       "pcso.gov.ph",
            "results":      results,
        }
        print(f"Total draws: {len(results)}")
    else:
        print("No data obtained - saving empty json")
        output = {
            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S PHT"),
            "source":       "pcso.gov.ph",
            "results":      [],
        }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Saved → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
