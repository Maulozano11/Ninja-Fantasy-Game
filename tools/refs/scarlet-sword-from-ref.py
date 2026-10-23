"""The owner's sword from his Scarlet picture (docs/reference/scarlet-owner-reference.jpg), at our
scale and held the way our swords are held.

Since 2026-10-23 (raised to the standard of his game-scale swords, Aiden's flame longsword and Ren's Katana
v2): each row of the blade is his black line, his dark steel, his red core two pixels wide (bright by the
guard, darker toward the point), his grey bevel and his light steel edge with his glints, his black line,
so it reads as one clean blade instead of seven flickering bands; the hilt is a steel cap round his red
jewel, the grip, and the cross-guard as one solid steel bar lit along its top with his jewel on the blade.
What follows describes how his colours were first read.

His Scarlet holds a dark longsword in his near hand, hanging blade-down to the screen-left: a steel
cap over a red jewel with a pink glint for a pommel, a dark steel grip, a cross-guard of steel bars
with a red jewel where the blade leaves it, and a long dark blade: on the side the light comes from
his black line, a light steel edge, a grey bevel and a dark line, then a red core down its middle
(bright reds where it leaves the guard, pinks toward the point), black, a dark steel edge and his
black line on the other side. The owner: "la espada copiala y arregla la orientacion para que sea
igual a nuestras armas" (copy it and fix its orientation so it is like our weapons).

Our swords hang the other way: the pommel up-left of the fist, the blade down-right across the legs,
the lit edge on top (src/sprite/items/weapons.ts). His sword mirrored left to right is held exactly
like that: it hangs at 55 degrees (our swords rest at 52) with his lit edge on top. A quarter turn
would also point it down-right, but would put his lit edge underneath. So the template is his sword
mirrored, drawn at 3 down for 2 across (56.3 degrees, one off his) so that every line of it steps
evenly, 1 and 2 pixels, as his lines do; it pivots on the grip under the middle of our fist
(grip.ts gripPoint), like our other blades, and our idle pose holds it at that angle (grip.ts
swordAngle), so at rest it is exactly this template. The jewels' glints stay up-left: they follow
the light, not the mirror.

His picture is not at our scale (tools/refs/scarlet_ref.py): one of our pixels is 1/0.6 of his along
the sword (SWORD_S: the sword 58 of our pixels long, its blade 41). On the template's line, a pixel
(dx, dy) from the pivot cell lies in band floor((3 dx - 2 dy) / 3), and band b of row dy is the
pixel dx = b + ceil(2 dy / 3): each band is one pixel in every row, a line stepping as his do, and a
row of the blade is one run of pixels across it. BLADE holds those runs, one for each row of ours,
read off his row of the picture that row covers (his y = 116.8 + 1.64 dy; `--rows` prints them):
from the dark side to the lit side his black line, his dark steel edge, black, his red core, his grey
bevel, his light steel edge and his black line (his blade is 10 of his pixels across, ours 7 of ours,
0.7 of his). Each band keeps his colour for it, the core his red on that row, so his bright reds by
the guard and his glints along the light edge are where he put them. Over the last rows his dark edge
curves in first while his light edge runs on, his pinks (#70273e, #ac5068, #9e3b41) light the core's
lit side and the core runs to the point, as his does.

The hilt is a few of our pixels each part, so it is drawn by hand at our scale after his pixels
(HILT), each part on its own layer: the pommel's steel cap, its jewel with his glint and the dark red
ring under it, the grip (his glove hides it: drawn in his grip's greys), the cross-guard (its long arm
up across the lit side, its short one straight out over the lit side and its other arm down the dark
side, each with his bright tip) and its jewel over the blade. His black line goes round it. Every
colour is one of his (scarlet_ref.PALETTE).

It writes, in <out>:

  study/sword@8.png     the template, at 8x
  study/kinds@8.png     what each pixel is: blade (grey), edge (red), guard (yellow), grip (blue),
                        his line (black)
  study/his@4.png       his sword in his picture (his pixels, the cape and coat round it dimmed)
  study/compare@6.png   his sword mirrored beside ours at the same size (his at 6x, ours at 10x)

and, given a third argument, the game's module (src/sprite/items/scarletSwordArt.ts). The same
picture always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/scarlet-sword-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/items/scarletSwordArt.ts
  python3 -I tools/refs/scarlet-sword-from-ref.py docs/reference/scarlet-owner-reference.jpg --rows
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import scarlet_ref as R  # noqa: E402
from aiden_ref import save  # noqa: E402

# His blade with his black line round it, in his pixels (for reading his rows and the studies).
BLADE_POLY = [(37.5, 122.5), (44.5, 122.5), (50.5, 126.5), (50, 130.5), (47, 135.5), (43, 140.5), (36, 150.5), (28, 160.5),
              (21, 170.5), (16, 175.5), (12, 180), (9, 180), (9.5, 176), (10.5, 174), (13, 169.5), (19.5, 159.5),
              (25.5, 149.5), (32.5, 139.5), (34.5, 134.5), (37, 129.5)]
# His row under our row dy: his y = HIS_Y0 + HIS_DY * dy (our rows are 1/0.6 of his along the line,
# from his guard's middle, which is ours at 4.9 along).
HIS_Y0, HIS_DY = 116.8, 1.6426

# Our blade, one row of ours per string from row BLADE_DY0 down, its characters those of
# scarlet_ref.CHARS (his colours) laid on bands -3 .. 3 (dx = ceil(2 dy / 3) - 3 + i): his black line,
# his dark steel edge (#39383c), black (#0f0407; his dark red #26060d beside his brightest reds), his
# red core, his grey bevel (#504e52: his bevel's greys, #646267 to #2e2d33, between them), his light
# steel edge (#86868a; his #767276 by the guard) and his black line (#111014). '.' is empty. His blade
# is 10 of his pixels across, ours 7 of ours, 0.7 of his: his two blacks beside the core are one of
# ours, and his dark line between the bevel and the core gives way to the bevel. Each band keeps his
# colour for it along the blade (his flecks of a pixel give way to it); the core takes his red row by
# row, and his glints on the light edge are where he put them. The rows of his each is read from are
# in the comments (`--rows` prints them beside ours).
BLADE_DY0 = 4
BLADE = [
    'atxKBRa',  # 4   by the guard: his brightest reds
    'atxKBRa',  # 5
    'atsxBVa',  # 6   his glint
    'atsxBRa',  # 7
    'atsxBRa',  # 8
    'atsxBRa',  # 9
    'atsxBRa',  # 10
    'atsxBRa',  # 11
    'atsxBRa',  # 12
    'atsxBRa',  # 13
    'atsxBVa',  # 14  his glint
    'atsxBRa',  # 15
    'atsxBRa',  # 16
    'atsxBRa',  # 17
    'atsxBRa',  # 18
    'atsxBRa',  # 19
    'atsxBRa',  # 20
    'atsxBRa',  # 21
    'atsxBRa',  # 22
    'atsxBVa',  # 23  his glint
    'atsxBRa',  # 24
    'atsxBRa',  # 25
    'atsxBRa',  # 26
    'atsxBRa',  # 27
    'atsxBRa',  # 28
    'atssBRa',  # 29  the core darkens toward the point
    'atssBRa',  # 30
    '.atsBRa',  # 31  his dark edge curves in, his light edge runs on
    '.atsxRa',  # 32
    '..atsRa',  # 33
    '..askRa',  # 34
    '...akRa',  # 35
    '....aRa',  # 36
    '.....aa',  # 37  the point
]

# The hilt at our scale after his: rows of scarlet_ref.CHARS (his colours) in our template's cells, the
# first row at HILT_ORIGIN[1] and the first column at HILT_ORIGIN[0] from the pivot cell. One layer per
# part (the layer is the colour slot that recolours it), drawn over the blade: the pommel's steel cap
# round his red jewel with its pink glint, the dark steel grip (under the fist), the cross-guard as one
# steel bar across the blade, lit along its top, and his red jewel where the blade leaves it.
HILT_ORIGIN = (-8, -11)
HILT = {
    'grip': [
        '....................',  # -11
        '....................',
        '....................',
        '....................',
        '....................',
        '....nt..............',  # -6
        '....nt..............',
        '.....nt.............',
        '.....nt.............',
        '......nt............',
        '.......nt...........',
        '.......nt...........',  # 0
        '........nt..........',
        '.........nt.........',
    ],
    'edge': [
        '....................',  # -11
        '....................',
        '..x1................',  # -9
        '..kx................',
        '....................',
        '....................',
        '....................',  # -5
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',  # 0
        '....................',
        '....................',
        '..........K1........',  # 3
    ],
    'guard': [
        '....................',  # -11
        '..BR................',  # -10
        '.B..R...............',
        '.N..N...............',
        '..Nt................',  # -7
        '....................',
        '....................',
        '....................',
        '....................',
        '................RR..',  # -2
        '...............RNN..',
        '.............RRN....',  # 0
        '............RNN.....',
        '...........RN.......',
        '.........RR.........',  # 3
        '........RNN.........',
        '.......RNN..........',
        '......RN............',  # 6
    ],
}
# His black line round the hilt (and the blade's top, under the guard).
HILT_LINE = '#040405'

# His colours for each part's slot: the one the slot's colour turns his from.
BASES = {'blade': '#39383c', 'edge': '#84141f', 'guard': '#767276'}


def polygon_mask(poly, H, W, k=4):
    img = Image.new('L', (W * k, H * k), 0)
    ImageDraw.Draw(img).polygon([(x * k, y * k) for x, y in poly], fill=255)
    return np.asarray(img.resize((W, H), Image.BOX)) > 127


def redness(hexc):
    r, g, b = int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16)
    return r - max(g, b)


def blade_cells():
    """Our blade: {(dx, dy): (hex, kind)}. His black line on either end of a row is 'line', his reds
    'edge', the rest 'blade'."""
    cells = {}
    for j, row in enumerate(BLADE):
        dy = BLADE_DY0 + j
        x0 = math.ceil(2 * dy / 3) - 3
        first, last = len(row) - len(row.lstrip('.')), len(row.rstrip('.')) - 1
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            hexc = R.PALETTE[R.CHARS.index(ch)]
            if redness(hexc) >= 20:
                kind = 'edge'
            elif i in (first, last) and R.luma(np.array([[int(hexc[k:k + 2], 16) for k in (1, 3, 5)]], float))[0] < 40:
                kind = 'line'
            else:
                kind = 'blade'
            cells[(x0 + i, dy)] = (hexc, kind)
    return cells


def build():
    """The template's cells {(dx, dy): (hex, kind)} from the pivot cell."""
    cells = blade_cells()
    # The blade carries its own line down both sides and round the point: his line is added round
    # the hilt and across the blade's top, under the guard.
    lined = [p for p in cells if p[1] == BLADE_DY0 and cells[p][1] != 'line']
    ox, oy = HILT_ORIGIN
    for layer, rows in HILT.items():
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    cells[(ox + i, oy + j)] = (R.PALETTE[R.CHARS.index(ch)], layer)
                    lined.append((ox + i, oy + j))
    # Sides, not corners.
    ring = set()
    for (x, y) in lined:
        for nb in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nb not in cells:
                ring.add(nb)
    for p in ring:
        cells[p] = (HILT_LINE, 'line')
    return cells


def print_rows(ref):
    """His blade's rows under ours, read from his lit side to his dark side round his red core."""
    a = R.native(ref)
    H, W, _ = a.shape
    q = R.quantize(a)
    inside = polygon_mask(BLADE_POLY, H, W) & ~R.background(a)
    for j in range(len(BLADE) + 1):
        dy = BLADE_DY0 + j
        lo = HIS_Y0 + HIS_DY * dy
        ys = [y for y in range(int(lo), int(lo + HIS_DY) + 1) if lo <= y + 0.5 < lo + HIS_DY]
        reads = []
        for y in ys:
            xs = np.nonzero(inside[y])[0]
            if not len(xs):
                continue
            row = [q[y, x] for x in range(xs.min(), xs.max() + 1)]
            core = int(np.argmax([redness(R.PALETTE[c]) for c in row]))
            s = ''.join(R.CHARS[c] for c in row)
            reads.append('%d %s|%s|%s' % (y, s[:core], s[core], s[core + 1:]))
        print('%2d  %-8s  %s' % (dy, BLADE[j] if j < len(BLADE) else '', '    '.join(reads)))


def main():
    ref, out = sys.argv[1], sys.argv[2]
    if out == '--rows':
        print_rows(ref)
        return
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    cells = build()

    # Characters: one per colour of his within each kind (the slots recolour by kind).
    chars = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    order = ['blade', 'edge', 'guard', 'grip', 'line']
    palette, groups, key = {}, {k: '' for k in order}, {}
    for k in order:
        for p in sorted(cells, key=lambda p: (p[1], p[0])):
            hexc, kind = cells[p]
            if kind != k or (k, hexc) in key:
                continue
            ch = chars[len(palette)]
            key[(k, hexc)] = ch
            palette[ch] = hexc
            groups[k] += ch
    xs_ = [p[0] for p in cells]
    ys_ = [p[1] for p in cells]
    x0, x1, y0, y1 = min(xs_), max(xs_) + 1, min(ys_), max(ys_) + 1
    rows = [''.join(key[(cells[(x, y)][1], cells[(x, y)][0])] if (x, y) in cells else '.' for x in range(x0, x1)) for y in range(y0, y1)]
    pivot = (-x0, -y0)
    angle = math.degrees(math.atan2(3, 2))

    if len(sys.argv) > 3:
        write_ts(sys.argv[3], rows, pivot, angle, palette, groups)

    # Studies.
    rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    kind_img = np.zeros_like(rgba)
    tints = {'blade': (150, 150, 160), 'edge': (230, 50, 60), 'guard': (240, 200, 60), 'grip': (60, 90, 200), 'line': (0, 0, 0)}
    for (x, y), (hexc, kind) in cells.items():
        rgba[y - y0, x - x0] = [int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16), 255]
        kind_img[y - y0, x - x0] = tints[kind] + (255,)
    save(rgba, os.path.join(out, 'study', 'sword@8.png'))
    save(kind_img, os.path.join(out, 'study', 'kinds@8.png'))
    # His sword in his picture, what is round it dimmed.
    a = R.native(ref)
    H, W, _ = a.shape
    blade = polygon_mask(BLADE_POLY, H, W) & ~R.background(a)
    bx0, by0, bx1, by1 = 4, 94, 70, 184
    his = a[by0:by1, bx0:bx1].astype(float)
    hm = sword_mask(H, W, blade)[by0:by1, bx0:bx1]
    his[~hm] = his[~hm] * 0.35 + 255 * 0.65
    save(his.astype(np.uint8), os.path.join(out, 'study', 'his@4.png'), 4)
    compare(a, hm, (bx0, by0, bx1, by1), rgba, os.path.join(out, 'study', 'compare@6.png'))
    print(len(rows), 'rows x', len(rows[0]), 'pivot', pivot, 'angle %.2f' % angle, 'colours', {k: len(v) for k, v in groups.items()})


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
    """His sword as he drew it and mirrored (6x) beside ours (10x): the same size, ours being 0.6 of his."""
    x0, y0, x1, y1 = box
    his = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    his[..., :3] = a[y0:y1, x0:x1]
    his[..., 3] = np.where(hm, 255, 0)
    panels = [('Tu espada', his), ('Espejada: como nuestras armas', his[:, ::-1])]
    imgs = [(label, Image.fromarray(p, 'RGBA').resize((p.shape[1] * 6, p.shape[0] * 6), Image.NEAREST)) for label, p in panels]
    imgs.append(('En el juego (0.6 de la tuya)', Image.fromarray(ours, 'RGBA').resize((ours.shape[1] * 10, ours.shape[0] * 10), Image.NEAREST)))
    W_ = sum(i.width for _, i in imgs) + 20 * (len(imgs) + 1)
    H_ = max(i.height for _, i in imgs) + 60
    img = Image.new('RGBA', (W_, H_), (226, 226, 232, 255))
    dr = ImageDraw.Draw(img)
    x = 20
    for label, i in imgs:
        img.alpha_composite(i, (x, 40))
        dr.text((x, 12), label, fill=(20, 20, 30, 255))
        x += i.width + 20
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
