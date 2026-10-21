"""The owner's flaming longsword from his Aiden picture (docs/reference/aiden-owner-reference.jpg).

His Aiden holds a long sword in the near fist, hanging across the legs: a pommel with a red jewel in
a gold collar, a dark blue wrapped grip, a gold cross-guard with a red jewel at its middle, and a long
blade burning red, orange and yellow, a hot yellow line down its middle, all in his black line. One
of his pixels is one fine pixel of our sprites (tools/refs/aiden_ref.py).

This script takes the sword out of his pixels: everything inside his black line, reached from the
blade, the guard, the pommel and the grip without crossing it, and that line around it (sides, not
corners). Every pixel keeps his exact colour, one palette character per colour of his (colours within
3 of each other share one), the characters of the blade and the jewels apart from those of the gold,
so the two can be recoloured each from his own. His gauntlet hides the grip between the pommel and
the guard: it is filled in with his grip's two blues, wrapped, in his black line, so the sword is
whole when our fist holds it elsewhere.

The template is drawn at his angle (the blade's line through its pixels) and pivots on the grip cell
under our near hand joint at rest: our idle pose holds this sword at his angle with its pivot on the
hand joint, so at rest every pixel is his, and our fist covers the grip as his gauntlet does.

It writes, in <out>:

  study/sword@8.png   the sword lifted out (the filled-in grip and its line marked in study/fill@8.png)
  study/kinds@8.png   what each pixel is: flame (red), gold (yellow), grip (blue), his line (black)
  study/his@8.png     his picture there

and, given a third argument, the game's module (src/sprite/items/flameSwordArt.ts). The same picture
always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/flame-sword-from-ref.py docs/reference/aiden-owner-reference.jpg <out> src/sprite/items/flameSwordArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

from aiden_ref import JOINTS, background, luma, native, save  # noqa: E402

# Where the sword is, in his pixels.
POMMEL_BOX = (21, 49, 27, 54)  # x0, y0, x1, y1 (exclusive): the jewel and its gold collar
GRIP_SEEDS = [(25, 52), (36, 60), (35, 61)]  # his grip above the gauntlet, and where it leaves it at the guard
GUARD_BOX = (32, 56, 45, 71)  # the cross-guard, from its low end by the knee to its high end by the belt
GUARD_SEEDS = [(36, 64), (39, 60), (42, 57)]
# The blade begins past this cell, on the far side of the guard's red jewel (along the sword).
BLADE_FROM = (40, 63)
TIP = (78.5, 90.5)  # the point (pixel centres)
# A rough line through the pommel and the point to find the blade's own line by.
ROUGH = ((23.5, 51.0), TIP)
# How far from the sword's line each part reaches (his pixels): the grip and pommel are narrow, the
# guard wide; the blade is about five pixels across.
HALF_BLADE = 5.0
HALF_GRIP = 2.5
# His black line: darker than any of the sword's own colours (his darkest flame red is about 34).
LINE_LUMA = 30
# The part of the grip his gauntlet hides, along the sword (from just past his last grip pixel above
# the gauntlet to the two he shows at the guard), and how far either side of the line it reaches.
HIDDEN_GRIP = ((29, 56), (36, 60))
GRIP_HALF = 1.0

# Palette characters: the shared ones, then Greek and Latin letters (his blade has over a hundred
# colours).
CHARS = ('abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'
         'αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩ' + ''.join(chr(c) for c in range(0xc0, 0x250) if chr(c).isalpha()))


def axis(a):
    """The sword's line: through the blade's bright pixels (their main direction). Returns the
    centroid, the unit direction (toward the point) and the angle in screen degrees."""
    H, W, _ = a.shape
    r, b = a[..., 0], a[..., 2]
    ys, xs = np.mgrid[0:H, 0:W]
    (x0, y0), (x1, y1) = ROUGH
    d = np.array([x1 - x0, y1 - y0], float)
    d /= np.linalg.norm(d)
    s = -(xs + 0.5 - x0) * d[1] + (ys + 0.5 - y0) * d[0]
    t = (xs + 0.5 - x0) * d[0] + (ys + 0.5 - y0) * d[1]
    bright = (r > 200) & (r > b + 60) & (np.abs(s) < 6) & (t > 20)
    pts = np.stack([xs[bright] + 0.5, ys[bright] + 0.5], 1).astype(float)
    m = pts.mean(0)
    v = np.linalg.svd(pts - m)[2][0]
    if v[0] < 0:
        v = -v
    return m, v, float(np.degrees(np.arctan2(v[1], v[0])))


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = native(ref)
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = luma(a)
    bg = background(a)
    ys, xs = np.mgrid[0:H, 0:W]
    m, d, angle = axis(a)
    n = np.array([-d[1], d[0]])
    # Every pixel's place along the sword (t, toward the point) and across it (s).
    t = (xs + 0.5 - m[0]) * d[0] + (ys + 0.5 - m[1]) * d[1]
    s = (xs + 0.5 - m[0]) * n[0] + (ys + 0.5 - m[1]) * n[1]

    def along(p):
        return (p[0] + 0.5 - m[0]) * d[0] + (p[1] + 0.5 - m[1]) * d[1]

    def inbox(box):
        x0, y0, x1, y1 = box
        return (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)

    t_guard = along((36, 62))
    t_tip = along((int(TIP[0]), int(TIP[1])))
    # Where the sword may be: the pommel's box, a narrow band along the grip, the guard's box and the
    # blade's band from the guard to the point.
    zone = inbox(POMMEL_BOX) | ((np.abs(s) <= HALF_GRIP) & (t < t_guard)) | inbox(GUARD_BOX) | ((np.abs(s) <= HALF_BLADE) & (t >= t_guard - 2) & (t <= t_tip + 1.5))
    # His steel (the gauntlet and the armour round the guard) is light grey-blue: never the sword.
    steel = (b > r + 10) & (L > 105)
    line = L < LINE_LUMA
    passable = zone & ~bg & ~line & ~steel

    # The sword: what is reached from its parts without crossing his black line (sides only).
    seeds = [(x, y) for x, y in GRIP_SEEDS + GUARD_SEEDS] + [(22, 50)]
    bright = zone & (r > 200) & (r > b + 60) & (t > t_guard + 2)
    seeds += [(int(x), int(y)) for y, x in zip(*np.nonzero(bright))]
    inside = np.zeros((H, W), bool)
    stack = [(y, x) for x, y in seeds]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or inside[y, x] or not passable[y, x]:
            continue
        inside[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    # The grip under his gauntlet: two pixels across the line, from his last grip pixel above the
    # gauntlet to the ones at the guard. It takes his grip's dark and light blue in turn (his grip is
    # wrapped), and his black line along both sides where his gauntlet covered that too.
    t0, t1 = along(HIDDEN_GRIP[0]), along(HIDDEN_GRIP[1])
    hidden = (np.abs(s) <= GRIP_HALF) & (t > t0 - 0.5) & (t < t1 + 0.5) & ~inside
    grip_dark = np.array([0x27, 0x2c, 0x45])  # his grip's blues (at 26,52 and 26,53)
    grip_light = np.array([0x50, 0x5c, 0x83])
    col = a.copy()
    for y, x in zip(*np.nonzero(hidden)):
        col[y, x] = grip_light if (x + y) % 2 else grip_dark
    shape = inside | hidden
    pad = np.pad(shape, 1)
    ring = (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]) & ~shape
    hp = np.pad(hidden, 1)
    near_hidden = (hp[:-2, 1:-1] | hp[2:, 1:-1] | hp[1:-1, :-2] | hp[1:-1, 2:])
    his_line = ring & line
    filled_line = ring & near_hidden & ~line
    line_black = np.array([0x01, 0x01, 0x01])  # his line round the grip
    for y, x in zip(*np.nonzero(filled_line)):
        col[y, x] = line_black
    # Where the sword meets something else without his line (none, if his line is closed): reported.
    open_edge = ring & ~line & ~near_hidden & ~bg
    if open_edge.any():
        print('no black line at', [(int(x), int(y)) for y, x in zip(*np.nonzero(open_edge))])
    outline = his_line | filled_line

    # What each pixel is: the flame (the blade, and the red jewels of the pommel and the guard), the
    # gold (the guard and the pommel's collar), the grip, or his line. The blade begins past the
    # guard's jewel: up to there all of his gold (its yellow, cream and brown shading) is the guard's,
    # and his reds (their green under about a third of their red) are the jewels'.
    jewel_red = g < 0.35 * r
    kind = np.full((H, W), '', dtype='<U5')
    blade = inside & (t > along(BLADE_FROM))
    hilt = inside & ~blade
    kind[blade] = 'flame'
    kind[hilt & jewel_red] = 'flame'
    kind[hilt & ~jewel_red & (r >= b)] = 'gold'
    kind[hilt & (b > r)] = 'grip'
    kind[hidden] = 'grip'
    kind[outline] = 'line'

    # His colours as palette characters, one per colour of his within each kind (colours within 3
    # share one), the flame's first, then the gold's, the grip's and his line's.
    grid = np.full((H, W), '.', dtype='<U1')
    palette = {}
    groups = {}
    used = 0
    for k in ('flame', 'gold', 'grip', 'line'):
        seen = []
        for y in range(H):
            for x in range(W):
                if kind[y, x] != k:
                    continue
                c = col[y, x]
                for ch, refc in seen:
                    if np.abs(refc - c).max() <= 3:
                        grid[y, x] = ch
                        break
                else:
                    ch = CHARS[used]
                    used += 1
                    seen.append((ch, c))
                    palette[ch] = '#%02x%02x%02x' % tuple(int(v) for v in c)
                    grid[y, x] = ch
        groups[k] = ''.join(ch for ch, _ in seen)

    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows = [''.join(grid[y, x0:x1]) for y in range(y0, y1)]
    # The pivot: the grip cell under our near hand joint at rest (our fist covers it).
    hx, hy = int(np.floor(JOINTS['handN'][0])), int(np.floor(JOINTS['handN'][1]))
    assert kind[hy, hx] == 'grip', ('the hand joint is not on the grip', kind[hy, hx])
    pivot = (hx - int(x0), hy - int(y0))

    # The colours the two slots turn from: his commonest flame and gold.
    def commonest(k, keep):
        best, n_best = None, -1
        for ch in groups[k]:
            hexc = palette[ch]
            rr, gg, bb = int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16)
            if not keep(rr, gg, bb):
                continue
            cnt = sum(row.count(ch) for row in rows)
            if cnt > n_best:
                best, n_best = hexc, cnt
        return best

    flame_base = commonest('flame', lambda rr, gg, bb: rr > 200 and gg < 100)
    gold_base = commonest('gold', lambda rr, gg, bb: rr > 200 and gg > 150)

    if len(sys.argv) > 3:
        write_ts(sys.argv[3], rows, pivot, angle, palette, groups, flame_base, gold_base)

    # Studies.
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                hexc = palette[ch]
                rgba[j, i] = [int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16), 255]
    save(rgba, os.path.join(out, 'study', 'sword@8.png'))
    fill = rgba.copy()
    sub = (hidden | filled_line)[y0:y1, x0:x1]
    fill[sub] = [0, 255, 255, 255]
    save(fill, os.path.join(out, 'study', 'fill@8.png'))
    save(a[y0:y1, x0:x1], os.path.join(out, 'study', 'his@8.png'))
    kinds = np.zeros_like(rgba)
    for k, c in (('flame', (230, 60, 40)), ('gold', (240, 200, 60)), ('grip', (60, 80, 160)), ('line', (0, 0, 0))):
        kinds[(kind == k)[y0:y1, x0:x1]] = c + (255,)
    save(kinds, os.path.join(out, 'study', 'kinds@8.png'))
    print(len(rows), 'rows x', len(rows[0]), 'origin', (int(x0), int(y0)), 'pivot', pivot, 'angle %.2f' % angle,
          'colours', {k: len(v) for k, v in groups.items()}, 'bases', flame_base, gold_base)


def write_ts(path, rows, pivot, angle, palette, groups, flame_base, gold_base):
    """The sword as the game's module (src/sprite/items/flameSwordArt.ts)."""
    import json
    import re

    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else json.dumps(k, ensure_ascii=False).replace('"', "'")

    def lit(v):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

    out = [
        "// The owner's flaming longsword, his pixels (tools/refs/flame-sword-from-ref.py from",
        '// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface PaintedSword extends PaintedPiece {',
        '  /** The characters of the burning blade and the red jewels in the pommel and the guard. */',
        '  flame: string;',
        '  /** The characters of the gold: the cross-guard and the pommel\'s collar. */',
        '  gold: string;',
        '}',
        '',
        '/** His commonest flame red and guard gold: the colours the two colour slots turn his from. */',
        f"export const FLAME_SWORD_FLAME = '{flame_base}';",
        f"export const FLAME_SWORD_GOLD = '{gold_base}';",
        '',
        '/**',
        ' * The sword as he painted it in Aiden\'s near fist, hanging across the legs: drawn at his angle and',
        ' * pivoting on the grip under our near hand joint, so held at rest it is every pixel his. The grip',
        ' * his gauntlet hides is filled in with his two grip blues in his black line.',
        ' */',
        'export const FLAME_LONGSWORD: PaintedSword = {',
        f'  pivot: [{pivot[0]}, {pivot[1]}],',
        f'  angle: {angle:.2f},',
        '  rows: [',
    ]
    out += [f'    {lit(r)},' for r in rows]
    out += ['  ],', '  colors: {']
    out += [f'    {key(k)}: {lit(v)},' for k, v in palette.items()]
    out += ['  },', f"  flame: {lit(groups['flame'])},", f"  gold: {lit(groups['gold'])},", '};', '']
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
