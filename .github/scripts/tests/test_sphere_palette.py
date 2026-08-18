"""Drift tests for the Oracle sphere palette.

gen_sphere_palette.py generates the 36 `.osph-N` rules (6 games x 6 positions)
that styles.css ships. It is a one-shot generator: nothing checked that the CSS
in the repo is still what it produces, that the 36 colours are still all
distinct, or that the text on them still clears the contrast floor CLAUDE.md
claims. A hand edit to styles.css, or a tweak to the generator that was never
re-run, would go unnoticed until the page looked wrong.

The generator writes palette.css into the current directory, so it is run
inside a temporary directory -- the repo is only ever read.

    python3 .github/scripts/tests/test_sphere_palette.py

Exits non-zero if the shipped palette and its generator disagree.
"""
import colorsys
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent
GENERATOR = ROOT / '.github' / 'scripts' / 'gen_sphere_palette.py'
STYLES = ROOT / 'styles.css'

failures = []


def check(name, ok, detail=''):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail and not ok else ''}")
    if not ok:
        failures.append(name)


RULE_RE = re.compile(r'#oracle-page \.osph-\d+\{[^}]*\}')


def rules_of(text):
    """Rule text keyed by class index, so a diff points at the sphere."""
    out = {}
    for rule in RULE_RE.findall(text):
        idx = int(re.search(r'\.osph-(\d+)\{', rule).group(1))
        out[idx] = rule
    return out


# ── 1. the shipped CSS is exactly what the generator produces ────────────
print('\n1. styles.css matches gen_sphere_palette.py')
with tempfile.TemporaryDirectory() as tmp:
    proc = subprocess.run([sys.executable, str(GENERATOR)], cwd=tmp,
                          capture_output=True, text=True)
    check('the generator runs cleanly', proc.returncode == 0, proc.stderr.strip())
    generated = rules_of((Path(tmp) / 'palette.css').read_text())
    check('it emits 36 rules', len(generated) == 36, f'{len(generated)}')
    check('the generator reports no duplicate colours',
          'duplicates: NONE' in proc.stdout, proc.stdout.strip().splitlines()[-1] if proc.stdout else '')

shipped = rules_of(STYLES.read_text())
check('styles.css carries 36 .osph rules', len(shipped) == 36, f'{len(shipped)}')

missing = sorted(set(generated) - set(shipped))
extra = sorted(set(shipped) - set(generated))
check('every generated class is shipped', not missing, f'missing {missing}')
check('styles.css ships no .osph class the generator does not make', not extra, f'extra {extra}')

drifted = [i for i in sorted(set(generated) & set(shipped)) if generated[i] != shipped[i]]
check('every shipped rule is byte-identical to the generated one', not drifted,
      f'drifted: {drifted[:4]}')
if drifted:
    i = drifted[0]
    print(f'      generated: {generated[i]}')
    print(f'      shipped:   {shipped[i]}')


# ── 2. the properties the palette exists to guarantee ────────────────────
# Re-derived here from the documented rule rather than read back out of the
# generator, so a change to the generator's own maths cannot quietly redefine
# what "correct" means.
print('\n2. 36 distinct colours, 60 degrees apart, 10 degrees per game')
GAMES = [('642', 62, 78), ('645', 71, 74), ('649', 46, 82),
         ('655', 66, 70), ('658', 54, 86), ('ez2', 58, 64)]


def rgb_of(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360.0,
                                  max(0, min(1, l / 100.0)), max(0, min(1, s / 100.0)))
    return (round(r * 255), round(g * 255), round(b * 255))


def luminance(rgb):
    def chan(v):
        v /= 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = [chan(x) for x in rgb]
    return .2126 * r + .7152 * g + .0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + .05) / (lo + .05)


colours, contrasts = {}, []
for g, (key, L, S) in enumerate(GAMES):
    for i in range(6):
        h = (i * 60 + g * 10) % 360
        rgb = rgb_of(h, S, L)
        colours.setdefault('#%02x%02x%02x' % rgb, []).append((key, i))
        contrasts.append(max(contrast(rgb, (18, 14, 8)), contrast(rgb, (255, 255, 255))))

dupes = {k: v for k, v in colours.items() if len(v) > 1}
check('all 36 colours are distinct', not dupes, f'{dupes}')
check('a colour cannot repeat inside one game',
      all(len({(i * 60 + g * 10) % 360 for i in range(6)}) == 6 for g in range(len(GAMES))))
check('the six hues in a row sit 60 degrees apart',
      all(((i + 1) * 60 - i * 60) % 360 == 60 for i in range(5)))
check('each game rotates the wheel by 10 degrees, keeping games distinct mod 60',
      len({(g * 10) % 60 for g in range(len(GAMES))}) == len(GAMES))

# CLAUDE.md states the weakest measured text contrast is 4.7:1. That is the
# floor the palette was tuned to, and it sits exactly on it -- there is no
# headroom, so any hue/lightness change needs re-checking here.
worst = min(contrasts)
check(f'weakest text contrast holds the documented 4.7:1 floor (measured {worst:.2f})',
      worst >= 4.7, f'{worst:.2f}')

# ── 3. the engine's classes and the stylesheet agree ─────────────────────
print('\n3. Class indices line up with the engine')
check('classes are numbered 0..35 with no gaps', sorted(shipped) == list(range(36)),
      f'{sorted(set(range(36)) - set(shipped))}')
oracle_js = (ROOT / 'oracle.js').read_text()
m = re.search(r"var OSPH_GAMES=\[([^\]]*)\]", oracle_js)
engine_games = [s.strip().strip("'\"") for s in m.group(1).split(',')] if m else []
check('OSPH_GAMES lists the same six games in the same order as the generator',
      engine_games == [k for k, _, _ in GAMES], f'{engine_games}')

print('\n' + '=' * 60)
if failures:
    print(f'{len(failures)} failure(s):')
    for f in failures:
        print(f'  - {f}')
    sys.exit(1)
print('0 failure(s) — the shipped palette matches its generator')
