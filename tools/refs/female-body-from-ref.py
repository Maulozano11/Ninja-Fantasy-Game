"""The owner's female body from his heroines drawn at our sprite scale -> src/sprite/femaleBodyArt.ts.

He sent Lyra, Aurelia and Saya drawn at our game scale (2026-10-21, "aqui tienes tus referencias
perfectas del modelo de mujer"): docs/reference/{lyra,aurelia,saya}-game-scale-owner-reference.jpg.
Each is a 100x100 grid of his pixels (one of his = one fine pixel of ours), 19.32 or 10.24 picture
pixels each, phase 0. This script samples every cell at its centre and lifts, as his pixels:

- his skin ramp: the line, deep shadow, shadow and base he paints bare skin with (median of each
  tone over every bare-skin pixel of the three pictures);
- the female hands, about 7x7 with the line: each one cut out of one of his hands, every pixel his
  (skin tone or line); his sleeve, cuff and weapon pixels next to it are left out, and where the
  weapon or cuff covered a pixel of the hand the hand's own row is continued;
- the female bare feet: his near and far foot silhouettes (5 rows near, 3 far, from his boots: he
  drew no bare feet) filled with his skin tones the way he shades his skin (lit toward the upper
  left, one shadow band, the sole dark);
- the near shoulder: Aurelia's bare near shoulder as a painted piece riding the upper arm.

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
    `keep` limits the cut to a mask of (row, col) offsets given as strings ('#' keeps); `fix` maps
    (row, col) offsets to a letter for a pixel his weapon or cuff covered, continuing his row."""
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




def inside_mask(name, y0, y1, x0, x1):
    """The inside of his outline in a window: figure pixels whose four neighbours are figure too
    (his boot's inner detail lines count as inside; only the outer line is left out)."""
    fig = N[name].min(2) <= 235
    pad = np.pad(fig, 1)
    ins = fig & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    return ins[y0:y1, x0:x1]


# ---------------------------------------------------------------------------
# Hands. His heroines' hands are about 7x7 with the line, against our 9x9 (whose pictures are his
# too: the crystal-sword hands in src/sprite/ctx.ts). The relaxed hand is Aurelia's near hand,
# pixel for pixel. The other shapes (grip, fist, open, point, cradle) he has not drawn bare at this
# size, so his crystal-sword hands are brought down to the heroines' size by leaving out the rows
# and columns that repeat a neighbour most: every pixel left is one of his, none is blended.
# ---------------------------------------------------------------------------
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


# Aurelia's near hand (his rows 53-58, cols 31-37), relaxed at her side, palm in, fingers down.
# Her dress line right of rows 57-58 is not hand and is left out; her gold cuff line over the
# wrist (row 53, col 32) becomes the shadow beside it, and the fingertip's line on row 57 that
# her dress hid is closed.
RELAXED_F = cut('aurelia', 53, 59, 31, 38,
                keep=['#######', '#######', '#######', '#######', '######.', '######.'],
                fix={(0, 1): 's', (4, 4): 'o', (4, 5): 'o'})

HANDS = {'relaxed': ([3, 0], RELAXED_F)}
for key, name, w, h in (('grip', 'HAND_GRIP', 8, 9), ('fist', 'HAND_FIST', 7, 6), ('fistFar', 'HAND_FIST_FAR', 6, 6),
                        ('open', 'HAND_OPEN', 9, 8), ('point', 'HAND_POINT', 8, 8), ('cradle', 'HAND_CRADLE', 9, 7)):
    HANDS[key] = shrink(*ctx_template(name), w, h)

# ---------------------------------------------------------------------------
# Bare feet: the inside of his boots' outline (he drew no bare feet), the near foot from Lyra (his
# rows 93-96, toes toward us), the far foot from Lyra (rows 91-94, pointing right). Filled with his
# skin the way he paints it: the base, the shadow on the side away from the light (right) and
# along the sole. Legend as ctx.ts FOOT_BARE: q-t skin shades 1-4 (r shadow, s base, q sole).
# ---------------------------------------------------------------------------


def foot(name, y0, y1, x0, x1, ankle_x):
    """His foot's whole silhouette, his line included: the layer's outline pass turns its edge into
    the line again, so the foot keeps his size. Inside it his skin: the base, and the shadow next to
    the line on the side away from the light (right) and along the sole."""
    fig = N[name].min(2) <= 235
    m = fig[y0:y1, x0:x1].copy()
    ys, xs = np.nonzero(m)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    for j in range(h):
        xs_j = np.nonzero(m[j])[0]
        if len(xs_j):
            m[j, xs_j.min():xs_j.max() + 1] = True

    def at(j, i):
        return 0 <= j < h and 0 <= i < w and m[j, i]

    def edge(j, i):
        return at(j, i) and not (at(j, i + 1) and at(j, i - 1) and at(j + 1, i) and (j == 0 or at(j - 1, i)))

    rows = []
    for j in range(h):
        r = ''
        for i in range(w):
            if not m[j, i]:
                r += '.'
            elif not edge(j, i) and (edge(j, i + 1) or edge(j + 1, i)):
                r += 'r'
            else:
                r += 's'
        rows.append(r)
    return [int(ankle_x - (x0 + xs.min())), 0], rows


FEET = {
    'N': foot('lyra', 93, 98, 34, 44, 38),
    'F': foot('lyra', 91, 96, 55, 70, 60),
}


def ts_template(p, rows, indent='  '):
    lines = [f'{indent}{{', f'{indent}  pivot: [{p[0]}, {p[1]}],', f'{indent}  rows: [']
    lines += [f"{indent}    '{r}'," for r in rows]
    lines += [f'{indent}  ],', f'{indent}}}']
    return '\n'.join(lines)


if '--show' in sys.argv:
    print('ramp', RAMP)
    for k, (p, rows) in HANDS.items():
        show(f'hand {k} pivot {p}', rows)
    for k, (p, rows) in FEET.items():
        show(f'foot {k} pivot {p}', rows)
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
        '/** The female hands, about 7x7 with the line (legend as ctx.ts: o line, D dark, x crease, s shadow, b base, l light). */',
        'export const FEMALE_HANDS: Record<\'relaxed\' | \'grip\' | \'fist\' | \'fistFar\' | \'open\' | \'point\' | \'cradle\', PixelTemplate> = {']
for k, (p, rows) in HANDS.items():
    out.append(f'  {k}: ' + ts_template(p, rows).lstrip() + ',')
out += ['};', '',
        '/** The female bare feet (legend as ctx.ts FOOT_BARE: q sole, r shadow, s base), the pivot on the ankle. */',
        'export const FEMALE_FEET: { N: PixelTemplate; F: PixelTemplate } = {']
for k, (p, rows) in FEET.items():
    out.append(f'  {k}: ' + ts_template(p, rows).lstrip() + ',')
out += ['};', '']
open(OUT, 'w').write('\n'.join(out))
print('wrote', os.path.relpath(OUT, REPO))
