"""The owner's long open coat with its red lining from his tactical paint-over
(docs/reference/tactical-coat-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/tactical_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the front     the near lapel beside the vest and the panel hanging from under the near sleeve, in
                front of the near leg, to its hem with the red lining showing. Where the lightning in
                his near hand, its blue light and the near arm cover it, his black cloth runs on up
                from below (his long folds) to its outer edge, drawn straight from under the sleeve to
                where his line shows again.
  the back      the far panel past the far leg and the red lining between the legs; below the vest,
                behind the trousers and the boots, his cloth laid across each row again (his folds run
                on behind them).
  the collar    the standing collar each side of the neck.
  the far lapel the strip of coat between the vest and the far arm.
  the sleeves   the near sleeve over the shoulder and the bit of the far one past the far lapel.

The front, back, collar and lapel ride the torso about the neck (the panels hang and sway below the
waist, in src/sprite/items/tactical.ts); each sleeve rides its upper arm about the shoulder. It writes
the pieces as TypeScript (src/sprite/items/tacticalCoatArt.ts) and, in <study>, his figure beside the
pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/tactical-coat-from-ref.py src/sprite/items/tacticalCoatArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tactical_ref as R  # noqa: E402

DOC = (
    "// The owner's long open coat with its red lining, his pixels (tools/refs/tactical-coat-from-ref.py from\n"
    '// docs/reference/tactical-coat-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    consts = [
        ('TACTICAL_COAT_BACK', P['back'], 'The far panel and the lining between the legs: it hangs from the neck behind the body.', J['neck'], torso),
        ('TACTICAL_COAT_COLLAR', P['collar'], 'The standing collar each side of the neck: it rides the torso about the neck.', J['neck'], torso),
        ('TACTICAL_COAT_LAPEL_F', P['lapel_f'], 'The far lapel between the vest and the far arm: it rides the torso about the neck.', J['neck'], torso),
        ('TACTICAL_COAT_FRONT', P['front_n'], 'The near lapel and the panel in front of the near leg to the hem: it hangs from the neck.', J['neck'], torso),
        ('TACTICAL_COAT_SLEEVE_F', P['sleeve_f'], 'The far sleeve past the far lapel: it rides the far upper arm about the shoulder.', J['shoulderF'], R.angle('shoulderF', 'elbowF')),
        ('TACTICAL_COAT_SLEEVE_N', P['sleeve_n'], 'The near sleeve over the shoulder: it rides the near upper arm about the shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
    ]
    coat = [P[n] for n in ('front_n', 'back', 'collar', 'lapel_f', 'sleeve_n', 'sleeve_f')]
    bases = {
        'TACTICAL_COAT_BLACK': R.middle(a, coat, ('dark',)),
        'TACTICAL_COAT_LINING': R.middle(a, coat, ('red',)),
    }
    R.write(out_ts, R.module(DOC, consts, bases, 'TACTICAL_COAT'))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['back', 'lapel_f', 'collar', 'front_n', 'sleeve_f', 'sleeve_n'], os.path.join(study, 'coat@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
