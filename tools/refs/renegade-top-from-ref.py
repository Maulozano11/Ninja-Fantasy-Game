"""The owner's sleeveless brown tunic and bare arms from his Renegade picture
(docs/reference/renegade-owner-reference.jpg), as the Sleeveless Tunic (top_sleeveless).

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the tunic     the sleeveless brown tunic from the shoulders to its hem under the belt: a V neck with a
                little of his chest's skin in it, a crease from the near armhole across the chest, his
                folds, its far side deep in shadow (SEG letter 't'). It rides the torso about the neck.
  the arms      a sleeveless tunic shows the arms, and his are his own: on each side the bare upper
                arm (the near one lit, the far one a dark rose strip past the tunic, his far shoulder
                included), the forearm and the fist (SEG u f n near, U F N far). Each rides its limb:
                the upper arm about the shoulder, the forearm about the elbow, the fist about the wrist
                (as our hand templates do). His arms hang where ours do, so at rest every pixel is his
                and where he drew it.

His skin follows the character's skin colour (at his lit skin, SKIN, it is his); the tunic follows the
Tunic colour; his black line stays. It writes src/sprite/items/sleevelessTopArt.ts and, in <study>, his
figure beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/renegade-top-from-ref.py src/sprite/items/sleevelessTopArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import renegade_ref as R  # noqa: E402

DOC = (
    "// The owner's sleeveless tunic and bare arms on his Renegade, his pixels (tools/refs/renegade-top-from-ref.py\n"
    '// from docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, _ = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {
        # His tunic brown of middle lightness: the rest of his browns move the way it does.
        'TUNIC_CLOTH': R.base(a, masks, 't', ('cloth',)),
        # His commonest skin on the arms, the broad lit tone: the character's skin colour stands for it.
        'TUNIC_SKIN': R.skin_base(a, masks),
    }
    consts = [
        ('TUNIC_BODY', 't', masks['t'], 'The tunic from the shoulders to the hem under the belt, his V neck and folds: it rides the torso about the neck.', J['neck'], torso),
        ('TUNIC_UPPER_N', 'u', masks['u'], 'The near bare upper arm, lit: it rides the upper arm about the shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('TUNIC_FORE_N', 'f', masks['f'], 'The near forearm: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN')),
        ('TUNIC_FIST_N', 'n', masks['n'], 'The near fist round the grip: it rides the hand about the wrist, as our hand templates do.', J['wristN'], 0.0),
        ('TUNIC_UPPER_F', 'U', masks['U'], 'The far bare shoulder and upper arm, a dark rose strip past the tunic: it rides the upper arm about the shoulder.', J['shoulderF'], R.angle('shoulderF', 'elbowF')),
        ('TUNIC_FORE_F', 'F', masks['F'], 'The far forearm: it rides the forearm about the elbow.', J['elbowF'], R.angle('elbowF', 'wristF')),
        ('TUNIC_FIST_F', 'N', masks['N'], 'The far fist: it rides the hand about the wrist.', J['wristF'], 0.0),
    ]
    text = R.module(a, masks, DOC, 'TUNIC', consts, bases)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, 'UFNtufn', os.path.join(study, 'top@8.png'), box=(26, 24, 76, 66))
    print('bases', bases, {c[0]: int(c[2].sum()) for c in consts})


if __name__ == '__main__':
    main()
