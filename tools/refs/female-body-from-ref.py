"""The owner's female body from his heroines drawn at our sprite scale -> src/sprite/femaleBodyArt.ts.

He sent Lyra, Aurelia and Saya drawn at our game scale (2026-10-21, "aqui tienes tus referencias
perfectas del modelo de mujer"): docs/reference/{lyra,aurelia,saya}-game-scale-owner-reference.jpg.
Each is a 100x100 grid of his pixels (one of his = one fine pixel of ours), 19.32 or 10.24 picture
pixels each, phase 0. This script samples every cell at its centre and lifts, as his pixels:

- his skin ramp: the line, deep shadow, shadow and base he paints bare skin with (median of each
  tone over every bare-skin pixel of the three pictures);
- the female hands, each cut out of one of his hands, every pixel his (skin tone or line): the near
  relaxed hand is Aurelia's near hand, the far relaxed hand Lyra's far hand, the near fist round a
  weapon's grip Lyra's near hand on her sword, the far fist Saya's far hand. His sleeve, cuff and
  weapon pixels next to them are left out; where his weapon or cuff covered a pixel of the hand the
  hand's own row is continued, and where his line is open onto his dress it is closed. A few of his
  far-hand pixels are darker than his deep shadow; they take the deep shadow (the ramp has no room
  below it but the line). He drew no open, pointing or cradling hand at this size, so those three
  are his crystal-sword hands (src/sprite/ctx.ts) brought down to his heroines' size by leaving out
  the rows and columns that repeat a neighbour most: every pixel left is one of his, none blended;
- the near shoulder: Aurelia's bare near shoulder (her rows 26-31), a painted piece riding the top
  of the upper arm (src/sprite/body.ts), in his skin tones so it follows the player's skin colour.

Bare feet are not lifted here: he drew none bare. The female feet are our feet from his
crystal-sword picture made shorter at runtime (src/sprite/ctx.ts shortFoot).

Run from the repo root:
    python3 -I tools/refs/female-body-from-ref.py            # writes src/sprite/femaleBodyArt.ts
    python3 -I tools/refs/female-body-from-ref.py --show     # prints every cut as text, writes nothing
Generated output says so: rerun the script to change it, never edit the module.
"""
import colorsys
import re
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(REPO, 'docs', 'reference')
OUT = os.path.join(REPO, 'src', 'sprite', 'femaleBodyArt.ts')
NAMES = ('lyra', 'aurelia', 'saya')


def native(name):
    """His picture sampled to its 100x100 grid: the median of the middle half of every cell."""
    a = np.asarray(Image.open(os.path.join(REF, f'{name}-game-scale-owner-reference.jpg')).convert('RGB')).astype(int)
    p = a.shape[0] / 100
    n = np.zeros((100, 100, 3), int)
    for j in range(100):
        for i in range(100):
            y0, y1 = int(j * p + p * 0.25), int(j * p + p * 0.75) + 1
            x0, x1 = int(i * p + p * 0.25), int(i * p + p * 0.75) + 1
            n[j, i] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), 0)
    return n


def is_line(c):
    return c.max() < 60


def is_skin(c):
    r, g, b = c / 255
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return (h < 0.1 or h > 0.97) and s > 0.35 and 0.45 < l < 0.92 and r > 0.75 and g > 0.45


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


N = {k: native(k) for k in NAMES}

# ---------------------------------------------------------------------------
# His skin ramp. Bare skin in the three pictures (face, neck, shoulders, hands, thighs), split by
# lightness into his three tones; the line is his near-black.
# ---------------------------------------------------------------------------
skin_px = []
line_px = []
for k in NAMES:
    a = N[k]
    for y in range(100):
        for x in range(100):
            c = a[y, x]
            if is_skin(c):
                skin_px.append(c)
            elif is_line(c):
                # a line pixel that touches skin is his skin outline
                if any(0 <= y + dy < 100 and 0 <= x + dx < 100 and is_skin(a[y + dy, x + dx]) for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0))):
                    line_px.append(c)
skin_px = np.array(skin_px)
lum = skin_px @ np.array([0.299, 0.587, 0.114])
# his three tones: base (the lightest), shadow, deep shadow
cuts = (150, 195)
deep = np.median(skin_px[lum < cuts[0]], 0)
shadow = np.median(skin_px[(lum >= cuts[0]) & (lum < cuts[1])], 0)
base = np.median(skin_px[lum >= cuts[1]], 0)
line = np.median(np.array(line_px), 0)
RAMP = {'line': hexc(line), 'deep': hexc(deep), 'shadow': hexc(shadow), 'base': hexc(base)}


def tone(c):
    """One of his pixels as a hand-template letter: o line, D deep, s shadow, b base; None if not skin."""
    if is_line(c):
        return 'o'
    if not is_skin(c):
        return None
    l = c @ np.array([0.299, 0.587, 0.114])
    return 'D' if l < cuts[0] else 's' if l < cuts[1] else 'b'


def cut(name, y0, y1, x0, x1, keep=None, fix=None):
    """His pixels in rows y0..y1-1, cols x0..x1-1 as tone letters ('.' where not skin or line).
    `keep` limits the cut to a mask of rows given as strings ('#' keeps); `fix` maps (row, col)
    offsets to a letter for a pixel his weapon, cuff or dress covered (continuing his row), for a
    far-hand pixel darker than his deep shadow ('D'), or for his line closed where it opens onto his
    dress ('o')."""
    a = N[name]
    rows = []
    for j, y in enumerate(range(y0, y1)):
        r = ''
        for i, x in enumerate(range(x0, x1)):
            t = tone(a[y, x]) or '.'
            if keep is not None and keep[j][i] != '#':
                t = '.'
            if fix and (j, i) in fix:
                t = fix[(j, i)]
            r += t
        rows.append(r)
    return rows


def show(title, rows):
    print(title)
    for r in rows:
        print('   ', r)


# ---------------------------------------------------------------------------
# Hands, each about 5-7 px with the line, as he draws them at our scale.
# ---------------------------------------------------------------------------

# Aurelia's near hand (her rows 53-58, cols 31-37), relaxed at her side, palm in, fingers down, the
# thumb in front. Her gold cuff's line over the wrist (row 53, col 32) becomes the shadow beside it;
# her dress line right of rows 57-58 is not hand; the fingertip's line on row 57, open onto her
# dress, is closed.
RELAXED = cut('aurelia', 53, 59, 31, 38,
              keep=['#######', '#######', '#######', '#######', '######.', '######.'],
              fix={(0, 1): 's', (4, 4): 'o'})

# Lyra's far hand (her rows 56-61, cols 65-69), hanging at her side seen edge-on: thin, in shade.
# Her sleeve beside rows 58-60 is left out; her three darkest skin pixels take the deep shadow.
RELAXED_FAR = cut('lyra', 56, 62, 65, 70,
                  keep=['#####', '#####', '.####', '.####', '.####', '..##.'],
                  fix={(0, 3): 'D', (1, 2): 'D', (2, 2): 'D', (3, 2): 'D', (4, 2): 'D'})

# Lyra's near hand round her sword's grip (her rows 55-59, cols 30-37): the grip came in at the top
# left (row 55, col 30: her line goes on there) and her sword's gold guard sat below right (rows
# 57-58: left out); the fist closes on her row 59.
GRIP = cut('lyra', 55, 60, 30, 38,
           keep=['########', '########', '#######.', '.####...', '........'],
           fix={(0, 0): 'o', (4, 2): 'o', (4, 3): 'o'})

# Saya's far hand (her rows 58-62, cols 65-71), a fist in shade at her far hip; her armour beside
# row 61 is left out and her three darkest skin pixels take the deep shadow.
FIST_FAR = cut('saya', 58, 63, 65, 72,
               keep=['#####..', '######.', '#######', '.#####.', '.####..'],
               fix={(2, 3): 'D', (2, 4): 'D', (3, 3): 'D'})

# Pivots: the wrist (the middle of the hand's top row). The grip hangs one row lower so a weapon's
# handle (grip.ts gripPoint, about 4 px below the wrist) passes through the middle of the fist.
HANDS = {
    'relaxed': ([3, 0], RELAXED),
    'relaxedFar': ([2, 0], RELAXED_FAR),
    'grip': ([3, -1], GRIP),
    'fist': ([3, 0], GRIP),
    'fistFar': ([2, 0], FIST_FAR),
}

# The shapes he has not drawn at this size: his crystal-sword hands (ctx.ts) brought down.
CTX = open(os.path.join(REPO, 'src', 'sprite', 'ctx.ts')).read()


def ctx_template(name):
    m = re.search(r'const ' + name + r': PixelTemplate = \{\s*pivot: \[(\d+), (\d+)\],\s*rows: \[(.*?)\],\s*\};', CTX, re.S)
    body = '\n'.join(l for l in m.group(3).split('\n') if not l.strip().startswith('//'))
    rows = re.findall(r"'([^']*)'", body)
    w = max(len(r) for r in rows)
    return [int(m.group(1)), int(m.group(2))], [r.ljust(w, '.') for r in rows]


def openings(rows):
    """Inner pixels (skin) of the hand touching the empty outside below the wrist row: gaps in his line."""
    h, w = len(rows), len(rows[0])
    n = 0
    for y in range(1, h):
        for x in range(w):
            if rows[y][x] in '.o':
                continue
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                yy, xx = y + dy, x + dx
                if yy < 0:
                    continue
                if not (0 <= yy < h and 0 <= xx < w) or rows[yy][xx] == '.':
                    n += 1
    return n


def drop_index(n, pivot, get, ok=lambda i: True):
    """The interior line most like one of its neighbours (ties: the one nearest the middle) whose
    removal keeps the hand's line shut."""
    best = None
    for i in range(1, n - 1):
        if i == pivot or not ok(i):
            continue
        a = get(i)
        same = max(sum(p == q for p, q in zip(a, get(i - 1))), sum(p == q for p, q in zip(a, get(i + 1))))
        key = (-same, abs(i - (n - 1) / 2), i)
        if best is None or key < best[0]:
            best = (key, i)
    if best is None:
        return drop_index(n, pivot, get)
    return best[1]


def shrink(pivot, rows, w, h):
    """His template brought to w x h by leaving out its most repeated interior rows and columns."""
    px, py = pivot
    rows = list(rows)
    while all(r[-1] == '.' for r in rows):
        rows = [r[:-1] for r in rows]
    while len(rows) > h:
        i = drop_index(len(rows), py, lambda k: rows[k], lambda k: openings(rows[:k] + rows[k + 1:]) <= openings(rows))
        rows.pop(i)
        if i < py:
            py -= 1
    while len(rows[0]) > w:
        i = drop_index(len(rows[0]), px, lambda k: [r[k] for r in rows], lambda k: openings([r[:k] + r[k + 1:] for r in rows]) <= openings(rows))
        rows = [r[:i] + r[i + 1:] for r in rows]
        if i < px:
            px -= 1
    return [px, py], shut(rows)


def shut(rows):
    """Where leaving lines out opened his line (a skin pixel now touching the outside below the
    wrist row), that pixel becomes the line: the hand is stamped without an outline pass."""
    h, w = len(rows), len(rows[0])
    out = [list(r) for r in rows]
    for y in range(1, h):
        for x in range(w):
            if rows[y][x] in '.o':
                continue
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                yy, xx = y + dy, x + dx
                if yy >= 0 and (not (0 <= yy < h and 0 <= xx < w) or rows[yy][xx] == '.'):
                    out[y][x] = 'o'
    return [''.join(r) for r in out]


def fingers(rows, n):
    """The last n rows of an open hand's spread fingers (one pixel each, his line between) read as
    claws at this size: they are left out and the row above closes the hand."""
    rows = rows[:len(rows) - n]
    last = rows[-1]
    rows[-1] = ''.join('o' if c not in '.o' else c for c in last)
    return rows


for key, name, w, h in (('open', 'HAND_OPEN', 7, 8), ('point', 'HAND_POINT', 7, 8), ('cradle', 'HAND_CRADLE', 7, 6)):
    HANDS[key] = shrink(*ctx_template(name), w, h)
HANDS['open'] = (HANDS['open'][0], fingers(HANDS['open'][1], 1))

# ---------------------------------------------------------------------------
# Aurelia's bare near shoulder (her rows 25-31, cols 39-48): the round of the shoulder with his line
# over its top (row 25, where her hair ends beside it), his shadow just inside the line all round
# and his base inside. Her gold strap on row 31 (col 40) continues her shadow; below row 31 her
# sleeve starts, so the piece ends there and our upper arm goes on. The pivot is the middle of the
# round, where our shoulder joint is; her upper arm points down and a little back (112 degrees on
# screen).
# ---------------------------------------------------------------------------
SHOULDER = cut('aurelia', 25, 32, 39, 49,
               keep=['.....###..'] + ['##########'] * 6,
               fix={(6, 1): 's', (6, 7): 'D'})
SHOULDER_PIVOT = [5, 4]
SHOULDER_ANGLE = 112


def ts_template(p, rows, indent='  ', extra=''):
    lines = [f'{indent}{{', f'{indent}  pivot: [{p[0]}, {p[1]}],', f'{indent}  rows: [']
    lines += [f"{indent}    '{r}'," for r in rows]
    lines += [f'{indent}  ],']
    if extra:
        lines.append(f'{indent}  {extra}')
    lines += [f'{indent}}}']
    return '\n'.join(lines)


if '--show' in sys.argv:
    print('ramp', RAMP)
    for k, (p, rows) in HANDS.items():
        show(f'hand {k} pivot {p}', rows)
    show(f'shoulder pivot {SHOULDER_PIVOT}', SHOULDER)
    sys.exit(0)

out = ['// Generated by tools/refs/female-body-from-ref.py from the owner\'s heroines drawn at our scale',
       '// (docs/reference/{lyra,aurelia,saya}-game-scale-owner-reference.jpg): rerun the script to change it.',
       '',
       "import type { PixelTemplate } from './rotsprite';",
       '',
       '/** His skin on the female bodies: the line, deep shadow, shadow and base he paints bare skin with. */',
       'export const FEMALE_SKIN = {']
for k, v in RAMP.items():
    out.append(f"  {k}: '{v}',")
out += ['};', '',
        '/** The female hands, his at our scale (legend as ctx.ts: o line, D deep, s shadow, b base, l light). */',
        'export const FEMALE_HANDS: Record<\'relaxed\' | \'relaxedFar\' | \'grip\' | \'fist\' | \'fistFar\' | \'open\' | \'point\' | \'cradle\', PixelTemplate> = {']
for k, (p, rows) in HANDS.items():
    out.append(f'  {k}: ' + ts_template(p, rows).lstrip() + ',')
out += ['};', '',
        '/** Aurelia\'s bare near shoulder (same legend), its pivot on the shoulder joint; `angle` is her upper arm\'s on screen. */',
        'export const FEMALE_SHOULDER_N: PixelTemplate & { angle: number } = ' + ts_template(SHOULDER_PIVOT, SHOULDER, '', f'angle: {SHOULDER_ANGLE},').lstrip() + ';',
        '']
open(OUT, 'w').write('\n'.join(out))
print('wrote', os.path.relpath(OUT, REPO))
