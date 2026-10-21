"""The owner's olive cargo trousers from his Renegade picture (docs/reference/renegade-owner-reference.jpg),
as the Baggy Cargo Pants (bottom_cargo).

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). His trousers are a dark olive, mottled with lighter and darker patches,
a near-black waistband under the tunic's hem, a big pocket with a buttoned flap on the near thigh and
another on the far thigh's side, the legs ending in a dark cuff over the wraps. This script lifts them out
of his pixels as five pieces, every pixel in his exact colour:

  the seat    the waistband and the top of both legs (SEG 'p'): it rides the torso about the pelvis.
  the thighs  each leg from the hip to the knee (SEG 'a' near, 'A' far, the pockets with them): it
              rides the thigh about the hip.
  the shins   each leg below the knee to its cuff (SEG 's' near, 'S' far): it rides the shin about the
              knee.

His legs stand where ours do, so at rest every pixel is his and where he drew it. Pants recolours his
olive; his black line and the button's grey stay. It writes src/sprite/items/cargoTrousersArt.ts and, in
<study>, his figure beside the trousers at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/renegade-trousers-from-ref.py src/sprite/items/cargoTrousersArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import renegade_ref as R  # noqa: E402

DOC = (
    "// The owner's olive cargo trousers on his Renegade, his pixels (tools/refs/renegade-trousers-from-ref.py\n"
    '// from docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, _ = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    bases = {'CARGO_CLOTH': R.base(a, masks, 'paAsS', ('cloth',))}
    consts = [
        ('CARGO_SEAT', 'p', masks['p'], 'The waistband and the top of both legs: it rides the torso about the pelvis.', J['pelvis'], torso),
        ('CARGO_THIGH_N', 'a', masks['a'], 'The near leg from the hip to the knee, its buttoned pocket: it rides the thigh about the hip.', J['hipN'], R.angle('hipN', 'kneeN')),
        ('CARGO_SHIN_N', 's', masks['s'], 'The near leg below the knee to its cuff: it rides the shin about the knee.', J['kneeN'], R.angle('kneeN', 'ankleN')),
        ('CARGO_THIGH_F', 'A', masks['A'], "The far leg from the hip to the knee, the pocket on its side: it rides the thigh about the hip.", J['hipF'], R.angle('hipF', 'kneeF')),
        ('CARGO_SHIN_F', 'S', masks['S'], 'The far leg below the knee to its cuff: it rides the shin about the knee.', J['kneeF'], R.angle('kneeF', 'ankleF')),
    ]
    text = R.module(a, masks, DOC, 'CARGO', consts, bases)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, 'ASpas', os.path.join(study, 'trousers@8.png'), box=(36, 54, 76, 90))
    print('bases', bases, {c[0]: int(c[2].sum()) for c in consts})


if __name__ == '__main__':
    main()
