"""The owner's black jacket from his Ren picture (docs/reference/ren-owner-reference.jpg).

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). This script lifts the jacket out of it, every pixel in his exact colour:

  the body     the black jacket from the high collar to the waist: his folds, the seam of its front
               opening and three silver buttons beside it. It rides the torso about the neck. Under
               the sleeves his chest runs on from beside them, and under the belt it runs on down to
               the hips (ren_ref.pieces), so no gap shows without the belt or when the arms swing.
  the sleeves  the short sleeves, each riding its upper arm about the shoulder.
  the arms     his bare forearms below the sleeves, in his skin shading with his dark plum line round
               them: each rides its forearm about the elbow. The character's skin moves them as far as
               it moves from his (src/sprite/painted.ts skinTone).

His chest and arms stand where ours do, so at rest every piece is where he drew it. It writes the pieces
as TypeScript (src/sprite/items/nightJacketArt.ts) and, in <study>, his figure beside the pieces at 8x.
The same picture always gives the same bytes:

  python3 -I tools/refs/ren-jacket-from-ref.py src/sprite/items/nightJacketArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ren_ref as R  # noqa: E402

DOC = (
    "// The owner's black jacket on his Ren, his pixels (tools/refs/ren-jacket-from-ref.py from\n"
    '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kinds_of(rgb, const):
    """His forearms are all skin (his dark plum line round them too); the rest as kind() sorts it."""
    k = R.kind(rgb)
    if const.startswith('NIGHT_ARM') and k != 'line':
        return 'skin'
    return 'silver' if k in ('blue', 'white') else k


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    J = R.JOINTS
    bases = {
        'NIGHT_JACKET': R.middle(a, P, ['jacket', 'sleeve_n', 'sleeve_f'], ('dark',)),
        'NIGHT_BUTTONS': R.middle(a, P, ['jacket'], ('silver', 'blue')),
    }
    consts = [
        ('NIGHT_JACKET_BODY', *P['jacket'], 'The jacket from the high collar to the hips, its front opening and silver buttons: it rides the torso about the neck.', J['neck'], R.angle('pelvis', 'neck')),
        ('NIGHT_SLEEVE_N', *P['sleeve_n'], 'The near short sleeve: it rides the upper arm about the shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('NIGHT_SLEEVE_F', *P['sleeve_f'], 'The far short sleeve: it rides the upper arm about the shoulder.', J['shoulderF'], R.angle('shoulderF', 'elbowF')),
        ('NIGHT_ARM_N', *P['fore_n'], 'The near bare forearm in his skin shading: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN')),
        ('NIGHT_ARM_F', *P['fore_f'], 'The far bare forearm in his skin shading: it rides the forearm about the elbow.', J['elbowF'], R.angle('elbowF', 'wristF')),
    ]
    R.write(out_ts, R.module(DOC, consts, bases, 'NIGHT_JACKET', kinds_of))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['sleeve_f', 'fore_f', 'jacket', 'sleeve_n', 'fore_n'], os.path.join(study, 'jacket@8.png'), (26, 22, 72, 58))
    print('bases', bases)


if __name__ == '__main__':
    main()
