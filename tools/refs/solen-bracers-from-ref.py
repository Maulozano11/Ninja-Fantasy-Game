"""The owner's steel bracers on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). They are his Roman bracers (tools/refs/roman-bracers-sandals-from-ref.py)
repainted in steel; this script lifts them out of his Solen, every pixel in his exact colour:

  the bracers   the steel bracer on each forearm, from below the elbow to the wrist (the near one broad
                and lit, the far one darker). Each rides its forearm about the elbow. His near arm stands
                where ours does, so at rest the near bracer is where he drew it. He drew the far arm nearer
                the body than ours: the far bracer stays where he drew it and turns about our far elbow
                moved solen_ref.FAR_OUT (src/sprite/items/clothes.ts founderFarOut).

It writes the pieces as TypeScript (src/sprite/items/steelBracersArt.ts) and, in <study>, his figure beside
the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-bracers-from-ref.py src/sprite/items/steelBracersArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's steel bracers, his pixels (tools/refs/solen-bracers-from-ref.py from\n"
    '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    J = R.JOINTS
    far_elbow = (J['elbowF'][0] + R.FAR_OUT[0], J['elbowF'][1] + R.FAR_OUT[1])
    bases = {'STEEL_BRACER': R.middle(a, masks, cols, ['bracer_n', 'bracer_f'], ('steel',))}
    consts = [
        ('STEEL_BRACER_N', 'bracer_n', 'The near steel bracer, elbow to wrist: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN')),
        ('STEEL_BRACER_F', 'bracer_f', 'The far steel bracer: it rides the forearm about the elbow.', far_elbow, R.angle('elbowF', 'wristF')),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'STEEL_BRACER')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['bracer_f', 'bracer_n'], os.path.join(study, 'bracers@8.png'), (26, 42, 70, 58), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
