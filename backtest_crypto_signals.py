#!/usr/bin/env python3
"""
backtest_crypto_signals.py — JOMERPBSTREAM Trade tab, Crypto "report card".

Replays the Crypto sub-tab's signal engine over this repo's own stored
crypto-history.json and grades every call against what actually happened
next. READ-ONLY consumer of crypto-history.json: never modifies it, never
touches the scraper, only output is crypto-backtest.json (rendered by the
Crypto Report Card).

This is a line-for-line Python port of the JS engine in trade.js
(tcComputeSignal and its helpers). If that JS changes, this port must
change with it, or the report card grades an engine that no longer runs.

ENGINE, crypto-calibrated (see trade.js for full reasoning comments):
  - Wilder RSI(14), thresholds 30/70 (classic default — crypto's 24/7
    liquid majors don't need PSE's illiquidity-tuned 25/75)
  - SMA20 vs SMA50 trend, buffer 1.0% / confidence cap at 6% gap
    (PSE used 0.4%/3% cap, but crypto's baseline daily volatility runs
    several times higher — a PSE-sized buffer would almost never read
    FLAT on crypto)
  - Volume confirmation, 1.2x over prior 20 (same concept as PSE)
  - True ATR(14) as % of price — computed ONLY over bars flagged
    "real": true in crypto-history.json (see that file's "source" note:
    only the trailing ~30 days have genuine high/low wicks; ATR's 14-day
    window fits entirely inside that real-data tier)
  - Swing-pivot support/resistance — same real-bars-only restriction,
    cluster width 1.5% (vs PSE's 1.0%; crypto swings further between
    genuine touches)
  - Score -> BUY/SELL/HOLD + confidence % (identical scoring scale to
    PSE: RSI worth +/-2, volume-weighted trend worth +/-1, so confidence%
    numbers mean the same thing on both tabs)

Walk-forward method (no look-ahead): at each historical bar i, the engine
sees ONLY bars [0..i]. Outcome is read from bars i+1, i+2, i+5 (calendar
days — crypto trades 24/7, so there's no session-skipping to account for,
unlike the PSE backtest).
"""

import json
import os
import sys
from datetime import datetime, timezone

# ── engine constants — MUST match trade.js's tcComputeSignal ───────────
RSI_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
TREND_BUFFER_PCT = 1.0
TREND_CONF_CAP_PCT = 6.0
VOL_CONFIRM_RATIO = 1.2
VOL_CONFIRM_PERIOD = 20
ATR_PERIOD = 14
SR_PIVOT_WING = 2
SR_CLUSTER_PCT = 1.5
SIGNAL_THRESHOLD = 2
MAX_SCORE = 3
REAL_WINDOW_CAP = 30      # ATR/SR restricted to at most the last N real-flagged bars

# ── backtest parameters ─────────────────────────────────────────────
MIN_BARS = 60             # need SMA50 + a little runway before grading
HORIZONS = (1, 2, 5)      # calendar days ahead to grade
WINDOW = 200              # bars fed to the engine per evaluation (closes/volume warm-up)
SR_TOUCH_PCT = 0.5
SR_HOLD_LOOKAHEAD = 3
HIT_EPS = 0.0


# ═════════════════════ engine port (mirrors trade.js) ═════════════════

def wilder_rsi(closes, period=RSI_PERIOD):
    if len(closes) < period + 1:
        return None
    avg_gain = avg_loss = 0.0
    for i in range(1, period + 1):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            avg_gain += diff
        else:
            avg_loss -= diff
    avg_gain /= period
    avg_loss /= period
    for i in range(period + 1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gain = diff if diff > 0 else 0.0
        loss = -diff if diff < 0 else 0.0
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def sma(closes, period, end_idx):
    if end_idx + 1 < period:
        return None
    return sum(closes[end_idx - period + 1: end_idx + 1]) / period


def trend_state(sma20, sma50):
    if sma20 is None or sma50 is None or sma50 == 0:
        return "FLAT", 0.0, 0
    gap_pct = (sma20 - sma50) / sma50 * 100
    abs_gap = abs(gap_pct)
    if gap_pct > TREND_BUFFER_PCT:
        conf = round(min(100, (abs_gap - TREND_BUFFER_PCT) / (TREND_CONF_CAP_PCT - TREND_BUFFER_PCT) * 100))
        return "BULL", gap_pct, conf
    if gap_pct < -TREND_BUFFER_PCT:
        conf = round(min(100, (abs_gap - TREND_BUFFER_PCT) / (TREND_CONF_CAP_PCT - TREND_BUFFER_PCT) * 100))
        return "BEAR", gap_pct, conf
    conf = round(max(0, 100 - (abs_gap / TREND_BUFFER_PCT) * 100))
    return "FLAT", gap_pct, conf


def volume_confirmation(series, period=VOL_CONFIRM_PERIOD):
    if len(series) < period + 1:
        return None
    vols = [b.get("volume", 0) or 0 for b in series]
    last_vol = vols[-1]
    prior = vols[-1 - period:-1]
    avg = sum(prior) / len(prior) if prior else 0
    if avg <= 0:
        return {"ratio": None, "confirmed": False}
    return {"ratio": last_vol / avg, "confirmed": (last_vol / avg) >= VOL_CONFIRM_RATIO}


def real_tail(series, cap=REAL_WINDOW_CAP):
    """Bars usable for wick-dependent math (ATR, S/R): only 'real': true
    bars, most-recent-first, capped. crypto-history.json guarantees real
    bars are contiguous at the end of the series (see scrape_crypto_live.py)."""
    tail = []
    for b in reversed(series):
        if not b.get("real"):
            break
        tail.append(b)
        if len(tail) >= cap:
            break
    tail.reverse()
    return tail


def atr_pct(series, period=ATR_PERIOD):
    bars = real_tail(series)
    if len(bars) < period + 1:
        return None
    total, n = 0.0, 0
    for i in range(len(bars) - period, len(bars)):
        cur, prev = bars[i], bars[i - 1]
        pc = prev.get("close")
        if not pc or pc <= 0:
            continue
        hi = cur.get("high", cur.get("close"))
        lo = cur.get("low", cur.get("close"))
        tr = max(hi - lo, abs(hi - pc), abs(lo - pc))
        total += tr / pc * 100
        n += 1
    return round(total / n, 2) if n else None


def round_step(price):
    if price >= 100:
        return 10
    if price >= 1:
        return 0.1 if price < 10 else 1
    return 0.001 if price < 0.01 else (0.01 if price < 1 else 0.1)


def is_round_level(level):
    if not level or level <= 0:
        return False
    step = round_step(level)
    nearest = round(level / step) * step
    return abs(level - nearest) / level < 0.003


def support_resistance(series):
    bars = real_tail(series)
    if len(bars) < (SR_PIVOT_WING * 2 + 3):
        return None
    price = bars[-1]["close"]
    if not price or price <= 0:
        return None
    pivots = []
    for i in range(SR_PIVOT_WING, len(bars) - SR_PIVOT_WING):
        hi = bars[i].get("high", bars[i]["close"]) or bars[i]["close"]
        lo = bars[i].get("low", bars[i]["close"]) or bars[i]["close"]
        is_high = is_low = True
        for w in range(1, SR_PIVOT_WING + 1):
            l, r = bars[i - w], bars[i + w]
            lh = l.get("high", l["close"]) or l["close"]
            rh = r.get("high", r["close"]) or r["close"]
            ll = l.get("low", l["close"]) or l["close"]
            rl = r.get("low", r["close"]) or r["close"]
            if lh > hi or rh > hi:
                is_high = False
            if ll < lo or rl < lo:
                is_low = False
        if is_high:
            pivots.append(hi)
        if is_low:
            pivots.append(lo)
    pivots.sort()
    clusters = []
    for p in pivots:
        if clusters:
            mean = clusters[-1]["sum"] / clusters[-1]["n"]
            if mean and abs(p - mean) / mean * 100 <= SR_CLUSTER_PCT:
                clusters[-1]["sum"] += p
                clusters[-1]["n"] += 1
                continue
        clusters.append({"sum": p, "n": 1})
    levels = [{"level": c["sum"] / c["n"], "touches": c["n"], "fallback": False} for c in clusters]
    support = resistance = None
    for L in levels:
        if L["level"] < price * 0.998 and (support is None or L["level"] > support["level"]):
            support = L
        if L["level"] > price * 1.002 and (resistance is None or L["level"] < resistance["level"]):
            resistance = L
    tail20 = bars[-20:]
    if support is None and tail20:
        mn = min((b.get("low", b["close"]) or b["close"]) for b in tail20)
        if mn < price * 0.998:
            support = {"level": mn, "touches": 1, "fallback": True}
    if resistance is None and tail20:
        mx = max((b.get("high", b["close"]) or b["close"]) for b in tail20)
        if mx > price * 1.002:
            resistance = {"level": mx, "touches": 1, "fallback": True}
    if support is None and resistance is None:
        return None
    return {"support": support, "resistance": resistance}


def compute_signal(series):
    closes = [b["close"] for b in series]
    last = len(closes) - 1
    r = wilder_rsi(closes)
    s20 = sma(closes, 20, last)
    s50 = sma(closes, 50, last)
    score = 0.0
    if r is not None:
        if r < RSI_OVERSOLD:
            score += 2
        elif r > RSI_OVERBOUGHT:
            score -= 2
    trend, gap_pct, _trend_conf = trend_state(s20, s50)
    vc = volume_confirmation(series)
    weight = 1.0 if (vc and vc["confirmed"]) else 0.5
    if trend == "BULL":
        score += weight
    elif trend == "BEAR":
        score -= weight
    signal = "HOLD"
    if score >= SIGNAL_THRESHOLD:
        signal = "BUY"
    elif score <= -SIGNAL_THRESHOLD:
        signal = "SELL"
    if signal == "HOLD":
        confidence = round(max(0, 100 - (abs(score) / SIGNAL_THRESHOLD) * 100))
    else:
        confidence = round(min(100, (abs(score) / MAX_SCORE) * 100))
    return {"signal": signal, "score": score, "confidence": confidence, "rsi": r, "trend": trend}


# ═════════════════════ data loading ══════════════════════════════════

def load_coins(path):
    if not os.path.exists(path):
        return {}, None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    coins = {}
    for sym, entry in (data.get("coins") or {}).items():
        series = entry.get("series")
        if not isinstance(series, list) or not series:
            continue
        bars = []
        for d in series:
            c = d.get("close")
            if c is None or c <= 0:
                continue
            bars.append({
                "date": d.get("date"), "open": d.get("open"), "high": d.get("high"),
                "low": d.get("low"), "close": c, "volume": d.get("volume") or 0,
                "real": bool(d.get("real")),
            })
        if bars:
            coins[sym] = bars
    return coins, data.get("generatedAt")


# ═════════════════════ walk-forward grading ════════════════════════

def run_backtest(coins):
    max_h = max(HORIZONS)
    per_signal = {s: {h: [] for h in HORIZONS} for s in ("BUY", "SELL", "HOLD")}
    conf_buckets = {"BUY": {"hi": [], "mid": []}, "SELL": {"hi": [], "mid": []}}
    sr_touches = {"support": {"held": 0, "broke": 0}, "resistance": {"held": 0, "broke": 0}}
    bars_graded = 0
    coins_used = 0
    date_min = date_max = None

    for sym, series in coins.items():
        if len(series) < MIN_BARS + max_h:
            continue
        coins_used += 1
        for i in range(MIN_BARS - 1, len(series) - max_h):
            visible = series[max(0, i - WINDOW + 1): i + 1]
            sig = compute_signal(visible)
            price = series[i]["close"]
            bars_graded += 1
            d = series[i].get("date")
            if d:
                date_min = d if (date_min is None or d < date_min) else date_min
                date_max = d if (date_max is None or d > date_max) else date_max

            for h in HORIZONS:
                fwd = (series[i + h]["close"] - price) / price * 100
                per_signal[sig["signal"]][h].append(fwd)
                if h == 2 and sig["signal"] in ("BUY", "SELL"):
                    bucket = "hi" if sig["confidence"] >= 80 else "mid"
                    conf_buckets[sig["signal"]][bucket].append(fwd)

            sr = support_resistance(visible)
            if sr:
                nxt = series[i + 1]
                nxt_lo = nxt.get("low") or nxt["close"]
                nxt_hi = nxt.get("high") or nxt["close"]
                sup, res = sr.get("support"), sr.get("resistance")
                if sup and not sup["fallback"] and sup["level"] > 0 and \
                        abs(nxt_lo - sup["level"]) / sup["level"] * 100 <= SR_TOUCH_PCT:
                    look = series[i + 1: i + 1 + SR_HOLD_LOOKAHEAD]
                    held = any(b["close"] > sup["level"] * 1.002 for b in look) and \
                        not any(b["close"] < sup["level"] * 0.99 for b in look)
                    sr_touches["support"]["held" if held else "broke"] += 1
                if res and not res["fallback"] and res["level"] > 0 and \
                        abs(nxt_hi - res["level"]) / res["level"] * 100 <= SR_TOUCH_PCT:
                    look = series[i + 1: i + 1 + SR_HOLD_LOOKAHEAD]
                    held = any(b["close"] < res["level"] * 0.998 for b in look) and \
                        not any(b["close"] > res["level"] * 1.01 for b in look)
                    sr_touches["resistance"]["held" if held else "broke"] += 1

    def stats(returns, direction):
        n = len(returns)
        if n == 0:
            return {"n": 0}
        hits = [r for r in returns if r * direction > HIT_EPS]
        wins = [r * direction for r in returns if r * direction > 0]
        losses = [r * direction for r in returns if r * direction < 0]
        return {
            "n": n,
            "hitRatePct": round(len(hits) / n * 100, 1),
            "avgReturnPct": round(sum(r * direction for r in returns) / n, 3),
            "avgWinPct": round(sum(wins) / len(wins), 3) if wins else None,
            "avgLossPct": round(sum(losses) / len(losses), 3) if losses else None,
        }

    out = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "engineVersion": "wilder-rsi(30/70) + sma-buffer(1.0%/6%) + vol-confirm + true-atr(real-tier) + swing-sr(real-tier)",
        "coinsTested": coins_used,
        "barsGraded": bars_graded,
        "dateRange": {"from": date_min, "to": date_max},
        "horizonsCalendarDays": list(HORIZONS),
        "signals": {}, "confidenceBuckets2d": {}, "supportResistance": {},
    }
    for s in ("BUY", "SELL", "HOLD"):
        direction = 1 if s == "BUY" else (-1 if s == "SELL" else 1)
        out["signals"][s] = {str(h): stats(per_signal[s][h], direction) for h in HORIZONS}
    for s in ("BUY", "SELL"):
        direction = 1 if s == "BUY" else -1
        out["confidenceBuckets2d"][s] = {
            "confidence80plus": stats(conf_buckets[s]["hi"], direction),
            "confidenceBelow80": stats(conf_buckets[s]["mid"], direction),
        }
    for side in ("support", "resistance"):
        t = sr_touches[side]
        total = t["held"] + t["broke"]
        out["supportResistance"][side] = {"touches": total, "heldPct": round(t["held"] / total * 100, 1) if total else None}
    return out


def main():
    coins, generated = load_coins("crypto-history.json")
    if not coins:
        print("ERROR: no crypto-history.json data found — run the Fetch Live Data scraper first.")
        sys.exit(1)
    print(f"Loaded {len(coins)} coins (source generated at: {generated or 'unknown'})")
    result = run_backtest(coins)
    with open("crypto-backtest.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"Graded {result['barsGraded']} signal-days across {result['coinsTested']} coins "
          f"({result['dateRange']['from']} -> {result['dateRange']['to']})")
    print("Wrote crypto-backtest.json")


if __name__ == "__main__":
    main()
