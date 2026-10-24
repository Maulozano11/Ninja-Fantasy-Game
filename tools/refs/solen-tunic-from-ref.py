"""The owner's navy tunic and bare arms on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the sleeve      the navy short sleeve on the near shoulder, under the cowl: it rides the near upper arm.
  the arms        each bare upper arm from under the sleeve to the bracer, in his skin and his shading (his
                  lit deltoid and biceps, the rosy shadow down the back of the arm, his black line). Each
                  rides its upper arm about the shoulder.
  the fists       his near hand closed round the sword's grip and his far hand hanging closed beside the
                  skirt, in his skin: each rides its wrist.

His near arm stands where ours does. He drew the far arm thinner and nearer the body than ours: the far
pieces stay where he drew them and turn about our far joints moved solen_ref.FAR_OUT, and the game moves
our far arm there under them (src/sprite/items/clothes.ts founderFarOut).

His skin follows the character's skin in the game. It writes the pieces as TypeScript
(src/sprite/items/founderTunicArt.ts) and, in <study>, his figure beside the pieces at 8x. The same picture
always gives the same bytes:

  python3 -I tools/refs/solen-tunic-from-ref.py src/sprite/items/founderTunicArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's navy sleeve and bare upper arms in his skin, his pixels (tools/refs/solen-tunic-from-ref.py\n"
    '// from docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    J = R.JOINTS
    far = lambda j: (J[j][0] + R.FAR_OUT[0], J[j][1] + R.FAR_OUT[1])
    bases = {
        'FOUNDER_TUNIC': R.middle(a, masks, cols, ['sleeve_n'], ('navy',)),
        # His lit skin (four fifths of his skin pixels are darker) stands for the character's skin colour,
        # which our bodies show in the light.
        'FOUNDER_ARM_SKIN': R.middle(a, masks, cols, ['arm_n', 'arm_f'], ('skin',), 0.8),
    }
    extra = ('/** How far his far arm hangs from ours at rest (fine pixels): his far pieces turn about our far joints moved this far. */\n'
             f'export const FOUNDER_FAR_OUT: [number, number] = [{R.FAR_OUT[0]}, {R.FAR_OUT[1]}];')
    consts = [
        ('FOUNDER_SLEEVE_N', 'sleeve_n', 'The navy short sleeve on the near shoulder: it rides the near upper arm about the shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('FOUNDER_ARM_N', 'arm_n', 'The bare near upper arm in his skin: it rides the near upper arm about the shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('FOUNDER_ARM_F', 'arm_f', 'The bare far upper arm in his skin: it rides the far upper arm about the shoulder (moved FAR_OUT).', far('shoulderF'), R.angle('shoulderF', 'elbowF')),
        ('FOUNDER_HAND_N', 'hand_n', 'The near fist round the grip, in his skin: it rides the near wrist.', J['wristN'], R.angle('wristN', 'handN')),
        ('FOUNDER_HAND_F', 'hand_f', 'The far fist hanging closed, in his skin: it rides the far wrist (moved FAR_OUT).', far('wristF'), R.angle('wristF', 'handF')),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_TUNIC', extra)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['arm_f', 'hand_f', 'arm_n', 'sleeve_n', 'hand_n'], os.path.join(study, 'tunic@8.png'), (26, 28, 72, 62), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
