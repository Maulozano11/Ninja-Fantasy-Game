"""The owner's leather tassets (Lamellar Tassets) from his Akira picture
(docs/reference/akira-owner-reference.jpg).

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour, the
tassets hanging from under the belt: the near plates in three riveted rows over the near thigh, the
dark strips between the legs and the far plates. They ride the torso, about the pelvis, over the legs.
His katana's guard and blade hide the near plates' lower corner: there each row of plates goes on
(his plates cloned along the row) to their left line (x 41) and their bottom line (row 65).

His hips stand where ours do, so they hang from our pelvis exactly where he drew them. It writes the
piece as TypeScript (src/sprite/items/emberTassetsArt.ts) and, in <study>, his figure beside it at 8x.
The same picture always gives the same bytes:

  python3 -I tools/refs/akira-tassets-from-ref.py src/sprite/items/emberTassetsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's leather tassets, his pixels (tools/refs/akira-tassets-from-ref.py from\n"
    '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# His darkest browns, the strips between the legs and the lacing between the rows: the Laces slot.
LACE_LUMA = 34


def kind_of(h):
    k = R.kind(R.rgb(h))
    if k == 'line':
        return 'line'
    if k in ('hair', 'grey', 'white'):
        return 'rivet'
    return 'lace' if R.hex_luma(h) < LACE_LUMA else 'leather'


def main():
    a = R.native()
    masks, cols, _ = R.pieces(a)
    J = R.JOINTS
    m, c = masks['tassets'], cols['tassets']
    bases = {
        'TASSET_LEATHER': R.middle(a, [(m & (R.luma(c) >= LACE_LUMA), c)], ('leather', 'skin')),
        'TASSET_LACE': R.middle(a, [(m & (R.luma(c) < LACE_LUMA), c)], ('leather',)),
    }
    consts = [
        ('TASSET_FRONT', m, c, 'The near plates, the dark strips between the legs and the far plates: they ride the torso about the pelvis.', J['pelvis'], R.angle('pelvis', 'neck'), (0, 0)),
    ]
    R.run(DOC, 'TASSET', consts, bases, kind_of)


if __name__ == '__main__':
    main()
