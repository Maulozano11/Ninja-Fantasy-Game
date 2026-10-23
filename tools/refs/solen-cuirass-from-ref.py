"""The owner's steel segmented cuirass on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the chest   the steel cuirass from under the cowl to its lower edge over the skirt's belt: its lit
              plates and dark seams, the red sash from the far shoulder down across the chest, and the
              thin brown strap from the near shoulder to the far hip with its gold buckle. It rides the
              torso about the neck.

His chest stands where ours does, so it hangs from our neck exactly where he drew it. It writes the piece as
TypeScript (src/sprite/items/founderCuirassArt.ts) and, in <study>, his figure beside the piece at 8x. The
same picture always gives the same bytes:

  python3 -I tools/refs/solen-cuirass-from-ref.py src/sprite/items/founderCuirassArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's steel segmented cuirass with its red sash and brown strap, his pixels (tools/refs/\n"
    '// solen-cuirass-from-ref.py from docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    J = R.JOINTS
    bases = {
        'FOUNDER_STEEL': R.middle(a, masks, cols, ['chest'], ('steel',)),
        'FOUNDER_SASH': R.middle(a, masks, cols, ['chest'], ('red',), 0.75),
        'FOUNDER_STRAP': R.middle(a, masks, cols, ['chest'], ('leather',)),
    }
    consts = [
        ('FOUNDER_CHEST', 'chest', 'The steel cuirass with the red sash and the brown strap: it rides the torso about the neck.', J['neck'], R.angle('pelvis', 'neck')),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_CUIRASS')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['chest'], os.path.join(study, 'cuirass@8.png'), (30, 20, 70, 56), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
