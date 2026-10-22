"""The owner's arms for Ren's 'cast' pose ("lanzar jutsu"), from his paint-over (docs/reference/ren-cast-owner-reference.jpg).

His picture (2000x1116) is our Ren casting the runes (male, 'cast'), painted over by the owner in two panels,
"Cuadro 0" and "Cuadro 1". His words: "mira los brazos del cuadro 0 ponlos asi". Panel 1 shows the arms we
had (the fist at the chest with its silver plate, a thin far forearm); panel 0 his new ones, and nothing else
of the figure changes between them (the head, sword and runes are the same pixels; the skirt only differs by
the picture's noise). Both frames of the pose wear his frame-0 arms: the pose is held.

His pixels: a grid of 1000/120 picture pixels (one pixel pitch over the whole picture, panel 0's first
cell at PANEL0), found from the edges of his black line. His figure is drawn larger than our sprite: about
SCALE of his pixels to one fine pixel of ours (his runes, sword guard, pommel and the arms we had all
match ours at that scale), so one of his pixels is not one of ours. Each arm is lifted at our scale by
keeping SCALE-th of his rows and columns: each fine pixel is one of his pixels in his exact colour, and the
rows and columns left out are those most like a neighbour (keep()), so his 1 px line and his folds stay.
His black line is one colour (his commonest); his other colours are the picture's, colours within 3
merged.

The pieces (his pixels in panel 0, in front of the jacket):
  the near forearm  bare, bent across the chest from his elbow under the short sleeve to the fist, in his
                    skin shading with his line round it. It rides the near forearm about the elbow.
  the near fist     the black fingerless glove round the sword's grip at the chest, his bare fingers
                    closed over the grip. It sits where the grip is held (grip.ts paintedGrip) and turns
                    with the fist.
  the far forearm   bare and thick, stretched out at the runes. It rides the far forearm about the elbow.
  the far fist      the black glove with its silver plate, his bare fingers at the runes. It rides the far
                    hand about the wrist.
Where each lands: his panel lined up with our male 'cast' frame 0 (ORIGIN: where his pixel corner (0, 0)
lies in our frame, per arm, fitted on the arms we had in his panel 1, which he drew one pixel to the left);
at our joints of that frame (CAST_JOINTS) every pixel of the piece is where he drew it.

It writes the pieces as TypeScript (src/sprite/items/nightCastArmsArt.ts) and, in <study>, his panel beside
the pieces at our scale (8x). The same picture always gives the same bytes:

  python3 -I tools/refs/ren-cast-arms-from-ref.py src/sprite/items/nightCastArmsArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import ren_ref as R  # noqa: E402

REF = 'docs/reference/ren-cast-owner-reference.jpg'
PITCH = 1000 / 120
# The picture corner of panel 0's first cell, and its size in his pixels.
PANEL0 = (33.8, 87.2)
CELLS = (114, 119)
# His pixels per fine pixel of ours.
SCALE = 1.3
# Where his pixel corner (0, 0) of panel 0 lies in our male 'cast' frame 0 (fine pixels), per arm.
ORIGIN = {'N': (90.23, 122.7), 'F': (93.73, 124.0)}
# Our male rig in 'cast' frame 0 (fine pixels; rig.ts drawRig), and where the near fist holds the sword's
# grip there (grip.ts paintedGrip: the point and the fist's angle). ren.test.ts checks these.
CAST_JOINTS = {
    'elbowN': (120.815, 164.105),
    'wristN': (131.598, 161.934),
    'gripN': (134.876, 163.423),
    'elbowF': (151.101, 154.013),
    'wristF': (162.014, 152.636),
    'handF': (165.586, 152.185),
}
FIST_N_ANGLE = 24.440

# The regions of panel 0 each piece is cut from (polygons in his pixel corners), the fists first (they are
# in front): a pixel goes to the first piece whose region holds it and whose kinds take it, and the piece
# takes his line beside its colours.
REGIONS = {
    # the glove from its line beside the forearm's end to the fingers' line, above the jacket's buttons
    'fist_n': [(49, 46), (49, 52), (50, 52), (50, 56), (57, 56), (57, 55), (63, 55), (63, 44), (54, 44), (54, 45), (53, 45), (53, 46)],
    'fist_f': [(84, 27), (99, 27), (99, 46), (84, 46)],
    'fore_n': [(33, 46), (51, 46), (51, 61), (33, 61)],
    'fore_f': [(72, 32), (86, 32), (86, 46), (72, 46)],
}
TAKES = {
    'fist_n': ('dark', 'silver', 'skin'),
    'fist_f': ('dark', 'silver', 'skin'),
    # his forearms: his skin and the warm dark he shaded it with
    'fore_n': ('skin', 'warm'),
    'fore_f': ('skin', 'warm'),
}
SIDE = {'fist_n': 'N', 'fore_n': 'N', 'fist_f': 'F', 'fore_f': 'F'}


def native(path=REF):
    """His pixels in panel 0: the median of each cell's middle, as a (rows, cols, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    nx, ny = CELLS
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            x0, y0 = PANEL0[0] + i * PITCH, PANEL0[1] + j * PITCH
            c = a[int(np.ceil(y0 + 2)):int(y0 + PITCH - 2), int(np.ceil(x0 + 2)):int(x0 + PITCH - 2)].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def kinds(a):
    """ren_ref.kind, with his dark warm shading ('warm': a dark colour redder than blue) apart."""
    K = R.kinds(a)
    warm = (K == 'dark') & (a[..., 0] > a[..., 2] + 6)
    K[warm] = 'warm'
    return K


def segment(a):
    """His arms in panel 0: {name: mask}, his colours (his line in one colour)."""
    H, W, _ = a.shape
    K = kinds(a)
    bg = R.background(a)
    line = K == 'line'
    owned = np.zeros((H, W), bool)
    masks = {}
    for n, pts in REGIONS.items():
        reg = R.inside(pts, H, W)
        m = reg & ~bg & ~owned & np.isin(K, TAKES[n])
        m |= line & reg & R.near8(m)
        owned |= m & ~line
        masks[n] = m
    col = a.copy()
    col[line] = R.his_line(a)
    return masks, col, K


def drop_costs(col, K, m, axis):
    """What leaving out each row (axis 0) or column (axis 1) of his would lose inside the arm `m`: how
    unlike its nearer neighbour it is (his line against anything else counts most)."""
    if axis == 1:
        col, K, m = col.transpose(1, 0, 2), K.T, m.T
    n = m.shape[0]

    def unlike(i, j):
        if j < 0 or j >= n:
            return 1e9
        both = m[i] | m[j]
        d = np.abs(col[i] - col[j]).max(axis=1)
        k = np.where(K[i] != K[j], np.where((K[i] == 'line') | (K[j] == 'line'), 6.0, 3.0), np.where(d > 24, 1.0, 0.0))
        k = np.where(m[i] != m[j], 6.0, k)
        return float((k * both).sum())

    return np.array([min(unlike(i, i - 1), unlike(i, i + 1)) for i in range(n)])


def keep(first, count, origin, cost):
    """Which of his rows (or columns) the fine rows first..first+count-1 show: each within one of where
    SCALE puts it, one after another or one left out between, those left out costing least (cost())."""
    ideal = [(k + 0.5 - origin) * SCALE - 0.5 for k in range(first, first + count)]
    near = [range(int(np.floor(t)) - 1, int(np.floor(t)) + 3) for t in ideal]
    best = [{c: (abs(c - ideal[0]) * 1e-3, None) for c in near[0]}]
    for k in range(1, count):
        row = {}
        for c in near[k]:
            got = None
            for prev, extra in ((c - 1, 0.0), (c - 2, None)):
                if prev not in best[-1]:
                    continue
                e = cost[prev + 1] if extra is None and 0 <= prev + 1 < len(cost) else 0.0
                v = best[-1][prev][0] + e + abs(c - ideal[k]) * 1e-3
                if got is None or v < got[0]:
                    got = (v, prev)
            if got is not None:
                row[c] = got
        best.append(row)
    c = min(best[-1], key=lambda q: (best[-1][q][0], q))
    out = [c]
    for k in range(count - 1, 0, -1):
        c = best[k][c][1]
        out.append(c)
    if any(v is None for v in out):
        raise ValueError('no way to keep his rows')
    return out[::-1]


def at_our_scale(a, col, K, masks, side):
    """The pieces of one arm at our scale, in our frame (256 x 256 fine pixels): {name: (mask, colours)}."""
    names = [n for n in masks if SIDE[n] == side]
    m = np.logical_or.reduce([masks[n] for n in names])
    ox, oy = ORIGIN[side]
    ys, xs = np.nonzero(m)
    fx0, fx1 = int(np.floor(ox + xs.min() / SCALE)) - 1, int(np.ceil(ox + (xs.max() + 1) / SCALE)) + 1
    fy0, fy1 = int(np.floor(oy + ys.min() / SCALE)) - 1, int(np.ceil(oy + (ys.max() + 1) / SCALE)) + 1
    cols = keep(fx0, fx1 - fx0, ox, drop_costs(col, K, m, 1))
    rows = keep(fy0, fy1 - fy0, oy, drop_costs(col, K, m, 0))
    H, W = m.shape
    out = {}
    for n in names:
        fm = np.zeros((256, 256), bool)
        fc = np.zeros((256, 256, 3), np.int32)
        for j, y in enumerate(rows):
            for i, x in enumerate(cols):
                if 0 <= y < H and 0 <= x < W and masks[n][y, x]:
                    fm[fy0 + j, fx0 + i] = True
                    fc[fy0 + j, fx0 + i] = col[y, x]
        out[n] = (fm, fc)
    return out


DOC = (
    "// The owner's arms for Ren's 'cast' pose, his pixels (tools/refs/ren-cast-arms-from-ref.py from\n"
    '// docs/reference/ren-cast-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(rgb, const):
    """His forearms are all skin (his warm dark shading too); on the fists his bare fingers are skin."""
    k = R.kind(rgb)
    if k == 'line':
        return 'line'
    if const.startswith('NIGHT_CAST_FORE'):
        return 'skin'
    if k in ('blue', 'white', 'gold'):
        return 'silver'
    return k


def module(consts):
    out = [DOC, "import type { PaintedPiece } from '../painted';", '']
    found = {}
    body = []
    rest = []
    for const, mask, col, doc, pivot, ang in consts:
        rows, origin, palette = R.pack(col, mask)
        for h in palette.values():
            k = kind_of([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], const)
            if found.get(h, k) != k:
                raise ValueError(f'{h} is {found[h]} in one piece and {k} in {const}')
            found[h] = k
        body.append(R.ts_piece(const, doc, rows, origin, palette, pivot, ang))
        rest.append((const, origin))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is: his line, his skin (it follows the character's), the glove's dark and its silver. */")
    out.append(f"export const NIGHT_CAST_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
    for h in sorted(found):
        out.append(f"  '{h}': '{found[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male 'cast' frame 0, as he drew it: the fine pixel of its first row's first cell. */")
    out.append('export const NIGHT_CAST_REST: Record<string, [number, number]> = {')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    (wx, wy), (gx, gy) = CAST_JOINTS['wristN'], CAST_JOINTS['gripN']
    out.append('/** Where the near fist holds the grip, from the near wrist, as he drew it (fine pixels; the fist closing on nothing sits there). */')
    out.append(f'export const NIGHT_CAST_GRIP_N: [number, number] = [{gx - wx:.3f}, {gy - wy:.3f}];')
    out.append('')
    out += body
    return '\n'.join(out)


def angle(a, b):
    (ax, ay), (bx, by) = CAST_JOINTS[a], CAST_JOINTS[b]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = native()
    masks, col, K = segment(a)
    P = {**at_our_scale(a, col, K, masks, 'N'), **at_our_scale(a, col, K, masks, 'F')}
    J = CAST_JOINTS
    consts = [
        ('NIGHT_CAST_FORE_N', *P['fore_n'], 'The near bare forearm across the chest: it rides the forearm about the elbow.', J['elbowN'], angle('elbowN', 'wristN')),
        ('NIGHT_CAST_FIST_N', *P['fist_n'], "The near fist round the sword's grip at the chest: it sits where the grip is held, turned with the fist.", J['gripN'], FIST_N_ANGLE),
        ('NIGHT_CAST_FORE_F', *P['fore_f'], 'The far bare forearm stretched out at the runes: it rides the forearm about the elbow.', J['elbowF'], angle('elbowF', 'wristF')),
        ('NIGHT_CAST_FIST_F', *P['fist_f'], 'The far fist at the runes, its silver plate and his bare fingers: it rides the hand about the wrist.', J['wristF'], angle('wristF', 'handF')),
    ]
    R.write(out_ts, module(consts))
    if study:
        os.makedirs(study, exist_ok=True)
        his = np.concatenate([a[24:64, 26:104].astype(np.uint8), np.full((40, 78, 1), 255, np.uint8)], axis=2)
        R.save(his, os.path.join(study, 'cast-arms-his@8.png'))
        ours = np.zeros((40, 64, 4), np.uint8)
        for n in ('fore_f', 'fist_f', 'fore_n', 'fist_n'):
            m, c = P[n]
            for y, x in zip(*np.nonzero(m)):
                if 140 <= y < 180 and 112 <= x < 176:
                    ours[y - 140, x - 112, :3] = c[y, x]
                    ours[y - 140, x - 112, 3] = 255
        R.save(ours, os.path.join(study, 'cast-arms-ours@8.png'))


if __name__ == '__main__':
    main()
