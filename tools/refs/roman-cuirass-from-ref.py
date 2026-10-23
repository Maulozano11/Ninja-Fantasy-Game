"""The owner's bronze muscle cuirass and leather shoulder guards from his Roman picture
(docs/reference/roman-owner-reference.jpg).

His picture is our male in the Bronze Cuirass painted over in his own pixels (tools/refs/roman_ref.py:
one of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his
exact colour:

  the chest      the sculpted bronze cuirass from the collar to its lower lip: pectorals, the six
                 plates of the belly, its dark leather sides. It rides the torso, about the neck.
                 Under the near shoulder guard his chest is hidden: there its left line goes on up
                 (x = 43) to the top line, and each column takes his colour from the chest below.
  the guards     the two leather shoulder guards (the near one in two studded lames over the upper
                 arm, the far one a dark edge past the chest). Each rides its shoulder and turns part
                 of the way with the upper arm, like the plate's pauldrons.

His chest and arms stand where ours do, so every piece hangs from our joint exactly where he drew it.
It writes the pieces as TypeScript (src/sprite/items/bronzeCuirassArt.ts) and, in <study>, his figure
beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/roman-cuirass-from-ref.py src/sprite/items/bronzeCuirassArt.ts <study>
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import roman_ref as R  # noqa: E402

DOC = (
    "// The owner's bronze muscle cuirass and leather shoulder guards, his pixels (tools/refs/roman-cuirass-from-ref.py\n"
    '// from docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {
        'CUIRASS_BRONZE': R.middle(a, masks, cols, ['chest'], ('bronze',)),
        'CUIRASS_LEATHER': R.middle(a, masks, cols, ['guard_n', 'guard_f'], ('leather',)),
    }
    consts = [
        ('CUIRASS_CHEST', 'chest', 'The sculpted bronze chest from the collar to its lower lip, its dark leather sides: it rides the torso about the neck.', J['neck'], torso),
        ('CUIRASS_GUARD_N', 'guard_n', 'The near leather shoulder guard, two studded lames over the upper arm: it rides the near shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('CUIRASS_GUARD_F', 'guard_f', 'The far leather shoulder guard, its dark edge past the chest: it rides the far shoulder.', J['shoulderF'], R.angle('shoulderF', 'elbowF')),
    ]
    text = R.module(a, masks, cols, DOC, consts, bases)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['guard_f', 'chest', 'guard_n'], os.path.join(study, 'cuirass@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
