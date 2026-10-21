"""The owner's open blue jacket over a dark-grey shirt, and his bare fists, from his Trunks 3 picture
(docs/reference/trunks3-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the body      the jacket from its high collar to its hem, open down the front over the dark-grey
                shirt: it rides the torso about the neck.
  the sleeves   each long sleeve cut into the upper arm (about the shoulder) and the forearm with its
                cuff (about the elbow); they overlap two rows at the elbow, so a bent arm opens no gap.
  the fists     his bare fists under the cuffs, in the character's skin: the near one round the
                sword's grip (the grip shows between his fingers; the same fist closes on nothing), the
                far one hanging. They ride the wrists in place of our closed hands.

Each piece is pinned to our joint where it lies in his picture, so at rest every pixel is his, where he
drew it. His blues follow the Jacket slot, his greys the Tank Top slot; his black line stays.

It writes the pieces as TypeScript (src/sprite/items/bomberJacketArt.ts) and, in <study>, his figure
beside them at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-bomber-from-ref.py src/sprite/items/bomberJacketArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's open blue jacket over a dark-grey shirt, and his bare fists, his pixels\n"
    '// (tools/refs/trunks-bomber-from-ref.py from docs/reference/trunks3-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, K, M, P, _black = R.trunks3()
    A = lambda j, k: R.angle('trunks3', j, k)  # noqa: E731
    grip = {R.hexc(a[y, x]) for y, x in zip(*R.np.nonzero(M['sword'] & P['fist_n'][0]))}
    cloth = R.by_kind({'grey': 'under', 'pale': 'under'}, 'main')
    skin_kind = R.by_kind({}, 'skin')
    skin = lambda h: 'line' if h in grip else skin_kind(h)  # noqa: E731
    pieces = []
    for s, side in (('F', 'far'), ('N', 'near')):
        k = s.lower()
        pieces += [
            (f'BOMBER_SLEEVE_UP_{s}', *P['sleeve_up_' + k], f'The {side} sleeve over the upper arm: it turns with it about the shoulder.', 'shoulder' + s, A('shoulder' + s, 'elbow' + s), cloth),
            (f'BOMBER_SLEEVE_FORE_{s}', *P['sleeve_fore_' + k], f'The {side} sleeve over the forearm, its cuff: it turns with it about the elbow.', 'elbow' + s, A('elbow' + s, 'wrist' + s), cloth),
            (f'BOMBER_FIST_{s}', *P['fist_' + k], f'His bare {side} fist' + (" round the sword's grip" if s == 'N' else ', hanging') + ': it rides the wrist.', 'wrist' + s, A('wrist' + s, 'hand' + s), skin),
        ]
        if s == 'F':
            pieces.append(('BOMBER_BODY', *P['jacket'], 'The jacket from its high collar to its hem, open over the grey shirt: it rides the torso about the neck.', 'neck', A('pelvis', 'neck'), cloth))
    R.run('trunks3', out_ts, DOC, pieces, 'BOMBER', {'main': 'BOMBER_BLUE', 'under': 'BOMBER_SHIRT'})
    if study:
        os.makedirs(study, exist_ok=True)
        names = ('sleeve_up_f', 'sleeve_fore_f', 'fist_f', 'jacket', 'sleeve_up_n', 'sleeve_fore_n', 'fist_n')
        R.study(a, [P[n] for n in names], os.path.join(study, 'bomber@8.png'))


if __name__ == '__main__':
    main()
