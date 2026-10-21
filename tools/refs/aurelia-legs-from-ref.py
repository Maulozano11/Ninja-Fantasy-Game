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

His pixels are laid on our female at idle frame 0 (the owner's bare female body; its joints in
tools/refs/aurelia_rig.py) where he drew them, none moved. His bare thighs in the skirt's slits above the
lace tops are not the boots': our thighs show there, his bare woman's (a thigh painted on the boot rode
the shin and showed as a third leg when she sat: the owner, 2026-10-21, "estas poniendo 3 piernas o 3
botas"):
  - near boot: his rows 62-98 where he drew them, with the rest of her (tools/refs/aurelia_rig.py AT:
    his soles on ours, his sole on our near sole, our row 218), none of his rows left out. Every
    pixel is his.
  - far boot: all of it shows in his picture, a narrow column between her front panel and the
    lining (his rows 62-96: the lace top under his far hand, the shin with its gold seam, the shoe in
    profile), and it is laid where he drew it, at his (x + 73, y + 120): beside the front panel's
    lower rows, his far sole two rows above his near one. Every pixel is his. His bare woman's far leg
    is the same straight column, so the boot is on it: its lace top rides our far thigh and the rest our
    far shin, as the near boot's, and our far leg goes from the lace top's top edge down (CUT_F).

The pieces, each pivoting on our joint (its angle our segment's at idle, so at rest it is stamped as
laid; in other poses it turns with its segment):
  - THIGH  the lace top and the boot down to our knee (pivot: the knee; turns with the thigh; on the
           far leg too: carried whole on the far shin, its lace top swung out past the body in a deep
           bend, the throw's release)
  - SHIN   the boot from the knee to the ankle,
           reaching UNDER_KNEE rows up under the thigh's piece
           and UNDER rows down under the shoe's, so a bending knee or ankle opens no gap (pivot: the
           ankle); where a hard bend still shows the boot's open edge at the knee, the item closes it
           in his line (closeKnee in aureliaBoots.ts)
  - FOOT   the ankle and the shoe, flat like our feet (pivot: the ankle); his near shin ends a little
           off our ankle, so the shoe hangs from where the shin's piece ends (FOOT_JOIN, turned with
           the shin, across only), not from the ankle itself
CUT (CUT_F on the far leg) is where our leg goes (the thigh below the lace top's top edge, the shin and
foot whole): its distance above the knee along the thigh, in fine pixels.

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

from aurelia_rig import AT, JOINTS as J  # noqa: E402

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
# Both boots are laid where he drew them, with the rest of her (aurelia_rig.AT): his soles on ours, his
# lace tops on our thighs, none of his rows left out.
NEAR_DX, NEAR_DY = AT['boots']

# ---- the far boot: all of it shows in his picture, a narrow column between her front panel and the
# lining: the lace top under his far hand (his rows 62-66, the line over it and his gold), the shin with
# its gold seam (rows 67-88) and the shoe in profile (rows 89-96).
FAR_ROWS = {62: (59, 62)} | {y: (59, 62) for y in range(63, 72)} | {y: (59, 61) for y in range(72, 78)} | {
    78: (58, 61), 79: (57, 61), 80: (56, 61), 81: (56, 61), 82: (56, 61), 83: (56, 61), 84: (57, 61), 85: (57, 61),
    86: (57, 61), 87: (57, 62), 88: (57, 62), 89: (56, 63), 90: (56, 63), 91: (56, 64), 92: (56, 66),
    93: (57, 67), 94: (57, 68), 95: (57, 68), 96: (62, 68),
}
# Laid where he drew it: beside her front panel with his far sole two rows above his near one, as he
# drew them. Our far leg stands further out and its ankle higher than his (the female's far ankle is six
# rows above the near one); its lace top rides our far thigh (pivot: the far knee), the rest our far shin
# (pivot: the far ankle), and our far
# thigh goes below the lace top's top edge (CUT_F): at rest his column is all that shows of the far leg.
FAR_DX, FAR_DY = AT['boots']

# Where the shoe begins, his rows: near (front view: the cream ankle, the gold toe cap, the brown
# sole) and far (profile: the heel and the shoe).
NEAR_FOOT_FROM, FAR_FOOT_FROM = 90, 89
# How far the shin's piece reaches on under the thigh's and the shoe's (fine pixels).
UNDER = 3
# How far the near shin's piece reaches up under the thigh's piece past the knee.
UNDER_KNEE = 3


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


def boot_cells(N, rows, skin=True):
    """A boot's cells of his: within its rows, not his ground or (where `skin`, his bare thigh shows by
    it) his skin."""
    out = []
    for y, (x0, x1) in sorted(rows.items()):
        for x in range(x0, x1 + 1):
            c = N[y, x]
            if is_ground(c) or (skin and is_skin(c)):
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
        near[(x + NEAR_DX, y + NEAR_DY)] = ((x, y), y >= NEAR_FOOT_FROM)
    far = {}
    # (no skin by the far boot: its pale lit gold at his row 78 reads as skin to is_skin)
    for (x, y) in boot_cells(N, FAR_ROWS, skin=False):
        far[(x + FAR_DX, y + FAR_DY)] = ((x, y), y >= FAR_FOOT_FROM)

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

    def chars(cs):
        return {p: letter[colours[c]] for p, (c, _) in cs.items()}

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
        foot_row = (NEAR_FOOT_FROM + NEAR_DY) if side == 'N' else FAR_FOOT_FROM + FAR_DY
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
                if s >= -UNDER_KNEE:
                    shin[p] = c
            else:
                shin[p] = c
        pieces[side] = (thigh, shin, foot)

    def cut_of(side, thigh_top):
        """Where our leg goes: the line across the thigh through the middle of the lace top's top edge
        (`thigh_top`, his row of it), as a distance above the knee along the thigh."""
        kn, ut = J['knee' + side], unit(J['hip' + side], J['knee' + side])
        cs = NL if side == 'N' else FL
        y = thigh_top + (NEAR_DY if side == 'N' else FAR_DY)
        xs = [x for (x, yy) in cs if yy == y]
        top = ((min(xs) + max(xs) + 1) / 2, y)
        return -((top[0] - kn[0]) * ut[0] + (top[1] - kn[1]) * ut[1])

    # the near lace top's top edge is his row 63 (its left half capped by his row 62's line); the far's,
    # his row 62's line
    cut = cut_of('N', 63)
    cut_f = cut_of('F', 62)

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
        out += [f"    {c if c.isalnum() else repr(c)}: '{hexes[c]}'," for c in used]
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
        '/** The same on the far leg. */',
        f'export const DAWN_BOOT_CUT_F = {cut_f:.2f};',
        '',
    ]
    what = {'N': 'near', 'F': 'far'}
    for side in 'NF':
        thigh, shin, foot = pieces[side]
        hip, knee, ankle = J['hip' + side], J['knee' + side], J['ankle' + side]
        parts.append(piece_ts(f'DAWN_THIGH_{side}', f'The {what[side]} lace top and the boot down to the knee (pivot: the knee).', thigh, knee, seg_angle(hip, knee)))
        shin_doc = f'The {what[side]} boot from the knee to the ankle (pivot: the ankle).'
        parts.append(piece_ts(f'DAWN_SHIN_{side}', shin_doc, shin, ankle, seg_angle(knee, ankle)))
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
        ox0, oy0 = hx0 + NEAR_DX, hy0 + NEAR_DY
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
