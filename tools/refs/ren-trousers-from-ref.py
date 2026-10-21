"""The owner's black trousers from his Ren picture (docs/reference/ren-owner-reference.jpg).

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). Of his trousers only the shins show, baggy blue-black cloth between the hem of his
skirt and his boots (and the far thigh in the slit of the skirt): every pixel of them is his. The rest
of each leg, under the skirt and his blade, is his cloth continued up each column from his pixels below
(his creases run on up the leg), closed on his line (ren_ref.pieces). Each leg is two pieces:

  the thigh   from the hip to the knee: it turns with the thigh about the hip
  the shin    from the knee into the boot: it turns with the shin about the knee

His legs stand a little apart from our rig's (ren_ref.LEG_SHIFT: his near leg 5 px further back, his
far leg 1 px back and 5 px lower). Each piece hangs from our joint (his hip on our hip, his knee on our
knee); worn with his boots, the game moves both by NIGHT_LEG_SHIFT, so at rest his legs are where he
drew them (src/sprite/items/night.ts). It writes the pieces as TypeScript
(src/sprite/items/nightTrousersArt.ts) and, in <study>, his figure beside the pieces at 8x. The same
picture always gives the same bytes:

  python3 -I tools/refs/ren-trousers-from-ref.py src/sprite/items/nightTrousersArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref as R  # noqa: E402

DOC = (
    "// The owner's black trousers on his Ren, his pixels (tools/refs/ren-trousers-from-ref.py from\n"
    '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def split(piece, s):
    """A leg's band cut at his knee: the thigh above the line across the leg there, the shin below."""
    m, c = piece
    H, W = m.shape
    hip, knee = R.his_joint('hip' + s, s), R.his_joint('knee' + s, s)
    ax, ay = knee[0] - hip[0], knee[1] - hip[1]
    ys, xs = np.mgrid[0:H, 0:W]
    below = (xs + 0.5 - knee[0]) * ax + (ys + 0.5 - knee[1]) * ay > 0
    return (m & ~below, c), (m & below, c)


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    J = R.JOINTS
    consts = []
    for s, side in (('F', 'far'), ('N', 'near')):
        thigh, shin = split(P['trousers_' + s.lower()], s)
        consts.append((f'NIGHT_THIGH_{s}', *thigh, f'The {side} thigh, hip to knee (under the skirt): it turns with the thigh about the hip.', R.his_joint('hip' + s, s), R.angle('hip' + s, 'knee' + s), J['hip' + s]))
        consts.append((f'NIGHT_SHIN_{s}', *shin, f'The {side} shin, knee into the boot: it turns with the shin about the knee.', R.his_joint('knee' + s, s), R.angle('knee' + s, 'ankle' + s), J['knee' + s]))
    bases = {'NIGHT_TROUSERS': R.middle(a, P, ['trousers_n', 'trousers_f'], ('dark',))}
    shift = ['/**',
             ' * How far his legs stand from our rig\'s at rest (fine pixels): worn with his boots, his trousers and',
             ' * boots hang from our hip, knee and ankle moved this far, so at rest they are where he drew them.',
             ' */',
             'export const NIGHT_LEG_SHIFT: Record<\'N\' | \'F\', [number, number]> = { ' + ', '.join(f'{s}: [{R.LEG_SHIFT[s][0]}, {R.LEG_SHIFT[s][1]}]' for s in ('N', 'F')) + ' };',
             '']
    R.write(out_ts, R.module(DOC, consts, bases, 'NIGHT_TROUSERS') + '\n'.join(shift))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['trousers_f', 'trousers_n'], os.path.join(study, 'trousers@8.png'), (30, 50, 70, 90))
    print('bases', bases)


if __name__ == '__main__':
    main()
