"""The owner's rock (docs/reference/lyra-read-owner-reference.jpg: the grey rock his Lyra sits on to read,
and the earth under it) as a seat prop of its own: src/sprite/seatRockArt.ts (src/sprite/seats.ts).

His words: "puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del escenario":
the rock is an object, not part of her sprite, and the scene picks the seat. His pixels are taken one for
one from his first frame ("Atenta"; lyra_read_ref.py reads his picture, his rock is the 'seat' owner
there), in the same frame as the sprite: laid at the same origin as a seated character, its top is under
her hips (rig.ts READ_SEAT_TOP).

She hides most of its top (her tabard's lining spreads over it, the tabard's front panel hangs down its
left side, her boots stand before its right end), and every other character sits elsewhere on it, so what
she hides is continued from his own pixels: a hidden cell of the rock takes his pixel of the rock's front
face HIDDEN_DROP rows below it (the nearest rock pixel of his in that column, his line skipped), up to the
rock's top line (ROCK: his rock's outline over her, her lining's top edge), and a hidden cell of the earth
under her boots takes the nearest earth pixel of his in its row. The new edges get his black line.

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/seat-rock-from-ref.py [src/sprite/seatRockArt.ts] [study.png]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lyra_read_ref as R  # noqa: E402
import owner_paintover as P  # noqa: E402

OUT = 'src/sprite/seatRockArt.ts'
FRAME = 0
# The rock under her (panel 1's columns and rows): its top under her lining's top edge, its right side
# along his visible right edge, down to the front face he drew.
ROCK = [(4, 64), (7, 61), (43, 61), (47, 64), (47, 78), (22, 78), (22, 86), (8, 86), (8, 78), (4, 78)]
# His rock's front face is this many rows below its hidden top.
HIDDEN_DROP = 15
# The earth he drew round her boots, right of the rock, is the ground she stands on, not the rock's: the
# scene has its own ground there, so the prop keeps only the earth under the rock (left of EARTH_X).
EARTH_X = 48
EARTH = [(44, 89), (EARTH_X, 89), (EARTH_X, 95), (44, 95)]
TOP_ROW = 61


def lift():
    m, fg, line = R.frame(FRAME)
    own, masks = R.owners(FRAME)
    seat = masks['seat'].copy()
    seat[:, EARTH_X:] = False
    col = m.copy()
    H, W = seat.shape
    # his line between her and the rock is hers too (her pieces carry it): inside the rock it goes, and the
    # rock is continued there
    hers = np.logical_or.reduce([mk for o, mk in masks.items() if o != 'seat'])
    region = P.inside(ROCK, H, W)
    seat &= ~(line & hers & region & ~P.near8(~region))
    rock_rgb = seat & ~line & R.rock(m) & ~R.earth(m)
    earth_rgb = seat & ~line & R.earth(m)
    out = seat.copy()
    # the rock's hidden top: his front face, HIDDEN_DROP rows down (the nearest rock pixel of his in the column)
    region = P.inside(ROCK, H, W)
    for y in range(H):
        for x in range(W):
            if not region[y, x] or seat[y, x]:
                continue
            src = None
            for d in sorted(range(1, H), key=lambda d: (abs(d - HIDDEN_DROP), d)):
                yy = y + d
                if yy < H and rock_rgb[yy, x]:
                    src = (yy, x)
                    break
            if src is None:
                continue
            col[y, x] = m[src]
            out[y, x] = True
    # the earth under her boots: the nearest earth pixel of his in the row
    band = P.inside(EARTH, H, W)
    for y in range(H):
        xs = np.nonzero(earth_rgb[y])[0]
        if not len(xs):
            continue
        for x in range(W):
            if band[y, x] and not out[y, x] and xs.min() <= x <= xs.max() + 4:
                col[y, x] = m[y, xs[np.argmin(np.abs(xs - x))]]
                out[y, x] = True
    # his black line on the new edges (a cell of the rock beside nothing)
    edge = np.zeros_like(out)
    for y in range(H):
        for x in range(W):
            if not out[y, x] or seat[y, x]:
                continue
            if any(not (0 <= y + dy < H and 0 <= x + dx < W) or not out[y + dy, x + dx] for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                edge[y, x] = True
    col[edge] = (0, 0, 0)
    return out, col


DOC = """// The owner's rock, the seat his Lyra reads on, as a prop of its own (tools/refs/seat-rock-from-ref.py from
// docs/reference/lyra-read-owner-reference.jpg). Generated: rerun the script to change it.
"""


def module(mask, col):
    rows, (x0, y0), palette = P.pack(mask, col)
    fx, fy = R.to_frame(x0, y0)
    top = R.to_frame(0, TOP_ROW)[1]
    out = [DOC]
    out.append('/** His rock and the earth under it, in the sprite\'s frame: its first cell at fine pixel `at`, seated characters on it. */')
    out.append('export const SEAT_ROCK = {')
    out.append(f'  at: [{fx}, {fy}] as [number, number],')
    out.append('  rows: [')
    out += [f"    '{r}'," for r in rows]
    out.append('  ],')
    out.append('  colors: { ' + ', '.join(f"'{c}': '{h}'" for c, h in palette.items()) + ' } as Record<string, string>,')
    out.append('};')
    out.append('')
    out.append('/** The fine pixel row of its top line, where a seated pose\'s seat is (rig.ts READ_SEAT_TOP). */')
    out.append(f'export const SEAT_ROCK_TOP = {top};')
    out.append('')
    return '\n'.join(out)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    mask, col = lift()
    with open(out, 'w') as f:
        f.write(module(mask, col))
    if len(sys.argv) > 2:
        img = np.full(mask.shape + (3,), 255)
        img[mask] = col[mask]
        P.save(img[50:, :], sys.argv[2], 8)
    print(out, int(mask.sum()), 'pixels')


if __name__ == '__main__':
    main()
