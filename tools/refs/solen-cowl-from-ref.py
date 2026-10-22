"""The owner's cowl on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the cowl      the dark grey cloth wound round the neck under the chin and over the far shoulder, with
                its gold stud on the chest. It rides the torso about the neck.
  the near end  the same cloth over the near shoulder, with its gold stud, in front of the arm's sleeve:
                it rides the near shoulder (left of COWL_SPLIT).
  the stud      the white stud on the far shoulder, over the cowl's end: it rides the far shoulder.

His neck and shoulders stand where ours do, so every piece hangs from our joint exactly where he drew it.
It writes the pieces as TypeScript (src/sprite/items/founderCowlArt.ts) and, in <study>, his figure beside
the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-cowl-from-ref.py src/sprite/items/founderCowlArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's cowl with its gold studs and the white stud on the far shoulder, his pixels (tools/refs/\n"
    '// solen-cowl-from-ref.py from docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)

# The cowl over the near shoulder is the columns left of this (his near shoulder's cloth, in front of the
# sleeve); the rest wraps the neck.
COWL_SPLIT = 47


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    xs = np.mgrid[0:a.shape[0], 0:a.shape[1]][1]
    masks['cowl_n'] = masks['cowl'] & (xs < COWL_SPLIT)
    masks['cowl'] = masks['cowl'] & (xs >= COWL_SPLIT)
    cols['cowl_n'] = cols['cowl']
    filled['cowl_n'] = filled['cowl']
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {
        'FOUNDER_COWL': R.middle(a, masks, cols, ['cowl', 'cowl_n'], ('grey',)),
        'FOUNDER_COWL_GOLD': R.middle(a, masks, cols, ['cowl', 'cowl_n'], ('gold',)),
        'FOUNDER_COWL_STUD': R.middle(a, masks, cols, ['stud_f'], ('white', 'stud', 'steel')),
    }
    consts = [
        ('FOUNDER_COWL_NECK', 'cowl', 'The cowl wound round the neck and over the far shoulder, its gold stud: it rides the torso about the neck.', J['neck'], torso),
        ('FOUNDER_COWL_NEAR', 'cowl_n', 'The cowl over the near shoulder with its gold stud, in front of the sleeve: it rides the near shoulder.', J['shoulderN'], torso),
        ('FOUNDER_COWL_STUD_F', 'stud_f', 'The white stud on the far shoulder: it rides the far shoulder.', J['shoulderF'], torso),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_COWL')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['cowl', 'cowl_n', 'stud_f'], os.path.join(study, 'cowl@8.png'), (26, 20, 70, 42), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
