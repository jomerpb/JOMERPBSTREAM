#!/usr/bin/env python3
"""
backtest_pse_signals.py — JOMERPBSTREAM Trade tab "report card".

Replays the Trade tab's signal engine over the repo's own stored PSE
history and grades every call against what actually happened next.
This is a READ-ONLY consumer of pse-history.json / pse-full-history.json:
it never modifies them, never touches the scrapers, and its only output
is pse-backtest.json (which the Trade tab renders as the Report Card).

The engine below is a line-for-line Python port of the JS in index.html:
  - Wilder-smoothed RSI(14), thresholds 25/75  (tpRSI)
  - SMA20 vs SMA50 trend with 0.4% buffer      (tpGetTrendState)
  - Volume confirmation, 1.2x over prior 20    (tpVolumeConfirmation)
  - True ATR(14) as % of price                 (tpATRPct)
  - Swing-pivot support/resistance             (tpSupportResistance)
  - Score -> BUY/SELL/HOLD + confidence %      (tpComputeSignal)
If the JS engine changes, this port must change with it — otherwise the
report card grades an engine that no longer exists.

Walk-forward method (no look-ahead): at each historical bar i, the engine
sees ONLY bars [0..i], exactly the data the tab would have had that day.
The outcome is then read from bars i+1, i+2, i+5.
"""

import json
import math
import os
import sys
from datetime import datetime, timezone

# ── engine constants — MUST match index.html ────────────────────────
RSI_PERIOD = 14
RSI_OVERSOLD = 25
RSI_OVERBOUGHT = 75
TREND_BUFFER_PCT = 0.4
VOL_CONFIRM_RATIO = 1.2
VOL_CONFIRM_PERIOD = 20
ATR_PERIOD = 14
SR_PIVOT_WING = 2
SR_CLUSTER_PCT = 1.0
SIGNAL_THRESHOLD = 2      # |score| >= 2 -> BUY/SELL
MAX_SCORE = 3

# ── backtest parameters ──────────────────────────────────────────────
MIN_BARS = 60             # need SMA50 + a little runway before grading
HORIZONS = (1, 2, 5)      # sessions ahead to grade
WINDOW = 90               # bars fed to the engine per evaluation (matches tab's tpGetSeries(sym, 90))
SR_TOUCH_PCT = 0.5        # a low within 0.5% of support counts as a "touch"
SR_HOLD_LOOKAHEAD = 3     # bars for the bounce/hold test
HIT_EPS = 0.0             # forward return > 0 counts as a hit for BUY


# ═════════════════════ engine port ═══════════════════════════════════

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
        return "FLAT"
    gap_pct = (sma20 - sma50) / sma50 * 100
    if gap_pct > TREND_BUFFER_PCT:
        return "BULL"
    if gap_pct < -TREND_BUFFER_PCT:
        return "BEAR"
    return "FLAT"


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


def atr_pct(series, period=ATR_PERIOD):
    if len(series) < period + 1:
        return None
    total, n = 0.0, 0
    for i in range(len(series) - period, len(series)):
        cur, prev = series[i], series[i - 1]
        pc = prev.get("close")
        if not pc or pc <= 0:
            continue
        hi = cur.get("high", cur.get("close"))
        lo = cur.get("low", cur.get("close"))
        if hi is None:
            hi = cur.get("close")
        if lo is None:
            lo = cur.get("close")
        tr = max(hi - lo, abs(hi - pc), abs(lo - pc))
        total += tr / pc * 100
        n += 1
    return round(total / n, 2) if n else None


def round_step(price):
    if price >= 100:
        return 10
    if price >= 10:
        return 1
    if price >= 1:
        return 0.5
    return 0.05


def is_round_level(level):
    if not level or level <= 0:
        return False
    step = round_step(level)
    nearest = round(level / step) * step
    return abs(level - nearest) / level < 0.003


def support_resistance(series):
    if len(series) < (SR_PIVOT_WING * 2 + 3):
        return None
    price = series[-1]["close"]
    if not price or price <= 0:
        return None
    pivots = []
    for i in range(SR_PIVOT_WING, len(series) - SR_PIVOT_WING):
        hi = series[i].get("high", series[i]["close"]) or series[i]["close"]
        lo = series[i].get("low", series[i]["close"]) or series[i]["close"]
        is_high = is_low = True
        for w in range(1, SR_PIVOT_WING + 1):
            l, r = series[i - w], series[i + w]
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
    levels = [{"level": c["sum"] / c["n"], "touches": c["n"], "fallback": False}
              for c in clusters]
    support = resistance = None
    for L in levels:
        if L["level"] < price * 0.998 and (support is None or L["level"] > support["level"]):
            support = L
        if L["level"] > price * 1.002 and (resistance is None or L["level"] < resistance["level"]):
            resistance = L
    tail = series[-20:]
    if support is None:
        mn = min((b.get("low", b["close"]) or b["close"]) for b in tail)
        if mn < price * 0.998:
            support = {"level": mn, "touches": 1, "fallback": True}
    if resistance is None:
        mx = max((b.get("high", b["close"]) or b["close"]) for b in tail)
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
    trend = trend_state(s20, s50)
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
    return {"signal": signal, "score": score, "confidence": confidence,
            "rsi": r, "trend": trend}


# ═════════════════════ data loading ══════════════════════════════════

def load_tickers(paths):
    """Merge history files; later files only fill tickers earlier ones lack
    (pse-history.json = blue chips, fresher; pse-full-history.json = the rest)."""
    tickers = {}
    generated = []
    for path in paths:
        if not os.path.exists(path):
            print(f"note: {path} not found, skipping")
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if data.get("generatedAt"):
            generated.append(data["generatedAt"])
        for sym, entry in (data.get("tickers") or {}).items():
            series = entry.get("series")
            if sym in tickers or not isinstance(series, list) or not series:
                continue
            bars = []
            for d in series:
                c = d.get("close")
                if c is None or c <= 0:
                    continue
                bars.append({
                    "date": d.get("date"),
                    "open": d.get("open"),
                    "high": d.get("high"),
                    "low": d.get("low"),
                    "close": c,
                    "volume": d.get("value") or d.get("volume") or 0,
                })
            if bars:
                tickers[sym] = bars
    return tickers, generated


def is_stale_tail(series, idx):
    """Mirror of the tab's stale-ticker idea: repeated identical flat prints
    ending at idx mean the name isn't really trading — grading a 'signal'
    there would grade illiquidity, not the engine."""
    if idx < 5:
        return False
    tail = series[idx - 4: idx + 1]
    closes = {b["close"] for b in tail}
    ranges = [(b.get("high") or b["close"]) - (b.get("low") or b["close"]) for b in tail]
    return len(closes) == 1 and all(r == 0 for r in ranges)


# ═════════════════════ walk-forward grading ══════════════════════════

def run_backtest(tickers):
    max_h = max(HORIZONS)
    per_signal = {s: {h: [] for h in HORIZONS} for s in ("BUY", "SELL", "HOLD")}
    conf_buckets = {"BUY": {"hi": [], "mid": []}, "SELL": {"hi": [], "mid": []}}
    sr_touches = {"support": {"held": 0, "broke": 0},
                  "resistance": {"held": 0, "broke": 0}}
    bars_graded = 0
    tickers_used = 0
    date_min = date_max = None

    for sym, series in tickers.items():
        if len(series) < MIN_BARS + max_h:
            continue
        tickers_used += 1
        for i in range(MIN_BARS - 1, len(series) - max_h):
            if is_stale_tail(series, i):
                continue
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

            # S/R touch test: does the engine's support/resistance actually
            # get respected when price reaches it in the NEXT bar?
            sr = support_resistance(visible)
            if sr:
                nxt = series[i + 1]
                nxt_lo = nxt.get("low") or nxt["close"]
                nxt_hi = nxt.get("high") or nxt["close"]
                sup = sr.get("support")
                res = sr.get("resistance")
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
        """direction: +1 grades 'went up' as a hit, -1 grades 'went down'."""
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
        "engineVersion": "wilder-rsi + sma-buffer + vol-confirm + true-atr + swing-sr",
        "tickersTested": tickers_used,
        "barsGraded": bars_graded,
        "dateRange": {"from": date_min, "to": date_max},
        "horizonsSessions": list(HORIZONS),
        "signals": {},
        "confidenceBuckets2d": {},
        "supportResistance": {},
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
        out["supportResistance"][side] = {
            "touches": total,
            "heldPct": round(t["held"] / total * 100, 1) if total else None,
        }
    return out


def main():
    tickers, generated = load_tickers(["pse-history.json", "pse-full-history.json"])
    if not tickers:
        print("ERROR: no ticker history found — nothing to backtest.")
        sys.exit(1)
    print(f"Loaded {len(tickers)} tickers "
          f"(source files generated at: {', '.join(generated) or 'unknown'})")
    result = run_backtest(tickers)
    with open("pse-backtest.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"Graded {result['barsGraded']} signal-days across "
          f"{result['tickersTested']} tickers "
          f"({result['dateRange']['from']} → {result['dateRange']['to']})")
    print("Wrote pse-backtest.json")


if __name__ == "__main__":
    main()
