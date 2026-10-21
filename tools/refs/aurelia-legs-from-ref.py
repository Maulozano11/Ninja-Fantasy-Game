"""Aurelia's thigh-high white boots with gold lace tops and gold heeled shoes, from the owner's picture
of her at our game's scale (docs/reference/aurelia-escala-juego-owner-reference.jpg), as painted pieces
that ride the rig: the creator's 'feet_dawn_boots' (src/sprite/items/aureliaBoots.ts).

He drew Aurelia again at our scale ("aqui tienes tus referencias perfectas del modelo de mujer"):
1932 x 1932 picture pixels, 19.32 for each of his pixels (100 x 100 of them, the grid starting at the
picture's corner), one of his pixels = one of ours. Each of his pixels is the middle of its cell (its
median); cells within NEAR of each other are one colour of his (their mean).

His boots: a gold lace top (a band of gold with darker gold lacing) high on the thigh, the white boot
over the knee and down the shin with a thin gold seam down its front (brown-gold where the skirt's
shade falls on it), lit cream again at the ankle, and gold shoes: the near one seen from the front (a
gold toe cap on a brown sole), the far one in profile with its brown heel.

His legs are longer than ours and stand wider, so his pixels are laid on our female at idle frame 0
with as little moved as possible:
  - near boot: his rows 62-98 at his x + 74 (one column right of his hair and dress, so the lace top
    sits on our thigh); the knee and the lace top at his y + 123 like the rest of her, and three of the
    shin's rows that repeat the row above (DROP) left out so his sole lands on our near sole (our row
    218). Every pixel is his.
  - far boot: his shin from where it shows past her front panel (his row 79) and his shoe at his
    (x + 78, y + 114), his sole on our far sole (row 210) and his ankle on ours. Above that his picture
    hides the far leg behind the front panel; it is continued from his pixels: the shin runs up to
    the knee as his rows 79-80 (FAR_SHIN_FILL), and the lace top and the boot down to the knee are
    his near boot's (to his row FAR_BAND_LAST), in the shade his far boot shows (FAR_SHADE: his lit
    cream takes the shaded cream his far boot shows at the same rows), turned with our far thigh.

The pieces, each pivoting on our joint (its angle our segment's at idle, so at rest it is stamped as
laid; in other poses it turns with its segment):
  - THIGH  the lace top and the boot down to our knee (pivot: the knee; turns with the thigh)
  - SHIN   the boot from the knee to the ankle, reaching UNDER_KNEE rows up under the thigh's piece
           and UNDER rows down under the shoe's, so a bending knee or ankle opens no gap (pivot: the
           ankle); where a hard bend still shows the boot's open edge at the knee, the item closes it
           in his line (closeKnee in aureliaBoots.ts)
  - FOOT   the ankle and the shoe, flat like our feet (pivot: the ankle); his near shin ends a little
           off our ankle, so the shoe hangs from where the shin's piece ends (FOOT_JOIN, turned with
           the shin), not from the ankle itself
CUT is where our leg goes (the thigh below the lace top's top edge, the shin and foot whole): its
distance above the knee along the thigh, in fine pixels.

His black line is kept and never tinted; his brown soles and heel (kind 'brown') stay; his whites, creams and
greys follow the Cloth slot and his golds the Gold slot. Writes <ts> (src/sprite/items/aureliaBootsArt.ts)
and, with --preview <dir>, his crop beside our layout at 8x (boots@8.png); the same picture always
gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/aurelia-legs-from-ref.py [src/sprite/items/aureliaBootsArt.ts] [--preview <dir>]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from heroine_ref import OUR_JOINTS as J  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PICTURE = os.path.join(ROOT, 'docs', 'reference', 'aurelia-escala-juego-owner-reference.jpg')
# One of his pixels in picture pixels; his grid starts at the picture's corner.
PITCH = 19.32
# Groups of cells whose mean colours are closer than this (RGB distance) are one colour of his (the
# JPEG moves a cell by up to 8; his seam and lacing golds lie 13 apart).
NEAR = 10

# ---- the near boot: his cells, as rows y -> (first x, last x), inclusive (his line at both ends);
# his white ground, skin and the skirt's cells outside them are not the boot's.
NEAR_ROWS = {
    62: (43, 45),  # the lace top's upper line (left half; the right half's is his row 63)
    63: (42, 50), 64: (42, 50), 65: (41, 49), 66: (40, 49), 67: (40, 48), 68: (40, 48), 69: (40, 47),
    70: (40, 47), 71: (39, 47), 72: (39, 46), 73: (38, 46), 74: (38, 45), 75: (37, 45), 76: (37, 44),
    77: (36, 44), 78: (36, 44), 79: (36, 43), 80: (36, 43), 81: (36, 42), 82: (36, 42), 83: (36, 42),
    84: (36, 41), 85: (36, 41), 86: (36, 41), 87: (36, 41), 88: (35, 40), 89: (35, 40), 90: (35, 40),
    91: (35, 40), 92: (34, 40), 93: (34, 40), 94: (34, 40), 95: (34, 40), 96: (34, 40), 97: (34, 40),
    98: (35, 39),
}
# Shin rows that repeat the row above (the same line, seam and outline columns), left out.
DROP = (78, 82, 87)
NEAR_DX = 74
# How far up each stretch of his near boot is laid (his y + this = our row): the lace top and knee at
# her own offset (123), and a row less below each dropped row.
def near_dy(y):
    return 123 - sum(1 for d in DROP if y > d)

# ---- the far boot as it shows: his shin past the front panel and his shoe.
FAR_ROWS = {
    79: (58, 61), 80: (56, 61), 81: (56, 61), 82: (56, 61), 83: (56, 61), 84: (57, 61), 85: (57, 61),
    86: (57, 61), 87: (57, 62), 88: (57, 62), 89: (56, 63), 90: (56, 63), 91: (56, 64), 92: (56, 66),
    93: (57, 67), 94: (57, 68), 95: (57, 68), 96: (62, 68),
}
FAR_DX, FAR_DY = 78, 114
# The far shin hidden behind her front panel (its point covers his row 79 to x 57), up to the knee
# and under the lace top: (x, y) -> the cell of his it copies. His row 80's line, shade and cream on
# the back side, his row 79's cream, lit gold seam and line on the front, run up from row 79.
FAR_SHIN_FILL = {}
for _y in range(71, 80):
    for _x, _c in ((56, (56, 80)), (57, (57, 80)), (58, (58, 80)), (59, (59, 79)), (60, (60, 79)), (61, (61, 79))):
        if _y < 79 or _x < 58:
            FAR_SHIN_FILL[(_x, _y)] = _c
# The far lace top is his near one (his rows 62-67) in the far boot's shade, turned with our far thigh.
FAR_BAND_LAST = 70
# His far boot is in the skirt's shade: where his near boot is lit cream his far boot shows his shaded
# cream (his far rows 67-70), and where the near is shaded, the far is his darker shade (rows 71-75).
FAR_SHADE = {(244, 237, 220): (205, 188, 171)}

# Where the shoe begins, his rows: near (front view: the cream ankle, the gold toe cap, the brown
# sole) and far (profile: the heel and the shoe).
NEAR_FOOT_FROM, FAR_FOOT_FROM = 90, 89
# How far the shin's piece reaches on under the thigh's and the shoe's (fine pixels).
UNDER = 3
# How far it reaches up under the thigh's piece past the knee: the far thigh's piece (his near boot's top)
# comes down to the knee itself, and more of the far shin would stand out past the far thigh when the
# knee bends hard (crouching, running).
UNDER_KNEE = {'N': 3, 'F': 1}


def native():
    """His pixels: the median of each grid cell (away from its edges), (H, W, 3) ints."""
    a = np.asarray(Image.open(PICTURE).convert('RGB')).astype(int)
    n = int(round(a.shape[0] / PITCH))
    out = np.zeros((n, n, 3), int)
    for y in range(n):
        for x in range(n):
            y0, y1 = int(y * PITCH + 4), int((y + 1) * PITCH - 4)
            x0, x1 = int(x * PITCH + 4), int((x + 1) * PITCH - 4)
            out[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    return out


def is_line(c):
    return max(c) < 48


def is_ground(c):
    return min(c) > 246


def is_skin(c):
    r, g, b = (int(v) for v in c)
    return r > 180 and 90 < b < 190 and r - g > 30


def boot_cells(N, rows):
    """A boot's cells of his: within its rows, not his ground or skin."""
    out = []
    for y, (x0, x1) in sorted(rows.items()):
        for x in range(x0, x1 + 1):
            c = N[y, x]
            if is_ground(c) or is_skin(c):
                continue
            out.append((x, y))
    return out


def kind_of(rgb, in_shoe):
    """Which colour slot a colour of his follows: 'line', 'brown' (his soles and heel), 'gold', 'cloth'."""
    r, g, b = (int(v) for v in rgb)
    if max(r, g, b) < 48:
        return 'line'
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn) / mx
    if in_shoe and mx < 160 and sat > 0.4:
        return 'brown'
    if sat > 0.45 or (r - b > 70):
        return 'gold'
    return 'cloth'


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    path = args[0] if args else 'src/sprite/items/aureliaBootsArt.ts'
    N = native()

    # ---- lay his cells on our frame: our (X, Y) -> (his cell, is it the shoe's)
    near = {}
    for (x, y) in boot_cells(N, NEAR_ROWS):
        if y in DROP:
            continue
        near[(x + NEAR_DX, y + near_dy(y))] = ((x, y), y >= NEAR_FOOT_FROM)
    far = {}
    for (x, y) in boot_cells(N, FAR_ROWS):
        far[(x + FAR_DX, y + FAR_DY)] = ((x, y), y >= FAR_FOOT_FROM)
    for (x, y), c in FAR_SHIN_FILL.items():
        far[(x + FAR_DX, y + FAR_DY)] = (c, False)

    # ---- his colours: within each kind, the two groups of cells whose mean colours are closest are one
    # colour of his while they are closer than NEAR (their means, so the JPEG's noise does not chain one
    # colour into the next: his seam's brown-gold and his lacing's dark gold stay two)
    used = {}
    for cs in (near, far):
        for (c, shoe) in cs.values():
            rgb = tuple(int(v) for v in N[c[1], c[0]])
            used.setdefault(kind_of(rgb, shoe), set()).add(c)
    colours = {}  # his cell -> group id
    groups = []  # (kind, [cells])
    for k in ('line', 'cloth', 'gold', 'brown'):
        cells = sorted(used.get(k, ()))
        if not cells:
            continue
        if k == 'line':
            found = [cells]  # his black line is one colour
        else:
            found = [[p] for p in cells]
            while True:
                ms = [np.mean([N[q[1], q[0]] for q in g], axis=0) for g in found]
                best = None
                for i in range(len(found)):
                    for j in range(i + 1, len(found)):
                        d = float(np.linalg.norm(ms[i] - ms[j]))
                        if d < NEAR and (best is None or d < best[0]):
                            best = (d, i, j)
                if best is None:
                    break
                _, i, j = best
                found[i] = sorted(found[i] + found[j])
                del found[j]
        for g in sorted(found):
            for p in g:
                colours[p] = len(groups)
            groups.append((k, g))
    mean = [tuple(int(v) for v in np.round(np.mean([N[p[1], p[0]] for p in g], axis=0))) for _, g in groups]

    # the far boot's shade: his lit cream on the far boot is his shaded cream there
    def shade(gi):
        m = mean[gi]
        for a, b in FAR_SHADE.items():
            if np.linalg.norm(np.array(m) - np.array(a)) < NEAR:
                best = min((j for j, (k, _) in enumerate(groups) if k == 'cloth'), key=lambda j: np.linalg.norm(np.array(mean[j]) - np.array(b)))
                return best
        return gi

    # letters: the line 'k', then by kind from light to dark
    pools = {'cloth': 'abcdefhijlmnopqrstuvwxyz', 'gold': 'ABCDEFGHIJLMNOPQRSTUVWXYZ', 'brown': '0123456789'}
    letter = {}
    for kd, pool in pools.items():
        ids = sorted((i for i, (k, _) in enumerate(groups) if k == kd), key=lambda i: (-sum(mean[i]), mean[i]))
        if len(ids) > len(pool):
            raise SystemExit(f'too many {kd} colours: {len(ids)}')
        for j, i in enumerate(ids):
            letter[i] = pool[j]
    for i, (k, _) in enumerate(groups):
        if k == 'line':
            letter[i] = 'k'
    hexes = {letter[i]: '#%02x%02x%02x' % mean[i] for i in range(len(groups))}

    def chars(cs, shaded=False):
        out = {}
        for p, (c, _) in cs.items():
            gi = colours[c]
            out[p] = letter[shade(gi) if shaded else gi]
        return out

    NL = chars(near)
    FL = chars(far)

    # ---- the pieces: our joints at idle frame 0
    def seg_angle(a, b):
        return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

    def unit(a, b):
        d = (b[0] - a[0], b[1] - a[1])
        n = math.hypot(*d)
        return (d[0] / n, d[1] / n)

    def along(p, j, u):
        """How far below the joint `j` along `u` the middle of fine pixel p lies."""
        return (p[0] + 0.5 - j[0]) * u[0] + (p[1] + 0.5 - j[1]) * u[1]

    pieces = {}
    for side, cs in (('N', NL), ('F', FL)):
        hip, knee, ankle = J['hip' + side], J['knee' + side], J['ankle' + side]
        ut = unit(hip, knee)
        foot_row = (NEAR_FOOT_FROM + near_dy(NEAR_FOOT_FROM)) if side == 'N' else FAR_FOOT_FROM + FAR_DY
        thigh, shin, foot = {}, {}, {}
        for p, c in cs.items():
            s = along(p, knee, ut)
            if p[1] >= foot_row:
                foot[p] = c
                if p[1] < foot_row + UNDER:
                    shin[p] = c
                continue
            if s < 0:
                thigh[p] = c
                if s >= -UNDER_KNEE[side]:
                    shin[p] = c
            else:
                shin[p] = c
        pieces[side] = (thigh, shin, foot)
    # the far thigh: his near boot's lace top in his far boot's shade, laid as the near's (the far
    # shin's fill reaches up under it)
    near_thigh = pieces['N'][0]
    far_thigh = {}
    for p, c in near_thigh.items():
        (hc, _) = near[p]
        if hc[1] <= FAR_BAND_LAST:
            far_thigh[p] = letter[shade(colours[hc])]
    pieces['F'] = (far_thigh, pieces['F'][1], pieces['F'][2])
    # where our leg goes: the line across the thigh through the top edge of his lace top (his row 63,
    # whose left half his row 62's line caps), as a distance above the knee along the thigh
    kn, ut = J['kneeN'], unit(J['hipN'], J['kneeN'])
    xs = [x for (x, y) in near_thigh if y == 63 + near_dy(63)]
    top = ((min(xs) + max(xs) + 1) / 2, 63 + near_dy(63))
    cut = -((top[0] - kn[0]) * ut[0] + (top[1] - kn[1]) * ut[1])

    # ---- check: every letter has its colour of his
    for side in 'NF':
        for cs in pieces[side]:
            for c in cs.values():
                if c not in hexes:
                    raise SystemExit(f'no colour for {c!r}')

    kinds = {letter[i]: k for i, (k, _) in enumerate(groups)}
    cloth_chars = ''.join(sorted(c for c, k in kinds.items() if k == 'cloth'))
    gold_chars = ''.join(sorted(c for c, k in kinds.items() if k == 'gold'))

    # the slots' defaults: his white and his gold (his colours nearest these)
    def nearest(kd, rgb):
        cs = [c for c, k in kinds.items() if k == kd]
        c = min(cs, key=lambda c: sum((int(hexes[c][1 + 2 * i:3 + 2 * i], 16) - rgb[i]) ** 2 for i in range(3)))
        return hexes[c]

    base = {'cloth': nearest('cloth', (245, 237, 220)), 'gold': nearest('gold', (243, 190, 74))}
    order = 'k' + pools['cloth'] + pools['gold'] + pools['brown']

    def piece_ts(name, doc, cs, joint, angle):
        xs = [x for x, _ in cs]
        ys = [y for _, y in cs]
        x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
        rows = [''.join(cs.get((x, y), '.') for x in range(x0, x1)) for y in range(y0, y1)]
        used = sorted(set(cs.values()), key=order.index)
        px, py = int(math.floor(joint[0])) - x0, int(math.floor(joint[1])) - y0
        out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{', f'  pivot: [{px}, {py}],', f'  angle: {angle:.2f},', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {c}: '{hexes[c]}'," for c in used]
        out += ['  },', '};', '']
        return '\n'.join(out)

    parts = [
        "// Aurelia's thigh-high white boots with gold lace tops and gold heeled shoes (feet_dawn_boots): the",
        "// owner's pixels from his picture of her at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg),",
        '// by tools/refs/aurelia-legs-from-ref.py: one piece per segment of the leg, pivot on its joint, angle the',
        "// segment's on our female at idle frame 0. Generated: rerun the script to change it.",
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        "/** His white: the Cloth slot's default (his creams and greys follow it). */",
        f"export const DAWN_BOOT_CLOTH = '{base['cloth']}';",
        "/** His gold: the Gold slot's default (his golds, the lacing and the seam follow it). */",
        f"export const DAWN_BOOT_GOLD = '{base['gold']}';",
        f"export const DAWN_BOOT_CLOTH_CHARS = '{cloth_chars}';",
        f"export const DAWN_BOOT_GOLD_CHARS = '{gold_chars}';",
        '/** Where our leg goes: fine pixels above the knee along the thigh (the lace top\'s top edge). */',
        f'export const DAWN_BOOT_CUT = {cut:.2f};',
        '',
    ]
    what = {'N': 'near', 'F': 'far'}
    for side in 'NF':
        thigh, shin, foot = pieces[side]
        hip, knee, ankle = J['hip' + side], J['knee' + side], J['ankle' + side]
        tdoc = (f'The {what[side]} lace top and the boot down to the knee (pivot: the knee).' if side == 'N' else
                'The far lace top and the boot over the knee: his near boot in his far boot\'s shade (pivot: the knee; laid as the near\'s, it turns with the far thigh).')
        if side == 'N':
            parts.append(piece_ts('DAWN_THIGH_N', tdoc, thigh, knee, seg_angle(hip, knee)))
        else:
            parts.append(piece_ts('DAWN_THIGH_F', tdoc, thigh, J['kneeN'], seg_angle(J['hipN'], J['kneeN'])))
        parts.append(piece_ts(f'DAWN_SHIN_{side}', f'The {what[side]} boot from the knee to the ankle (pivot: the ankle).', shin, ankle, seg_angle(knee, ankle)))
        parts.append(piece_ts(f'DAWN_FOOT_{side}', f'The {what[side]} ankle and shoe, flat (pivot: the ankle).', foot, ankle, 0.0))
        # where the shoe meets the shin: the middle of the shoe's top row, from our ankle (fine pixels)
        top = min(y for _, y in foot)
        xs = [x for x, y in foot if y == top]
        join = ((min(xs) + max(xs) + 1) / 2 - ankle[0], top - ankle[1])
        parts.append(f'/** Where the {what[side]} shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */')
        parts.append(f'export const DAWN_FOOT_JOIN_{side}: [number, number] = [{join[0]:.2f}, {join[1]:.2f}];')
        parts.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    os.replace(tmp, path)
    print('wrote', path, '| colours:', len(hexes), '| cloth', cloth_chars, 'gold', gold_chars, '| cut', f'{cut:.2f}', '| base', base)

    if preview:
        os.makedirs(preview, exist_ok=True)
        k = 8
        hx0, hy0, hx1, hy1 = 28, 58, 72, 100
        ox0, oy0 = hx0 + NEAR_DX, hy0 + 123
        w, h = hx1 - hx0, hy1 - hy0
        img = np.full((h * k, w * 2 * k + 16, 3), 255, np.uint8)
        for y in range(hy0, hy1):
            for x in range(hx0, hx1):
                img[(y - hy0) * k:(y - hy0 + 1) * k, (x - hx0) * k:(x - hx0 + 1) * k] = N[y, x]
        for side in 'FN':
            thigh, shin, foot = pieces[side]
            for cs in ((shin, foot, thigh) if side == 'N' else (shin, foot)):
                for (X, Y), c in cs.items():
                    x, y = X - ox0, Y - oy0
                    if 0 <= x < w and 0 <= y < h:
                        hh = hexes[c]
                        X0 = x * k + w * k + 16
                        img[y * k:(y + 1) * k, X0:X0 + k] = [int(hh[i:i + 2], 16) for i in (1, 3, 5)]
        Image.fromarray(img).save(os.path.join(preview, 'boots@8.png'))


if __name__ == '__main__':
    main()
