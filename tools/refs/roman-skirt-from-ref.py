"""The owner's pteruges skirt and red drapes from his Roman picture (docs/reference/roman-owner-reference.jpg).

His picture is our male in the Imperial War Skirt painted over in his own pixels (tools/refs/roman_ref.py:
one of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his
exact colour:

  the front   the studded leather strips (pteruges) hanging from under the cuirass, the red tunic
              showing between and under them down to its hem over the thighs. It rides the torso,
              about the pelvis, over the legs.
  the drape   the long red cloth open in front: a flap falling out behind the near leg, the inside
              of the cloth between the legs and a flap past the far leg. It hangs behind the legs,
              about the pelvis. Where his legs cover it, each pixel takes the colour of his nearest
              drape pixel in that row (his black outlines of the legs are the legs'), and a black line
              closes it at the bottom. Where his near fist covers it (beside the strips, above the drape's
              top line) the cloth goes on up behind the fist, each column in the colour of his first drape
              pixel below, closed by his black line along the top and the left (our fist hangs a few pixels
              left of his, so the cloth shows there beside it).

His hips stand where ours do, so both hang from our pelvis exactly where he drew them. It writes the
pieces as TypeScript (src/sprite/items/pterugesArt.ts) and, in <study>, his figure beside the pieces at
8x. The same picture always gives the same bytes:

  python3 -I tools/refs/roman-skirt-from-ref.py src/sprite/items/pterugesArt.ts <study>
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402

DOC = (
    "// The owner's pteruges skirt and red drapes, his pixels (tools/refs/roman-skirt-from-ref.py from\n"
    '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


# The drape behind his near fist: his fist covers the cloth from the fist's top line (row 54) down to the
# drape's top line (row 61), from the strips' left line (column 40) back to its left edge. The owner marked
# it on our idle frame: our fist hangs a few pixels left of his, so the cloth shows there.
FIST_ROWS = (54, 60)
FIST_EDGE = 36  # the column of the cloth's left line on the fist's top row


def fist_edge(y):
    """The cloth's left line under his fist on row y: from FIST_EDGE down toward his drape's left line on its
    top row (column 34), so the edge flares out into his."""
    return FIST_EDGE - (y - FIST_ROWS[0]) * 2 // 6


def drape_under_fist(a, masks, cols):
    """The drape continued behind his near fist (FIST_ROWS, from fist_edge to the strips): each column takes
    his colour from the first drape pixel below it (the shadowed cloth under the strips), with his black line
    along the top row and the left edge."""
    m, c = masks['drape'], cols['drape']
    H, W = m.shape
    black = R.his_line(a)
    K = np.array([[R.kind(c[y, x]) for x in range(W)] for y in range(H)])
    solid = m & (K != 'line')
    # The colours the module packs his drape in (R.pack: colours within 3 share the first one met in the
    # rows). The new cells come first in the rows, so every cell is set to the colour it is packed in now
    # (those are more than 3 apart): each pixel of his keeps its colour whatever comes before it.
    _, _, palette = R.pack(c, m)
    packed = [np.array([int(h[k:k + 2], 16) for k in (1, 3, 5)]) for h in palette.values()]
    snap = lambda col: next(p for p in packed if np.abs(p - col).max() <= 3)
    for y, x in zip(*np.nonzero(m)):
        c[y, x] = snap(c[y, x])
    for y in range(FIST_ROWS[0], FIST_ROWS[1] + 1):
        edge = fist_edge(y)
        strips = next(x for x in range(edge, W) if masks['front'][y, x])
        for x in range(edge, strips):
            if m[y, x]:
                continue
            m[y, x] = True
            if x == edge or y == FIST_ROWS[0]:
                c[y, x] = snap(black)
                continue
            below = next(q for q in range(y + 1, H) if solid[q, x])
            c[y, x] = snap(c[below, x])


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {
        # His lit red (three quarters of his reds are darker), the red a player picks for a red tunic.
        'PTERUGES_TUNIC': R.middle(a, masks, cols, ['front', 'drape'], ('red',), 0.75),
        'PTERUGES_LEATHER': R.middle(a, masks, cols, ['front'], ('leather', 'bronze')),
        'PTERUGES_STUD': R.middle(a, masks, cols, ['front'], ('stud',)),
    }
    # after the bases, which count only his own pixels
    drape_under_fist(a, masks, cols)
    consts = [
        ('PTERUGES_FRONT', 'front', 'The studded leather strips over the red tunic, down to its hem: it rides the torso about the pelvis.', J['pelvis'], torso),
        ('PTERUGES_DRAPE', 'drape', 'The long red cloth open in front, behind the legs: it hangs from the pelvis.', J['pelvis'], torso),
    ]
    text = R.module(a, masks, cols, DOC, consts, bases)
    # the drape's first rows are those under his fist (knocked out, they stay under the body)
    assert int(np.nonzero(masks['drape'].any(axis=1))[0].min()) == FIST_ROWS[0]
    text += ('\n/** How many of the drape\'s first rows are the cloth his fist hides (continued by the script). */\n'
             f'export const PTERUGES_DRAPE_FIST_ROWS = {FIST_ROWS[1] - FIST_ROWS[0] + 1};\n')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['drape', 'front'], os.path.join(study, 'skirt@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
