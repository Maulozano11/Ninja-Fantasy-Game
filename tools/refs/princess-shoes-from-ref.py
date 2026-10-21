"""The princess's heeled shoes, from the owner's picture of her at our game scale
(docs/reference/princess-owner-reference.jpg, provisional "Rosalind, la Princesa del Alba Rosa"), as painted
pieces that ride the rig (src/sprite/items/princessShoes.ts, feet_rose_heels).

One of his pixels is one fine pixel of ours (tools/refs/princess_ref.py); his pixel (x, y) is our (x + DX,
y + DY) at our female's idle frame 0, DX, DY = princess_ref.PART_OFFSET['shoes'] (her near sole on ours).
Every pixel of the pieces is his, in his colour (princess_ref.quantize, his palette):

  the far shoe   his rows 86-96: the lilac stocking with the gold ribbons wound round the ankle (under the
                 petticoat's hem), its lit instep, the gold heel counter and the thin heel, the gold vamp
                 with its dark opening and light, the sole pointing right
  the near shoe  his rows 93-98: the toe seen from the front under the overskirt's hem, the lilac stocking
                 over its dark opening and the gold vamp with its light

What her gown hides is filled by continuing his pixels (none of it is seen in his picture):
  - the near ankle above his row 93 (the hem hides it) is the far ankle's ribbons, his rows 86-88 (his line,
    his lilacs and his gold, the same width as his near stocking), so both ankles are wound the same way;
  - the stocking up each shin to the knee: drawn by princessShoes.ts in his stocking lilacs (his #a884b4 lit,
    his #9172a3 in shade on the side away from the light) inside his black line, from his ankle (the top of
    the shoe piece) to our knee, with his ribbon's gold and browns as a band under the line at the top. It is
    drawn in the pose, not turned from a picture, so its line stays one clean pixel at any angle.

His feet do not stand where ours do (his far foot six rows lower and three to the left, his near foot five
to the left), so each leg's stocking runs from our knee to his ankle and turns with our shin about the knee;
the shoe stays flat (as our feet do) where the stocking ends. At idle frame 0 every pixel of the pieces is
where he drew it. Our leg below the knee (skin and trousers) and our foot are taken off, so his stocking and
shoe are the lower leg.

Our leg's width at the knee (KNEE_SPAN) is read off our bare female at idle frame 0
(`npx tsx tools/refs/princess-idle.ts <out>` writes it as <out>.rgba): on a new female body, measure it again
with OUR_JOINTS.

It writes the pieces as TypeScript and, in <out>, his feet beside the pieces at idle at 8x
(tu-dibujo-vs-piezas@8.png, Spanish labels). The same picture always gives the same bytes. Run from the
repository root:

  python3 -I tools/refs/princess-shoes-from-ref.py <out> [src/sprite/items/princessShoesArt.ts]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

DX, DY = P.PART_OFFSET['shoes']

# What of his picture is the shoes: (first column, first row, rows) in his pixels; '=' takes his pixel.
# Left out: the petticoat's hem line over the far ankle (his row 85) and its dark lilac behind the far
# heel (column 56 to row 88), the overskirt's gold hem over the near toe (row 92) and the line of the
# petticoat's edge right of the far ankle (columns 63-64 at rows 86-90).
FAR = (56, 86, [
    '.======......',  # 86-88 the ankle: the stocking and his ribbons, between his lines
    '.======......',
    '.======......',
    '========.....',  # 89-90 the ankle widening to the heel
    '========.....',
    '=========....',  # 91-92 the heel counter (gold) and the stocking's lit instep
    '==========...',
    '.==========..',  # 93-94 the thin heel, the vamp's dark opening, its gold and light
    '.============',
    '.===.========',  # 95 the heel's tip, the gold sole
    '......=======',  # 96 his line under the sole
])
NEAR = (34, 93, [
    '=======',  # 93 the stocking over the shoe, under the hem
    '=======',  # 94 the shoe's dark opening between the stocking's sides
    '=======',  # 95-97 the gold vamp and its light
    '=======',
    '=======',
    '.=====.',  # 98 his line under the toe
])
HIS = {'F': FAR, 'N': NEAR}
# The near ankle under the hem: his far ankle (columns 57-62, rows 86-88: his line, his lilacs, his
# ribbons) laid over his near stocking (columns 35-40, the same width between his lines), in his rows 90-92.
NEAR_ANKLE = {'from': (57, 86), 'to': (35, 90), 'size': (6, 3)}
# Our leg at the knee row (floor of OUR_JOINTS knee y) at idle frame 0: its first and last column inside
# his line (the bare female: far row 188 columns 136-141, near row 193 columns 117-123).
KNEE_SPAN = {'F': (136, 141), 'N': (117, 123)}

# The stocking (princessShoes.ts draws it): his line, his lilacs lit and in shade, and his ribbon's gold
# and browns for the band under the line at its top (lit side, middle, shade side).
LINE = '#060317'
STOCKING_LIT = '#a884b4'
STOCKING_SHADE = '#9172a3'
BAND = ('#ce9749', '#96603a', '#864c44')
# The colours the slots move the others from (at these, every pixel is his).
BASE = {'gold': '#eaba5e', 'lilac': STOCKING_LIT}

OUT_DOC = (
    "// The princess's heeled shoes: the owner's pixels from his picture of her at our game's scale\n"
    '// (docs/reference/princess-owner-reference.jpg, one of his pixels is one of ours), cut by\n'
    '// tools/refs/princess-shoes-from-ref.py. Generated: rerun the script to change it.\n'
)
DOCS = {
    'N': 'The near shoe seen from the front, its toe out from under the hem, the ankle above it wound with his ribbons.',
    'F': 'The far heeled shoe pointing right, the ankle above it wound with his ribbons.',
}
CONST = {'N': 'PRINCESS_SHOE_N', 'F': 'PRINCESS_SHOE_F'}


def his_hex():
    """His colour of each of his pixels: (100, 100) array of hex strings."""
    Q = P.quantize(P.native())
    out = np.empty((P.SIZE, P.SIZE), dtype=object)
    for y in range(P.SIZE):
        for x in range(P.SIZE):
            out[y, x] = P.rgb_hex(Q[y, x])
    return out


def kind(hx):
    """What a colour of these pieces is: his line, a lilac (the stocking) or gold (shoe and ribbons, with
    their browns)."""
    r, g, b = (int(hx[i:i + 2], 16) for i in (1, 3, 5))
    if 0.299 * r + 0.587 * g + 0.114 * b < 45:
        return 'line'
    return 'lilac' if b > g and r - b < 40 else 'gold'


def taken(H, s):
    """His pixels of a side, in our frame at idle: {(x, y): hex}."""
    x0, y0, rows = HIS[s]
    fam = P.family(P.native())
    bad = {P.FAMILIES.index(f) for f in ('white', 'skin', 'eye', 'gem')}  # his pale lilac reads as 'hair'
    out = {}
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '=':
                continue
            x, y = x0 + i, y0 + j
            assert fam[y, x] not in bad, ('not his shoe', s, (x, y), H[y, x])
            out[(x + DX, y + DY)] = H[y, x]
    return out


def pieces(H):
    """Each side's piece in our frame at idle, {(x, y): hex}; and the pixels taken from him where he drew them."""
    out, his = {}, {}
    for s in 'NF':
        his[s] = taken(H, s)
        out[s] = dict(his[s])
    (fx, fy), (tx, ty), (w, h) = NEAR_ANKLE['from'], NEAR_ANKLE['to'], NEAR_ANKLE['size']
    for j in range(h):
        for i in range(w):
            out['N'][(tx + i + DX, ty + j + DY)] = H[fy + j, fx + i]
    return out, his


def top(cells):
    """The middle of a piece's first row (our frame, a point): where the stocking ends on it."""
    y = min(y for _, y in cells)
    xs = [x for x, yy in cells if yy == y]
    return (min(xs) + max(xs) + 1) / 2, float(y)


def knee_top(s):
    """The middle of the top of our leg's knee row (our frame, a point) and the stocking's half width
    there (to the middle of his line's pixels)."""
    a, b = KNEE_SPAN[s]
    ky = math.floor(P.OUR_JOINTS['knee' + s][1])
    return ((a + b + 1) / 2, float(ky)), (b - a + 1) / 2 + 0.5


LETTERS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'


def legend(P_):
    """One letter per colour across the pieces: his lines first, then darkest first."""
    cols = sorted({hx for cells in P_.values() for hx in cells.values()},
                  key=lambda h: (kind(h) != 'line', sum(int(h[i:i + 2], 16) for i in (1, 3, 5)), h))
    return {hx: LETTERS[i] for i, hx in enumerate(cols)}


def packed(cells, L):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    x0, y0 = min(xs), min(ys)
    W, Hh = max(xs) - x0 + 1, max(ys) - y0 + 1
    grid = [['.'] * W for _ in range(Hh)]
    for (x, y), hx in cells.items():
        grid[y - y0][x - x0] = L[hx]
    return [''.join(r) for r in grid], (x0, y0)


def fmt(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def write_ts(P_, path):
    L = legend(P_)
    out = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '']
    out += ['/** His colours the colour slots move the others from (at these, every pixel is his). */']
    out += [f"export const PRINCESS_SHOE_GOLD = '{BASE['gold']}';", f"export const PRINCESS_SHOE_LILAC = '{BASE['lilac']}';", '']
    out += ["/** What each letter of the pieces is: his black line (it stays), the stocking's lilacs or the shoes' and ribbons' gold. */",
            "export const PRINCESS_SHOE_KIND: Record<string, 'line' | 'lilac' | 'gold'> = {"]
    out += [f"  {ch if ch.isalpha() else repr(ch)}: '{kind(hx)}'," for hx, ch in L.items()]
    out += ['};', '']
    out += ['/**',
            " * The stocking's colours, his: the line, lilac lit and in shade, and the ribbon band under the line at its top",
            ' * (lit side, middle, shade side).',
            ' */',
            f"export const PRINCESS_STOCKING = {{ line: '{LINE}', lit: '{STOCKING_LIT}', shade: '{STOCKING_SHADE}', "
            f"band: ['{BAND[0]}', '{BAND[1]}', '{BAND[2]}'] }} as const;", '']
    out += ['/**',
            " * Each leg at our female idle frame 0, fine pixels: our knee and ankle (the rig's); the stocking's top (the",
            " * middle of the top of our knee row) and half width there, and its foot (the middle of the shoe piece's first",
            " * row) and half width there (to the middle of the line's pixels).",
            ' */',
            'export const PRINCESS_SHOE_LEGS = {']
    for s in 'NF':
        k, a = P.OUR_JOINTS['knee' + s], P.OUR_JOINTS['ankle' + s]
        (kx, ky), kr = knee_top(s)
        (tx, ty) = top(P_[s])
        tr = (sum(1 for (x, y) in P_[s] if y == ty) - 1) / 2
        out += [f'  {s}: {{ knee: [{k[0]}, {k[1]}], ankle: [{a[0]}, {a[1]}], top: [{fmt(kx)}, {fmt(ky)}], topHalf: {fmt(kr)}, '
                f'foot: [{fmt(tx)}, {fmt(ty)}], footHalf: {fmt(tr)} }},']
    out += ['} as const;', '']
    for s in 'NF':
        rows, (ox, oy) = packed(P_[s], L)
        tx, ty = top(P_[s])
        pivot = (math.floor(tx - 0.5), math.floor(ty))
        used = sorted({L[hx] for hx in P_[s].values()}, key=LETTERS.index)
        inv = {v: k_ for k_, v in L.items()}
        out += [f'/** {DOCS[s]} Its pivot is the cell left of the middle of its first row. */',
                f'export const {CONST[s]}: PaintedPiece = {{',
                f'  pivot: [{pivot[0] - ox}, {pivot[1] - oy}],', '  angle: 0,', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {c if c.isalpha() else repr(c)}: '{inv[c]}'," for c in used]
        out += ['  },', '};', '']
    text = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
    os.replace(tmp, path)


def check(P_, his):
    for s, cells in his.items():
        for c, hx in cells.items():
            assert P_[s][c] == hx, ('not his at idle', s, c)
    pal = {P.rgb_hex(c) for c in P.PALETTE}
    for hx in {h for cells in P_.values() for h in cells.values()} | {LINE, STOCKING_LIT, STOCKING_SHADE, *BAND}:
        assert hx in pal, ('not his colour', hx)


def rgb(hx):
    return [int(hx[i:i + 2], 16) for i in (1, 3, 5)]


def picture(H, P_, his, path, k=8):
    """His picture round her feet, the pixels taken from him, and the pieces at idle, side by side at 8x."""
    x0, y0, x1, y1 = 100, 196, 150, 221
    W, Hh = x1 - x0, y1 - y0
    bg = (236, 236, 236)
    fig = P.figure()

    def tile(cells):
        a = np.zeros((Hh, W, 3), np.uint8)
        a[:] = bg
        for (x, y), hx in cells.items():
            if x0 <= x < x1 and y0 <= y < y1:
                a[y - y0, x - x0] = rgb(hx)
        return a
    allhis = np.zeros((Hh, W, 3), np.uint8)
    allhis[:] = bg
    for y in range(y0, y1):
        for x in range(x0, x1):
            hy, hx = y - DY, x - DX
            if 0 <= hy < P.SIZE and 0 <= hx < P.SIZE and fig[hy, hx]:
                allhis[y - y0, x - x0] = rgb(H[hy, hx])
    mine, both = {}, {}
    for s in 'FN':
        mine.update(his[s])
        both.update(P_[s])
    panels = [('Tu dibujo', allhis), ('Lo tomado de ti', tile(mine)), ('Las piezas (reposo)', tile(both))]
    pad, top_ = 12, 34
    ims = [Image.fromarray(a).resize((W * k, Hh * k), Image.NEAREST) for _, a in panels]
    sheet = Image.new('RGB', (sum(i.width for i in ims) + pad * (len(ims) + 1), Hh * k + top_ + pad), (40, 40, 48))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except OSError:
        font = ImageFont.load_default()
    X = pad
    for (label, _), im in zip(panels, ims):
        sheet.paste(im, (X, top_))
        d.text((X + 4, 6), label, fill=(255, 255, 255), font=font)
        X += im.width + pad
    tmp = path + '.tmp.png'
    sheet.save(tmp)
    os.replace(tmp, path)


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    H = his_hex()
    P_, his = pieces(H)
    check(P_, his)
    picture(H, P_, his, os.path.join(out_dir, 'tu-dibujo-vs-piezas@8.png'))
    for s in 'NF':
        print(CONST[s], 'cells', len(P_[s]), 'his', len(his[s]))
    if len(sys.argv) > 2:
        write_ts(P_, sys.argv[2])


if __name__ == '__main__':
    main()
