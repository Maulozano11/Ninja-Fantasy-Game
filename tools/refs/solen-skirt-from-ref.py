"""The owner's studded war skirt on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). It is his Roman skirt (tools/refs/roman-skirt-from-ref.py) repainted: a brown
belt under the cuirass, lighter brown leather strips with grey studs and a gold stud at each strip's end,
over the red tunic. This script lifts it out of his Solen, every pixel in his exact colour:

  the front   the belt, the studded strips and the red tunic showing between and under them down to its
              hem over the thighs. Behind his near hand and the sword's guard its left strips and hem are
              continued (solen_ref.clone_fill: cloned from his strips a shift away, closed by his line).
              It rides the torso about the pelvis, over the legs.

His hips stand where ours do, so it hangs from our pelvis exactly where he drew it. It writes the piece as
TypeScript (src/sprite/items/founderSkirtArt.ts) and, in <study>, his figure beside the piece at 8x. The
same picture always gives the same bytes:

  python3 -I tools/refs/solen-skirt-from-ref.py src/sprite/items/founderSkirtArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's studded war skirt over a red tunic, his pixels (tools/refs/solen-skirt-from-ref.py from\n"
    '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    J = R.JOINTS
    bases = {
        # His lit red (three quarters of his reds are darker), the red a player picks for a red tunic.
        'FOUNDER_SKIRT_TUNIC': R.middle(a, masks, cols, ['skirt'], ('red',), 0.75),
        'FOUNDER_SKIRT_LEATHER': R.middle(a, masks, cols, ['skirt'], ('leather',)),
        'FOUNDER_SKIRT_STUD': R.middle(a, masks, cols, ['skirt'], ('gold',)),
    }
    consts = [
        ('FOUNDER_SKIRT', 'skirt', 'The belt, the studded leather strips and the red tunic under them: it rides the torso about the pelvis.', J['pelvis'], R.angle('pelvis', 'neck')),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_SKIRT')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['skirt'], os.path.join(study, 'skirt@8.png'), (32, 46, 70, 72), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
