"""The princess's gown skirt, from the owner's picture of her (docs/reference/princess-owner-reference.jpg),
as one skirt (skirt_rose_gown): the open pink overskirt with its lilac-and-gold embroidered hems flaring
wide, the lilac underskirt in its opening with its gold hem band, and the dark purple petticoat under
the hem.

His picture is drawn at our game's scale (tools/refs/princess_ref.py: one of his pixels is one fine pixel of
our sprite), so every pixel is lifted one for one. His colours are his palette's (princess_ref.quantize).
His pixel (x, y) goes to (x + DX, y + DY) of our female at idle frame 0, princess_ref.PART_OFFSET['overskirt']:
his pelvis and hips on ours.

The skirt is one piece (the overskirt, the underskirt and the petticoat together, so they move as one cloth
and never open a gap between them). What is his skirt:

  - the pixels princess_ref.part_map() gives the overskirt and the underskirt, from his row WAIST down (the
    pink strip above it beside the bodice, his columns 44-48, is the bodice's side, not the skirt), less
    the white enclosed between his far sleeve, the skirt and the sceptre (it is the background);
  - less his line round the near hand where it lies on the skirt (it is the hand's line);
  - what the rest of her hides of it, filled by continuing his pixels (HIDDEN): under the bodice's point
    (the waist), under the near sleeve and the near hand (the near hip), under the far sleeve and the
    sceptre's shaft (the far hip), under the far shoe and its stocking (the panel's gold hem band and the
    petticoat behind the far leg) and under the near shoe's toe (the hem). A hidden pixel at the hips
    takes the first pixel of his skirt (not his line) down the ray from FOCUS through it (his folds fan out from the
    waist), one at the hem the pixel of his mirrored across the nearest end of its row's hidden run (his
    embroidery and petticoat carried on). His black line goes round the filled edge: the waistband on
    top, the hip lines, the petticoat's foot.

Every pixel on the piece's edge is his line, so the game can draw his line round the piece when it moves
(src/sprite/items/princessSkirt.ts) and still leave every pixel his at rest.

Colour slots: 'cloth' the overskirt's pinks, 'lilac' the underskirt and the embroidered bands' lilacs,
'gold' the embroidery and hem golds (and their browns), 'petticoat' the petticoat's purples; his line
stays his. Each slot recolours from BASE (at it every pixel stays his).

Writes, in <out>: skirt-his@8.png (his crop, the parts of her over it marked, and the piece with what was
filled marked, Spanish labels) and, with a second argument, the game's module
(src/sprite/items/princessSkirtArt.ts). The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/princess-skirt-from-ref.py <out> [src/sprite/items/princessSkirtArt.ts]
"""

import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

DX, DY = P.PART_OFFSET['overskirt']
assert P.PART_OFFSET['underskirt'] == (DX, DY)

# The skirt starts at this row of his: above it beside the bodice is the bodice's pink side.
WAIST = 50
# The waistband's line: this row, from the near hip to the far one (under the bodice).
BAND = 49
# His white enclosed between the far sleeve, the skirt and the sceptre: lighter than this and greyer than
# GREY is the background, not cloth.
WHITE, GREY = 225, 14

# Where his skirt is hidden, as polygons of his pixel corners: a pixel of her that is not the skirt (a
# sleeve, a hand, the bodice, the sceptre, a shoe) inside one of these is the skirt carried on under it.
#   waist    under the bodice's point, up to the waistband
#   near     under the near sleeve and the near hand: the hip line runs on from his (29, 57) up to the
#            waist at (44, 49), the same slope as his line below the hand
#   far      under the far sleeve and the sceptre's shaft: the hip line runs on from his (68, 53) down to
#            his (72, 61) where it shows again
#   farshoe  under the far shoe and its stocking: the panel's gold hem band and the petticoat, down to
#            the petticoat's foot (his row 91, which steps up to 90 past the shoe)
#   nearshoe under the near shoe's toe: the overskirt's hem
HIDDEN = {
    'waist': [(43.5, 49), (66, 49), (66, 58), (43.5, 58)],
    'near': [(29.5, 56), (33, 53.5), (37, 51.5), (41, 50), (43.5, 49), (47, 49), (47, 61), (29, 61)],
    'far': [(58, 49), (66, 49), (66.6, 50.6), (73, 61.6), (66, 61.6), (58, 55)],
    'farshoe': [(54.5, 84.5), (65, 84.5), (65, 92), (54.5, 92)],
    'nearshoe': [(33.5, 91.5), (35.6, 91.5), (35.6, 94), (33.5, 94)],
}
# How each is filled: 'ray' down the fan of his folds from FOCUS, 'row' mirrored along its row.
FILL = {'waist': 'ray', 'near': 'ray', 'far': 'ray', 'farshoe': 'row', 'nearshoe': 'row'}
# Where his folds fan out from (above the waist, between the hips).
FOCUS = (54.0, 22.0)
# The petticoat: the dark purples under the underskirt's hem band, from its row down.
PETTICOAT = ([(40, 85.5), (72, 85.5), (72, 93), (40, 93)], 115)

# A pixel is the overskirt's pink when its red is over its blue by more than this (his lilacs are within 6).
PINK = 15

LINE_HEX = P.PALETTE_HEX[0]
# Characters for his colours (one per colour and slot; '.' is empty, 'k' his line).
CHARS = 'abcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'


def his_skirt():
    """(vis, Q): his visible skirt pixels and his colours (quantized) everywhere."""
    N = P.native()
    Q = P.quantize(N)
    pm = P.part_map()
    skirt = (pm == P.PARTS.index('overskirt')) | (pm == P.PARTS.index('underskirt'))
    L = P.luma(N)
    white = (L > WHITE) & ((N.max(-1) - N.min(-1)) <= GREY)
    yy = np.arange(P.SIZE)[:, None] + np.zeros((1, P.SIZE), int)
    vis = skirt & ~white & (yy >= WAIST)
    # his line round the near hand, where it lies on the skirt, is the hand's (part_map gives a line pixel to
    # the front-most part beside it, and the hand is not a part that claims line): the skirt goes on under it
    hand = pm == P.PARTS.index('body')
    near_hand = np.zeros_like(hand)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            near_hand |= np.roll(np.roll(hand, dy, 0), dx, 1)
    vis &= ~(near_hand & (P.luma(Q) < 45))
    return vis, Q, pm, white


def fill_hidden(vis, Q, pm, white):
    """The hidden skirt filled by continuing his pixels: (sil, col, filled region name per pixel)."""
    fig = P.figure()
    skirt_parts = (P.PARTS.index('overskirt'), P.PARTS.index('underskirt'))
    yy, xx = np.mgrid[0:P.SIZE, 0:P.SIZE]
    cx, cy = xx + 0.5, yy + 0.5
    # what covers his skirt: the other parts of her, and the bodice's pink side above the waist
    cover = fig & ~white & (~np.isin(pm, skirt_parts) | (yy < WAIST) | ~vis)
    region = np.full((P.SIZE, P.SIZE), '', dtype='<U8')
    for name, poly in HIDDEN.items():
        m = P.inside([poly], cx, cy) & cover & ~vis & (region == '')
        region[m] = name
    # a filled pixel hanging on by one side (where a polygon's corner pokes past his skirt) goes: the game takes
    # such spurs off a moved piece, so the piece has none
    while True:
        sil = vis | (region != '')
        n = np.zeros(sil.shape, int)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n += np.roll(np.roll(sil, dy, 0), dx, 1)
        spur = (region != '') & (n < 2)
        if not spur.any():
            break
        region[spur] = ''
    fill = region != ''
    sil = vis | fill
    col = np.zeros((P.SIZE, P.SIZE, 3), int)
    col[vis] = Q[vis]
    for y, x in zip(*np.nonzero(fill)):
        how = FILL[region[y, x]]
        if how == 'ray':
            d = np.array([x + 0.5 - FOCUS[0], y + 0.5 - FOCUS[1]])
            d /= np.hypot(*d)
            p = np.array([x + 0.5, y + 0.5])
            for _ in range(200):
                p = p + d * 0.5
                i, j = int(np.floor(p[0])), int(np.floor(p[1]))
                # his folds' colours, not his lines (a fold's dark line would run on as a stripe)
                if vis[j, i] and P.luma(Q[j, i]) >= 45:
                    col[y, x] = Q[j, i]
                    break
            else:
                raise AssertionError(f'no skirt of his down the fold from ({x}, {y})')
        else:
            row = fill[y] & (region[y] == region[y, x])
            a = x
            while a - 1 >= 0 and row[a - 1]:
                a -= 1
            b = x
            while b + 1 < P.SIZE and row[b + 1]:
                b += 1
            # mirrored across the nearer end of the run that has his skirt beside it
            left = a - 1 >= 0 and vis[y, a - 1]
            right = b + 1 < P.SIZE and vis[y, b + 1]
            if left and (not right or x - a <= b - x):
                src = a - 1 - (x - a)
                while src < 0 or not vis[y, src]:
                    src += 1
            elif right:
                src = b + 1 + (b - x)
                while src >= P.SIZE or not vis[y, src]:
                    src -= 1
            else:
                # a run with none of his skirt beside it (under the stocking, the petticoat's foot): his line
                src = None
            col[y, x] = Q[y, src] if src is not None else P.PALETTE[0]
    # his line round what was filled: a filled pixel on the piece's edge (or at the waistband) is his line
    line = P.PALETTE[0]
    for y, x in zip(*np.nonzero(fill)):
        edge = y == BAND or any(not (0 <= y + dy < P.SIZE and 0 <= x + dx < P.SIZE) or not sil[y + dy, x + dx]
                                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if edge:
            col[y, x] = line
    return sil, col, region


def edge_mask(sil):
    e = np.zeros_like(sil)
    for y, x in zip(*np.nonzero(sil)):
        e[y, x] = any(not (0 <= y + dy < P.SIZE and 0 <= x + dx < P.SIZE) or not sil[y + dy, x + dx]
                      for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    return e


def roles(sil, col):
    """The colour slot of each pixel: '' his line, else gold (his golds and their browns), cloth (his pinks and
    their dark rose shades: red over blue by more than PINK) or lilac (his lilacs and purples, the underskirt's
    pale pink-lilac too), the petticoat's purples apart."""
    fam = P.family(col)
    F = P.FAMILIES
    yy, xx = np.mgrid[0:P.SIZE, 0:P.SIZE]
    out = np.full((P.SIZE, P.SIZE), '', dtype='<U10')
    is_line = np.all(col == P.PALETTE[0], -1) | np.all(col == P.PALETTE[1], -1)
    pink = col[..., 0] - col[..., 2] > PINK
    out[sil & pink] = 'cloth'
    out[sil & ~pink] = 'lilac'
    out[sil & np.isin(fam, [F.index('gold')])] = 'gold'
    poly, dark = PETTICOAT
    pet = P.inside([poly], xx + 0.5, yy + 0.5) & (out == 'lilac') & (P.luma(col) < dark)
    out[sil & pet] = 'petticoat'
    out[sil & is_line] = ''
    return out


def build():
    vis, Q, pm, white = his_skirt()
    sil, col, region = fill_hidden(vis, Q, pm, white)
    role = roles(sil, col)
    edge = edge_mask(sil)
    not_line = edge & (role != '')
    assert not not_line.any(), f'edge pixels that are not his line: {list(zip(*np.nonzero(not_line)))}'
    n = np.zeros(sil.shape, int)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n += np.roll(np.roll(sil, dy, 0), dx, 1)
    assert not (sil & (n < 2)).any(), f'spurs: {list(zip(*np.nonzero(sil & (n < 2))))}'
    return vis, Q, sil, col, role, region


def base_colours(sil, col, role):
    """Each slot's commonest colour of his: the colour it recolours from."""
    base = {}
    for r in ('cloth', 'lilac', 'gold', 'petticoat'):
        c = Counter(P.rgb_hex(col[y, x]) for y, x in zip(*np.nonzero(sil & (role == r))))
        base[r] = c.most_common(1)[0][0]
    return base


def to_rows(sil, col, role):
    """Rows of characters over the piece's box, the characters' colours and slots."""
    ys, xs = np.nonzero(sil)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    keys = {}
    for y, x in sorted(zip(*np.nonzero(sil)), key=lambda p: (p[0], p[1])):
        k = (role[y, x], P.rgb_hex(col[y, x]))
        if k not in keys and k[0] != '':
            keys[k] = None
    # characters in a fixed order: by slot, then darkest first
    order = sorted(keys, key=lambda k: (('cloth', 'lilac', 'gold', 'petticoat').index(k[0]), float(P.luma(P.rgb(k[1]))), k[1]))
    assert len(order) <= len(CHARS), len(order)
    ch = {k: CHARS[i] for i, k in enumerate(order)}
    rows = []
    for y in range(y0, y1 + 1):
        r = ''
        for x in range(x0, x1 + 1):
            if not sil[y, x]:
                r += '.'
            elif role[y, x] == '':
                r += 'k'
            else:
                r += ch[(role[y, x], P.rgb_hex(col[y, x]))]
        rows.append(r)
    return (int(x0), int(y0)), rows, ch


def ts_module(origin, rows, ch, base):
    ox, oy = origin
    slots = {}
    for (r, hx), c in ch.items():
        slots.setdefault(r, []).append(c)
    out = [
        "// The princess's gown skirt, the owner's pixels at our scale (tools/refs/princess-skirt-from-ref.py from",
        '// docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        '/** A piece of his as drawn on our female body at idle frame 0: rows of his colours from fine pixel (x, y) of the frame. */',
        'export interface GownPiece {',
        '  x: number;',
        '  y: number;',
        "  /** One character per colour of his; '.' is empty, 'k' his line. */",
        '  rows: string[];',
        '  colors: Record<string, string>;',
        '}',
        '',
        '/** His line. */',
        f"export const PRINCESS_SKIRT_LINE = '{LINE_HEX}';",
        '',
        '/** The open pink overskirt with its lilac and gold embroidered hems, the lilac underskirt with its gold hem band and the',
        ' * dark purple petticoat, from the waistband to the floor; what the rest of her hides of it is his pixels carried on. */',
        'export const PRINCESS_SKIRT: GownPiece = {',
        f'  x: {ox + DX},',
        f'  y: {oy + DY},',
        '  rows: [',
    ]
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {', f"    k: '{LINE_HEX}',"]
    out += [f"    '{c}': '{hx}'," if not c.isalpha() else f"    {c}: '{hx}'," for (r, hx), c in ch.items()]
    out += ['  },', '};', '']
    docs = {'cloth': "The overskirt's pinks", 'lilac': "The underskirt's and the embroidered bands' lilacs",
            'gold': 'The embroidery and hem golds (and their browns)', 'petticoat': "The petticoat's purples"}
    for r in ('cloth', 'lilac', 'gold', 'petticoat'):
        out.append(f'/** {docs[r]}: its characters and the colour of his it recolours from. */')
        out.append(f"export const PRINCESS_SKIRT_{r.upper()} = '{''.join(slots[r])}';")
        out.append(f"export const PRINCESS_SKIRT_{r.upper()}_BASE = '{base[r]}';")
    return '\n'.join(out) + '\n'


def sheet(vis, Q, sil, col, region, out):
    """His crop and the piece side by side at 8x, with Spanish labels."""
    N = P.native()
    fig = P.figure()
    ys, xs = np.nonzero(sil | (vis))
    y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
    k = 8
    W, H = (x1 - x0) * k, (y1 - y0) * k
    bg = (236, 233, 226)

    def panel(px):
        im = Image.new('RGB', (W, H), bg)
        d = ImageDraw.Draw(im)
        for y in range(y0, y1):
            for x in range(x0, x1):
                c = px(y, x)
                if c is not None:
                    d.rectangle([(x - x0) * k, (y - y0) * k, (x - x0 + 1) * k - 1, (y - y0 + 1) * k - 1], fill=tuple(int(v) for v in c))
        return im

    his = panel(lambda y, x: N[y, x] if fig[y, x] else None)
    only = panel(lambda y, x: Q[y, x] if vis[y, x] else None)
    ours = panel(lambda y, x: col[y, x] if sil[y, x] else None)
    marked = ours.copy()
    d = ImageDraw.Draw(marked)
    for y, x in zip(*np.nonzero(region != '')):
        d.rectangle([(x - x0) * k + 1, (y - y0) * k + 1, (x - x0 + 1) * k - 2, (y - y0 + 1) * k - 2], outline=(0, 190, 255))
    f = ImageFont.truetype(BOLD, 22)
    s = ImageFont.truetype(FONT, 15)
    pad, top = 16, 70
    labels = [('Tu dibujo', 'tus píxeles, 1 = 1'), ('Solo la falda', 'tus píxeles visibles'),
              ('La falda en el juego', 'con lo oculto rellenado'), ('Lo rellenado', 'en azul: bajo las mangas, la mano, el cetro y los zapatos')]
    ims = [his, only, ours, marked]
    sheet_im = Image.new('RGB', (pad + len(ims) * (W + pad), top + H + pad), (248, 247, 243))
    dd = ImageDraw.Draw(sheet_im)
    for i, (im, (a, b)) in enumerate(zip(ims, labels)):
        x = pad + i * (W + pad)
        sheet_im.paste(im, (x, top))
        dd.text((x, 12), a, font=f, fill=(25, 25, 30))
        dd.text((x, 40), b, font=s, fill=(80, 80, 90))
    tmp = out + '.tmp.png'
    sheet_im.save(tmp)
    os.replace(tmp, out)


def main(out_dir, out_ts=None):
    vis, Q, sil, col, role, region = build()
    origin, rows, ch = to_rows(sil, col, role)
    base = base_colours(sil, col, role)
    os.makedirs(out_dir, exist_ok=True)
    sheet(vis, Q, sil, col, region, os.path.join(out_dir, 'skirt-his@8.png'))
    if out_ts:
        tmp = out_ts + '.tmp'
        with open(tmp, 'w') as fh:
            fh.write(ts_module(origin, rows, ch, base))
        os.replace(tmp, out_ts)
    n = Counter(region[region != ''])
    print(f'his pixels {int(vis.sum())}, filled {int((region != "").sum())} ({", ".join(f"{k} {v}" for k, v in sorted(n.items()))}),'
          f' colours {len(ch)}, box {origin} {len(rows[0])}x{len(rows)}, base {base}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
