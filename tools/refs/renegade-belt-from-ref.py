"""The owner's woven rope belt from his Renegade picture (docs/reference/renegade-owner-reference.jpg), as
the Braided Rope Belt (waist_rope).

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). His belt is a broad band of woven rope round the waist, tan and gold in
a diagonal weave between two near-black brown lines, knotted at the near hip, its two ends hanging down in
front of the near thigh behind the fist (olive, gold and rust). This script lifts it out of his pixels
(SEG letter 'b') as two pieces, both riding the torso about the pelvis:

  the band   the woven band round the waist (rows above 55): Rope recolours it;
  the ends   the knot's hanging ends (rows 55 down): Tassels recolours them.

It writes src/sprite/items/ropeBeltArt.ts and, in <study>, his figure beside the belt at 8x. The same
picture always gives the same bytes:

  python3 -I tools/refs/renegade-belt-from-ref.py src/sprite/items/ropeBeltArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import renegade_ref as R  # noqa: E402

DOC = (
    "// The owner's woven rope belt on his Renegade, his pixels (tools/refs/renegade-belt-from-ref.py from\n"
    '// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# The band's lower line is his row 54-55; below it hang the ends.
ENDS_FROM = 55
# Where the ends pass behind the fist's bottom and the kunai's handle on their way from the knot (x 38-40)
# to the tails over the thigh (x 31-35): a polygon of his pixel corners. When the fist moves away it shows,
# so there each hidden pixel takes the colour of his nearest pixel of the ends (the knot's browns above,
# the tails' olive below), and his line closes it on the outside.
ENDS_HIDDEN = [(34, 61), (39, 61), (37, 65), (33, 65)]


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, _ = R.pieces(a)
    rows = np.arange(a.shape[0])[:, None]
    band = masks['b'] & (rows < ENDS_FROM)
    ends = masks['b'] & (rows >= ENDS_FROM)
    col = a.copy()
    H, W = ends.shape
    own = ends & (R.luma(a) >= R.LINE_LUMA)
    hidden = R.inside(ENDS_HIDDEN, H, W) & ~ends
    oy, ox = np.nonzero(own)
    for y, x in zip(*np.nonzero(hidden)):
        k = int(np.argmin((oy - y) ** 2 + (ox - x) ** 2))
        col[y, x] = a[oy[k], ox[k]]
    ends = ends | hidden
    # his line on the fill's outer edge: where it meets neither the ends nor the fill
    for y, x in zip(*np.nonzero(hidden)):
        if any(not ends[y + dy, x + dx] for dy, dx in ((0, 1), (0, -1))):
            col[y, x] = a[R.SEG_LINE_PIXEL]
    parts = {'B': band, 'E': ends}
    bases = {
        'BELT_ROPE': R.base(a, {'b': band}, 'b', ('cloth',)),
        'BELT_ENDS': R.base(a, {'b': ends & ~hidden}, 'b', ('cloth',)),
    }
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    consts = [
        ('BELT_BAND', 'b', band, 'The woven rope band round the waist between his two dark lines: it rides the torso about the pelvis.', J['pelvis'], torso),
        ('BELT_ENDS_PIECE', 'b', ends, "The knot's two hanging ends in front of the near thigh: they ride the torso about the pelvis.", J['pelvis'], torso),
    ]
    text = R.module(a, masks, DOC, 'BELT', consts, bases, cols=col)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, parts, 'BE', os.path.join(study, 'belt@8.png'), box=(26, 44, 70, 76), cols=col)
    print('bases', bases, 'band', int(band.sum()), 'ends', int(ends.sum()))


if __name__ == '__main__':
    main()
