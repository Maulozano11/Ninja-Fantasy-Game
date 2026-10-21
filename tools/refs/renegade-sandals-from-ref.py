"""The owner's dark wrapped sandals from his Renegade picture (docs/reference/renegade-owner-reference.jpg),
as the Wrapped Sandals (feet_wrapsandals).

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). On each leg he drew dark grey-brown cloth wrapped in bands round the
shin from the trouser cuff down to the ankle, and an open sandal: the wraps go on over the instep, his
toes show bare over a dark sole. This script lifts them out of his pixels as four pieces, like the Roman
sandals (tools/refs/roman-bracers-sandals-from-ref.py):

  the wraps   each shin's wrapped bands (SEG 'w' near, 'W' far): they turn with the shin about the ankle.
  the feet    each sandal with its toes (SEG 'o' near, 'O' far), seen from the front (near) or pointing
              right (far): it stays flat on the ground like our feet.

His legs stand where ours do, so at rest every pixel is his and where he drew it. Wraps recolours his
cloth; his toes follow the character's skin; his black line stays. It writes
src/sprite/items/wrapSandalsArt.ts and, in <study>, his figure beside the sandals at 8x. The same picture
always gives the same bytes:

  python3 -I tools/refs/renegade-sandals-from-ref.py src/sprite/items/wrapSandalsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import renegade_ref as R  # noqa: E402

DOC = (
    "// The owner's wrapped sandals on his Renegade, his pixels (tools/refs/renegade-sandals-from-ref.py\n"
    '// from docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, _ = R.pieces(a)
    J = R.JOINTS
    bases = {
        'WRAP_CLOTH': R.base(a, masks, 'wWoO', ('cloth',)),
        # His skin's base (the arms' lit tone, as in the tunic's pieces): the character's skin colour stands for it.
        'WRAP_SKIN': R.skin_base(a, masks),
    }
    consts = [
        ('WRAP_SHIN_N', 'w', masks['w'], "The near shin's wrapped bands: they turn with the shin about the ankle.", J['ankleN'], R.angle('kneeN', 'ankleN')),
        ('WRAP_FOOT_N', 'o', masks['o'], 'The near sandal from the front: the wraps over the instep, his bare toes, the dark sole.', J['ankleN'], R.angle('kneeN', 'ankleN')),
        ('WRAP_SHIN_F', 'W', masks['W'], "The far shin's wrapped bands: they turn with the shin about the ankle.", J['ankleF'], R.angle('kneeF', 'ankleF')),
        ('WRAP_FOOT_F', 'O', masks['O'], 'The far sandal pointing right: the wraps over the instep, his toes, the sole.', J['ankleF'], R.angle('kneeF', 'ankleF')),
    ]
    text = R.module(a, masks, DOC, 'WRAP', consts, bases)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, 'WOwo', os.path.join(study, 'sandals@8.png'), box=(38, 72, 76, 100))
    print('bases', bases, {c[0]: int(c[2].sum()) for c in consts})


if __name__ == '__main__':
    main()
