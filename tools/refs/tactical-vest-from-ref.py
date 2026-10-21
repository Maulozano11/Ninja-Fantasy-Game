"""The owner's padded tactical vest from his tactical paint-over
(docs/reference/tactical-coat-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/tactical_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour, the vest:
its quilted front (four rows of pads each side of the centre seam), the black binding at the top and the
two dark bands at the bottom. Under the coat's near lapel it goes on to the side of the torso (his
panels continued from beside it, closed on his line), as his vest-only picture shows. It rides the torso
about the neck. His green is only his: the game recolours it (the owner: "solo cambiale los colores").

It writes the piece as TypeScript (src/sprite/items/tacticalVestArt.ts) and, in <study>, his figure
beside the piece at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/tactical-vest-from-ref.py src/sprite/items/tacticalVestArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tactical_ref as R  # noqa: E402

DOC = (
    "// The owner's padded tactical vest, his pixels (tools/refs/tactical-vest-from-ref.py from\n"
    '// docs/reference/tactical-coat-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    J = R.JOINTS
    consts = [
        ('TACTICAL_VEST', P['vest'], 'The padded vest from its top binding to its bottom bands: it rides the torso about the neck.', J['neck'], R.angle('pelvis', 'neck')),
    ]
    bases = {
        'TACTICAL_VEST_GREEN': R.middle(a, [P['vest']], ('green',)),
        'TACTICAL_VEST_TRIM': R.middle(a, [P['vest']], ('dark',)),
    }
    R.write(out_ts, R.module(DOC, consts, bases, 'TACTICAL_VEST'))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['vest'], os.path.join(study, 'vest@8.png'), (36, 26, 70, 68))
    print('bases', bases)


if __name__ == '__main__':
    main()
