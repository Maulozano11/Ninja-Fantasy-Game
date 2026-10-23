"""Trunks reading, the owner's two frames (docs/reference/trunks-read-owner-reference.jpg; trunks_read_ref.py
says how his picture is read), as painted pieces on our rig: src/sprite/items/trunksReadArt.ts.

Each frame of his ("Leyendo", the book open in both gloved hands; "Libro cerrado", the book shut in the far
hand at the chest) is cut by owner (trunks_read_ref.ZONES) and part, every pixel his, in his colour, one
for one, his black line with each owner it touches. The rock under him is not his Trunks' (the seat prop,
seats.ts, is drawn there instead); its top row is where his figure sits, so a seat is laid with its top
there (TRUNKS_READ_SEAT). The white he left at the waist between the trousers and the belt is filled with
his own cloth (trunks_read_ref.fill_waist). Every piece is pinned to the pelvis of our male rig in the read
pose (PELVIS, printed by `npx tsx tools/refs/trunks-pose-joints.mts`), so laid on it the frame is his, as
he drew it over our read frame.

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/trunks-read-from-ref.py [src/sprite/items/trunksReadArt.ts] [studyDir]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402
import trunks_frames as T  # noqa: E402
import trunks_read_ref as R  # noqa: E402

OUT = 'src/sprite/items/trunksReadArt.ts'
# Our male rig's pelvis in the read pose (every frame), fine pixels: tools/refs/trunks-pose-joints.mts.
PELVIS = (108.000000, 178.600000)
# Where his near and far limbs part, per frame in its own cells: the gloves (a column, or in the second
# frame a row: the far fingers over the book above it) and the boots (a column).
HANDS_SPLIT = {0: ('x', 44), 1: ('y', 38)}
BOOTS_SPLIT = {0: 41, 1: 40}


def parts(k):
    def split(owner, m):
        H, W = m.shape
        ys, xs = np.mgrid[0:H, 0:W]
        if owner == 'hands':
            axis, at = HANDS_SPLIT[k]
            near = (xs < at) if axis == 'x' else (ys >= at)
            return [('N', 'handN', m & near), ('F', 'handF', m & ~near)]
        if owner == 'feet':
            near = xs < BOOTS_SPLIT[k]
            return [('N', 'footN', m & near), ('F', 'footF', m & ~near)]
        return [('T', T.F.PART_OF_OWNER[owner], m)]
    return split


def frame(k):
    m, fg, line = R.frame(k)
    own, masks = R.owners(k)
    fills = R.fill_waist(k, m, fg, line, own)
    m, masks = T.apply_fills(m, masks, fills)
    seat = int(np.nonzero(masks['seat'].any(axis=1))[0].min()) + R.OFFSET[k][1]
    place = lambda x, y: (int(x) + R.OFFSET[k][0], int(y) + R.OFFSET[k][1])
    pcs, want = T.frame_pieces(m, masks, place, PELVIS, parts(k), R.LINE, R)
    return pcs, want, seat, {place(x, y): v for (x, y), v in fills.items()}


DOC = """// Trunks reading: the owner's two frames, his pixels one for one (tools/refs/trunks-read-from-ref.py from
// docs/reference/trunks-read-owner-reference.jpg). Generated: rerun the script to change it.
"""


def study(wants, fills, d):
    os.makedirs(d, exist_ok=True)
    for k, want in enumerate(wants):
        img = np.full((256, 256, 3), 255, np.uint8)
        for (x, y), h in want.items():
            img[y, x] = T.F.rgb(h)
        P.save(img[120:225, 70:160], os.path.join(d, f'read-{k}-his.png'), 6)
        for (x, y) in fills[k]:
            img[y, x] = (255, 0, 255)
        P.save(img[120:225, 70:160], os.path.join(d, f'read-{k}-fills.png'), 6)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    T.clear_of_boxes(R.REF, R.BOXES, R.PITCH, R.PAGE, R.PAGE_TOL)
    frames, wants, seats, fills = [], [], [], []
    for k in range(2):
        pcs, want, seat, fill = frame(k)
        frames.append(pcs)
        wants.append(want)
        seats.append(seat)
        fills.append(fill)
    # (he drew the rock a row higher between the legs in the second frame: the seat is the first frame's)
    assert max(seats) - min(seats) <= 1, seats
    fill_ts = '[\n' + ''.join(f"  [{', '.join(f'[{x}, {y}]' for (x, y) in sorted(f))}],\n" for f in fills) + ']'
    text = T.module(DOC, [
        ('TRUNKS_READ', "His frames 'Leyendo' (the book open) and 'Libro cerrado' (the book shut at the chest), each cut by owner and part, pinned to the pelvis.", 'OwnerPiece[][]', T.ts_frames(frames, R.NAMES)),
        ('TRUNKS_READ_SEAT', 'The fine pixel row his figure sits on: the top of the rock he drew under it in his first frame (a seat prop is laid with its top there).', 'number', str(seats[0])),
        ('TRUNKS_READ_FILLED', "The fine pixels of each frame that were his white at the waist, filled with his cloth (trunks_read_ref.fill_waist).", '[number, number][][]', fill_ts),
    ])
    with open(out, 'w') as f:
        f.write(text)
    if len(sys.argv) > 2:
        study(wants, fills, sys.argv[2])
    print(out, ', '.join(f'{R.NAMES[k]}: {len(frames[k])} pieces, {len(wants[k])} pixels, {len(fills[k])} filled' for k in range(2)), f'seat row {seats[0]}')


if __name__ == '__main__':
    main()
