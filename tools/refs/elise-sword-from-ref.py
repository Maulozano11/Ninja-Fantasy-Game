"""Elise's sword from the owner's picture (docs/reference/elise-owner-reference.jpg).

Elise (provisional "Elise, la Espada Celeste") holds a long slender sword in her near fist, hanging
blade-down across her legs: a gold pommel, a wrapped grip, a gold knuckle bow that sweeps from the
pommel round the outside of her fist to the guard, a gold shell with a steel cross-bar, and a long
blade glowing gold with a white-hot middle, gold sparkles round it, all in her dark line.

Her picture is not at our scale (tools/refs/heroine_ref.py: her weapon comes down by 0.36). The
study (tools/refs/heroine-study.py) brought her blade and its sparkles down to our scale on our
female idle in her own colours (reduced_layers('elise')['blade'] and ['glow']); they are taken from
there. Her hilt is too small at our scale to reduce by machine (about 11 x 12 of our pixels, its
bow and bar one pixel wide) and our fist is bigger than her glove, so it is drawn here pixel by
pixel (HILT, BOW) after her picture, in her colours only, on the blade's own line: the pommel shows
above our fist as hers shows above her glove, the bow is a thin bar close round the outside of the
fist with a pixel's gap before the glove, the shell and the cross-bar sit where the blade leaves the fist. The grip hidden in her glove is drawn
in her grip's browns.

The template is drawn at her angle (the blade's line, about 51 degrees, which our idle pose holds
the sword at) and pivots on the grip cell under our near hand joint at rest (heroine_ref.OUR_JOINTS
handN). The study's blade lies about two pixels off the line through our fist, and our fist (bigger
than her glove) would hide her guard; the blade is moved onto that line and a little further out
(BLADE_SHIFT) so the fist holds the grip in every pose and the shell shows below it.

It writes, in <out>:

  study/sword@8.png    the sword (blade, hilt and sparkles) as the template draws it at rest
  study/kinds@8.png    what each pixel is: blade glow (yellow), guard gold (orange), steel (grey),
                       grip (brown), her line (black), sparkles (cyan)
  study/reduced@8.png  the study's reduced sword there, for comparison

and, given a third argument, the game's module (src/sprite/items/eliseSwordArt.ts). The same input
always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/elise-sword-from-ref.py <out> src/sprite/items/eliseSwordArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

from heroine_ref import OUR_JOINTS, reduced_layers, rgb, save  # noqa: E402

WHICH = 'elise'
# Her colours used here (hex, all from PALETTES['elise']), by the character the drawings below use.
HER = {
    '#': '080613',  # her dark line
    # gold
    '$': 'fefae0', 'z': 'fce89e', 'y': 'f8dc92', 'o': 'e6b75e', 'd': 'cf9b48', 'b': 'cb9658',
    'k': 'ddac5a', 'T': 'a47043', 'X': 'b27b44', '"': 'feeeb8', '%': 'fefef9', ']': 'a99271',
    # steel
    'u': 'ced0dc', 'r': 'c4c4ce', 'h': 'a8a8b9', '\\': '8d8ea0', 'Z': '88889b', 'R': '787782',
    'M': '686771', 'W': '8b8076', 'e': 'a6a09b', '?': '464754',
    # grip leather
    ':': '573027', 'J': '865339', 'N': '905f3c',
}
GOLD = set('$zyodbkTX"%]')
STEEL = set('urh\\ZRMWe?')
GRIP = set(':JN')

# The study's blade pixels that are not the blade: the blue of her coat and the brown of her
# thighs where the blade crosses them (her picture's blade is gold, white and steel only).
NOT_BLADE = {'2d5090', '5e7faa', '764534', '804936', 'beaf9e', 'd2bb94'}
# The study's blade moved onto the line through our fist, and 2.3 px along it so the guard clears the
# fist (our pixels, x right, y down).
BLADE_SHIFT = (0, 3)
# Where the hilt ends and the blade begins: blade rows above this (after the shift) are the hilt's.
BLADE_FROM_ROW = 186

# The hilt, drawn after her picture at our scale in our 256 x 256 frame at idle (columns HILT_X0..,
# rows HILT_Y0..). '.' is nothing; the other characters are HER colours. The knuckle bow is BOW.
HILT_X0, HILT_Y0 = 98, 168
HILT = [
    # 98   103  108  113  118
    '...##',  # 168  the pommel
    '..#zy#',  # 169
    '..#ozo#',  # 170
    '...#dT#',  # 171  its collar (the bow leaves it here)
    '...##N:#',  # 172  the grip
    '.....#:N#',  # 173
    '......#N:#',  # 174
    '.......#:N#',  # 175  (from here the grip is under our fist)
    '........#N:#',  # 176
    '........#:N#',  # 177
    '.........#N:#',  # 178
    '..........#:N#',  # 179  our near hand joint is on the grip here (x 109)
    '...........#N:#',  # 180
    '............#:N#....##',  # 181
    '............#N:#...#zo#',  # 182  the cross-bar's upper end, a gold finial
    '.............#:N#.#uh#',  # 183
    '.............#kyourZ#',  # 184  the shell, and the steel cross-bar over it
    '.......dddoyzyokuhZ#',  # 185  the bow joins the shell
    '........#Tdkoyouh',  # 186  (the cross-bar crosses the blade's root)
    '.........#TdduhZ',  # 187
    '..........##uZ#',  # 188
    '..........#od#',  # 189  the cross-bar's lower end, a gold finial
    '...........##',  # 190
]
# Her knuckle bow (x, row, colour), her gold lit at the top and darker below: a thin bar that leaves
# the pommel's collar and sweeps down close round the outside of the fist into the shell, as hers
# hugs her glove, with one pixel of background between its line and the glove so it does not read as
# part of our (bigger) fist. Her line runs along both its sides (BOW_LINE: every side of a bow pixel
# the hilt leaves empty).
BOW = [
    (100, 172, 'k'), (100, 173, 'k'), (101, 174, 'k'), (101, 175, 'o'), (101, 176, 'o'), (101, 177, 'o'),
    (101, 178, 'o'), (101, 179, 'o'), (101, 180, 'd'), (101, 181, 'd'), (101, 182, 'd'), (102, 183, 'd'),
    (103, 184, 'd'), (104, 185, 'd'),
]
BOW_LINE = '#'

# Palette characters for the module, one per (kind, colour).
CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'


def hexrgb(h):
    return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)])


def build():
    """The sword at rest in our frame: kind and her colour per pixel, and the sparkles."""
    pal = rgb(WHICH)
    her = {'%02x%02x%02x' % tuple(int(v) for v in c) for c in pal}
    for k, h in HER.items():
        assert h in her, ('not her colour', k, h)
    lay = reduced_layers(WHICH)
    G = 256
    kind = np.full((G, G), '', dtype='<U6')
    col = np.full((G, G), '', dtype='<U6')
    # The blade: the study's, moved onto the line through the fist.
    sx, sy = BLADE_SHIFT
    for y, x in zip(*np.nonzero(lay['blade'] < 255)):
        h = '%02x%02x%02x' % tuple(int(v) for v in pal[lay['blade'][y, x]])
        if h in NOT_BLADE:
            continue
        X, Y = x + sx, y + sy
        if Y < BLADE_FROM_ROW:
            continue
        col[Y, X] = h
        kind[Y, X] = 'line' if h == HER['#'] else 'steel' if h in {HER[c] for c in STEEL} else 'blade'
    # The hilt over it.
    for j, row in enumerate(HILT):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            X, Y = HILT_X0 + i, HILT_Y0 + j
            col[Y, X] = HER[ch]
            kind[Y, X] = 'line' if ch == '#' else 'guard' if ch in GOLD else 'steel' if ch in STEEL else 'grip'
    # The bow, and her line along it where nothing of the hilt is.
    for X, Y, ch in BOW:
        assert not kind[Y, X], ('the bow runs into the hilt', X, Y)
        col[Y, X] = HER[ch]
        kind[Y, X] = 'guard'
    for X, Y, _ in BOW:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if not kind[Y + dy, X + dx]:
                col[Y + dy, X + dx] = HER[BOW_LINE]
                kind[Y + dy, X + dx] = 'line'
    # The sparkles: the study's glow, moved with the blade, where the sword is not.
    sparks = []
    for y, x in zip(*np.nonzero(lay['glow'] < 255)):
        X, Y = x + sx, y + sy
        if kind[Y, X]:
            continue
        sparks.append((int(X), int(Y), '%02x%02x%02x' % tuple(int(v) for v in pal[lay['glow'][y, x]])))
    sparks.sort(key=lambda p: (p[1], p[0]))
    return kind, col, sparks


def axis_angle(kind, col):
    """The blade's line: through its white-hot middle (her brightest gold)."""
    ys, xs = np.nonzero((kind == 'blade') & (col == HER['$']))
    pts = np.stack([xs + 0.5, ys + 0.5], 1).astype(float)
    m = pts.mean(0)
    v = np.linalg.svd(pts - m)[2][0]
    if v[0] < 0:
        v = -v
    return float(np.degrees(np.arctan2(v[1], v[0])))


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    kind, col, sparks = build()
    angle = axis_angle(kind, col)
    hx, hy = int(np.floor(OUR_JOINTS['handN'][0])), int(np.floor(OUR_JOINTS['handN'][1]))
    assert kind[hy, hx] == 'grip', ('the hand joint is not on the grip', kind[hy, hx])
    # One palette character per (kind, colour): the blade's glow and the guard's gold recolour apart.
    grid = np.full(kind.shape, '.', dtype='<U1')
    palette, groups, seen = {}, {'blade': '', 'guard': ''}, {}
    order = ('blade', 'guard', 'steel', 'grip', 'line', 'spark')
    spark_kind = {}
    for k in order:
        cells = [(y, x) for y, x in zip(*np.nonzero(kind == k))] if k != 'spark' else [(y, x) for x, y, _ in sparks]
        for y, x in sorted(cells):
            h = col[y, x] if k != 'spark' else next(c for X, Y, c in sparks if (X, Y) == (x, y))
            key = (k, h)
            if key not in seen:
                ch = CHARS[len(seen)]
                seen[key] = ch
                palette[ch] = '#' + h
                if k in ('blade', 'spark'):
                    groups['blade'] += ch
                elif k == 'guard':
                    groups['guard'] += ch
            if k == 'spark':
                spark_kind[(x, y)] = seen[key]
            else:
                grid[y, x] = seen[key]
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    for x, y, _ in sparks:
        x0, x1, y0, y1 = min(x0, x), max(x1, x + 1), min(y0, y), max(y1, y + 1)
    rows = [''.join(grid[y, x0:x1]) for y in range(y0, y1)]
    pivot = (hx - int(x0), hy - int(y0))
    spark_list = [(x - int(x0), y - int(y0), spark_kind[(x, y)]) for x, y, _ in sparks]
    blade_base = commonest(rows, palette, groups['blade'], lambda c: c[2] < 0.75 * c[0] and c[0] > 200)
    guard_base = commonest(rows, palette, groups['guard'], lambda c: c[2] < 0.75 * c[0] and c[0] > 200)

    if len(sys.argv) > 2:
        write_ts(sys.argv[2], rows, pivot, angle, palette, groups, spark_list, blade_base, guard_base)

    # Studies.
    H, W = y1 - y0, x1 - x0
    rgba = np.zeros((H, W, 4), np.uint8)
    kinds = np.zeros((H, W, 4), np.uint8)
    kc = {'blade': (240, 220, 60), 'guard': (240, 140, 40), 'steel': (150, 150, 160), 'grip': (110, 60, 30), 'line': (0, 0, 0)}
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                rgba[j, i, :3] = hexrgb(palette[ch][1:])
                rgba[j, i, 3] = 255
                kinds[j, i] = kc[kind[y0 + j, x0 + i]] + (255,)
    for x, y, ch in spark_list:
        rgba[y, x, :3] = hexrgb(palette[ch][1:])
        rgba[y, x, 3] = 255
        kinds[y, x] = (0, 230, 230, 255)
    save(rgba, os.path.join(out, 'study', 'sword@8.png'))
    save(kinds, os.path.join(out, 'study', 'kinds@8.png'))
    lay = reduced_layers(WHICH)
    pal = rgb(WHICH)
    ref = np.zeros((H, W, 4), np.uint8)
    for n in ('glow', 'blade', 'hilt'):
        L = lay[n][y0:y1, x0:x1]
        m = L < 255
        ref[m, :3] = pal[L[m]]
        ref[m, 3] = 255
    save(ref, os.path.join(out, 'study', 'reduced@8.png'))
    print(len(rows), 'rows x', len(rows[0]), 'origin', (int(x0), int(y0)), 'pivot', pivot, 'angle %.2f' % angle,
          'colours', len(palette), 'sparks', len(spark_list), 'bases', blade_base, guard_base)


def commonest(rows, palette, chars, keep):
    best, n_best = None, -1
    for ch in chars:
        c = hexrgb(palette[ch][1:])
        if not keep(c):
            continue
        n = sum(r.count(ch) for r in rows)
        if n > n_best:
            best, n_best = palette[ch], n
    return best


def write_ts(path, rows, pivot, angle, palette, groups, sparks, blade_base, guard_base):
    """The sword as the game's module (src/sprite/items/eliseSwordArt.ts)."""
    import json
    import re

    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else json.dumps(k).replace('"', "'")

    def lit(v):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

    out = [
        "// Elise's sword, the owner's picture at our scale (tools/refs/elise-sword-from-ref.py from",
        '// docs/reference/elise-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface EliseSword extends PaintedPiece {',
        '  /** The characters of the glowing blade and its sparkles. */',
        '  blade: string;',
        "  /** The characters of the guard's gold: the pommel, the knuckle bow and the shell. */",
        '  guard: string;',
        '  /** The sparkles round the blade: [x, y, character] in the template\'s cells (not in rows). */',
        '  sparks: [number, number, string][];',
        '}',
        '',
        '/** Her commonest blade gold and guard gold: the colours the two colour slots turn hers from. */',
        f"export const ELISE_SWORD_BLADE = '{blade_base}';",
        f"export const ELISE_SWORD_GUARD = '{guard_base}';",
        '',
        '/**',
        " * The sword as she holds it, hanging across the legs: drawn at her angle and pivoting on the grip",
        ' * under our near hand joint, so held at rest it lies as in her picture brought to our scale.',
        ' */',
        'export const ELISE_RAPIER: EliseSword = {',
        f'  pivot: [{pivot[0]}, {pivot[1]}],',
        f'  angle: {angle:.2f},',
        '  rows: [',
    ]
    out += [f'    {lit(r)},' for r in rows]
    out += ['  ],', '  colors: {']
    out += [f'    {key(k)}: {lit(v)},' for k, v in palette.items()]
    out += ['  },', f"  blade: {lit(groups['blade'])},", f"  guard: {lit(groups['guard'])},", '  sparks: [']
    out += [f'    [{x}, {y}, {lit(ch)}],' for x, y, ch in sparks]
    out += ['  ],', '};', '']
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
