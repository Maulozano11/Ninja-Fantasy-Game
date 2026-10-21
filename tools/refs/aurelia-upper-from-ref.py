"""Aurelia's dress bodice and detached sleeves from the owner's picture of her at our game's scale
(docs/reference/aurelia-escala-juego-owner-reference.jpg) as painted pieces that ride the rig: the
creator's 'armor_dawn_vestment' (src/sprite/items/aureliaVestment.ts).

He drew Aurelia again at our scale ("aqui tienes tus referencias perfectas del modelo de mujer"):
1932 x 1932 picture pixels, 19.32 for each of his pixels (100 x 100 of them, the grid starting at the
picture's corner; every cell is flat but for the JPEG's few levels of noise), and one of his pixels is
one of ours. So nothing is reduced or redrawn: each of his pixels is the middle of its cell (its
median), cells he drew in one colour are one colour (cells linked by steps closer than NEAR take
their mean), and they are laid on our female at idle frame 0 (the second female body, fitted to his
heroines at our scale) one for one, all of her at one place (tools/refs/aurelia_rig.py AT: his soles
on ours, his collar just under our chin): the collar and bodice at (x + OFFSET[0], y + OFFSET[1]) of our
256 x 256 frame, the sleeves whole where he drew them (SLEEVE_AT: the near one with his bare near
shoulder over its band), none of their rows left out: our arms hang where his do (the female standard,
docs/SPRITE_STYLE_GUIDE.md), so his cuffs end at our wrists.

His Aurelia wears a white sleeveless dress: a high collar edged in gold round the neck with a blue gem
on a dark cord at the throat and a small keyhole of skin under it, bare shoulders, a bodice
embroidered in gold, the shade under the bust; and white sleeves of their own, each held round the
upper arm by a gold band, widening to a long hanging opening over a grey lining, edged and cuffed in
gold. The sash, belt, pouch and skirt are another item's (aurelia-lower): the bodice stops at the
sash's line. The pieces:

  - BODICE   the collar, the gem, the bodice to the sash's line, and the bit of armpit by the near
             arm (his rows 24-41)                                   pivot neck      torso.armor
  - WAIST    the bodice carried on under the sash to the hips, his row 40 run down (hidden under
             the sash and skirt when they are worn; it closes the dress when they are not)
                                                                    pivot neck      torso.top
  - sleeves  each cut at the elbow into the upper arm's piece (pivot shoulder) and the forearm's
             (pivot elbow), which reaches on under the upper arm's so a bending elbow opens no gap
                                                       near: nearArm.armor; far: farLeg.armor

His skin in the keyhole and the armpit is the face's own (it follows the player's skin): those cells
are written as skin letters, drawn in the body's skin shades (SKIN_SHADE). His black line is never
tinted.

What his picture hides, filled by continuing his pixels (FILL, each a copy of one of his cells):
  - the collar's top under her near side lock (his rows 23-24, x 48-50): his collar line and its gold
  - the far sleeve behind her bust and under her belt: its gold band at the far shoulder (his near
    band's rows), its cloth down to where it shows past her bust, and where the belt's end hangs over
    it (his rows 44-48)

In our idle pose each piece is stamped exactly as laid here (stampPiece at its own angle); in other
poses it turns with its segment. Writes <ts> (src/sprite/items/aureliaVestmentArt.ts) and, with
--preview <dir>, the pieces on his picture's grid at 8x (pieces@8.png); the same picture always gives
the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/aurelia-upper-from-ref.py [src/sprite/items/aureliaVestmentArt.ts] [--preview <dir>]
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
# His pixel (x, y) lies at (x + OFFSET[0], y + OFFSET[1]) of our frame (female, idle frame 0): where all
# of her lies (tools/refs/aurelia_rig.py).
OFFSET = AT['bodice']
# The sleeves hang from our shoulders, each laid whole where he drew it (SLEEVE_AT): the near one with
# his bare near shoulder over its band, the far one with its band at our far shoulder. Our arms hang
# where his do (the female standard), so none of his rows is left out (SLEEVE_DROP, the earlier layout's
# shortening): his cuffs end at our wrists, where our hands (his hands, the female body's) come out of his
# cuffs' openings.
SLEEVE_AT = {'near': AT['sleeveN'], 'far': AT['sleeveF']}
SLEEVE_DROP = {'near': (), 'far': ()}
# Cells linked by steps closer than this (RGB distance) are one colour of his: the JPEG moves a cell
# by up to 8; his three golds lie 20 and more apart.
NEAR = 9

# Each piece's cells of his, as rows: y -> (first x, last x), inclusive. Within them, his black line,
# his white ground and (but where SKIN_CELLS says) his skin are left out; his line is then taken back
# where it touches the piece (outline()).
BODICE_ROWS = {
    24: (51, 51), 25: (47, 54), 26: (48, 54), 27: (49, 55), 28: (49, 56), 29: (49, 57), 30: (49, 58),
    31: (49, 59), 32: (45, 60), 33: (45, 60), 34: (47, 60), 35: (46, 59), 36: (46, 59), 37: (47, 58),
    38: (47, 58), 39: (48, 58), 40: (49, 58), 41: (52, 57),
}
# The bodice's skin: the keyhole under the gem and the armpit by the near arm, in the body's skin.
SKIN_CELLS = {(55, 30), (56, 30), (56, 31), (45, 32), (46, 32), (45, 33), (46, 33)}
# His bare near shoulder over the near sleeve's band (his rows 26-32, up to the bodice's armpit), in the
# body's skin as the keyhole: it rides the upper arm with the sleeve.
SHOULDER_ROWS = {26: (41, 46), 27: (41, 46), 28: (41, 46), 29: (41, 46), 30: (41, 46), 31: (41, 45), 32: (41, 44)}
SHOULDER_CELLS = {(x, y) for y, (x0, x1) in SHOULDER_ROWS.items() for x in range(x0, x1 + 1)}
NEAR_ROWS = SHOULDER_ROWS | {y: (28, 43) for y in range(33, 42)} | {y: (28, 40) for y in range(42, 53)}
for _y in (31, 32):
    NEAR_ROWS[_y] = (28, SHOULDER_ROWS[_y][1])
# The far sleeve shows past her bust from his row 35 down to its cuff (row 50; row 51 under it at the
# outer side); her belt and its hanging end cross it at rows 44-48 (x <= 62).
FAR_ROWS = {y: (60, 68) for y in range(35, 44)} | {44: (62, 68), 45: (62, 68)} | {y: (63, 68) for y in range(46, 50)} | {50: (60, 68), 51: (63, 63)}
# Hidden cells, filled by continuing his pixels: (x, y) -> the cell of his it copies.
K = 'line'
FILL = {}
# the collar's top under her near side lock: his line over it (as at x 51-56) and his gold (x 51)
for x in (48, 49, 50):
    FILL[(x, 23)] = K
    FILL[(x, 24)] = (51, 24)
# the far sleeve's gold band behind her bust, after his near band (rows 33-35, x 38-43): his line
# round it, his golds, the dark inside of the sleeve under it
FAR_BAND = [
    (31, [K, K, K, K, K]),
    (32, [K, (39, 34), (40, 34), (41, 34), K]),
    (33, [K, (39, 33), (40, 33), (43, 34), K]),
    (34, [K, (38, 35), (39, 35), (40, 35), K]),
    (35, [K, K, K, K]),
]
for y, cells in FAR_BAND:
    for i, c in enumerate(cells):
        FILL[(56 + i, y)] = c
# the far sleeve's cloth behind her bust and her belt, his far sleeve's own cells run on: its line on
# the inner side, then his cream and grey (rows 36-49), meeting what shows of it
for y in range(36, 50):
    FILL[(56, y)] = K
    for x in range(57, 60):
        FILL[(x, y)] = (40, 38) if x < 59 else (60, 38)
for y in (44, 45):
    FILL[(60, y)] = (60, 42)
    FILL[(61, y)] = (61, 42)
for y in (46, 47, 48):
    FILL[(60, y)] = (60, 42)
    FILL[(61, y)] = (62, 44)
    FILL[(62, y)] = (62, 45)
FILL[(60, 49)] = (60, 42)
FILL[(61, 49)] = (62, 44)
FILL[(62, 49)] = (62, 45)
FAR_FILL = {p for p in FILL if p[0] >= 56 and p[1] >= 31}
BODICE_FILL = {p for p in FILL if p[1] <= 24}

# The waist under the sash: his row 40 (x 48-59, its line at both ends) run down to the hips, widening
# a pixel a side every three rows as his belt does, closed by his line.
WAIST_TOP, WAIST_BOTTOM = 42, 54
# The body's skin shade each of his skin colours is drawn in: the nearest of his base, shadow and
# dark skin (the face's own colours, f5c7a6, e2977f and c27769).
SKIN_SHADES = {3: (245, 199, 166), 2: (226, 151, 127), 1: (194, 119, 104)}
# How far each sleeve piece reaches on under the one drawn over it at the elbow (fine pixels).
UNDER = 3


def sleeve_at(piece, x, y):
    """Where his sleeve cell (x, y) lies on our frame: SLEEVE_AT, less his rows left out above it."""
    dy = sum(1 for r in SLEEVE_DROP[piece] if y > r)
    return (x + SLEEVE_AT[piece][0], y + SLEEVE_AT[piece][1] - dy)


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


def mask(N, rows):
    """The cells of a piece's rows that are his cloth, gold or gem (not line, ground or skin)."""
    out = set()
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1):
            c = N[y, x]
            if is_line(c) or is_ground(c):
                continue
            if is_skin(c) and (x, y) not in SKIN_CELLS | SHOULDER_CELLS:
                continue
            out.add((x, y))
    return out


def outline(N, cells, rows=None):
    """His line cells touching the piece (8 ways), within its rows' reach."""
    out = set()
    for (x, y) in cells:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q not in cells and is_line(N[q[1], q[0]]):
                    out.add(q)
    return out


def classify(rgb):
    """Which colour slot a colour of his follows: 'line', 'skin', 'gem', 'gold' or 'cloth'."""
    r, g, b = (int(v) for v in rgb)
    if max(r, g, b) < 48:
        return 'line'
    if b > r + 15:
        return 'gem'
    if r - b > 55:
        return 'gold'
    return 'cloth'


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    path = args[0] if args else 'src/sprite/items/aureliaVestmentArt.ts'
    N = native()

    # ---- the pieces' cells of his (and his line round them), then the filled cells
    bodice = mask(N, BODICE_ROWS)
    bodice |= outline(N, bodice)
    near = mask(N, NEAR_ROWS)
    near |= outline(N, near)
    far = mask(N, FAR_ROWS)
    far |= outline(N, far)
    # the cells a piece fills: its own copy of one of his cells, or his line (None)
    fills = {'bodice': {}, 'near': {}, 'far': {}}
    for p in BODICE_FILL:
        fills['bodice'][p] = None if FILL[p] == K else FILL[p]
        bodice.add(p)
    for p in FAR_FILL:
        fills['far'][p] = None if FILL[p] == K else FILL[p]
        far.add(p)

    def look(p, piece):
        """The cell of his a piece's pixel shows: his own, or the one a fill copies (None: his line)."""
        return fills[piece][p] if p in fills[piece] else p

    # ---- his colours: cells linked by steps closer than NEAR are one colour, their mean
    used = set()
    pieces = {'bodice': bodice, 'near': near, 'far': far}
    for piece, cs in pieces.items():
        for p in cs:
            q = look(p, piece)
            if q is not None and not is_line(N[q[1], q[0]]):
                used.add(q)
    line_cells = [p for cs in pieces.values() for p in cs if is_line(N[p[1], p[0]])]
    cells = sorted(used)
    group = {p: k for k, p in enumerate(cells)}
    for p in cells:
        for q in cells:
            if group[p] != group[q] and np.linalg.norm(N[p[1], p[0]] - N[q[1], q[0]]) < NEAR:
                old = group[q]
                for r in cells:
                    if group[r] == old:
                        group[r] = group[p]
    groups = {}
    for p in cells:
        groups.setdefault(group[p], []).append(p)
    mean = {k: tuple(int(v) for v in np.round(np.mean([N[p[1], p[0]] for p in g], axis=0))) for k, g in groups.items()}
    line_rgb = tuple(int(v) for v in np.round(np.mean([N[p[1], p[0]] for p in line_cells], axis=0)))

    # letters: by kind, then from light to dark within it
    kind = {}
    for k, g in groups.items():
        kind[k] = 'skin' if all(p in SKIN_CELLS | SHOULDER_CELLS for p in g) else classify(mean[k])
    pools = {'cloth': 'abcdefhijlmnopqrstuvwxyz', 'gold': 'ABCDEFHJKLMNOPQRVWXY', 'gem': 'GIZ', 'skin': 'STU0123'}
    letter = {}
    for kd, pool in pools.items():
        ks = sorted((k for k in groups if kind[k] == kd), key=lambda k: (-sum(mean[k]), mean[k]))
        if len(ks) > len(pool):
            raise SystemExit(f'too many {kd} colours: {len(ks)}')
        for i, k in enumerate(ks):
            letter[k] = pool[i]
    hexes = {letter[k]: '#%02x%02x%02x' % mean[k] for k in groups}
    hexes['k'] = '#%02x%02x%02x' % line_rgb

    def ch(p, piece):
        q = look(p, piece)
        if q is None or is_line(N[q[1], q[0]]):
            return 'k'
        return letter[group[q]]

    def to_ours(piece):
        return {(x + OFFSET[0], y + OFFSET[1]): ch((x, y), piece) for (x, y) in pieces[piece]}

    def sleeve_ours(piece):
        return {sleeve_at(piece, x, y): ch((x, y), piece) for (x, y) in pieces[piece] if y not in SLEEVE_DROP[piece]}

    B = to_ours('bodice')
    NS = sleeve_ours('near')
    FS = sleeve_ours('far')

    # the waist: his row 40 run down under the sash to the hips
    row40 = [ch((x, 40), 'bodice') for x in range(48, 60)]
    W = {}
    for i, y in enumerate(range(WAIST_TOP, WAIST_BOTTOM + 1)):
        grow = i // 3
        x0, x1 = 48 - grow, 59 + grow
        for x in range(x0, x1 + 1):
            if y == WAIST_BOTTOM or x in (x0, x1):
                c = 'k'
            else:
                t = (x - x0) / (x1 - x0)
                c = row40[min(len(row40) - 2, max(1, int(round(1 + t * (len(row40) - 3)))))]
            W[(x + OFFSET[0], y + OFFSET[1])] = c

    # ---- check: every colour is his (a group's mean), every letter has one
    for cs in (B, NS, FS, W):
        for c in cs.values():
            if c not in hexes:
                raise SystemExit(f'no colour for {c!r}')

    cloth_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'cloth'))
    gold_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'gold'))
    gem_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'gem'))
    skin_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'skin'))
    # the slots' defaults: his commonest cloth, gold and gem colours
    def commonest(kd):
        ks = [k for k in groups if kind[k] == kd]
        k = max(ks, key=lambda k: (len(groups[k]), sum(mean[k])))
        return '#%02x%02x%02x' % mean[k]

    def skin_shade(c):
        rgb = [int(hexes[c][i:i + 2], 16) for i in (1, 3, 5)]
        return min(SKIN_SHADES, key=lambda k: sum((a - b) ** 2 for a, b in zip(rgb, SKIN_SHADES[k])))

    base = {'cloth': commonest('cloth'), 'gold': commonest('gold'), 'gem': commonest('gem')}

    order = 'k' + ''.join(pools['cloth'] + pools['gold'] + pools['gem'] + pools['skin'])

    def seg_angle(a, b):
        return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

    def along(p, a, b):
        d = (b[0] - a[0], b[1] - a[1])
        return ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2)

    def split_arm(cs, side):
        """A sleeve cut at the elbow, across the upper arm: (upper, fore). The forearm's piece reaches on
        UNDER pixels above the cut under the upper arm's, a pixel inside its line, its edge in his line."""
        sh, el = J['shoulder' + side], J['elbow' + side]
        d = (el[0] - sh[0], el[1] - sh[1])
        n = math.hypot(*d)
        u = (d[0] / n, d[1] / n)
        nb = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
        inner = {p for p, c in cs.items() if c != 'k' and all((p[0] + dx, p[1] + dy) in cs for dx, dy in nb)}
        upper, fore = {}, {}
        for (x, y), c in cs.items():
            s = (x + 0.5 - el[0]) * u[0] + (y + 0.5 - el[1]) * u[1]
            if s < 0:
                upper[(x, y)] = c
            if s >= 0:
                fore[(x, y)] = c
            elif s >= -UNDER and (x, y) in inner:
                edge = s < 1 - UNDER or any((x + dx, y + dy) not in inner for dx, dy in nb)
                fore[(x, y)] = 'k' if edge else c
        return upper, fore

    def piece_ts(name, doc, cs, joint, angle):
        xs = [x for x, _ in cs]
        ys = [y for _, y in cs]
        x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
        rows = [''.join(cs.get((x, y), '.') for x in range(x0, x1)) for y in range(y0, y1)]
        chars = sorted(set(cs.values()), key=order.index)
        px, py = int(math.floor(joint[0])) - x0, int(math.floor(joint[1])) - y0
        out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{', f'  pivot: [{px}, {py}],', f'  angle: {angle:.2f},', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {c}: '{hexes[c]}'," for c in chars]
        out += ['  },', '};', '']
        return '\n'.join(out)

    neck = J['neck']
    torso = seg_angle(J['pelvis'], neck)
    parts = [
        "// Aurelia's dress bodice and detached sleeves (armor_dawn_vestment): the owner's pixels from his",
        '// picture of her at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg), one for one,',
        '// by tools/refs/aurelia-upper-from-ref.py: one piece per segment of the rig, pivot on its joint, angle',
        "// the segment's on our female at idle frame 0. Generated: rerun the script to change it.",
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        "/** His white: the Cloth slot's default (his creams and greys follow it). */",
        f"export const AURELIA_CLOTH = '{base['cloth']}';",
        "/** His gold: the Gold slot's default (his golds and the gem's dark cord follow it). */",
        f"export const AURELIA_GOLD = '{base['gold']}';",
        "/** His gem's blue: the Gem slot's default. */",
        f"export const AURELIA_GEM = '{base['gem']}';",
        f"export const AURELIA_CLOTH_CHARS = '{cloth_chars}';",
        f"export const AURELIA_GOLD_CHARS = '{gold_chars}';",
        f"export const AURELIA_GEM_CHARS = '{gem_chars}';",
        '/** His skin (the keyhole, the armpit): drawn in the body\'s skin, at these shades of it. */',
        'export const AURELIA_SKIN_SHADES: Record<string, number> = { ' + ', '.join(f'{c}: {skin_shade(c)}' for c in skin_chars) + ' };',
        '/** His black line. */',
        f"export const AURELIA_LINE = '{hexes['k']}';",
        '',
    ]
    # what of our torso the bodice and waist stand for, along the torso below the neck: from under her
    # near armhole (his row 36) on the near side, from the neck on the far side (his far shoulder is
    # hidden behind her far hair lock and her bodice's edge, and our bust stands out past hers), to the
    # waist's lower edge
    def below(y):
        return y + OFFSET[1] - neck[1]

    parts += [
        '/**',
        ' * Where the bodice and its waist stand for our torso, in fine pixels below the neck along the torso:',
        ' * [near side from, far side from, to]: from under his near armhole (the shoulder above stays bare),',
        ' * from the neck on the far side (his far shoulder does not show), to the waist\'s lower edge.',
        ' */',
        f'export const AURELIA_TORSO_SPAN: [number, number, number] = [{below(36):.2f}, 0.00, {below(WAIST_BOTTOM + 1):.2f}];',
        '',
    ]
    parts.append(piece_ts('AURELIA_BODICE', "The collar, the gem and the bodice to the sash's line (pivot: the base of the neck).", B, neck, torso))
    parts.append(piece_ts('AURELIA_WAIST', 'The bodice on under the sash to the hips (pivot: the base of the neck).', W, neck, torso))
    spans = {}
    for side, cs, what, band_row in (('N', NS, 'near', 26), ('F', FS, 'far', None)):
        upper, fore = split_arm(cs, side)
        sh, el, wr = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        parts.append(piece_ts(f'AURELIA_SLEEVE_UPPER_{side}', f'The {what} sleeve to the elbow: its gold band (pivot: the shoulder).', upper, sh, seg_angle(sh, el)))
        parts.append(piece_ts(f'AURELIA_SLEEVE_FORE_{side}', f'The {what} sleeve from the elbow to its gold cuff (pivot: the elbow).', fore, el, seg_angle(el, wr)))
        # what of our arm the sleeve stands for: on the upper arm below his bare shoulder's top (his row
        # 26) on the near side, all of it on the far side (his far shoulder is hidden behind her hair and
        # bodice), down to its cuff's lower edge on the forearm
        if band_row is None:
            t_band = -1.0
        else:
            yb = sleeve_at(what, 0, band_row)[1]
            row = [x + 0.5 for (x, y) in cs if y == yb]
            t_band = along((sum(row) / len(row), yb), sh, el)
        bot = max(y for _, y in cs)
        row = [x + 0.5 for (x, y) in cs if y == bot]
        t_cuff = along((sum(row) / len(row), bot + 1), el, wr)
        spans[side] = (t_band, t_cuff)
        parts.append(f"/** The {what} sleeve along its arm: under its band on the upper arm (0 shoulder, 1 elbow) and its")
        parts.append(' * lower edge on the forearm (0 elbow, 1 wrist). */')
        parts.append(f'export const AURELIA_SLEEVE_SPAN_{side}: [number, number] = [{t_band:.3f}, {t_cuff:.3f}];')
        parts.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    os.replace(tmp, path)
    print('wrote', path, '| colours:', len(hexes), '| cloth', cloth_chars, 'gold', gold_chars, 'gem', gem_chars, 'skin', skin_chars)

    if preview:
        os.makedirs(preview, exist_ok=True)
        k = 8
        x0, y0, x1, y1 = 20, 18, 72, 60
        img = np.full(((y1 - y0) * k, (x1 - x0) * 2 * k + 16, 3), 255, np.uint8)
        for y in range(y0, y1):
            for x in range(x0, x1):
                img[(y - y0) * k:(y - y0 + 1) * k, (x - x0) * k:(x - x0 + 1) * k] = N[y, x]
        for cs in (W, FS, B, NS):
            for (X, Y), c in cs.items():
                x, y = X - OFFSET[0], Y - OFFSET[1]
                if x0 <= x < x1 and y0 <= y < y1:
                    h = hexes[c]
                    X0 = (x - x0) * k + (x1 - x0) * k + 16
                    img[(y - y0) * k:(y - y0 + 1) * k, X0:X0 + k] = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
        Image.fromarray(img).save(os.path.join(preview, 'pieces@8.png'))


if __name__ == '__main__':
    main()
