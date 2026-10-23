"""The owner's dark grey cape on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the back   the cape falling from the shoulders behind the body, flaring out behind the near arm to the
             calves in long folds that run down and back, its hem cut in points, and showing between and
             behind the legs. Where his arm, sword, legs and body hide it, it is continued
             (solen_ref.fill_cape): his folds run on up and down, his hem is drawn straight across behind
             each leg and closed by his black line. It hangs from the base of the neck and swings with the
             wind like the other capes.

It writes the piece as TypeScript (src/sprite/items/founderCapeArt.ts) and, in <study>, his figure beside
the piece at 8x (and the continued pixels marked). The same picture always gives the same bytes:

  python3 -I tools/refs/solen-cape-from-ref.py src/sprite/items/founderCapeArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's dark grey cape, his pixels (tools/refs/solen-cape-from-ref.py from\n"
    '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    J = R.JOINTS
    bases = {'FOUNDER_CAPE_CLOTH': R.middle(a, masks, cols, ['cape'], ('grey',), 0.6)}
    consts = [
        ('FOUNDER_CAPE', 'cape', 'The cape behind the body, from the shoulders to its hem: it hangs from the base of the neck.', J['neck'], R.angle('pelvis', 'neck')),
    ]
    hem = int(np.nonzero(masks['cape'].any(axis=1))[0].max())
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_CAPE')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['cape'], os.path.join(study, 'cape@8.png'), (4, 24, 62, 94), filled)
    print('bases', bases, 'hem row', hem)


if __name__ == '__main__':
    main()
