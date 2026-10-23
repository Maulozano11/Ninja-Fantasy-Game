"""Trunks sitting, the owner's frame (docs/reference/trunks-sit-owner-reference.jpg; trunks_sit_ref.py says how
his picture is read and brought down to our scale), as painted pieces on our rig: src/sprite/items/trunksSitArt.ts.

His frame (no book: the near hand in his glove resting on the thigh, the far arm reaching forward, the
open palm up) is cut by owner (trunks_sit_ref.ZONES) and part, every pixel his, in his colour, his black
line with each owner it touches. His two hands are the standard for the hands of characters to come (the
owner: "usa sus dos manos como referencia y standard para futuros disenos de personajes"): they are his,
exactly. The rock under him is not his Trunks' (the seat prop, seats.ts); its top row is where his figure
sits (TRUNKS_SIT_SEAT). The white at his waist, right of the gloved hand between his shirt and his far
thigh, is filled with his trousers (trunks_sit_ref.fill_waist). He painted one frame: every frame of the
sit pose shows it (our sit's frames only breathe), every piece pinned to the pelvis of our male rig in
the sit pose (PELVIS, printed by `npx tsx tools/refs/trunks-pose-joints.mts`).

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/trunks-sit-from-ref.py [src/sprite/items/trunksSitArt.ts] [studyDir]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import owner_paintover as P  # noqa: E402
import trunks_frames as T  # noqa: E402
import trunks_read_ref as RR  # noqa: E402
import trunks_sit_ref as S  # noqa: E402

OUT = 'src/sprite/items/trunksSitArt.ts'
# Our male rig's pelvis in the sit pose (every frame), fine pixels: tools/refs/trunks-pose-joints.mts.
PELVIS = (110.000000, 185.000000)
# Where his near and far limbs part, in the frame's cells: the gloves (his near hand on the thigh is below
# this row, his far hand reaching out above it) and the boots (a column).
HANDS_ROW = 43
BOOTS_COL = 45


def parts(owner, m):
    H, W = m.shape
    ys, xs = np.mgrid[0:H, 0:W]
    if owner == 'hands':
        near = ys > HANDS_ROW
        return [('N', 'handN', m & near), ('F', 'handF', m & ~near)]
    if owner == 'feet':
        near = xs < BOOTS_COL
        return [('N', 'footN', m & near), ('F', 'footF', m & ~near)]
    return [('T', T.F.PART_OF_OWNER[owner], m)]


def frame():
    m, fg, line = S.frame(0)
    own, masks = S.owners(0)
    fills = S.fill_waist(0, m, fg, line, own)
    m, masks = T.apply_fills(m, masks, fills)
    seat = int(np.nonzero(masks['seat'].any(axis=1))[0].min()) + S.OFFSET[1]
    place = lambda x, y: (int(x) + S.OFFSET[0], int(y) + S.OFFSET[1])
    pcs, want = T.frame_pieces(m, masks, place, PELVIS, parts, S.LINE, RR)
    return pcs, want, seat, {place(x, y): v for (x, y), v in fills.items()}


DOC = """// Trunks sitting: the owner's frame, his pixels (tools/refs/trunks-sit-from-ref.py from
// docs/reference/trunks-sit-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.
"""


def study(want, fills, d):
    os.makedirs(d, exist_ok=True)
    img = np.full((256, 256, 3), 255, np.uint8)
    for (x, y), h in want.items():
        img[y, x] = T.F.rgb(h)
    P.save(img[120:225, 60:170], os.path.join(d, 'sit-his.png'), 6)
    for (x, y) in fills:
        img[y, x] = (255, 0, 255)
    P.save(img[120:225, 60:170], os.path.join(d, 'sit-fills.png'), 6)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    T.clear_of_boxes(S.REF, S.BOXES, S.PITCH, S.PAGE, S.PAGE_TOL)
    pcs, want, seat, fills = frame()
    fill_ts = '[' + ', '.join(f'[{x}, {y}]' for (x, y) in sorted(fills)) + ']'
    text = T.module(DOC, [
        ('TRUNKS_SIT', 'His frame, cut by owner and part, pinned to the pelvis: every frame of the sit pose.', 'OwnerPiece[]', T.ts_pieces(pcs)),
        ('TRUNKS_SIT_SEAT', 'The fine pixel row his figure sits on: the top of the rock he drew under it (a seat prop is laid with its top there).', 'number', str(seat)),
        ('TRUNKS_SIT_FILLED', "The fine pixels that were his white at the waist, filled with his trousers (trunks_sit_ref.fill_waist).", '[number, number][]', fill_ts),
    ])
    with open(out, 'w') as f:
        f.write(text)
    if len(sys.argv) > 2:
        study(want, fills, sys.argv[2])
    print(out, f'{len(pcs)} pieces, {len(want)} pixels, {len(fills)} filled, seat row {seat}')


if __name__ == '__main__':
    main()
