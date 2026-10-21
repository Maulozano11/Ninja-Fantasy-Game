"""The princess's sceptre from the owner's picture of her (docs/reference/princess-owner-reference.jpg):
the creator's 'held_rose_sceptre' (src/sprite/items/princessSceptre.ts), his pixels one for one.

His picture is drawn at our game's scale (tools/refs/princess_ref.py: 20 picture pixels to one of his,
one of his = one fine pixel of ours), so nothing is reduced or redrawn: each of his pixels is the
median of its block (princess_ref.native()), and cells he drew in one colour are one colour (cells of a
kind linked by steps closer than NEAR take their mean: the JPEG's noise).

His sceptre is held up in her far hand, leaning right: a gold head like a small crown (a spike on top,
a gold cage with pale gold lights and brown shadows) round a mauve gem with a pink facet, a twisted gold
collar under it, and a thin gold shaft in his black line down through her fist to a black butt over
her skirt. Round its head float his sparkles: pale gold crosses and dots, and two pink ones (SPARKS,
kept apart so they can twinkle).

What his picture hides, filled by continuing his pixels: the shaft inside her fist (rows 43 to 47).
His shaft steps one pixel left every three rows (x 75 at rows 39-40, 74 at 41-42, 72 at 48-49, 71 at
50-52, 70 at 53-55), so the hidden rows are x 73 (43-45) and 72 (46-47), in his black line on both
sides; its gold repeats his shaft's twist below the fist (a light pixel every third row, his (71, 51)
and (70, 54)), each hidden pixel the colour of his pixel six rows (two twists) lower. The pivot is in
the fist, on the shaft.

Two templates of his pixels: ROSE_SCEPTRE as he drew it (at rest she holds it at his angle, every
pixel his) and ROSE_SCEPTRE_STRAIGHT for the poses that turn it. His shaft is a one-pixel staircase
(a step every three rows), and turned towards level a staircase breaks up into gold dashes; so the
straight one moves each row of the shaft under the head across (STRAIGHT_X) to an upright shaft and
closes the butt's line under it (one line pixel more). Its head and sparkles are as he drew them.

Colour kinds (the item's colour slots): his golds, the gold's lights and its brown shadows ('gold');
the gem's mauves and pinks ('gem'); his sparkles by their colour (pale gold ones 'gold', pink ones
'gem'); his black line is never tinted.

Writes <ts> (src/sprite/items/princessSceptreArt.ts) and, with --preview <dir>, his crop beside the
template at 12x (sceptre@12.png, Spanish labels); the same picture always gives the same bytes. Run
from the repository root with python3 -I:

  python3 -I tools/refs/princess-sceptre-from-ref.py [src/sprite/items/princessSceptreArt.ts] [--preview <dir>]
"""

import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

# Cells of a kind linked by steps closer than this (RGB distance) are one colour of his: at 7 no cell is
# more than 6 from its colour on any channel (8 already merges distinct lights, 11 apart).
NEAR = 7

# His sceptre above her fist (his pixels, inclusive): the head and the shaft down to the fist's top.
# Left of HEAD_X is her hand's outline and her sleeve.
HEAD_BOX = (73, 21, 85, 42)
# Below the fist: the shaft's middle column per row, and the butt's last two line pixels.
SHAFT_BELOW = {48: 72, 49: 72, 50: 71, 51: 71, 52: 71, 53: 70, 54: 70, 55: 70}
BUTT = [(69, 56), (70, 56)]
# Hidden in her fist: the shaft's middle column per row, and the cell of his each one copies.
SHAFT_HIDDEN = {43: 73, 44: 73, 45: 73, 46: 72, 47: 72}
HIDDEN_FROM = {y: (SHAFT_BELOW[y + 6], y + 6) for y in SHAFT_HIDDEN}
# Her fist's dark finger line over the shaft at (73, 48): the shaft's right line there.
FIST_LINE = {(73, 48)}
# The grip: the middle of her fist (her hand joint, (73, 46.5)), on the hidden shaft.
PIVOT = (72, 46)
# The shaft's axis, butt to the top of the shaft under the head's collar: the angle he drew it at.
SHAFT_BOTTOM = (70.5, 55.5)
SHAFT_TOP = (76.5, 36.5)
# The straight template (ROSE_SCEPTRE_STRAIGHT): below this row each row of the shaft is moved across
# so its left line is at STRAIGHT_X, where his shaft's line is just under the head (rows 36-38).
STRAIGHT_FROM = 38
STRAIGHT_X = 75


def is_line(c):
    return max(c) < 48


def is_ground(c):
    return min(c) > 236 and max(c) - min(c) <= 12


def kind_of(c):
    """Which colour slot a cell of his follows: 'line', 'gold' (golds, browns, pale gold lights) or
    'gem' (mauves and pinks: blue over green)."""
    r, g, b = (int(v) for v in c)
    if is_line(c):
        return 'line'
    return 'gem' if b > g else 'gold'


def sparks():
    """His sparkles round the head: princess_ref's loose bits of her figure, (x, y) sorted."""
    ys, xs = np.nonzero(P.sparkles())
    return sorted((int(x), int(y)) for y, x in zip(ys, xs))


def sceptre_cells(N):
    """His sceptre's cells (x, y) -> the cell of his it shows (None: his black line)."""
    look = {}
    x0, y0, x1, y1 = HEAD_BOX
    spk = set(sparks())
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) not in spk and not is_ground(N[y, x]):
                look[(x, y)] = (x, y)
    for y, x in SHAFT_BELOW.items():
        for dx in (-1, 0, 1):
            look[(x + dx, y)] = (x + dx, y)
    for p in BUTT:
        look[p] = p
    for y, x in SHAFT_HIDDEN.items():
        look[(x - 1, y)] = None
        look[(x, y)] = HIDDEN_FROM[y]
        look[(x + 1, y)] = None
    for p in FIST_LINE:
        look[p] = None
    for p, q in look.items():
        if q is not None and is_ground(N[q[1], q[0]]):
            raise SystemExit(f'{p} shows his white ground')
    for y, x in SHAFT_BELOW.items():
        if not is_line(N[y, x - 1]) or kind_of(N[y, x]) != 'gold':
            raise SystemExit(f'the shaft is not at {x} in row {y}')
    return look


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    path = args[0] if args else 'src/sprite/items/princessSceptreArt.ts'
    N = P.native()

    look = sceptre_cells(N)
    spk = sparks()
    for p in spk:
        look[p] = p

    # ---- his colours: cells of a kind linked by steps closer than NEAR are one colour, their mean
    used = sorted({q for q in look.values() if q is not None and not is_line(N[q[1], q[0]])})
    group = {p: k for k, p in enumerate(used)}
    spk_set = set(spk)
    # the sparkles' colours are kept apart from the sceptre's (they twinkle on their own)
    sort_of = {p: (kind_of(N[p[1], p[0]]), p in spk_set) for p in used}
    for p in used:
        for q in used:
            if group[p] != group[q] and sort_of[p] == sort_of[q] and np.linalg.norm(N[p[1], p[0]] - N[q[1], q[0]]) < NEAR:
                old = group[q]
                for r in used:
                    if group[r] == old:
                        group[r] = group[p]
    groups = {}
    for p in used:
        groups.setdefault(group[p], []).append(p)
    mean = {k: tuple(int(v) for v in np.round(np.mean([N[p[1], p[0]] for p in g], axis=0))) for k, g in groups.items()}
    drift = max(int(np.abs(N[p[1], p[0]] - np.array(mean[group[p]])).max()) for p in used)
    kind = {k: kind_of(N[g[0][1], g[0][0]]) for k, g in groups.items()}
    line_cells = sorted({q for q in look.values() if q is not None and is_line(N[q[1], q[0]])})
    line_rgb = tuple(int(v) for v in np.round(np.mean([N[q[1], q[0]] for q in line_cells], axis=0)))

    # letters: by kind, then from light to dark within it
    pools = {'gold': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-', 'gem': 'abcdefghijklmnpqrstuvwxyz:;<=>?@^_~'}
    letter = {}
    for kd, pool in pools.items():
        ks = sorted((k for k in groups if kind[k] == kd), key=lambda k: (-sum(mean[k]), mean[k]))
        if len(ks) > len(pool):
            raise SystemExit(f'too many {kd} colours: {len(ks)}')
        for i, k in enumerate(ks):
            letter[k] = pool[i]
    hexes = {'o': P.rgb_hex(line_rgb)}
    for k in sorted(groups, key=lambda k: letter[k]):
        hexes[letter[k]] = P.rgb_hex(mean[k])

    def ch(p):
        q = look[p]
        if q is None or is_line(N[q[1], q[0]]):
            return 'o'
        return letter[group[q]]

    def template(at):
        """`at`: each template cell (x, y) -> the cell of `look` it shows (None: his line). His cells in
        a box, the sparkles apart: (rows, sparks, pivot, origin)."""
        every = set(at)
        bx0 = min(x for x, _ in every)
        by0 = min(y for _, y in every)
        bx1 = max(x for x, _ in every)
        by1 = max(y for _, y in every)

        def ch_at(p):
            return 'o' if at[p] is None else ch(at[p])

        rows = []
        for y in range(by0, by1 + 1):
            rows.append(''.join(ch_at((x, y)) if (x, y) in at and at[(x, y)] not in spk_set else '.' for x in range(bx0, bx1 + 1)))
        sparks_t = [(x - bx0, y - by0, ch_at((x, y))) for (x, y) in sorted(at) if at[(x, y)] in spk_set]
        pv = next(p for p, q in at.items() if q == PIVOT)
        pivot = (pv[0] - bx0, pv[1] - by0)
        if rows[pivot[1]][pivot[0]] == '.':
            raise SystemExit('the pivot is not on the sceptre')
        return rows, sparks_t, pivot, (bx0, by0)

    # ---- as he drew it
    rows, sparks_t, pivot, (bx0, by0) = template({p: p for p in look})
    by1, bx1 = by0 + len(rows) - 1, bx0 + len(rows[0]) - 1
    angle = math.degrees(math.atan2(SHAFT_TOP[1] - SHAFT_BOTTOM[1], SHAFT_TOP[0] - SHAFT_BOTTOM[0]))

    # ---- straightened: each row of the shaft under the head moved across so its left line is at
    # STRAIGHT_X, the head and the sparkles as they are; the butt's line closed under the moved shaft
    shaft_left = {}
    for (x, y) in look:
        if y > STRAIGHT_FROM and (x, y) not in spk_set:
            shaft_left[y] = min(shaft_left.get(y, x), x)
    shift = {y: STRAIGHT_X - x for y, x in shaft_left.items()}
    straight = {(x + (0 if (x, y) in spk_set else shift.get(y, 0)), y): (x, y) for (x, y) in look}
    butt_y = max(shift)
    for x in range(STRAIGHT_X, STRAIGHT_X + 3):
        straight.setdefault((x, butt_y), None)
    s_rows, s_sparks, s_pivot, s_origin = template(straight)

    def commonest(kd):
        # the sceptre's own (not a sparkle's)
        ks = [k for k in groups if kind[k] == kd and groups[k][0] not in spk_set]
        k = max(ks, key=lambda k: (sum(1 for p, q in look.items() if p not in spk_set and q is not None and q in groups[k]), sum(mean[k])))
        return P.rgb_hex(mean[k])

    gold_base, gem_base = commonest('gold'), commonest('gem')
    gold_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'gold'))
    gem_chars = ''.join(sorted(letter[k] for k in groups if kind[k] == 'gem'))
    write_ts(path, (rows, pivot, angle, sparks_t, (bx0, by0)), (s_rows, s_pivot, -90.0, s_sparks, s_origin),
             hexes, gold_chars, gem_chars, gold_base, gem_base)
    print(len(rows), 'rows x', len(rows[0]), 'origin', (bx0, by0), 'pivot', pivot, 'angle %.2f' % angle,
          'colours', len(hexes), 'drift', drift, 'sparks', len(sparks_t), 'bases', gold_base, gem_base,
          '| straight', len(s_rows), 'x', len(s_rows[0]), 'origin', s_origin, 'pivot', s_pivot)

    if preview:
        os.makedirs(preview, exist_ok=True)
        k = 12

        def paint(rows_, sparks_, W, H, dx=0):
            img = np.full((H, W, 3), 255, np.uint8)
            for y, r in enumerate(rows_):
                for x, c in enumerate(r):
                    if c != '.':
                        img[y, x + dx] = P.rgb(hexes[c])
            for x, y, c in sparks_:
                img[y, x + dx] = P.rgb(hexes[c])
            return img

        H = by1 - by0 + 1
        W = max(bx1, s_origin[0] + len(s_rows[0]) - 1) - min(bx0, s_origin[0]) + 1
        x_min = min(bx0, s_origin[0])
        his = np.full((H, W, 3), 255, np.uint8)
        his[:, bx0 - x_min:bx0 - x_min + bx1 - bx0 + 1] = N[by0:by1 + 1, bx0:bx1 + 1]
        ours = paint(rows, sparks_t, W, H, bx0 - x_min)
        filled = np.zeros((H, W), bool)
        for (x, y), q in look.items():
            if q != (x, y):
                filled[y - by0, x - x_min] = True
        mark = ours.copy()
        mark[filled] = (255, 0, 255)
        st = paint(s_rows, s_sparks, W, H, s_origin[0] - x_min) if s_origin[1] == by0 and len(s_rows) == H else None
        if st is None:
            raise SystemExit('the straight template does not span the same rows')
        panels = [(his, 'Tu dibujo', '(escala del juego, 12x)'), (ours, 'En el juego', '(reposo, sin la mano)'),
                  (mark, 'Rellenado', '(magenta: bajo la mano)'), (st, 'Recto, para girarlo', '(las demás poses)')]
        gap, top = 24, 46
        sheet = Image.new('RGB', (len(panels) * (W * k + gap) - gap, H * k + top), 'white')
        d = ImageDraw.Draw(sheet)
        font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        font = ImageFont.truetype(font, 14) if os.path.exists(font) else None
        for i, (img, a, b) in enumerate(panels):
            x = i * (W * k + gap)
            sheet.paste(Image.fromarray(img).resize((W * k, H * k), Image.NEAREST), (x, top))
            d.text((x + 4, 6), a, fill=(0, 0, 0), font=font)
            d.text((x + 4, 24), b, fill=(0, 0, 0), font=font)
        sheet.save(os.path.join(preview, 'sceptre@12.png'))


def write_ts(path, held, straight, palette, gold, gem, gold_base, gem_base):
    """The sceptre as the game's module (src/sprite/items/princessSceptreArt.ts): `held` and `straight`
    are (rows, pivot, angle, sparks, origin)."""

    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else json.dumps(k).replace('"', "'")

    def lit(v):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

    def piece(name, t, doc):
        rows, pivot, angle, sparks_t, origin = t
        out = ['/**'] + [f' * {line}' for line in doc] + [f' * Its cell (0, 0) is his pixel {origin}.', ' */']
        out += [f'export const {name}: RoseSceptre = {{', f'  pivot: [{pivot[0]}, {pivot[1]}],', f'  angle: {angle:.2f},', '  rows: [']
        out += [f'    {lit(r)},' for r in rows]
        out += ['  ],', '  colors: ROSE_SCEPTRE_COLORS,', f'  gold: {lit(gold)},', f'  gem: {lit(gem)},', '  sparks: [']
        out += [f'    [{x}, {y}, {lit(c)}],' for x, y, c in sparks_t]
        out += ['  ],', '};', '']
        return out

    out = [
        "// The princess's sceptre, the owner's pixels at our game's scale (tools/refs/princess-sceptre-from-ref.py",
        '// from docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface RoseSceptre extends PaintedPiece {',
        "  /** The characters of his golds: the head's cage and spike, the collar, the shaft, their lights and brown shadows. */",
        '  gold: string;',
        "  /** The characters of the gem's mauves and pinks (and his pink sparkles). */",
        '  gem: string;',
        "  /** His sparkles round the head: [x, y, character] in the template's cells (not in rows). */",
        '  sparks: [number, number, string][];',
        '}',
        '',
        '/** His commonest gold and gem colour: the colours the two colour slots turn his from. */',
        f"export const PRINCESS_SCEPTRE_GOLD = '{gold_base}';",
        f"export const PRINCESS_SCEPTRE_GEM = '{gem_base}';",
        '',
        '/** His colours, one character each (\'o\' his black line). */',
        'const ROSE_SCEPTRE_COLORS: Record<string, string> = {',
    ]
    out += [f'  {key(k)}: {lit(v)},' for k, v in palette.items()]
    out += ['};', '']
    out += piece('ROSE_SCEPTRE', held, [
        'The sceptre as he drew it, held up in her far fist and leaning right: drawn at his angle (the',
        "shaft's axis) and pivoting on the grip in the fist, so held there at that angle every pixel is his.",
        'The shaft inside the fist continues his shaft and its twist.'])
    out += piece('ROSE_SCEPTRE_STRAIGHT', straight, [
        'The same pixels with the shaft under the head straightened (each row of it moved across, a pixel',
        "more every few rows, his butt's line closed under it): an upright shaft, for the poses that turn",
        'the sceptre (his slanted shaft is a staircase, which breaks up when turned). The head is as he drew it.'])
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
