"""The owner's plate boots and brown gloves from his Aiden picture (docs/reference/aiden-owner-reference.jpg).

His picture is our Aiden painted over in his own pixels (tools/refs/aiden_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the boots   on each leg, the round knee cop and the greave below it (the shin piece, which turns
              with the shin), and the sabaton with its gold cuff, gold straps and brown sole (the foot
              piece, which stays flat on the ground like our feet). His blade crosses the top of the
              near knee cop and the far greave: there his pixels are continued (the greave's columns
              from below, the cop's trim and steel from beside and below) and his black line closed,
              so other poses show no hole. Each greave also runs on two rows under its cuff, so the
              shin can turn without a gap at the ankle.
  the gloves  the near fist round the sword's grip (a steel plate with a gold edge over the back of the
              hand, brown leather fingers; the grip shows through it where it does in his picture, and
              the closed fist without a weapon is the same) and the far fist hanging closed (brown
              leather, a steel knuckle edge with a gold rivet).

His legs stand a little apart from our rig's (the near one 4 pixels left and 1 down, the far one 1
left and 5 down), so each boot hangs from our ankle moved by that much: at rest it is exactly where
he drew it, and in other poses it follows our leg. The gloves hang from our wrists as he drew them.

It writes the pieces as TypeScript (src/sprite/items/sabatonsGauntletsArt.ts) and, in <study>, the
pieces lifted out next to his figure at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/aiden-boots-gloves-from-ref.py src/sprite/items/sabatonsGauntletsArt.ts <study>
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

from aiden_ref import JOINTS, REF, native, pack, save  # noqa: E402

# Where his legs stand from our rig's at rest, in his pixels: the boot pieces hang from our ankle moved
# by this, so his knee cop lands on our knee moved the same (the shin is as long as ours).
SHIFT = {'N': (-4, 1), 'F': (-1, 5)}

LINE = 'line'

# Each piece as the rows of his picture it covers: row -> (first x, last x), inclusive.
# The near knee cop and greave, from the cop's top line to the cuff; two more rows run on under the cuff.
NEAR_SHIN = {
    69: (41, 45), 70: (39, 47), 71: (39, 47), 72: (38, 48), 73: (38, 48), 74: (38, 48), 75: (37, 48),
    76: (37, 47), 77: (37, 47), 78: (36, 46), 79: (36, 46), 80: (36, 46), 81: (36, 46), 82: (36, 45),
    83: (36, 45), 84: (36, 44), 85: (36, 44), 86: (36, 43), 87: (36, 43), 88: (36, 43), 89: (36, 43),
}
# Under his blade and its black line: the top right of the near cop. His cop is round about x = 43,
# so its line, its gold rim and its steel go on as on the left; each takes the colour of his pixel
# named (the rim beside it, the steel below it).
NEAR_SHIN_HIDDEN = {
    (43, 69): LINE, (44, 69): LINE, (45, 69): LINE,
    (43, 70): (42, 70), (44, 70): (42, 70), (45, 70): (42, 70), (46, 70): LINE, (47, 70): LINE,
    (45, 71): (45, 72), (46, 71): (47, 73), (47, 71): LINE,
    (46, 72): (46, 73), (47, 72): (47, 73), (48, 72): LINE,
}
# The near greave under the cuff: the cuff's top line (row 87) and two rows more are his row 86 again,
# inside his line (the line is the cuff's: it turns with the foot, not with the shin).
NEAR_UNDER_CUFF = (87, 89, 86)  # first row, last row, the row they copy

# The near sabaton: the cuff's top line, then everything of his down to the sole's line.
NEAR_FOOT = {87: (38, 40), 88: (36, 43), 89: (35, 43), 90: (35, 43), 91: (35, 43), 92: (35, 43),
             93: (35, 43), 94: (34, 43), 95: (34, 43), 96: (34, 42), 97: (35, 41)}

# The far knee cop (all of it shows, his blade passes just under it) and the far greave below it,
# whose top and front his blade covers down to row 84.
FAR_SHIN = {
    67: (63, 64), 68: (62, 65), 69: (61, 65), 70: (60, 66), 71: (59, 66), 72: (59, 66), 73: (59, 66),
    74: (60, 66), 75: (58, 65), 76: (56, 65), 77: (55, 63), 78: (55, 63), 79: (55, 63), 80: (55, 63),
    81: (55, 63), 82: (56, 63), 83: (55, 63), 84: (57, 63), 85: (57, 63), 86: (57, 62), 87: (56, 61),
    88: (56, 61), 89: (56, 61),
}
# The far greave under his blade: its line closes round it (its top rising to the cop's left side,
# its back and front as below the blade), and inside it each column takes his colour from the first
# pixel of his greave below it.
FAR_GREAVE_TOP_LINE = [(55, 77), (56, 76), (57, 76), (58, 75), (59, 75)]
FAR_COP_BOTTOM = {75: 61, 76: 63}   # where the cop's own line starts on its last rows
FAR_GREAVE_FRONT = 63               # its front line
FAR_GREAVE_HIDDEN_TO = 84           # his greave shows from here down on the front
FAR_UNDER_CUFF = (88, 89, 87)

# The far sabaton: the cuff's top line and gold top, then everything of his down to the sole's line.
FAR_FOOT_ROWS = {86: (62, 64), 87: (61, 64)}
FAR_FOOT_BOX = (56, 88, 71, 96)  # x0, y0, x1, y1 (exclusive)
FAR_FOOT_SEED = (64, 92)

# The near glove: the dark band at the wrist, the steel plate over the back of the hand with its gold
# edge, the brown fingers round the grip and his line. The grip's two pixels between the fist and the
# guard, (36, 60) and (35, 61), are the sword's and stay out.
NEAR_HAND = {55: (30, 34), 56: (30, 37), 57: (29, 37), 58: (29, 38), 59: (29, 38), 60: (29, 35),
             61: (30, 34), 62: (31, 35), 63: (33, 35)}
# The far glove: the brown fist and its steel knuckle edge with a gold rivet, under the vambrace's gold.
FAR_HAND = {55: (67, 71), 56: (65, 71), 57: (65, 72), 58: (65, 72), 59: (65, 72), 60: (65, 71),
            61: (66, 70), 62: (66, 69)}

# Palette characters: the standard set (aiden_ref.pack); the item recolours by what each colour is.
OUT_DOC = (
    "// The owner's plate boots and brown gloves, his pixels (tools/refs/aiden-boots-gloves-from-ref.py from\n"
    '// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind(c):
    """What a colour of his is: his black line (and the blackest browns), gold, brown leather or steel."""
    r, g, b = (int(v) for v in c)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    if lum < 40:
        return 'line'
    if r > b + 40 and r >= 110 and g > b + 20:
        return 'gold'
    if r > b + 5 and lum < 110:
        return 'brown'
    return 'steel'


def rows_mask(spec, H, W):
    m = np.zeros((H, W), bool)
    for y, (x0, x1) in spec.items():
        m[y, x0:x1 + 1] = True
    return m


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = native(REF)
    H, W, _ = a.shape
    black = np.array([1, 1, 1])
    pieces = {}

    # --- the near boot ---------------------------------------------------------------------------
    col = a.copy()
    shin = rows_mask(NEAR_SHIN, H, W)
    for (x, y), src in NEAR_SHIN_HIDDEN.items():
        col[y, x] = black if src == LINE else a[src[1], src[0]]
    y0, y1, ys = NEAR_UNDER_CUFF
    x0, x1 = NEAR_SHIN[ys]
    for y in range(y0, y1 + 1):
        for x in range(x0 + 1, x1):
            if kind(a[y, x]) == 'line' or y > y0:
                col[y, x] = a[ys, x]
        col[y, x0] = col[y, x1] = black
    pieces['near_shin'] = (col.copy(), shin)
    pieces['near_foot'] = (a.copy(), rows_mask(NEAR_FOOT, H, W))

    # --- the far boot ----------------------------------------------------------------------------
    col = a.copy()
    shin = rows_mask(FAR_SHIN, H, W)
    # His blade over the far greave: everything inside the greave's line above row 84 (and left of the
    # cop) that is not his greave. His greave there: steel and brown, not the blade's reds, not black.
    def his_greave(x, y):
        r, g, b = (int(v) for v in a[y, x])
        red = r > b + 50 and r > g + 50
        return kind(a[y, x]) in ('steel', 'brown') and not red and 0.299 * r + 0.587 * g + 0.114 * b < 225

    for y in range(min(FAR_COP_BOTTOM), FAR_GREAVE_HIDDEN_TO):
        for x in range(FAR_SHIN[y][0], FAR_GREAVE_FRONT + 1):
            if x >= FAR_COP_BOTTOM.get(y, 99):
                continue  # the cop's own pixels
            if (x, y) in FAR_GREAVE_TOP_LINE:
                col[y, x] = black
                continue
            if (y > 77 and x == FAR_SHIN[y][0]) or x == FAR_GREAVE_FRONT:
                if not his_greave(x, y):
                    col[y, x] = black  # his line round the greave, where the blade's covers it
                continue
            if his_greave(x, y):
                continue
            # the first pixel of his greave below, in this column
            for q in range(y + 1, 90):
                if his_greave(x, q):
                    col[y, x] = a[q, x]
                    break
    y0, y1, ys = FAR_UNDER_CUFF
    x0, x1 = FAR_SHIN[ys]
    for y in range(y0, y1 + 1):
        col[y, x0 + 1:x1] = a[ys, x0 + 1:x1]
        col[y, x0] = col[y, x1] = black
    pieces['far_shin'] = (col, shin)

    # The far sabaton: his pixels reached from inside it without crossing the white around him.
    bx0, by0, bx1, by1 = FAR_FOOT_BOX
    foot = np.zeros((H, W), bool)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    stack = [(FAR_FOOT_SEED[1], FAR_FOOT_SEED[0])]
    while stack:
        y, x = stack.pop()
        if not (bx0 <= x < bx1 and by0 <= y < by1) or foot[y, x] or lum[y, x] > 225:
            continue
        foot[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    foot |= rows_mask(FAR_FOOT_ROWS, H, W)
    pieces['far_foot'] = (a.copy(), foot)

    # --- the gloves ------------------------------------------------------------------------------
    pieces['near_hand'] = (a.copy(), rows_mask(NEAR_HAND, H, W))
    pieces['far_hand'] = (a.copy(), rows_mask(FAR_HAND, H, W))

    # His colours, packed: one character per colour of his.
    packed = {}
    for name, (c, m) in pieces.items():
        rows, origin, palette = pack(c, m)
        packed[name] = (rows, origin, palette)

    # The bases the colour slots recolour from: his steel, gold and leather of middle lightness (half
    # of his pixels of that kind are lighter, half darker).
    def middle(kinds_of, names):
        cols = []
        for n in names:
            c, m = pieces[n]
            for y, x in zip(*np.nonzero(m)):
                if kind(c[y, x]) == kinds_of:
                    r, g, b = (int(v) for v in c[y, x])
                    cols.append((0.299 * r + 0.587 * g + 0.114 * b, '#%02x%02x%02x' % (r, g, b)))
        cols.sort()
        return cols[len(cols) // 2][1]

    boots = ['near_shin', 'near_foot', 'far_shin', 'far_foot']
    gloves = ['near_hand', 'far_hand']
    bases = {
        'BOOT_STEEL': middle('steel', boots),
        'BOOT_TRIM': middle('gold', boots),
        'GLOVE_LEATHER': middle('brown', gloves),
        'GLOVE_STEEL': middle('steel', gloves),
        'GLOVE_TRIM': middle('gold', gloves),
    }

    # His leather in tones for the hands he did not paint (open, pointing, relaxed): his black line, his
    # darkest brown (the creases), and his browns a fifth, a half and five sixths of the way up.
    browns = []
    lines = {}
    for n in gloves:
        c, m = pieces[n]
        for y, x in zip(*np.nonzero(m)):
            r, g, b = (int(v) for v in c[y, x])
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            h = '#%02x%02x%02x' % (r, g, b)
            if kind(c[y, x]) == 'brown':
                browns.append((lum, h))
            elif lum >= 15 and r > b:
                browns.append((lum, h))
            elif kind(c[y, x]) == 'line':
                lines[h] = lines.get(h, 0) + 1
    browns.sort()
    line = max(sorted(lines), key=lambda h: lines[h])
    tones = [line, browns[0][1]] + [browns[int(len(browns) * q)][1] for q in (0.2, 0.5, 5 / 6)]

    def joint(name, shift=(0, 0)):
        jx, jy = JOINTS[name]
        return (int(np.floor(jx + shift[0])), int(np.floor(jy + shift[1])))

    def angle(a_name, b_name):
        (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
        return float(np.degrees(np.arctan2(by - ay, bx - ax)))

    spec = {
        'near_shin': ('SABATON_SHIN_N', 'The near knee cop and greave: they turn with the shin about the ankle.', joint('ankleN', SHIFT['N']), angle('kneeN', 'ankleN')),
        'near_foot': ('SABATON_FOOT_N', 'The near sabaton, seen from the front: the gold cuff, a gold strap over the instep, the steel toe and the brown sole.', joint('ankleN', SHIFT['N']), angle('kneeN', 'ankleN')),
        'far_shin': ('SABATON_SHIN_F', 'The far knee cop and greave, its brown back showing: they turn with the shin about the ankle.', joint('ankleF', SHIFT['F']), angle('kneeF', 'ankleF')),
        'far_foot': ('SABATON_FOOT_F', 'The far sabaton pointing right: the gold cuff, the steel toe, the brown heel and sole.', joint('ankleF', SHIFT['F']), angle('kneeF', 'ankleF')),
        'near_hand': ('GAUNTLET_N', 'The near fist round a grip: the steel plate over the back of the hand with its gold edge, the brown fingers under it.', joint('wristN'), angle('wristN', 'handN')),
        'far_hand': ('GAUNTLET_F', 'The far fist hanging closed: brown leather, the steel knuckle edge with a gold rivet.', joint('wristF'), angle('wristF', 'handF')),
    }

    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"

    out = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '']
    out += [
        '/**',
        " * Where his legs stand from our rig's at rest, in fine pixels: each boot hangs from our ankle moved",
        ' * by this, so at rest it is where he drew it (the near leg 4 left and 1 down, the far 1 left and 5',
        ' * down). Zero once the rig stands as he drew it.',
        ' */',
        f"export const SABATON_SHIFT = {{ N: [{SHIFT['N'][0]}, {SHIFT['N'][1]}], F: [{SHIFT['F'][0]}, {SHIFT['F'][1]}] }} as const;",
        '',
        '/** His colours the colour slots recolour from (at these, every pixel is his). */',
    ]
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out += [
        '',
        "/** His leather for the hands he did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */",
        'export const GLOVE_TONES = [' + ', '.join(f"'{t}'" for t in tones) + "] as const;",
        '',
        '/** What a colour of his is, as the script sorts them: his black line (and blackest browns), gold, brown leather or steel. */',
        "export function crimsonKind(hex: string): 'line' | 'gold' | 'brown' | 'steel' {",
        '  const r = parseInt(hex.slice(1, 3), 16);',
        '  const g = parseInt(hex.slice(3, 5), 16);',
        '  const b = parseInt(hex.slice(5, 7), 16);',
        '  const lum = 0.299 * r + 0.587 * g + 0.114 * b;',
        "  if (lum < 40) return 'line';",
        "  if (r > b + 40 && r >= 110 && g > b + 20) return 'gold';",
        "  if (r > b + 5 && lum < 110) return 'brown';",
        "  return 'steel';",
        '}',
        '',
    ]
    for name, (const, doc, pivot, ang) in spec.items():
        rows, (ox, oy), palette = packed[name]
        out += [f'/** {doc} */', f'export const {const}: PaintedPiece = {{', f'  pivot: [{pivot[0] - ox}, {pivot[1] - oy}],', f'  angle: {ang:.2f},', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
        out += ['  },', '};', '']
    text = '\n'.join(out)
    if out_ts:
        tmp = out_ts + '.tmp'
        with open(tmp, 'w') as f:
            f.write(text)
        os.replace(tmp, out_ts)

    if study:
        os.makedirs(study, exist_ok=True)
        lifted = np.full((H, W, 4), 0, np.uint8)
        for name in ('far_shin', 'far_foot', 'near_shin', 'near_foot', 'near_hand', 'far_hand'):
            rows, (ox, oy), palette = packed[name]
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    if ch != '.':
                        h = palette[ch]
                        lifted[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
        his = np.concatenate([a.astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
        save(np.concatenate([his[50:99, 20:80], np.zeros((49, 2, 4), np.uint8), lifted[50:99, 20:80]], axis=1), os.path.join(study, 'boots-gloves@8.png'))
    for name, (rows, origin, palette) in packed.items():
        print(name, 'origin', origin, len(rows), 'rows', len(palette), 'colours')
    print('bases', bases, 'tones', tones)


if __name__ == '__main__':
    main()
