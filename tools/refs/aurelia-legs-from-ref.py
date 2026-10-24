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
botas"), with his skin and the shade the panels cast on it over them (SLIT_N, SLIT_F: pieces of the
thigh, drawn by the skirt):
  - near boot: his rows 62-98 where he drew them, with the rest of her (tools/refs/aurelia_rig.py AT:
    his soles on ours, his sole on our near sole, our row 218), none of his rows left out. Every
    pixel is his.
  - far boot: what shows of it in his picture, a narrow column between her front panel and the
    lining (his rows 62-96: the lace top under his far hand, the shin with its gold seam, the shoe in
    profile), is laid where he drew it, at his (x + 73, y + 120): beside the front panel's lower rows,
    his far sole two rows above his near one. Under the panel it goes on to its own width, in his cells
    (FAR_LEFT): at rest the panel covers that, so every pixel that shows is his. His bare woman's far leg
    is the same straight column, so the boot is on it: its lace top rides our far thigh and the rest our
    far shin, as the near boot's, and our far leg goes from the lace top's top edge down (CUT_F).

The pieces, each pivoting on our joint (its angle our segment's at idle, so at rest it is stamped as
laid; in other poses it turns with its segment):
  - THIGH  the lace top and the boot down to our knee (pivot: the knee; turns with the thigh); where the
           knee bends past the way he drew it, its own cells next to the knee turned through the bend
           fill the outside of the knee (stampBent in aureliaBoots.ts), so a bent knee opens no gap
  - SHIN   the boot from the knee to the ankle (pivot: the ankle), reaching UNDER rows down under the
           shoe's, so a bending ankle opens no gap. It starts at the knee: the thigh's piece and the
           shin's meet there, none of the shin's rows above the knee (rows of it laid up under the
           thigh's piece stuck out behind a bent knee, a spike past the knee in a deep bend)
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

# ---- the far boot where he drew none of it: above the front panel's tip (his rows 62-79) the panel hides
# all of the far boot but that column, so the column alone was a far leg two or three pixels wide, a stick
# beside our far thigh in every pose but idle (the owner, 2026-10-22: "tienes muy buggeada las piernas de
# aurelia en la mayoria de las poses"). Under the panel the boot goes on to its own line, FAR_LEFT: as
# wide as his far shin below the panel's tip (his row 80: his line at 56, the boot to his line at 61)
# and its lace top a column wider, as his near lace top is wider than his near boot. What fills it is
# his: the boot is his far shin's first whole row (FAR_WHOLE) continued up, the lace top his near lace
# top's lacing (his near lace band, a row lower: it slants down to the front, right edges together),
# the top edge and its own line his line. The panel's line beside the column (FAR_ROWS' first cell
# there) is the panel's, not the boot's: under it the boot goes on. At rest all of it is under the
# front panel, so every pixel that shows is still his where he drew it.
FAR_LEFT = {y: 55 for y in range(62, 67)} | {y: 56 for y in range(67, 80)}
FAR_WHOLE = 80
FAR_LACE = range(63, 67)

# ---- his bare thighs in the skirt's slits, above the lace tops: his skin with the shade the panels cast
# on it (our thigh is one flat skin there). Drawn by the skirt (aureliaLower.ts), each turning with its
# thigh about the knee as the lace top does: his cells within these boxes (x0, y0, x1, y1, inclusive).
SLIT_N = (44, 50, 50, 62)
SLIT_F = (59, 50, 62, 62)

# Where the shoe begins, his rows: near (front view: the cream ankle, the gold toe cap, the brown
# sole) and far (profile: the heel and the shoe).
NEAR_FOOT_FROM, FAR_FOOT_FROM = 90, 89
# How far the shin's piece reaches on under the thigh's and the shoe's (fine pixels).
UNDER = 3


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


def is_bare(c):
    """His skin and its shade, not his pale golds beside it (their green is high: 206 and over)."""
    r, g, b = (int(v) for v in c)
    return is_skin(c) and g < 200


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
    # under the front panel, the far boot on to its own line (FAR_LEFT), in his cells
    whole_l = FAR_ROWS[FAR_WHOLE][0]
    for y, lf in sorted(FAR_LEFT.items()):
        x0, x1 = FAR_ROWS[y]
        for x in range(lf, x0 + 1):
            if x == lf or y == 62:
                src = (whole_l, FAR_WHOLE)  # his line
            elif y in FAR_LACE:
                ny = min(y + 1, max(FAR_LACE))
                src = (x - x1 + NEAR_ROWS[ny][1], ny)
            else:
                src = (x - lf + whole_l, FAR_WHOLE)
            if not is_line(N[src[1], src[0]]) and (x == lf or y == 62):
                raise SystemExit(f'not his line: {src}')
            far[(x + FAR_DX, y + FAR_DY)] = (src, False)

    # his bare thighs in the slits: our (X, Y) -> his cell
    slits = {}
    for side, (x0, y0, x1, y1) in (('N', SLIT_N), ('F', SLIT_F)):
        slits[side] = {(x + NEAR_DX, y + NEAR_DY): (x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if is_bare(N[y, x])}

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

    # ---- his bare thighs in the slits: his skin colours (cells closer than NEAR are one), lightest first
    sk = [[c] for c in sorted(set(slits['N'].values()) | set(slits['F'].values()))]
    while True:
        ms = [np.mean([N[q[1], q[0]] for q in g], axis=0) for g in sk]
        best = None
        for i in range(len(sk)):
            for j in range(i + 1, len(sk)):
                d = float(np.linalg.norm(ms[i] - ms[j]))
                if d < NEAR and (best is None or d < best[0]):
                    best = (d, i, j)
        if best is None:
            break
        _, i, j = best
        sk[i] = sorted(sk[i] + sk[j])
        del sk[j]
    smean = [tuple(int(v) for v in np.round(np.mean([N[p[1], p[0]] for p in g], axis=0))) for g in sk]
    sorder = sorted(range(len(sk)), key=lambda i: (-sum(smean[i]), smean[i]))
    sletter = {}
    shex = {}
    for j, i in enumerate(sorder):
        shex['stuvwxyz'[j]] = '#%02x%02x%02x' % smean[i]
        for p in sk[i]:
            sletter[p] = 'stuvwxyz'[j]
    # his lit skin: the lightest (his shades lie below it)
    lit = sorder[0]
    parts += [
        "/** His lit skin in the slits: a body's skin recolours his slit pixels from it (at it they stay his). */",
        f"export const DAWN_SLIT_SKIN = '#%02x%02x%02x';" % smean[lit],
        '',
    ]
    for side in 'NF':
        hip, knee = J['hip' + side], J['knee' + side]
        cs = {p: sletter[c] for p, c in slits[side].items()}
        if set(shex) & set(kinds):
            raise SystemExit('slit letters taken by the boots')
        hexes.update(shex)
        parts.append(piece_ts(f'DAWN_SLIT_{side}', f"His bare {what[side]} thigh in the skirt's slit, with the shade the panels cast on it (pivot: the knee).", cs, knee, seg_angle(hip, knee)))
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
