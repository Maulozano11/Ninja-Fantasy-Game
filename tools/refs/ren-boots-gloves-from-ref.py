"""The owner's black boots and fingerless gloves from his Ren picture (docs/reference/ren-owner-reference.jpg).

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the boots   on each leg the shaft, its top band of silver and gold over the trousers (the shin piece,
              which turns with the shin about the ankle; it runs on two rows under the top of the foot,
              his two rows above again, so the shin can turn without a gap) and the foot with its gold
              and silver strap and dark sole (the foot piece, which stays flat on the ground like our
              feet). His legs stand a little apart from our rig's (ren_ref.LEG_SHIFT): each boot hangs
              from our ankle (his ankle on ours), and worn with his trousers the game moves both back
              by that much, so at rest they are where he drew them.
  the gloves  the black fingerless gloves: the near fist round the sword's grip, a silver plate over
              its knuckles, his bare fingers under the grip; the far fist hanging closed, his fingers
              curled under it. Each hangs from our wrist as he drew it (his hands are where ours are).
              They are the upgrade of our Fingerless Gloves (hands_fingerless).

It writes the pieces as TypeScript (src/sprite/items/nightBootsGlovesArt.ts) and, in <study>, his figure
beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/ren-boots-gloves-from-ref.py src/sprite/items/nightBootsGlovesArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ren_ref as R  # noqa: E402

DOC = (
    "// The owner's black boots and fingerless gloves on his Ren, his pixels (tools/refs/ren-boots-gloves-from-ref.py\n"
    '// from docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kinds_of(rgb, const):
    k = R.kind(rgb)
    if k in ('blue', 'white'):
        return 'silver'
    # his gloves' bare fingers are skin; on the boots his warm dark browns are the leather's shading
    if k == 'skin' and const.startswith('NIGHT_BOOT'):
        return 'silver' if sum(rgb) > 450 else 'dark'
    return k


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    J = R.JOINTS
    consts = []
    for s, side in (('F', 'far'), ('N', 'near')):
        ankle = R.his_joint('ankle' + s, s)
        shin = R.angle('knee' + s, 'ankle' + s)
        consts.append((f'NIGHT_BOOT_SHIN_{s}', *P[f'boot_{s.lower()}_shin'], f'The {side} boot\'s shaft with its silver and gold band: it turns with the shin about the ankle.', ankle, shin, J['ankle' + s]))
        consts.append((f'NIGHT_BOOT_FOOT_{s}', *P[f'boot_{s.lower()}_foot'], f'The {side} boot\'s foot, its gold and silver strap and dark sole: it stays flat on the ground.', ankle, shin, J['ankle' + s]))
    consts.append(('NIGHT_GLOVE_N', *P['glove_n'], 'The near fist round a grip: the black glove, the silver plate over the knuckles, his bare fingers under the grip.', J['wristN'], R.angle('wristN', 'handN')))
    consts.append(('NIGHT_GLOVE_F', *P['glove_f'], 'The far fist hanging closed: the black glove, his bare fingers curled under it.', J['wristF'], R.angle('wristF', 'handF')))
    bases = {
        'NIGHT_BOOTS': R.middle(a, P, ['boot_n_shin', 'boot_n_foot', 'boot_f_shin', 'boot_f_foot'], ('dark',)),
        'NIGHT_BOOT_GOLD': R.middle(a, P, ['boot_n_shin', 'boot_n_foot', 'boot_f_shin', 'boot_f_foot'], ('gold',)),
        'NIGHT_BOOT_SILVER': R.middle(a, P, ['boot_n_shin', 'boot_n_foot', 'boot_f_shin', 'boot_f_foot'], ('silver', 'white')),
        'NIGHT_GLOVE': R.middle(a, P, ['glove_n', 'glove_f'], ('dark',)),
        'NIGHT_GLOVE_PLATE': R.middle(a, P, ['glove_n', 'glove_f'], ('silver',)),
    }
    R.write(out_ts, R.module(DOC, consts, bases, 'NIGHT_KIT', kinds_of))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['boot_f_shin', 'boot_f_foot', 'boot_n_shin', 'boot_n_foot', 'glove_f', 'glove_n'], os.path.join(study, 'boots-gloves@8.png'), (26, 46, 76, 100))
    print('bases', bases)


if __name__ == '__main__':
    main()
