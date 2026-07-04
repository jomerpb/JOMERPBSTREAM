#!/usr/bin/env python3
"""
scrape_crypto_live.py — JOMERPBSTREAM Trade tab, Crypto sub-tab data pipeline.

Fetches live + historical OHLCV data for the 8 tracked coins from the
CoinGecko public API (keyless, no API key required) and writes:
  - crypto-live-quotes.json  (current price / 24h change / volume snapshot)
  - crypto-history.json      (daily OHLCV series per coin, ~365 days)

WHY COINGECKO (not Binance/another exchange API):
Binance's public market-data endpoints return HTTP 451 (Unavailable For
Legal Reasons) for requests originating from US-based cloud IP ranges —
which is exactly what GitHub-hosted Actions runners use. This has been
true since Binance tightened geo-restrictions in Nov 2022 and is widely
reported (e.g. github.com/ccxt/ccxt issues #15872, #15891). CoinGecko's
public API has no such restriction, is free, needs no key, and covers
all 8 tracked coins (including HYPE, CoinGecko id "hyperliquid" — not to
be confused with the unrelated token whose id is "hype-3").

DATA FIDELITY — READ BEFORE CHANGING THIS FILE:
CoinGecko's free-tier /coins/{id}/ohlc endpoint auto-selects candle size
by range: 1-2 days -> 30min, 3-30 days -> 4h, 31+ days -> 4-day candles.
There is no way on the free tier to get real (wicked) daily OHLC beyond
~30 days back. So this script builds each coin's series in two tiers:

  1. REAL tier (last ~30 days): /coins/{id}/ohlc?days=30 returns true
     4-hour candles, which we resample into true daily OHLC (real high/
     low wicks, not just closes). Marked "real": true per bar.
  2. CLOSE-DERIVED tier (31-365 days ago): /coins/{id}/market_chart
     gives only closing price + volume per day, no wicks. We derive
     open = previous day's close, close = that day's close, and
     high/low = max/min(open, close) — i.e. a zero-wick candle. Marked
     "real": false per bar.

The dates from market_chart are the single source of truth for CLOSE
and VOLUME across the *entire* series (both tiers) — the real-OHLC tier
only contributes open/high/low for its own dates, adjusted so they never
contradict the authoritative close. This means RSI/SMA/volume-trend
(which only consume closes) are accurate for the full ~365-day history;
only ATR(14) and swing-pivot support/resistance (which need real highs/
lows) are restricted client-side to the last 30 real bars — which fully
covers ATR's 14-day requirement.

Usage: python3 scrape_crypto_live.py
Network: pypi.org (via pip in the workflow) + api.coingecko.com at runtime.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# symbol -> CoinGecko coin id. Verified against coingecko.com/en/coins/<id>
# on 2026-07-04. HYPE is "hyperliquid" (NOT "hype-3", an unrelated token).
COINS = [
    {"sym": "BTC",  "id": "bitcoin",     "name": "Bitcoin"},
    {"sym": "ETH",  "id": "ethereum",    "name": "Ethereum"},
    {"sym": "XRP",  "id": "ripple",      "name": "XRP"},
    {"sym": "BNB",  "id": "binancecoin", "name": "BNB"},
    {"sym": "SOL",  "id": "solana",      "name": "Solana"},
    {"sym": "DOGE", "id": "dogecoin",    "name": "Dogecoin"},
    {"sym": "TRX",  "id": "tron",        "name": "TRON"},
    {"sym": "HYPE", "id": "hyperliquid", "name": "Hyperliquid"},
]

REAL_OHLC_DAYS = 30       # true-wick window (see module docstring)
HISTORY_DAYS = 365        # full close+volume window
REQUEST_TIMEOUT = 20      # seconds
MAX_RETRIES = 4
BASE_BACKOFF = 8          # seconds; doubles each retry on 429/5xx
CALL_SPACING = 13         # seconds between calls — stays under the public
                          # API's most conservative documented floor of
                          # ~5 calls/min (12s/call) with a safety margin.

OUT_HISTORY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "crypto-history.json")
OUT_QUOTES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "crypto-live-quotes.json")


def http_get_json(url, attempt=1):
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "JOMERPBSTREAM-crypto-scraper/1.0 (+https://github.com/jomerpb/JOMERPBSTREAM)",
    })
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (429, 500, 502, 503, 504) and attempt <= MAX_RETRIES:
            wait = BASE_BACKOFF * (2 ** (attempt - 1))
            print(f"  HTTP {e.code} on attempt {attempt}, backing off {wait}s: {url}")
            time.sleep(wait)
            return http_get_json(url, attempt + 1)
        print(f"  FAILED ({e.code}) after {attempt} attempt(s): {url}")
        return None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        if attempt <= MAX_RETRIES:
            wait = BASE_BACKOFF * (2 ** (attempt - 1))
            print(f"  Network error on attempt {attempt} ({e}), backing off {wait}s")
            time.sleep(wait)
            return http_get_json(url, attempt + 1)
        print(f"  FAILED (network error) after {attempt} attempt(s): {url} — {e}")
        return None


def utc_date_str(ts_ms):
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def resample_ohlc_to_daily(raw_ohlc):
    """raw_ohlc: list of [ts_ms, open, high, low, close] (CoinGecko /ohlc
    format — note: NO volume field on this endpoint). Groups candles by
    UTC calendar date -> {date: {open, high, low}} using first candle's
    open, last candle's close is intentionally NOT kept here (closes come
    from market_chart, the single source of truth — see module docstring)."""
    by_date = {}
    for row in raw_ohlc:
        if not isinstance(row, list) or len(row) < 5:
            continue
        ts, o, h, l, c = row[0], row[1], row[2], row[3], row[4]
        d = utc_date_str(ts)
        if d not in by_date:
            by_date[d] = {"open": o, "high": h, "low": l, "firstTs": ts}
        else:
            entry = by_date[d]
            if ts < entry["firstTs"]:
                entry["open"] = o
                entry["firstTs"] = ts
            entry["high"] = max(entry["high"], h)
            entry["low"] = min(entry["low"], l)
    return {d: {"open": v["open"], "high": v["high"], "low": v["low"]} for d, v in by_date.items()}


def build_coin_series(coin):
    """Returns (series, error) where series is a list of daily bars sorted
    ascending by date, each {date, open, high, low, close, volume, real}."""
    mc_url = f"{COINGECKO_BASE}/coins/{coin['id']}/market_chart?vs_currency=usd&days={HISTORY_DAYS}"
    mc = http_get_json(mc_url)
    if not mc or "prices" not in mc or "total_volumes" not in mc:
        return None, f"market_chart fetch failed for {coin['sym']}"

    time.sleep(CALL_SPACING)

    ohlc_url = f"{COINGECKO_BASE}/coins/{coin['id']}/ohlc?vs_currency=usd&days={REAL_OHLC_DAYS}"
    raw_ohlc = http_get_json(ohlc_url)
    real_by_date = resample_ohlc_to_daily(raw_ohlc) if isinstance(raw_ohlc, list) else {}
    if not real_by_date:
        print(f"  WARNING: no real OHLC for {coin['sym']}, all bars will be close-derived")

    # Merge prices + volumes by date (both arrays are [[ts, value], ...],
    # same cadence, but merge by date key defensively rather than index).
    closes_by_date = {}
    for ts, price in mc["prices"]:
        if price is None or price <= 0:
            continue
        closes_by_date[utc_date_str(ts)] = price
    vols_by_date = {}
    for ts, vol in mc["total_volumes"]:
        vols_by_date[utc_date_str(ts)] = vol or 0

    dates = sorted(closes_by_date.keys())
    if not dates:
        return None, f"no usable close-price data for {coin['sym']}"

    series = []
    prev_close = None
    for d in dates:
        close = closes_by_date[d]
        volume = vols_by_date.get(d, 0)
        real_bar = real_by_date.get(d)
        if real_bar:
            open_p = real_bar["open"]
            high = max(real_bar["high"], close, open_p)
            low = min(real_bar["low"], close, open_p)
            is_real = True
        else:
            open_p = prev_close if prev_close is not None else close
            high = max(open_p, close)
            low = min(open_p, close)
            is_real = False
        series.append({
            "date": d, "open": round(open_p, 8), "high": round(high, 8),
            "low": round(low, 8), "close": round(close, 8),
            "volume": round(volume, 2), "real": is_real,
        })
        prev_close = close

    return series, None


def fetch_market_snapshot(coins):
    ids = ",".join(c["id"] for c in coins)
    url = f"{COINGECKO_BASE}/coins/markets?vs_currency=usd&ids={ids}&price_change_percentage=24h"
    data = http_get_json(url)
    if not isinstance(data, list):
        return {}, "coins/markets fetch failed — no live snapshot available"
    by_id = {row["id"]: row for row in data if isinstance(row, dict) and row.get("id")}
    quotes = {}
    for c in coins:
        row = by_id.get(c["id"])
        if not row or row.get("current_price") is None:
            continue
        quotes[c["sym"]] = {
            "id": c["id"], "name": c["name"],
            "price": row["current_price"],
            "change24hPct": row.get("price_change_percentage_24h_in_currency",
                                     row.get("price_change_percentage_24h")),
            "high24h": row.get("high_24h"),
            "low24h": row.get("low_24h"),
            "volume24h": row.get("total_volume"),
            "marketCap": row.get("market_cap"),
            "asOf": row.get("last_updated"),
        }
    return quotes, None


def main():
    print(f"Fetching live snapshot for {len(COINS)} coins...")
    quotes, quote_err = fetch_market_snapshot(COINS)
    if quote_err:
        print(f"  {quote_err}")
    time.sleep(CALL_SPACING)

    history = {}
    errors = []
    if quote_err:
        errors.append(quote_err)

    for i, coin in enumerate(COINS):
        print(f"[{i+1}/{len(COINS)}] {coin['sym']} ({coin['id']})...")
        series, err = build_coin_series(coin)
        if err:
            errors.append(err)
            print(f"  {err}")
        else:
            real_count = sum(1 for b in series if b["real"])
            print(f"  OK — {len(series)} daily bars ({real_count} real-OHLC, "
                  f"{len(series)-real_count} close-derived)")
            history[coin["sym"]] = {"id": coin["id"], "name": coin["name"], "series": series}
        if i < len(COINS) - 1:
            time.sleep(CALL_SPACING)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    quotes_out = {"generatedAt": generated_at, "source": "CoinGecko API /coins/markets",
                  "quotes": quotes, "errors": [e for e in errors if "market_chart" not in e and "OHLC" not in e]}
    history_out = {
        "generatedAt": generated_at,
        "source": f"CoinGecko API — real OHLC (last {REAL_OHLC_DAYS}d, resampled from 4h candles) "
                  f"+ close-derived OHLC ({REAL_OHLC_DAYS}-{HISTORY_DAYS}d, from daily market_chart closes)",
        "coins": history,
        "errors": errors,
    }

    if not history and not quotes:
        print("FATAL: no data fetched for any coin — refusing to overwrite existing files.")
        sys.exit(1)

    with open(OUT_QUOTES, "w", encoding="utf-8") as f:
        json.dump(quotes_out, f, indent=2)
    with open(OUT_HISTORY, "w", encoding="utf-8") as f:
        json.dump(history_out, f, indent=2)

    print(f"\nWrote {OUT_QUOTES} ({len(quotes)}/{len(COINS)} coins)")
    print(f"Wrote {OUT_HISTORY} ({len(history)}/{len(COINS)} coins)")
    if errors:
        print(f"Completed with {len(errors)} error(s) — partial data committed, see 'errors' arrays.")
        # Non-fatal: partial data is still useful (mirrors pse-live-scraper.yml's
        # philosophy of always committing whatever was successfully fetched).


if __name__ == "__main__":
    main()
