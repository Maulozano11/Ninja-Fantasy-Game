"""Saya's sword from the owner's big picture of her (docs/reference/saya-owner-reference.jpg).

Saya (provisional "Saya, la Sombra Carmesí") holds a sword in her near fist, hanging blade-down across
her legs: a gold pommel above the fist, a dark leather grip, a gold knuckle bow that drops from the
pommel and runs round the outside of the fist to the guard, a round guard cup (gold rims round a steel
ring), and a straight steel blade, its upper edge lit almost white, a line of gold dots down its middle,
gold sparkles round it, all in her dark line.

His game-scale Saya (docs/reference/saya-game-scale-owner-reference.jpg) draws her weapons wrongly ("aquí
hay otra solo que tiene el arma bugeada, quita lo que está bugeado": two crossed swords and a scabbard
from one hand), so none of its weapon pixels is used. Her big picture draws two blades from one guard as
well; the one hanging down-right across her legs is the sword, as our weapons hang at rest; the one
pointing down-left is left out (the study, tools/refs/heroine_ref.py, keeps it apart as 'blade2').

Her big picture is not at our scale (heroine_ref: her weapon comes down by about 0.46). Her sword is too
small at our scale to reduce by machine (the guard about 7 of our pixels across, the bow one pixel wide),
so it is drawn here at our scale on the blade's own line, in her colours only (each one is in
heroine_ref.PALETTES['saya'], asserted): her blade's profile as the study reduced it (line, three steel
tones, line; the gold dots on the middle), its length as the study's reduced blade (tip about 36 px
along the line from our fist) and as his game-scale picture draws a sword (about 49 px). The pommel
shows above our fist as hers does above her glove; the bow passes outside the fist; the cup sits where
the blade leaves the fist. The grip hidden in her glove is drawn in her grip's browns.

The template is drawn at 45 degrees (the study's reduced blade lies at 44) and pivots on the grip cell
in the middle of her near glove's fist at rest (tools/refs/saya_rig.py GRIP_N), so held at rest every
pixel lies as drawn here. Cells are placed by (u, v): u = x + y - 286 runs along the blade (two per pixel step), v =
x - y + 68 across it (positive toward the upper right, the lit edge); the grip cell is u = v = 0.
The same sword is also drawn level (SAYA_SABER_LEVEL, build_flat): turned from 45 degrees to near level
or upright, a blade one line of steel thick breaks its line, so the game turns whichever drawing is
nearer a quarter turn (src/sprite/items/sayaSword.ts).

It writes, in <out>:

  sword@8.png       the sword (blade, hilt and every sparkle) as the template draws it at rest
  level@8.png       the level drawing
  kinds@8.png       what each pixel is: blade steel (grey), gold dots (yellow), guard gold (orange),
                    guard steel (blue-grey), grip (brown), her line (black), sparkles (cyan)
  compare@8.png     her big picture's sword (her pixels, scaled down to ours by nearest neighbour), the
                    study's reduced sword, and ours, side by side

and, given a second argument, the game's module (src/sprite/items/sayaSwordArt.ts). The same input
always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/saya-sword-from-ref.py <out> src/sprite/items/sayaSwordArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import heroine_ref as R  # noqa: E402
import saya_rig  # noqa: E402

WHICH = 'saya'
# Her colours used here, all from PALETTES['saya'].
LINE = '#02010d'
STEEL_HI, STEEL_LT, STEEL_MID, STEEL_DK = '#f2f1f1', '#cacdd5', '#a0a4b2', '#7e7f8e'
RING_LT, RING_DK = '#b7becc', '#6c6e78'
GOLD_HI, GOLD, GOLD_MID, GOLD_DK, GOLD_DEEP = '#f6d886', '#e8ba58', '#d8a84c', '#c48e42', '#9d6e44'
GRIP_DK, GRIP, GRIP_LT = '#302525', '#453631', '#604f46'
SPARK_HI, SPARK, SPARK_GOLD = '#fef6d8', '#feeeb5', '#f7c962'

# The cell the grip passes through at rest: the middle of her near glove's fist (tools/refs/saya_rig.py
# GRIP_N; src/sprite/items/sayaUpper.ts sayaGrip puts it there in every pose).
HX, HY = saya_rig.GRIP_N

# Along the blade (u, two per pixel step): the pommel, the grip, the guard cup, the blade, the tip. Her
# glove's fist (six pixels wide, four tall, tools/refs/saya-upper-from-ref.py SAYA_GLOVE_N) covers the
# grip from about u -5 to 4: the pommel rests on its upper end, out past her wrist, and the cup on its
# lower end, as hers do on her glove, so no grip shows between them.
POMMEL_U = -8
GRIP_U = (-6, 5)
CUP_U = (6, 8)
BLADE_U = (9, 70)


def uv(x, y):
    return x + y - (HX + HY), x - y - (HX - HY)


def xy(u, v):
    assert (u + v) % 2 == 0, (u, v)
    return (u + v) // 2 + HX, (u - v) // 2 + HY


def build():
    """kind and colour per cell of our frame at rest, and the sparkles (x, y, colour)."""
    cells = {}

    def put(x, y, kind, col):
        cells[(x, y)] = (kind, col)

    # The blade: line, darker steel, steel, her gold dots in the middle, the lit edge, line.
    u0, u1 = BLADE_U
    for u in range(u0, u1 + 1):
        left = u1 - u  # how far from the tip
        half = 1 if left >= 2 else 0
        for v in range(-half - 1, half + 2):
            if (u + v) % 2:
                continue
            x, y = xy(u, v)
            if abs(v) > half:
                continue
            if half == 0:
                col = STEEL_LT
            elif v == half:
                col = STEEL_HI
            elif v == -half:
                col = STEEL_MID
            elif v == 0:
                # Her gold dots down the middle; the root (the ricasso) gold through.
                col = GOLD if (u < u0 + 4 or (u - u0) % 6 == 5) else STEEL_LT
            else:
                col = STEEL_LT
            put(x, y, 'dot' if col == GOLD else 'blade', col)

    # The guard cup: a gold rim on each side of a steel ring, round, across the blade's root.
    cu0, cu1 = CUP_U
    for u in range(cu0, cu1 + 1):
        r = 5 if u == cu0 + 1 else 4
        for v in range(-r, r + 1):
            if (u + v) % 2:
                continue
            x, y = xy(u, v)
            if u == cu0 + 1:
                col, kind = (RING_LT if v > 0 else RING_DK) if abs(v) < 5 else GOLD_DK, 'ring' if abs(v) < 5 else 'guard'
            elif u == cu0:
                col, kind = (GOLD_HI if v > 0 else GOLD), 'guard'
            else:
                col, kind = (GOLD_MID if v > 0 else GOLD_DEEP), 'guard'
            put(x, y, kind, col)

    # The grip: dark leather, two pixels wide in each row (v 0 and 1), wrapped: a darker turn every
    # third step, its lit side the upper one.
    g0, g1 = GRIP_U
    for u in range(g0, g1 + 1):
        v = u % 2
        x, y = xy(u, v)
        col = GRIP_DK if (u // 2) % 3 == 0 else (GRIP_LT if v == 1 else GRIP)
        put(x, y, 'grip', col)

    # The pommel: a gold knob, lit from the upper left, on a dark gold collar.
    px, py = xy(POMMEL_U, 0)
    knob = {(px - 1, py - 1): GOLD_HI, (px, py - 1): GOLD, (px - 1, py): GOLD, (px, py): GOLD_MID,
            (px + 1, py): GOLD_DK, (px, py + 1): GOLD_DK, (px + 1, py + 1): GOLD_DEEP}
    for (x, y), c in knob.items():
        put(x, y, 'guard', c)

    # The knuckle bow: from under the pommel's collar straight down, then along the outside of the
    # fist, parallel to the grip, into the cup's lower end. One pixel of gold, lit on its upper part.
    end = xy(CUP_U[0] + 1, -5)
    path = [(px - 1, py + 2), (px - 1, py + 3), (px - 1, py + 4), (px - 1, py + 5)]
    x, y = path[-1]
    while (x + 1, y + 1) != end and y < end[1]:
        x, y = x + 1, y + 1
        if (x, y) == end:
            break
        path.append((x, y))
    for i, (x, y) in enumerate(path):
        put(x, y, 'guard', GOLD_HI if i < 3 else GOLD if i < 8 else GOLD_MID)

    outline(cells)
    # The tip: one more pixel of line past the point, as hers ends.
    tx, ty = xy(BLADE_U[1], 0)
    cells.setdefault((tx + 1, ty + 1), ('line', LINE))

    # Her sparkles round the blade: single glints and one four-point star, near both edges.
    sparks = []
    # (along the blade from its root, as she has them)
    b0 = BLADE_U[0]
    for u, v, c in ((9, 6, SPARK_HI), (17, -6, SPARK), (23, 8, SPARK_GOLD), (31, -8, SPARK_HI), (39, 6, SPARK),
                    (45, -6, SPARK_GOLD), (53, 6, SPARK_HI), (61, -4, SPARK)):
        x, y = xy(b0 + u, v)
        sparks.append((x, y, c))
    sx, sy = xy(b0 + 35, -10)
    sparks += [(sx, sy, SPARK_HI), (sx - 1, sy, SPARK_GOLD), (sx + 1, sy, SPARK_GOLD), (sx, sy - 1, SPARK_GOLD), (sx, sy + 1, SPARK_GOLD)]
    for x, y, _ in sparks:
        assert (x, y) not in cells, ('sparkle on the sword', x, y)
    return cells, sparks


def outline(cells):
    """Her dark line round everything (4-neighbours), as her picture outlines the sword."""
    for (x, y) in list(cells):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in cells:
                cells[q] = ('line', LINE)


# The same sword drawn level (pointing right), for the poses that hold it near level or upright: turned
# from 45 degrees there, a blade this thin breaks its line, while a quarter turn of either drawing is
# exact. Along it s (pixels from the hand joint's cell), across it w (pixels, up positive: the lit edge).
FLAT_POMMEL_S = -7
FLAT_GRIP_S = (-4, 4)
FLAT_CUP_S = (5, 7)
FLAT_BLADE_S = (8, 50)


def build_flat():
    """kind and colour per cell of the level drawing (the hand joint's cell at 0, 0), and its sparkles."""
    cells = {}

    def put(s, w, kind, col):
        cells[(s, -w)] = (kind, col)

    b0, b1 = FLAT_BLADE_S
    for s in range(b0, b1 + 1):
        if b1 - s < 2:
            put(s, 0, 'blade', STEEL_LT)
            continue
        put(s, 1, 'blade', STEEL_HI)
        gold = s < b0 + 3 or (s - b0) % 4 == 3
        put(s, 0, 'dot' if gold else 'blade', GOLD if gold else STEEL_LT)
        put(s, -1, 'blade', STEEL_MID)
    c0, _ = FLAT_CUP_S
    for w in range(-3, 4):
        put(c0, w, 'guard', GOLD_HI if w > 0 else GOLD)
        put(c0 + 1, w, 'ring' if abs(w) < 3 else 'guard', (RING_LT if w > 0 else RING_DK) if abs(w) < 3 else GOLD_DK)
        if abs(w) < 3:
            put(c0 + 2, w, 'guard', GOLD_MID if w > 0 else GOLD_DEEP)
    g0, g1 = FLAT_GRIP_S
    for s in range(g0, g1 + 1):
        dark = (s - g0) % 3 == 0
        put(s, 1, 'grip', GRIP_DK if dark else GRIP_LT)
        put(s, 0, 'grip', GRIP_DK if dark else GRIP)
    p = FLAT_POMMEL_S
    for (s, w), c in {(p, 1): GOLD_HI, (p, 0): GOLD, (p + 1, 1): GOLD, (p + 1, 0): GOLD_MID, (p, -1): GOLD_DK,
                      (p + 1, -1): GOLD_DEEP, (p + 2, 0): GOLD_DK}.items():
        put(s, w, 'guard', c)
    # The knuckle bow: down from under the pommel, then along under the fist into the cup's lower end.
    path = [(p + 1, -2), (p + 1, -3)] + [(s, -4) for s in range(p + 2, c0)]
    for i, (s, w) in enumerate(path):
        put(s, w, 'guard', GOLD_HI if i < 3 else GOLD if i < 8 else GOLD_MID)
    outline(cells)
    cells.setdefault((b1 + 1, 0), ('line', LINE))
    sparks = []
    for s, w, c in ((6, 4, SPARK_HI), (11, -4, SPARK), (15, 5, SPARK_GOLD), (21, -5, SPARK_HI), (27, 4, SPARK),
                    (31, -4, SPARK_GOLD), (37, 4, SPARK_HI), (43, -3, SPARK)):
        sparks.append((b0 + s, -w, c))
    sx, sy = b0 + 24, 7
    sparks += [(sx, sy, SPARK_HI), (sx - 1, sy, SPARK_GOLD), (sx + 1, sy, SPARK_GOLD), (sx, sy - 1, SPARK_GOLD), (sx, sy + 1, SPARK_GOLD)]
    for x, y, _ in sparks:
        assert (x, y) not in cells, ('sparkle on the sword', x, y)
    return cells, sparks


CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    her = set(R.PALETTES[WHICH])
    cells, sparks = build()
    flat, flat_sparks = build_flat()
    for _, c in list(cells.values()) + list(flat.values()):
        assert c in her, ('not her colour', c)
    for *_, c in sparks + flat_sparks:
        assert c in her, ('not her colour', c)
    assert cells[(HX, HY)][0] == 'grip', ('the grip cell is not on the grip', cells[(HX, HY)])
    assert flat[(0, 0)][0] == 'grip', ('the hand joint is not on the level grip', flat[(0, 0)])

    # One palette character per (group, colour): the blade and the guard recolour apart.
    group = {'blade': 'blade', 'dot': 'guard', 'guard': 'guard', 'ring': 'steel', 'grip': 'grip', 'line': 'line', 'spark': 'blade'}
    order = ('blade', 'guard', 'steel', 'grip', 'line')
    keys = sorted({(group[k], c) for k, c in list(cells.values()) + list(flat.values())} |
                  {('spark', c) for *_, c in sparks + flat_sparks},
                  key=lambda kc: ((order + ('spark',)).index(kc[0]), kc[1]))
    char = {kc: CHARS[i] for i, kc in enumerate(keys)}
    palette = {char[kc]: kc[1] for kc in keys}
    groups = {'blade': ''.join(char[kc] for kc in keys if kc[0] in ('blade', 'spark')),
              'guard': ''.join(char[kc] for kc in keys if kc[0] == 'guard')}

    def piece(cells, sparks, hand):
        xs = [x for x, _ in cells] + [x for x, _, _ in sparks]
        ys = [y for _, y in cells] + [y for _, y, _ in sparks]
        x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
        rows = []
        for y in range(y0, y1):
            r = ''
            for x in range(x0, x1):
                kc = cells.get((x, y))
                r += char[(group[kc[0]], kc[1])] if kc else '.'
            rows.append(r)
        spark_list = [(x - x0, y - y0, char[('spark', c)]) for x, y, c in sparks]
        return rows, (hand[0] - x0, hand[1] - y0), spark_list, (x0, y0, x1, y1)

    rows, pivot, spark_list, (x0, y0, x1, y1) = piece(cells, sparks, (HX, HY))
    flat_rows, flat_pivot, flat_spark_list, (fx0, fy0, fx1, fy1) = piece(flat, flat_sparks, (0, 0))

    if len(sys.argv) > 2:
        write_ts(sys.argv[2], palette, groups, [('SAYA_SABER', 45, rows, pivot, spark_list),
                                                ('SAYA_SABER_LEVEL', 0, flat_rows, flat_pivot, flat_spark_list)])
    flat_rgba = np.zeros((fy1 - fy0, fx1 - fx0, 4), np.uint8)
    for (x, y), (k, c) in flat.items():
        flat_rgba[y - fy0, x - fx0] = hexrgb(c) + (255,)
    for x, y, c in flat_sparks:
        flat_rgba[y - fy0, x - fx0] = hexrgb(c) + (255,)
    big(flat_rgba, 8).save(os.path.join(out, 'level@8.png'))

    # Studies.
    H, W = y1 - y0, x1 - x0
    rgba = np.zeros((H, W, 4), np.uint8)
    kinds = np.zeros((H, W, 4), np.uint8)
    kc_col = {'blade': (150, 150, 160), 'dot': (240, 220, 60), 'guard': (240, 140, 40), 'ring': (110, 130, 170),
              'grip': (110, 60, 30), 'line': (0, 0, 0)}
    for (x, y), (k, c) in cells.items():
        rgba[y - y0, x - x0] = hexrgb(c) + (255,)
        kinds[y - y0, x - x0] = kc_col[k] + (255,)
    for x, y, c in sparks:
        rgba[y - y0, x - x0] = hexrgb(c) + (255,)
        kinds[y - y0, x - x0] = (0, 230, 230, 255)
    big(rgba, 8).save(os.path.join(out, 'sword@8.png'))
    big(kinds, 8).save(os.path.join(out, 'kinds@8.png'))
    compare(out, rgba, (x0, y0))
    print(len(rows), 'rows x', len(rows[0]), 'origin', (x0, y0), 'pivot', pivot, 'colours', len(palette),
          'sparks', len(spark_list))


def hexrgb(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def big(a, k):
    bg = np.zeros(a.shape[:2] + (3,), np.uint8)
    bg[...] = (232, 232, 238)
    m = a[..., 3] > 0
    bg[m] = a[m, :3]
    return Image.fromarray(bg).resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)


def compare(out, ours, origin):
    """Her big picture's sword (her pixels, brought to our size by nearest neighbour), the study's reduced
    sword and ours, at 8x, with Spanish labels."""
    n = R.native(WHICH)
    # Her sword in her native pixels: the hilt and the down-right blade (the down-left one is greyed).
    crop = n[90:150, 44:142].astype(np.uint8)
    lay = R.reduced_layers(WHICH)
    pal = R.rgb(WHICH)
    H, W = ours.shape[:2]
    x0, y0 = origin
    ref = np.zeros((H, W, 4), np.uint8)
    for name in ('glow', 'blade', 'hilt'):
        L = lay[name][y0:y0 + H, x0:x0 + W]
        m = L < 255
        ref[m, :3] = pal[L[m]]
        ref[m, 3] = 255
    k = 8
    # Her pixels at 4x: about the size of ours at 8x (her weapon is about 0.46 of hers on ours).
    panels = [(big(np.dstack([crop, np.full(crop.shape[:2], 255, np.uint8)]), 4), 'Tu dibujo grande (sus pixeles)'),
              (big(ref, k), 'Estudio (reducido)'), (big(ours, k), 'En el juego')]
    pad, top = 16, 40
    Wt = sum(p.width for p, _ in panels) + pad * (len(panels) + 1)
    Ht = max(p.height for p, _ in panels) + top + pad
    sheet = Image.new('RGB', (Wt, Ht), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    x = pad
    for p, label in panels:
        sheet.paste(p, (x, top))
        d.text((x, 12), label, fill=(0, 0, 0))
        x += p.width + pad
    sheet.save(os.path.join(out, 'compare@8.png'))


def write_ts(path, palette, groups, pieces):
    """The sword as the game's module (src/sprite/items/sayaSwordArt.ts)."""
    def lit(v):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

    out = [
        "// Saya's sword, the owner's big picture of her at our scale (tools/refs/saya-sword-from-ref.py from",
        '// docs/reference/saya-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface SayaSword extends PaintedPiece {',
        '  /** The characters of the steel blade and its sparkles. */',
        '  blade: string;',
        "  /** The characters of the hilt's gold: the pommel, the knuckle bow, the cup's rims and the blade's gold dots. */",
        '  guard: string;',
        "  /** The sparkles round the blade: [x, y, character] in the template's cells (not in rows). */",
        '  sparks: [number, number, string][];',
        '}',
        '',
        '/** Her blade steel and hilt gold: the colours the two colour slots turn hers from. */',
        f"export const SAYA_SWORD_BLADE = '{STEEL_LT}';",
        f"export const SAYA_SWORD_GUARD = '{GOLD}';",
    ]
    docs = {
        'SAYA_SABER': ['The sword as she holds it, hanging across the legs at 45 degrees and pivoting on the grip under our',
                       'near hand joint, so held at rest every pixel lies as drawn.'],
        'SAYA_SABER_LEVEL': ['The same sword drawn level, for the angles nearer level or upright than diagonal: turned from',
                             '45 degrees there its thin blade would break its line.'],
    }
    for name, angle, rows, pivot, sparks in pieces:
        out += ['', '/**'] + [f' * {d}' for d in docs[name]] + [' */', f'export const {name}: SayaSword = {{',
                                                                f'  pivot: [{pivot[0]}, {pivot[1]}],', f'  angle: {angle},', '  rows: [']
        out += [f'    {lit(r)},' for r in rows]
        out += ['  ],', '  colors: {']
        out += [f'    {k}: {lit(v)},' for k, v in palette.items()]
        out += ['  },', f"  blade: {lit(groups['blade'])},", f"  guard: {lit(groups['guard'])},", '  sparks: [']
        out += [f'    [{x}, {y}, {lit(ch)}],' for x, y, ch in sparks]
        out += ['  ],', '};']
    out.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
