"""Saya's pleated skirt, her belts with the pouch, and her scabbard, from the owner's Saya at our scale.

His game-scale Saya (docs/reference/saya-game-scale-owner-reference.jpg, "aquí hay otra solo que tiene el
arma bugeada, quita lo que está bugeado": the picture he drew at our sprite scale) is 1024 x 1024 picture
pixels for 100 x 100 of hers, the grid from the picture's corner: one of her pixels is 10.24 picture
pixels and one of ours. Laid on our 256 x 256 frame at (+76, +122) her eyes land on our female's (her
soles on ours), so every row below is written in our frame's coordinates and, at idle frame 0, sits where
he drew it (the same grid and placement as tools/refs/saya-upper-from-ref.py).

Her pixels: each cell's colour is the median of its middle (a JPEG), and her colours are the cells'
colours gathered into tones (colours within 14 of each other in every channel are one tone, its colour
their mean; a tone of fewer than 4 cells is noise and is dropped). The skirt and the belts are rows of
those tones, one character per tone (KEY, printed by --key). Every character is her pixel there, except
the cells this script reports as filled (fill() below; the preview crosses them):

  the skirt     SHADE_SKIRT rides the pelvis and turns with the torso. Her navy pleats with the red
                stripes, the near panel a row shorter than the front, the red hem with its dark pleat
                marks, the far panel; her thighs show bare between the panels. Filled: the skirt's top
                under her belts and pouch (dark navy, as it shows between them), and the near-left pleat
                with its red hem under the bugged sword's guard and blade (x 114-118), its edge on our
                thigh's.
  the belts     SHADE_BELTS rides the pelvis and turns with the torso: her two slung brown belts with
                their steel buckles, the pouch on the near hip and its flap, her black line. The top
                showing between the belts is left out (the armour shows there). Filled: the belts'
                near ends (x 114-118) where our waist is wider than hers, under her hair lock, and the
                pouch's lower corner under the bugged sword's guard.

The bugged weapons in his picture (two crossed swords and a scabbard) are not used: none of their pixels
is copied, and what they covered is filled as above. Her scabbard comes from her big picture
(docs/reference/saya-owner-reference.jpg, tools/refs/heroine_ref.py) brought down to our scale (0.48):

  the scabbard  SHADE_SCABBARD: her black-navy scabbard, the grey-blue light along its upper side, a gold
                chape at the tip, hanging from the near hip down and back behind the near leg at her
                angle (about 45 degrees). Each colour is one of her big picture's (asserted). Its mouth
                is hidden under her skirt there; it is closed with a gold throat ring (drawn, not seen).

The navy and the red of the skirt are its colour slots (Cloth, Stripe); the belts' browns (Leather), the
buckles' steels (Steel), the scabbard's dark (Scabbard) and its gold (Gold) are the belts' (KIND says
which colour is which). At her colours every pixel is hers; another colour shifts each of her shades as
far from it as hers was from her base (src/sprite/color.ts retintHex). Her black line stays.

Writes the pieces as TypeScript (src/sprite/items/sayaLowerArt.ts) and, in <out>, saya-lower-pieces@8.png
(each piece at 8x, filled cells crossed, the pivot ringed). The same pictures always give the same bytes.
Run from the repo root:

  python3 -I tools/refs/saya-lower-from-ref.py docs/reference/saya-game-scale-owner-reference.jpg src/sprite/items/sayaLowerArt.ts <out>
  python3 -I tools/refs/saya-lower-from-ref.py docs/reference/saya-game-scale-owner-reference.jpg --key
"""

import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heroine_ref as R  # noqa: E402

# Her grid: one of her pixels in picture pixels, her grid's size, and where her picture lies on our frame.
PITCH = 10.24
SIZE = 100
AT = (76, 122)
# Tones: colours within TH in every channel are one tone; a tone of fewer than MIN cells is dropped.
TH, MIN = 14, 4
CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

# Our female's pelvis at idle frame 0 (tools/refs/heroine_ref.py OUR_JOINTS), fine pixels: every piece
# hangs from it.
PELVIS = (127.00, 177.47)
NECK = (127.24, 149.84)

# The pieces from his game-scale picture: name, what it is, the frame position (x, y) of its first row's
# first cell, and the rows (one per frame row, from y), in his tones.
PIECES = [
    ('SHADE_SKIRT', 'The skirt: her navy pleats, red stripes and red hem; the top under her belts and the near-left pleat filled.',
     (113, 178), [
         # x 113.......................142
         '..................22..........',  # 178 the top, between the belts
         '.002222222222222222c220000620.',  # 179 under the belts and the pouch (filled but 114-116, 128-141)
         '.0000022cc9b0092c2ccc2900i2c0.',  # 180 x 117-126: under the guard and the pouch
         '.002c002cc9b00icc2ccc2i00i2c0.',  # 181 x 116-117: under the guard
         '.02cc02ccci020icc2ccc2i00i2c0.',  # 182 x 114-117: under the guard
         '.02c002ccii020icc2ccc2ci00icc0',  # 183 x 114-116: under the guard
         '.0iii000ci0220icc2ccc2ci00icc0',  # 184 x 114-118: the near-left pleat's hem, under the guard and blade
         '..000000000000jcc2ccc2ci0.0ic0',  # 185 x 115-119: its edge, under the blade
         '............000ii9iii9i0..0ii0',  # 186 the hem; her thighs between the panels
         '..............000000000....000',  # 187
     ]),
    ('SHADE_BELTS', 'The belts: two slung brown belts with steel buckles and the pouch on the near hip.',
     (114, 170), [
         # x 114....................139
         '...00055000..........050..',  # 170 x 117-118: under her hair lock
         '..0000555ee000......05500.',  # 171 x 116: our waist
         '.05550055eeeCe00...0ew500.',  # 172 x 115-118: our waist
         '0eeeeee0000eqeee000eew0.0.',  # 173 x 114-118: our waist
         '0eeeeeeeee000ee5CCe0e00..0',  # 174 x 114-118: our waist
         '00000weew5000005Ceee00...0',  # 175 x 114-116: our waist
         '...0505ee05500e005e5C5000.',  # 176
         '..00550005e50eee5005q55e0.',  # 177
         '....00555ee50e000..0055e0.',  # 178
         '.....0055e5500............',  # 179 x 118-119: under the guard
         '......0000000.............',  # 180
     ]),
]

# Her scabbard from her big picture at our scale, its own characters: her black line, the grey-blue light
# along its upper side, its black-navy, and the chape's golds (light, mid, dark). Every colour is one of
# her big picture's (heroine_ref.PALETTES['saya']).
SCAB_COLORS = {
    '0': '#02010d', 'R': '#343545', 'T': '#1d1d32', 'e': '#c69151', 'f': '#c48e42', 'g': '#9d6e44',
}
SCABBARD = ('SHADE_SCABBARD', 'The scabbard: black-navy, lit along its upper side, a gold chape at the tip and a gold throat ring.',
            (98, 180), [
                # x 98.....................125
                '......................0000..',  # 180 its mouth, closed
                '.....................0efg0..',  # 181 the throat ring
                '....................0efg0...',  # 182
                '...................0RTT0....',  # 183
                '..................0RTT0.....',  # 184
                '.................0RTT0......',  # 185
                '................0RTT0.......',  # 186
                '...............0RTT0........',  # 187
                '..............0RTT0.........',  # 188
                '.............0RTT0..........',  # 189
                '............0RTT0...........',  # 190
                '...........0RTT0............',  # 191
                '..........0RTT0.............',  # 192
                '.........0RTT0..............',  # 193
                '........0RTT0...............',  # 194
                '.......0RTT0................',  # 195
                '......0RTT0.................',  # 196
                '.....0RTT0..................',  # 197
                '....0RTT0...................',  # 198
                '...0eTT0....................',  # 199 the chape
                '..0fgg0.....................',  # 200
                '..0gg0......................',  # 201
                '..000.......................',  # 202
            ])

# Which colour slot recolours each colour (the rest, her black line, stay).
SLOT_OF = {
    'cloth': ['#222338', '#272c48', '#374061', '#373b49'],
    'stripe': ['#3f1e30', '#431527', '#5f1a29', '#6e212c', '#6f2f32', '#772930', '#7e3232', '#a73234', '#b63133'],
    'leather': ['#3e2b25', '#63483b'],
    'steel': ['#6f727d', '#9899a2', '#b2b5ba'],
    'scabbard': ['#1d1d32', '#343545'],
    'gold': ['#9d6e44', '#c48e42', '#c69151'],
}
BASE = {'cloth': '#374061', 'stripe': '#a73234', 'leather': '#63483b', 'steel': '#b2b5ba', 'scabbard': '#1d1d32', 'gold': '#c48e42'}

OUT_DOC = (
    "// Saya's pleated skirt, belts with the pouch, and scabbard: the owner's pixels 1:1 from his Saya at our\n"
    "// scale, her scabbard from her big picture (tools/refs/saya-lower-from-ref.py from\n"
    "// docs/reference/saya-game-scale-owner-reference.jpg). Generated: rerun the script to change it.\n"
)


def native(path):
    """Her pixels: the median colour of each cell's middle (5 x 5 picture pixels), SIZE x SIZE x 3."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    assert a.shape[:2] == (round(PITCH * SIZE),) * 2, a.shape
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    for y in range(SIZE):
        for x in range(SIZE):
            y0, x0 = int(round(y * PITCH + 2.5)), int(round(x * PITCH + 2.5))
            out[y, x] = np.median(a[y0:y0 + 5, x0:x0 + 5].reshape(-1, 3), 0).round()
    return out


def tones(N):
    """Her tones, darkest first: {char: hex}. White (her background) is not a tone."""
    cols, counts = np.unique(N.reshape(-1, 3), axis=0, return_counts=True)
    order = sorted(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))
    centres, members = [], []
    for i in order:
        c = cols[i]
        if (c > 235).all():
            continue
        for j, ce in enumerate(centres):
            if np.abs(c - ce).max() <= TH:
                members[j].append((c, counts[i]))
                break
        else:
            centres.append(c)
            members.append([(c, counts[i])])
    pal = []
    for m in members:
        tot = sum(n for _, n in m)
        if tot >= MIN:
            pal.append(tuple(int(v) for v in (sum(c * n for c, n in m) / tot).round()))
    pal.sort(key=lambda c: (sum(c), c))
    assert len(pal) <= len(CHARS)
    return {CHARS[i]: '#%02x%02x%02x' % c for i, c in enumerate(pal)}


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def hers(N, key):
    """Her picture on our frame as tone characters: {(x, y): char}; her white is left out."""
    P = np.array([rgb(h) for h in key.values()])
    chars = list(key)
    out = {}
    for y in range(SIZE):
        for x in range(SIZE):
            c = N[y, x]
            if (c > 235).all():
                continue
            out[(x + AT[0], y + AT[1])] = chars[int(np.argmin(((P - c) ** 2).sum(1)))]
    return out


def fill(piece, H):
    """The cells of a piece that are not her pixel there (filled), as a set of frame (x, y)."""
    _name, _doc, (x0, y0), rows = piece
    out = set()
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != '.' and H.get((x0 + i, y0 + j)) != ch:
                out.add((x0 + i, y0 + j))
    return out


def check(key):
    for name, _doc, _at, rows in PIECES + [SCABBARD]:
        for r in rows:
            assert len(r) == len(rows[0]), (name, r)
    for _name, _doc, _at, rows in PIECES:
        for r in rows:
            for ch in r:
                assert ch == '.' or ch in key, ch
    for r in SCABBARD[3]:
        for ch in r:
            assert ch == '.' or ch in SCAB_COLORS, ch
    big = {h.lower() for h in R.PALETTES['saya']}
    for h in SCAB_COLORS.values():
        assert h in big, h
    known = set(key.values()) | set(SCAB_COLORS.values())
    for hexes in SLOT_OF.values():
        assert all(h in known for h in hexes), hexes
    for b in BASE.values():
        assert b in known, b


def colors_of(piece, key):
    rows = piece[3]
    pal = SCAB_COLORS if piece is SCABBARD else key
    used = sorted({ch for r in rows for ch in r if ch != '.'}, key=list(pal).index)
    return {ch: pal[ch] for ch in used}


def pivot(piece):
    """The pivot cell in the piece: the pelvis' cell."""
    x0, y0 = piece[2]
    return int(PELVIS[0]) - x0, int(PELVIS[1]) - y0


def torso_angle():
    import math
    return math.degrees(math.atan2(NECK[1] - PELVIS[1], NECK[0] - PELVIS[0]))


def ts_piece(piece, key):
    name, doc, _at, rows = piece
    px, py = pivot(piece)
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{', f'  pivot: [{px}, {py}],',
           f'  angle: {torso_angle():.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    '{ch}': '{h}'," for ch, h in colors_of(piece, key).items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def write_ts(path, key):
    lines = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '',
             '/** Her colours the colour slots recolour from (at these, every pixel is hers). */',
             'export const SHADE_BASE = {']
    lines += [f"  {k}: '{h}'," for k, h in BASE.items()]
    lines += ['} as const;', '', '/** Which slot recolours each of her colours (her black line stays). */',
              'export const SHADE_KIND: Record<string, keyof typeof SHADE_BASE> = {']
    for slot, hexes in SLOT_OF.items():
        for h in hexes:
            lines.append(f"  '{h}': '{slot}',")
    lines += ['};', '']
    for p in PIECES + [SCABBARD]:
        lines.append(ts_piece(p, key))
    text = '\n'.join(lines)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def sheet(out, key, H):
    """Each piece at 8x on grey, its filled cells crossed (green), its pivot ringed."""
    k = 8
    ims = []
    for piece in PIECES + [SCABBARD]:
        (x0, y0), rows = piece[2], piece[3]
        pal = colors_of(piece, key)
        F = fill(piece, H) if piece is not SCABBARD else set()
        im = Image.new('RGB', (len(rows[0]) * k, len(rows) * k), (214, 214, 214))
        d = ImageDraw.Draw(im)
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch == '.':
                    continue
                d.rectangle([i * k, j * k, i * k + k - 1, j * k + k - 1], fill=tuple(int(v) for v in rgb(pal[ch])))
                if (x0 + i, y0 + j) in F:
                    d.line([i * k + 2, j * k + 2, i * k + k - 3, j * k + k - 3], fill=(0, 220, 0))
        px, py = pivot(piece)
        cx, cy = (px + 0.5) * k, (py + 0.5) * k
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=(255, 0, 255))
        ims.append(im)
    Wt = sum(i.width for i in ims) + 12 * len(ims)
    o = Image.new('RGB', (Wt, max(i.height for i in ims) + 8), (255, 255, 255))
    x = 0
    for im in ims:
        o.paste(im, (x, 4))
        x += im.width + 12
    o.save(os.path.join(out, 'saya-lower-pieces@8.png'))


def main():
    N = native(sys.argv[1])
    key = tones(N)
    if sys.argv[2] == '--key':
        for ch, h in key.items():
            print(ch, h)
        return
    check(key)
    H = hers(N, key)
    write_ts(sys.argv[2], key)
    for p in PIECES:
        F = fill(p, H)
        total = sum(ch != '.' for r in p[3] for ch in r)
        print(f'{p[0]}: {total - len(F)} of {total} cells hers, {len(F)} filled')
    print(f'{SCABBARD[0]}: from her big picture, {sum(ch != "." for r in SCABBARD[3] for ch in r)} cells')
    if len(sys.argv) > 3:
        os.makedirs(sys.argv[3], exist_ok=True)
        sheet(sys.argv[3], key, H)


if __name__ == '__main__':
    main()
