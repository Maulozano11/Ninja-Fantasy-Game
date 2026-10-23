"""The owner's sit rock (docs/reference/lyra-sit-owner-reference.jpg: the rock his Lyra sits on to talk, and the
earth under it) as a seat prop of its own: src/sprite/seatRockSitArt.ts (src/sprite/seats.ts).

His words, of his two rocks (2026-10-22): "usar las dos una es para leer y la otra cuando conversa sentada
asi para todos los personajes tendran animaciones sentados": the rock of his read picture is the read seat
(seat-rock-from-ref.py), this one the sit seat, for every character. His pixels are taken one for one
(lyra_sit_ref.py reads his picture; his rock is the 'seat' owner there), in the same frame as the sprite:
laid at the same origin as a seated character, its top is under her hips (rig.ts READ_SEAT_TOP).

She hides its top (her tabard's lining spreads over it, the tabard hangs down its left side, her near boot
stands before its right end), and every other character sits elsewhere on it, so what she hides is continued
from his own pixels, as the read rock is: a hidden cell of the rock (in ROCK, from its top row TOP_ROW) takes
his pixel of the rock's front face HIDDEN_DROP rows below it (the nearest rock pixel of his in that column,
his line skipped). The earth he drew round her boots, right of the rock, is the ground she stands on: the
scene has its own there, so the prop keeps the earth under the rock only (left of EARTH_X). The new edges get
his black line.

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/seat-rock-sit-from-ref.py [src/sprite/seatRockSitArt.ts] [study.png]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lyra_sit_ref as S  # noqa: E402
import owner_paintover as P  # noqa: E402

OUT = 'src/sprite/seatRockSitArt.ts'
# The rock under her (his columns and rows): its hidden top on TOP_ROW (READ_SEAT_TOP in our frame), from his
# rock's left side to its right side (his line in column 59, behind her near boot).
TOP_ROW = 64
ROCK = [(20, TOP_ROW), (59, TOP_ROW), (59, 93), (20, 93)]
# His rock's front face is about this many rows below its hidden top.
HIDDEN_DROP = 17
EARTH_X = 59


def lift():
    m, fg, line = S.frame()
    own, masks = S.owners()
    seat = masks['seat'].copy()
    seat[:, EARTH_X + 1:] = False
    H, W = seat.shape
    # his line between her and the rock is hers too (her pieces carry it): inside the rock it goes, and the
    # rock is continued there
    hers = np.logical_or.reduce([mk for o, mk in masks.items() if o != 'seat'])
    region = P.inside(ROCK, H, W)
    seat &= ~(line & hers & region & ~P.near8(~region))
    # (his stones' greys and tans: not the earth, nor the dark warm brown of the ground's shadow under it)
    shadow = (m[..., 0] - m[..., 2] > 25) & (m[..., 0] < 110)
    rock_rgb = seat & ~line & S.R.rock(m) & ~S.R.earth(m) & ~shadow
    col = m.copy()
    out = seat.copy()
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
    # his black line on the new edges (a continued cell of the rock beside nothing)
    edge = np.zeros_like(out)
    for y in range(H):
        for x in range(W):
            if not out[y, x] or seat[y, x]:
                continue
            if any(not (0 <= y + dy < H and 0 <= x + dx < W) or not out[y + dy, x + dx] for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                edge[y, x] = True
    col[edge] = (0, 0, 0)
    return out, col


DOC = """// The owner's sit rock, the seat his Lyra sits on to talk, as a prop of its own (tools/refs/seat-rock-sit-from-ref.py
// from docs/reference/lyra-sit-owner-reference.jpg). Generated: rerun the script to change it.
"""


def module(mask, col):
    rows, (x0, y0), palette = P.pack(mask, col)
    fx, fy = S.to_frame(x0, y0)
    top = S.to_frame(0, TOP_ROW)[1]
    out = [DOC]
    out.append('/** His sit rock and the earth under it, in the sprite\'s frame: its first cell at fine pixel `at`, seated characters on it. */')
    out.append('export const SEAT_ROCK_SIT = {')
    out.append(f'  at: [{fx}, {fy}] as [number, number],')
    out.append('  rows: [')
    out += [f"    '{r}'," for r in rows]
    out.append('  ],')
    out.append('  colors: { ' + ', '.join(f"'{c}': '{h}'" for c, h in palette.items()) + ' } as Record<string, string>,')
    out.append('};')
    out.append('')
    out.append('/** The fine pixel row of its top line, where a seated pose\'s seat is (rig.ts READ_SEAT_TOP). */')
    out.append(f'export const SEAT_ROCK_SIT_TOP = {top};')
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
