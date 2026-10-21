"""Aurelia's staff from the owner's picture of her at our game's scale
(docs/reference/aurelia-escala-juego-owner-reference.jpg): the creator's 'held_dawn_staff'
(src/sprite/items/aureliaStaff.ts), his pixels one for one.

He drew Aurelia again at our scale ("aqui tienes tus referencias perfectas del modelo de mujer"):
1932 x 1932 picture pixels, 19.32 for each of his pixels (100 x 100 of them, the grid starting at the
picture's corner), and one of his pixels is one of ours. So nothing is reduced or redrawn: each of his
pixels is the middle of its cell (its median), and cells he drew in one colour are one colour (cells
linked by steps closer than NEAR take their mean).

His staff hangs from her far fist down to the right: a short shaft (a dark grey and a tan pixel in his
black line), a gold cross-piece with curled arms, a steel collar, a gold wing over a pearl orb in a
dark setting and a gold wing under it, and the orb's light: a few pale gold sparkles round it (the big
picture's rays of light; at our scale he drew them as sparkles). Its cells are everything of his in
STAFF_BOX that is not his white ground (SKIRT_X keeps her skirt out), the orb's white middle (ORB_WHITE,
lighter than the ground test lets through) and his sparkles (SPARKS, kept apart so they can twinkle).

What his picture hides, filled by continuing his pixels: the shaft inside her fist, his one grey pixel
in his line run on up through the fist to a capped end (SHAFT_FILL). The pivot is in the fist.

At rest the staff lies where he drew it with the rest of her (tools/refs/aurelia_rig.py AT), from our far
fist's joint (DAWN_STAFF_REST), and his far fist round it (DAWN_FAR_FIST: his skin cells in FIST_BOX and
his line round them, drawn in the body's skin) stands for our far fist, so the fist, the shaft and her
cuff are his picture.

Colour kinds (the item's colour slots): his golds ('gold'), the orb's pale colours and the sparkles
('orb'); the shaft, the collar and the orb's dark setting keep his colours ('steel'); his black line
is never tinted.

Writes <ts> (src/sprite/items/aureliaStaffArt.ts) and, with --preview <dir>, his crop beside the
template at 12x (staff@12.png); the same picture always gives the same bytes. Run from the
repository root with python3 -I:

  python3 -I tools/refs/aurelia-staff-from-ref.py [src/sprite/items/aureliaStaffArt.ts] [--preview <dir>]
"""

import json
import math
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aurelia_rig import AT, JOINTS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PICTURE = os.path.join(ROOT, 'docs', 'reference', 'aurelia-escala-juego-owner-reference.jpg')
# One of his pixels in picture pixels; his grid starts at the picture's corner.
PITCH = 19.32
# Cells linked by steps closer than this (RGB distance) are one colour of his (the JPEG's noise).
NEAR = 9

# Where his staff is (his pixels, inclusive): from under her far fist to the lower wing's tip.
STAFF_BOX = (66, 56, 90, 76)
# Her skirt's edge runs down beside the staff's head: left of this x (from row 60 down) is hers.
SKIRT_X = 70
# The orb's white middle, inside its dark setting: as light as his white ground.
ORB_WHITE = {(83, 66), (84, 66), (82, 67), (83, 67), (84, 67), (83, 68)}
# His sparkles round the orb (the light it gives), apart from the staff.
SPARKS = [(90, 64), (90, 65), (90, 72), (74, 74), (74, 75), (75, 75), (83, 74), (86, 77), (79, 79), (83, 82)]
# Her fist hides the shaft: his grey pixel (67, 56) between his line run on up-left through the fist
# (the diagonal x - y = 11), his line on either side of it (x - y = 10 and 12) and over its end; his
# line under the shaft at (66, 56) is taken from her fist's.
SHAFT_GREY = (67, 56)
SHAFT_FILL = {(66, 55): SHAFT_GREY, (65, 54): SHAFT_GREY, (64, 53): SHAFT_GREY}
for _p in [(67, 55), (66, 54), (65, 53), (64, 52), (66, 56), (65, 55), (64, 54), (63, 53), (63, 52)]:
    SHAFT_FILL[_p] = 'line'
# The shaft's last pixel before the gold cross-piece (his (72, 59) is gold).
SHAFT_END = (71, 59)
# The grip: the middle of her fist, on the hidden shaft (our hand holds it here).
PIVOT = (65, 54)
# The orb's middle: the staff points from the grip to it.
ORB_MID = (83.5, 67.5)


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


# Her far fist round the shaft at rest (his box, inclusive): his skin cells in it and his line round them.
FIST_BOX = (63, 51, 69, 56)


def skin_tone(c):
    """One of his skin cells as a hand letter (the female hands' legend, src/sprite/femaleBodyArt.ts): D his
    deep shadow, s his shadow, b his base; None when it is not skin."""
    r, g, b = (int(v) for v in c)
    if not (r > 180 and 90 < b < 190 and r - g > 30):
        return None
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    return 'D' if lum < 150 else 's' if lum < 195 else 'b'


def far_fist(N):
    """Her far fist as he drew it round the staff: {(x, y): letter} of his cells ('o' his line)."""
    x0, y0, x1, y1 = FIST_BOX
    out = {}
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            t = skin_tone(N[y, x])
            if t:
                out[(x, y)] = t
    for (x, y) in list(out):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q not in out and is_line(N[q[1], q[0]]):
                    out[q] = 'o'
    return out


def kind_of(p, c):
    """Which colour slot a cell of his follows: 'line', 'orb', 'gold' or 'steel'."""
    r, g, b = (int(v) for v in c)
    if is_line(c):
        return 'line'
    if p in ORB_WHITE or p in SPARKS or (81 <= p[0] <= 85 and 65 <= p[1] <= 69 and min(r, g, b) > 120):
        return 'orb'
    # the shaft's tan pixels are his shaft's, not gold
    if r - b > 55 and not (p[0] <= SHAFT_END[0] and p[1] <= SHAFT_END[1]):
        return 'gold'
    return 'steel'


def staff_cells(N):
    """His staff's cells (x, y): not his ground, not her skirt, the orb's white; and the sparkles."""
    x0, y0, x1, y1 = STAFF_BOX
    cells = set()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) in SPARKS or (y >= 60 and x < SKIRT_X):
                continue
            if (x, y) in ORB_WHITE or not is_ground(N[y, x]):
                cells.add((x, y))
    # her fist's line and skin round the shaft's top are hers, not the staff's
    cells = {p for p in cells if p[0] >= 67}
    return cells


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    path = args[0] if args else 'src/sprite/items/aureliaStaffArt.ts'
    N = native()

    staff = staff_cells(N)
    for p in staff | set(SPARKS):
        if is_ground(N[p[1], p[0]]) and p not in ORB_WHITE:
            raise SystemExit(f'{p} is his white ground')
    # the cell of his each pixel shows: his own, or the one a fill copies (None: his line)
    look = {p: p for p in staff | set(SPARKS)}
    for p, q in SHAFT_FILL.items():
        look[p] = None if q == 'line' else q

    # ---- his colours: cells linked by steps closer than NEAR are one colour, their mean
    used = sorted({q for q in look.values() if q is not None and not is_line(N[q[1], q[0]])})
    group = {p: k for k, p in enumerate(used)}
    for p in used:
        for q in used:
            if group[p] != group[q] and kind_of(p, N[p[1], p[0]]) == kind_of(q, N[q[1], q[0]]) and np.linalg.norm(N[p[1], p[0]] - N[q[1], q[0]]) < NEAR:
                old = group[q]
                for r in used:
                    if group[r] == old:
                        group[r] = group[p]
    groups = {}
    for p in used:
        groups.setdefault(group[p], []).append(p)
    mean = {k: tuple(int(v) for v in np.round(np.mean([N[p[1], p[0]] for p in g], axis=0))) for k, g in groups.items()}
    kind = {k: kind_of(g[0], N[g[0][1], g[0][0]]) for k, g in groups.items()}
    line_cells = [q for q in look.values() if q is not None and is_line(N[q[1], q[0]])]
    line_rgb = tuple(int(v) for v in np.round(np.mean([N[q[1], q[0]] for q in line_cells], axis=0)))

    # letters: by kind, then from light to dark within it
    pools = {'gold': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'orb': 'abcdefghijklmnopqrs', 'steel': 'tuvwxyz0123456789'}
    letter = {}
    for kd, pool in pools.items():
        ks = sorted((k for k in groups if kind[k] == kd), key=lambda k: (-sum(mean[k]), mean[k]))
        if len(ks) > len(pool):
            raise SystemExit(f'too many {kd} colours: {len(ks)}')
        for i, k in enumerate(ks):
            letter[k] = pool[i]
    hexes = {'o': '#%02x%02x%02x' % line_rgb}
    for k in sorted(groups, key=lambda k: letter[k]):
        hexes[letter[k]] = '#%02x%02x%02x' % mean[k]

    def ch(p):
        q = look[p]
        if q is None or is_line(N[q[1], q[0]]):
            return 'o'
        return letter[group[q]]

    # ---- the template: his cells in a box, the sparkles apart
    every = set(look)
    bx0 = min(x for x, _ in every)
    by0 = min(y for _, y in every)
    bx1 = max(x for x, _ in every)
    by1 = max(y for _, y in every)
    rows = []
    for y in range(by0, by1 + 1):
        rows.append(''.join(ch((x, y)) if (x, y) in look and (x, y) not in SPARKS else '.' for x in range(bx0, bx1 + 1)))
    sparks = [(x - bx0, y - by0, ch((x, y))) for (x, y) in SPARKS]
    pivot = (PIVOT[0] - bx0, PIVOT[1] - by0)
    if rows[pivot[1]][pivot[0]] == '.':
        raise SystemExit('the pivot is not on the staff')
    angle = math.degrees(math.atan2(ORB_MID[1] - (PIVOT[1] + 0.5), ORB_MID[0] - (PIVOT[0] + 0.5)))

    def commonest(kd):
        ks = [k for k in groups if kind[k] == kd]
        k = max(ks, key=lambda k: (sum(1 for p, q in look.items() if q is not None and q in groups[k]), sum(mean[k])))
        return '#%02x%02x%02x' % mean[k]

    gold_base, orb_base = commonest('gold'), commonest('orb')
    gold_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'gold'))
    orb_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'orb'))
    # At rest the grip lies where he drew it, with the rest of her (aurelia_rig.AT): fine pixels from our far
    # fist's joint (its pixel) at idle frame 0.
    hx, hy = JOINTS['handF']
    rest = (PIVOT[0] + AT['staff'][0] - math.floor(hx), PIVOT[1] + AT['staff'][1] - math.floor(hy))
    # her far fist round it at rest, his pixels, its top-left from the same fist joint
    fist = far_fist(N)
    fx0, fy0 = min(x for x, _ in fist), min(y for _, y in fist)
    fx1, fy1 = max(x for x, _ in fist), max(y for _, y in fist)
    fist_rows = [''.join(fist.get((x, y), '.') for x in range(fx0, fx1 + 1)) for y in range(fy0, fy1 + 1)]
    fist_at = (fx0 + AT['staff'][0] - math.floor(hx), fy0 + AT['staff'][1] - math.floor(hy))
    write_ts(path, rows, pivot, angle, hexes, gold_chars, orb_chars, sparks, gold_base, orb_base, rest, fist_rows, fist_at)
    print(len(rows), 'rows x', len(rows[0]), 'origin', (bx0, by0), 'pivot', pivot, 'angle %.2f' % angle,
          'colours', len(hexes), 'sparks', len(sparks), 'bases', gold_base, orb_base)

    if preview:
        os.makedirs(preview, exist_ok=True)
        k = 12
        H, W = by1 - by0 + 1, bx1 - bx0 + 1
        his = np.full((H, W, 3), 255, np.uint8)
        ours = np.full((H, W, 3), 255, np.uint8)
        for y in range(H):
            for x in range(W):
                his[y, x] = N[by0 + y, bx0 + x]
                c = rows[y][x]
                if c != '.':
                    ours[y, x] = [int(hexes[c][i:i + 2], 16) for i in (1, 3, 5)]
        for x, y, c in sparks:
            ours[y, x] = [int(hexes[c][i:i + 2], 16) for i in (1, 3, 5)]
        gap = 16
        sheet = Image.new('RGB', (2 * W * k + gap, H * k + 28), 'white')
        sheet.paste(Image.fromarray(his).resize((W * k, H * k), Image.NEAREST), (0, 28))
        sheet.paste(Image.fromarray(ours).resize((W * k, H * k), Image.NEAREST), (W * k + gap, 28))
        d = ImageDraw.Draw(sheet)
        font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        font = ImageFont.truetype(font, 13) if os.path.exists(font) else None
        d.text((4, 8), 'Tu dibujo (escala del juego)', fill=(0, 0, 0), font=font)
        d.text((W * k + gap + 4, 8), 'En el juego (la mano tapa el mango)', fill=(0, 0, 0), font=font)
        sheet.save(os.path.join(preview, 'staff@12.png'))


def write_ts(path, rows, pivot, angle, palette, gold, orb, sparks, gold_base, orb_base, rest, fist_rows, fist_at):
    """The staff as the game's module (src/sprite/items/aureliaStaffArt.ts)."""

    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else json.dumps(k).replace('"', "'")

    def lit(v):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

    out = [
        "// Aurelia's staff, the owner's pixels at our game's scale (tools/refs/aurelia-staff-from-ref.py from",
        '// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface DawnStaff extends PaintedPiece {',
        '  /** The characters of his golds: the cross-piece, the wings, the orb\'s rim. */',
        '  gold: string;',
        '  /** The characters of the pearl orb\'s pale colours and its sparkles. */',
        '  orb: string;',
        "  /** The sparkles round the orb: [x, y, character] in the template's cells (not in rows). */",
        '  sparks: [number, number, string][];',
        '}',
        '',
        '/** His commonest gold and orb colour: the colours the two colour slots turn his from. */',
        f"export const AURELIA_STAFF_GOLD = '{gold_base}';",
        f"export const AURELIA_STAFF_ORB = '{orb_base}';",
        "/** At rest, where the grip lies from the far fist's joint (fine pixels): where he drew it with the rest of her. */",
        f'export const DAWN_STAFF_REST: [number, number] = [{rest[0]}, {rest[1]}];',
        '/**',
        " * Her far fist round the staff at rest, his pixels (legend as the female hands: o his line, D, s, b his",
        " * skin's deep shadow, shadow and base, drawn in the body's skin), its top-left `at` fine pixels from the far",
        " * fist's joint. It stands for our far fist at rest (ours hangs a little lower and further out).",
        ' */',
        'export const DAWN_FAR_FIST: { rows: string[]; at: [number, number] } = {',
        '  rows: [',
    ] + [f'    {lit(r)},' for r in fist_rows] + [
        '  ],',
        f'  at: [{fist_at[0]}, {fist_at[1]}],',
        '};',
        '',
        '/**',
        ' * The staff as he drew it hanging from her far fist down to the right: drawn at his angle (the grip',
        " * to the orb's middle) and pivoting on the grip in the fist, so held there at rest every pixel is his.",
        ' * The shaft inside the fist is his grey pixel and line run on up to a capped end.',
        ' */',
        'export const DAWN_STAFF: DawnStaff = {',
        f'  pivot: [{pivot[0]}, {pivot[1]}],',
        f'  angle: {angle:.2f},',
        '  rows: [',
    ]
    out += [f'    {lit(r)},' for r in rows]
    out += ['  ],', '  colors: {']
    out += [f'    {key(k)}: {lit(v)},' for k, v in palette.items()]
    out += ['  },', f'  gold: {lit(gold)},', f'  orb: {lit(orb)},', '  sparks: [']
    out += [f'    [{x}, {y}, {lit(c)}],' for x, y, c in sparks]
    out += ['  ],', '};', '']
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
