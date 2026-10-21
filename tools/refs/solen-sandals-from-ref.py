"""The owner's laced sandals on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). They are his Roman sandals (feet_gladiator_sandals,
tools/refs/roman-bracers-sandals-from-ref.py) repainted: the same shape and place on the near leg, new laces
and skin between them, the far one 2 px shorter in the shin. This script lifts them out of his Solen as a
second paint of that item, every pixel in his exact colour:

  the shins   on each leg the laced shin from the strap band under the knee to the ankle, the skin
              between the laces his (it follows the character's skin). It turns with the shin.
  the feet    each sandal with its straps over the toes and its brown sole, flat on the ground.

His legs stand wider than ours (solen_ref.LEG_OUT): each piece stays where he drew it and hangs from our
ankle moved LEG_OUT, unturned at rest (src/sprite/items/founderOut.ts founderLegOut moves our legs under
them). It writes the pieces as TypeScript (src/sprite/items/founderSandalsArt.ts) and, in <study>, his
figure beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-sandals-from-ref.py src/sprite/items/founderSandalsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's laced sandals on his Solen, his pixels (tools/refs/solen-sandals-from-ref.py from\n"
    '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)

# The first row of each foot (the sandal widens over the instep there); above it is the shin.
FOOT_FROM = {'N': 92, 'F': 88}


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    rows = np.mgrid[0:a.shape[0], 0:a.shape[1]][0]
    for s in 'NF':
        m = masks['sandal_' + s.lower()]
        for part, sel in (('shin', rows < FOOT_FROM[s]), ('foot', rows >= FOOT_FROM[s])):
            n = f'{part}_{s.lower()}'
            masks[n] = m & sel
            cols[n] = cols['sandal_' + s.lower()]
            filled[n] = filled['sandal_' + s.lower()]
    J = R.JOINTS
    ankle = lambda s: (J['ankle' + s][0] + R.LEG_OUT[s][0], J['ankle' + s][1] + R.LEG_OUT[s][1])
    bases = {
        'FOUNDER_SANDAL_LEATHER': R.middle(a, masks, cols, ['sandal_n', 'sandal_f'], ('leather',)),
        # His skin pieces' base (solen-tunic-from-ref.py): at the character's skin, his skin here is his.
        'FOUNDER_SANDAL_SKIN': R.middle(a, masks, cols, ['arm_n', 'arm_f'], ('skin',), 0.8),
    }
    consts = []
    for s, side in (('N', 'near'), ('F', 'far')):
        shin = R.angle('knee' + s, 'ankle' + s)
        consts.append((f'FOUNDER_SANDAL_SHIN_{s}', f'shin_{s.lower()}', f'The {side} laced shin, from the strap band under the knee to the ankle: it turns with the shin about the ankle (moved LEG_OUT).', ankle(s), shin))
        consts.append((f'FOUNDER_SANDAL_FOOT_{s}', f'foot_{s.lower()}', f'The {side} sandal: straps over the toes, the brown sole. It stays flat on the ground under the ankle (moved LEG_OUT).', ankle(s), shin))
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_SANDAL')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['shin_f', 'foot_f', 'shin_n', 'foot_n'], os.path.join(study, 'sandals@8.png'), (30, 76, 74, 100), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
