"""The owner's pteruges skirt and red drapes from his Roman picture (docs/reference/roman-owner-reference.jpg).

His picture is our male in the Imperial War Skirt painted over in his own pixels (tools/refs/roman_ref.py:
one of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his
exact colour:

  the front   the studded leather strips (pteruges) hanging from under the cuirass, the red tunic
              showing between and under them down to its hem over the thighs. It rides the torso,
              about the pelvis, over the legs.
  the drape   the long red cloth open in front: a flap falling out behind the near leg, the inside
              of the cloth between the legs and a flap past the far leg. It hangs behind the legs,
              about the pelvis. Where his legs cover it, each pixel takes the colour of his nearest
              drape pixel in that row (his black outlines of the legs are the legs'), and a black line
              closes it at the bottom.

His hips stand where ours do, so both hang from our pelvis exactly where he drew them. It writes the
pieces as TypeScript (src/sprite/items/pterugesArt.ts) and, in <study>, his figure beside the pieces at
8x. The same picture always gives the same bytes:

  python3 -I tools/refs/roman-skirt-from-ref.py src/sprite/items/pterugesArt.ts <study>
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import roman_ref as R  # noqa: E402

DOC = (
    "// The owner's pteruges skirt and red drapes, his pixels (tools/refs/roman-skirt-from-ref.py from\n"
    '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {
        # His lit red (three quarters of his reds are darker), the red a player picks for a red tunic.
        'PTERUGES_TUNIC': R.middle(a, masks, cols, ['front', 'drape'], ('red',), 0.75),
        'PTERUGES_LEATHER': R.middle(a, masks, cols, ['front'], ('leather', 'bronze')),
        'PTERUGES_STUD': R.middle(a, masks, cols, ['front'], ('stud',)),
    }
    consts = [
        ('PTERUGES_FRONT', 'front', 'The studded leather strips over the red tunic, down to its hem: it rides the torso about the pelvis.', J['pelvis'], torso),
        ('PTERUGES_DRAPE', 'drape', 'The long red cloth open in front, behind the legs: it hangs from the pelvis.', J['pelvis'], torso),
    ]
    text = R.module(a, masks, cols, DOC, consts, bases)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['drape', 'front'], os.path.join(study, 'skirt@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
