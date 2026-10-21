"""The owner's brown cloth mask from his Renegade picture (docs/reference/renegade-owner-reference.jpg), as
the Cloth Mask (face_clothmask): Renegado 1 and 2 and the Raider wear it.

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). His mask is a dark brown cloth pulled up over the nose to just under
the eyes, wrapped round the jaw and the neck, its front hanging in a point over the tunic's collar, a few
lit folds and a reddish stain on it. This script lifts it out of his pixels (SEG letter 'm'), with his
black line round it, as one piece stamped with its pivot on our face anchor (the near eye's lash start),
so it sits on the face as he drew it on every body and in every pose.

It writes src/sprite/items/clothMaskArt.ts and, in <study>, his head beside the mask at 8x. The same
picture always gives the same bytes:

  python3 -I tools/refs/renegade-mask-from-ref.py src/sprite/items/clothMaskArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import renegade_ref as R  # noqa: E402

DOC = (
    "// The owner's cloth mask on his Renegade, his pixels (tools/refs/renegade-mask-from-ref.py from\n"
    '// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, _ = R.pieces(a)
    # His commonest brown (the mask's shadowed cloth): his stain and lit folds move the way it does.
    bases = {'MASK_CLOTH': R.commonest(a, masks, 'm', ('cloth',))}
    consts = [
        ('CLOTH_MASK', 'm', masks['m'], 'His mask from under the eyes to its point over the collar, wrapped round the jaw and neck: its pivot is the cell on our face anchor.', R.ANCHOR, 0.0),
    ]
    text = R.module(a, masks, DOC, 'CLOTH_MASK', consts, bases)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, 'm', os.path.join(study, 'mask@8.png'), box=(38, 10, 68, 40))
    print('bases', bases, 'px', int(masks['m'].sum()))


if __name__ == '__main__':
    main()
