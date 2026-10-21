"""The owner's sword from his Scarlet picture (docs/reference/scarlet-owner-reference.jpg), at our
scale and held the way our swords are held.

His Scarlet holds a dark longsword in his near hand, hanging blade-down to the screen-left: a steel
cap over a red jewel with a pink glint for a pommel, a dark steel grip, a cross-guard of steel bars
with a red jewel where the blade leaves it, and a long dark blade, its edge on the side the light
comes from light steel, a red core down its middle, a dark steel edge on the other side, all in his
black line. The owner: "la espada copiala y arregla la orientacion para que sea igual a nuestras
armas" (copy it and fix its orientation so it is like our weapons).

Our swords hang the other way: the pommel up-left of the fist, the blade down-right across the legs,
the lit edge on top (src/sprite/items/weapons.ts). His sword mirrored left to right is held exactly
like that: it hangs at 55 degrees (our swords rest at 52) with his lit edge on top, his light still
falling on it from the upper left (a quarter turn would put his lit edge underneath). So the template
is his sword mirrored, drawn at 3 down for 2 across (56.3 degrees, one off his) so that every line
of it steps evenly, 2 and 1 pixels, as his lines do; it pivots on the grip under the middle of our
fist (grip.ts gripPoint), like our other blades, and our idle pose holds it at that angle
(grip.ts swordAngle), so at rest it is exactly this template.

His picture is not at our scale (tools/refs/scarlet_ref.py): one of our pixels is 1/0.6 of his
along the sword (SWORD_S: the sword 58 of our pixels long, its blade 41). Across, each of his blade's
bands keeps a row of its own, one pixel in every row of ours, so each stays an unbroken line (BANDS:
his black line, the light edge, the grey under it, a dark line, the red core, black, the dark steel
edge, his black line; nine of his pixels, seven of ours: his grey and dark line under the light edge
become one grey, his two blacks under the core one black). Along the blade each band takes, at each
of our pixels, his commonest colour in that band over the stretch of his blade that pixel covers
(ALONG): the bright reds where the blade leaves the guard, his glints along the light edge, the reds
toward the point. Each band ends where his ends (TIP), so the point is his: the dark edge curves in
first. The hilt is a few of our pixels each part, so it is drawn by hand at our scale after his
pixels (HILT), each part on its own layer: the pommel's steel cap, its jewel with his glint and the
dark red ring under it, the grip (his glove hides it: drawn in his grip's greys), the cross-guard
(its long bar up toward the pommel, its short one toward the point and the one below, each with his
bright tip) and its jewel. His black line goes round it all. Every colour is one of his
(scarlet_ref.PALETTE).

It writes, in <out>:

  study/sword@8.png     the template, at 8x
  study/kinds@8.png     what each pixel is: blade (grey), edge (red), guard (yellow), grip (blue),
                        his line (black)
  study/his@4.png       his sword in his picture (his pixels, the cape and coat round it dimmed)
  study/compare@6.png   his sword mirrored beside ours at the same size (his at 6x, ours at 10x)

and, given a third argument, the game's module (src/sprite/items/scarletSwordArt.ts). The same
picture always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/scarlet-sword-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/items/scarletSwordArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import scarlet_ref as R  # noqa: E402
from aiden_ref import save  # noqa: E402

# His blade with his black line round it, in his pixels (scarlet-study.py's).
BLADE = [(37.5, 122.5), (44.5, 122.5), (50.5, 126.5), (50, 130.5), (47, 135.5), (43, 140.5), (36, 150.5), (28, 160.5),
         (21, 170.5), (16, 175.5), (12, 180), (9, 180), (9.5, 176), (10.5, 174), (13, 169.5), (19.5, 159.5),
         (25.5, 149.5), (32.5, 139.5), (34.5, 134.5), (37, 129.5)]
# His reds (characters of scarlet_ref.CHARS): the line through those down his blade's middle is the
# sword's line. His pommel, his hand on the grip and his guard's jewel lie on it within a pixel.
CORE_REDS = 'skxCEKPDLuw'
CORE_FROM = 132  # below his guard (his rows)

# Our template's line: 2 across for 3 down. A pixel (dx, dy) from the pivot cell is f = 3 dx - 2 dy
# across (toward the lit edge; f / sqrt(13) pixels) and g = 2 dx + 3 dy along (toward the point).
# A band is three steps of f: one pixel in every row.
SQ = 13 ** 0.5

# Our blade's bands (band = f // 3, + toward the lit edge) and the bands of his each takes (his s,
# pixels across his line from his red core's middle, + toward his lit edge). Outside them, his line.
BANDS = {
    2: (2.5, 3.5),     # the light steel edge
    1: (0.5, 2.5),     # the grey under it (his grey, and his dark line along the core)
    0: (-0.5, 0.5),    # the red core
    -1: (-2.5, -0.5),  # black (his two black rows)
    -2: (-3.5, -2.5),  # the dark steel edge
}
# How far along his blade each band is taken, either side of the middle of the stretch one of our
# pixels covers (his pixels).
ALONG = 1.5
# Where each band ends: how far short of his point (his pixels along the line) his band stops. His
# dark steel edge curves in first; the core runs to the point.
TIP = {2: 4.5, 1: 3.0, 0: 0.0, -1: 3.0, -2: 9.5}
POINT = R.SWORD_LINE['tip']
# The blade begins under the cross-guard's jewel (his pixels): the guard is drawn over it.
JEWEL = (48.5, 124.5)
# His line round the blade and the hilt: his commonest colour along the blade's edges, and the black
# of his line round the hilt.
BLADE_LINE = '#111014'
HILT_LINE = '#040405'

# The hilt, drawn by hand at our scale after his pixels: rows of scarlet_ref.CHARS (his colours) in
# our template's cells, the first row at OY and the first column at OX from the pivot cell. One
# layer per part (the layer is the colour slot that recolours it). Drawn over the blade.
HILT_ORIGIN = (-8, -11)
HILT = {
    'grip': [
        '..................',  # -11
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',  # -5
        '.....nt...........',
        '.....nt...........',
        '......nt..........',
        '.......nt.........',
        '.......nt.........',  # 0
        '........nt........',
        '.........nt.......',
    ],
    'edge': [
        '..................',  # -11
        '..................',
        '..................',
        '..kKk.............',
        '..kC1.............',
        '...sk.............',
        '....ir............',  # -5
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',  # 0
        '..................',
        '..................',
        '..................',
        '..........WC......',
        '..........kK......',  # 5
    ],
    'guard': [
        '..................',  # -11
        '..................',
        '..tB..............',
        '..................',
        '..................',
        '..................',
        '..................',  # -5
        '..................',
        '..................',
        '...............N..',
        '..............H...',
        '..............N...',  # 0
        '.............R....',
        '.............V....',
        '.........HR.H.....',
        '.........H..BRNR3.',
        '.........N........',  # 5
        '........BN........',
        '.......BR.........',
        '......BN..........',
        '......0...........',
    ],
}

# His colours for each part's slot: the one the slot's colour turns his from.
BASES = {'blade': '#39383c', 'edge': '#84141f', 'guard': '#767276'}


def axis(q, inside):
    """His sword's line: through his red core below the guard. Returns its middle and unit direction
    (toward the point, his pixels)."""
    reds = [R.CHARS.index(c) for c in CORE_REDS]
    ys, xs = np.nonzero(inside & np.isin(q, reds))
    keep = ys >= CORE_FROM
    pts = np.stack([xs[keep] + 0.5, ys[keep] + 0.5], 1).astype(float)
    m = pts.mean(0)
    v = np.linalg.svd(pts - m)[2][0]
    if v[1] < 0:
        v = -v
    return m, v


def polygon_mask(poly, H, W, k=4):
    img = Image.new('L', (W * k, H * k), 0)
    ImageDraw.Draw(img).polygon([(x * k, y * k) for x, y in poly], fill=255)
    return np.asarray(img.resize((W, H), Image.BOX)) > 127


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    H, W, _ = a.shape
    q = R.quantize(a)
    bg = R.background(a)
    inside = polygon_mask(BLADE, H, W) & ~bg
    m, d = axis(q, inside)
    n = np.array([-d[1], d[0]])  # his lit side (upper-left): our blade's top once mirrored
    ys, xs = np.mgrid[0:H, 0:W]
    T = (xs + 0.5 - m[0]) * d[0] + (ys + 0.5 - m[1]) * d[1]
    Sx = (xs + 0.5 - m[0]) * n[0] + (ys + 0.5 - m[1]) * n[1]

    def along(p):
        return (p[0] - m[0]) * d[0] + (p[1] - m[1]) * d[1]

    S = R.SWORD_S
    t_hand = along(R.SWORD_LINE['grip'])
    t_point = along(POINT)
    t_jewel = along(JEWEL)

    def his_t(g):
        """His t (along his line) under our pixel g steps along ours."""
        return t_hand + (g / SQ) / S

    # The template's box, from the pivot cell: the pommel's end up-left to the point down-right.
    X0, X1, Y0, Y1 = -12, 32, -14, 44
    cells = {}
    kinds = {}
    for dy in range(Y0, Y1):
        for dx in range(X0, X1):
            f, g = 3 * dx - 2 * dy, 2 * dx + 3 * dy
            band = f // 3
            if band not in BANDS:
                continue
            t = his_t(g)
            if t < t_jewel - 1 or t > t_point - TIP[band]:
                continue
            lo, hi = BANDS[band]
            sel = inside & (Sx >= lo) & (Sx < hi) & (np.abs(T - t) <= ALONG)
            vals = q[sel]
            if not len(vals):
                sel = inside & (Sx >= lo) & (Sx < hi) & (np.abs(T - t) <= 2 * ALONG)
                vals = q[sel]
            if not len(vals):
                raise SystemExit(f'no pixel of his in band {band} at t {t:.1f}')
            counts = np.bincount(vals, minlength=len(R.PALETTE))
            best = counts.max()
            # Ties go to the one nearest the middle of the stretch.
            tied = [c for c in range(len(counts)) if counts[c] == best]
            if len(tied) > 1:
                dist = {c: np.abs(T[sel][vals == c] - t).min() for c in tied}
                tied.sort(key=lambda c: (dist[c], c))
            c = tied[0]
            cells[(dx, dy)] = R.PALETTE[c]
            kinds[(dx, dy)] = 'edge' if is_red(R.PALETTE[c]) and band != 2 else 'blade'

    # The hilt, over the blade.
    ox, oy = HILT_ORIGIN
    for layer, rows in HILT.items():
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.':
                    continue
                cells[(ox + i, oy + j)] = R.PALETTE[R.CHARS.index(ch)]
                kinds[(ox + i, oy + j)] = layer

    # His line round it all (sides, not corners): his blade's line along the blade, his hilt's
    # elsewhere.
    ring = {}
    for (x, y) in cells:
        for nb in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nb not in cells:
                ring.setdefault(nb, []).append(kinds[(x, y)])
    for p, ks in ring.items():
        cells[p] = BLADE_LINE if all(k in ('blade', 'edge') for k in ks) and p[1] * 3 + p[0] * 2 > 0 else HILT_LINE
        kinds[p] = 'line'

    # Characters: one per colour of his within each kind (the slots recolour by kind).
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    order = ['blade', 'edge', 'guard', 'grip', 'line']
    palette, groups, key = {}, {k: '' for k in order}, {}
    for k in order:
        for p in sorted(cells, key=lambda p: (p[1], p[0])):
            if kinds[p] != k or (k, cells[p]) in key:
                continue
            ch = chars[len(palette)]
            key[(k, cells[p])] = ch
            palette[ch] = cells[p]
            groups[k] += ch
    xs_ = [p[0] for p in cells]
    ys_ = [p[1] for p in cells]
    x0, x1, y0, y1 = min(xs_), max(xs_) + 1, min(ys_), max(ys_) + 1
    rows = [''.join(key[(kinds[(x, y)], cells[(x, y)])] if (x, y) in cells else '.' for x in range(x0, x1)) for y in range(y0, y1)]
    pivot = (-x0, -y0)
    angle = float(np.degrees(np.arctan2(3, 2)))

    if len(sys.argv) > 3:
        write_ts(sys.argv[3], rows, pivot, angle, palette, groups)

    # Studies.
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    kind_img = np.zeros_like(rgba)
    tints = {'blade': (150, 150, 160), 'edge': (230, 50, 60), 'guard': (240, 200, 60), 'grip': (60, 90, 200), 'line': (0, 0, 0)}
    for (x, y), hexc in cells.items():
        rgba[y - y0, x - x0] = [int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16), 255]
        kind_img[y - y0, x - x0] = tints[kinds[(x, y)]] + (255,)
    save(rgba, os.path.join(out, 'study', 'sword@8.png'))
    save(kind_img, os.path.join(out, 'study', 'kinds@8.png'))
    # His sword in his picture, what is round it dimmed.
    bx0, by0, bx1, by1 = 4, 94, 70, 184
    his = a[by0:by1, bx0:bx1].astype(float)
    hm = sword_mask(H, W, inside)[by0:by1, bx0:bx1]
    his[~hm] = his[~hm] * 0.35 + 255 * 0.65
    save(his.astype(np.uint8), os.path.join(out, 'study', 'his@4.png'), 4)
    compare(a, hm, (bx0, by0, bx1, by1), rgba, os.path.join(out, 'study', 'compare@6.png'))
    print(len(rows), 'rows x', len(rows[0]), 'pivot', pivot, 'angle %.2f' % angle, 'his line %.2f' % (180 - np.degrees(np.arctan2(d[1], d[0]))),
          'colours', {k: len(v) for k, v in groups.items()})


def is_red(hexc):
    r, g, b = int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16)
    return r >= 0x50 and r > 2 * g and r > 1.4 * b


def sword_mask(H, W, blade):
    """His whole sword (the blade and, by hand, his hilt's parts), for the study pictures."""
    m = blade.copy()
    ys, xs = np.mgrid[0:H, 0:W]
    for (ax, ay), (bx, by), r in [((64.5, 101.5), (57, 112.5), 2.6), ((37.5, 112.5), (58.5, 134), 2.2),
                                  ((50, 120), (45.5, 127), 3.0), ((37.5, 123), (46, 124), 1.8), ((57, 112.5), (52, 120), 1.6)]:
        dv = np.array([bx - ax, by - ay], float)
        t = np.clip(((xs + 0.5 - ax) * dv[0] + (ys + 0.5 - ay) * dv[1]) / (dv @ dv), 0, 1)
        m |= np.hypot(xs + 0.5 - ax - t * dv[0], ys + 0.5 - ay - t * dv[1]) <= r
    return m


def compare(a, hm, box, ours, path):
    """His sword mirrored (6x) beside ours (10x): the same size, ours being 0.6 of his."""
    x0, y0, x1, y1 = box
    his = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    his[..., :3] = a[y0:y1, x0:x1]
    his[..., 3] = np.where(hm, 255, 0)
    his = his[:, ::-1]
    A = Image.fromarray(his, 'RGBA').resize((his.shape[1] * 6, his.shape[0] * 6), Image.NEAREST)
    B = Image.fromarray(ours, 'RGBA').resize((ours.shape[1] * 10, ours.shape[0] * 10), Image.NEAREST)
    W_ = A.width + B.width + 60
    H_ = max(A.height, B.height) + 60
    img = Image.new('RGBA', (W_, H_), (226, 226, 232, 255))
    img.alpha_composite(A, (20, 40))
    img.alpha_composite(B, (A.width + 40, 40))
    dr = ImageDraw.Draw(img)
    dr.text((20, 12), 'Tu espada (espejada)', fill=(20, 20, 30, 255))
    dr.text((A.width + 40, 12), 'En el juego (0.6)', fill=(20, 20, 30, 255))
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)


def write_ts(path, rows, pivot, angle, palette, groups):
    """The sword as the game's module (src/sprite/items/scarletSwordArt.ts)."""
    out = [
        "// The owner's sword from his Scarlet picture, at our scale and held as our swords are",
        '// (tools/refs/scarlet-sword-from-ref.py from docs/reference/scarlet-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface PaintedScarletSword extends PaintedPiece {',
        "  /** The characters of the blade's dark steel. */",
        '  blade: string;',
        "  /** The characters of the red: the blade's core and point, the jewels in the pommel and the guard. */",
        '  edge: string;',
        "  /** The characters of the hilt's steel: the cross-guard and the pommel's cap. */",
        '  guard: string;',
        '}',
        '',
        "/** His colours the three colour slots turn his from: the blade's dark steel, its red core, the guard's steel. */",
        f"export const SCARLET_SWORD_BLADE = '{BASES['blade']}';",
        f"export const SCARLET_SWORD_EDGE = '{BASES['edge']}';",
        f"export const SCARLET_SWORD_GUARD = '{BASES['guard']}';",
        '',
        '/**',
        ' * His sword mirrored, so it hangs as our swords do (pommel up-left of the fist, blade down-right,',
        ' * his lit edge on top), brought down to our scale and drawn at the angle our idle pose holds it',
        ' * at, pivoting on the grip under the middle of our fist.',
        ' */',
        'export const SCARLET_SWORD: PaintedScarletSword = {',
        f'  pivot: [{pivot[0]}, {pivot[1]}],',
        f'  angle: {angle:.2f},',
        '  rows: [',
    ]
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {k}: '{v}'," if not k[0].isdigit() else f"    '{k}': '{v}'," for k, v in palette.items()]
    out += ['  },', f"  blade: '{groups['blade']}',", f"  edge: '{groups['edge']}',", f"  guard: '{groups['guard']}',", '};', '']
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
