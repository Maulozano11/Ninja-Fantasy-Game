"""The owner's open-toe shin boots and short far glove from his tactical paint-over
(docs/reference/tactical-coat-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/tactical_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the boots   black shin boots open at the toes and the heel: on each leg the shaft (the shin piece,
              which turns with the shin about the ankle; it runs on two rows under the top of the foot,
              his two rows above again, so the shin can turn without a gap) and the foot with its band,
              his bare toes and the sole (the foot piece, which stays flat on the ground like our feet).
              The near shaft is under the coat's hem above the foot: it is continued up the shin from
              his rows to as high above the sole as his far boot's. His far foot stands 5 px lower and
              1 px further back than ours (tactical_ref.LEG_SHIFT): each boot hangs from our ankle (his
              ankle on ours).
  the glove   the short dark glove on his far wrist, its glint and its line (his fist below it is bare:
              that is our hand). His far arm hangs about 3 px lower than ours, so it hangs from our
              wrist (his wrist on ours).

It writes the pieces as TypeScript (src/sprite/items/tacticalBootsGloveArt.ts) and, in <study>, his
figure beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/tactical-boots-glove-from-ref.py src/sprite/items/tacticalBootsGloveArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tactical_ref as R  # noqa: E402

DOC = (
    "// The owner's open-toe shin boots and short far glove, his pixels (tools/refs/tactical-boots-glove-from-ref.py\n"
    '// from docs/reference/tactical-coat-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kinds_of(rgb, const):
    k = R.kind(rgb)
    # the glove has no skin: its warm grey glint is the glove's
    if const.startswith('TACTICAL_GLOVE') and k == 'skin':
        return 'dark'
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
        consts.append((f'TACTICAL_BOOT_SHIN_{s}', P[f'boot_{s.lower()}_shin'], f"The {side} boot's shaft: it turns with the shin about the ankle.", ankle, shin, J['ankle' + s]))
        consts.append((f'TACTICAL_BOOT_FOOT_{s}', P[f'boot_{s.lower()}_foot'], f"The {side} boot's foot, its band, his bare toes and the sole: it stays flat on the ground.", ankle, shin, J['ankle' + s]))
    consts.append(('TACTICAL_GLOVE_F', P['glove_f'], 'The short glove on the far wrist: it turns with the forearm about the wrist.', R.HIS_WRIST_F, R.angle('elbowF', 'wristF'), J['wristF']))
    boots = [P[n] for n in ('boot_n_shin', 'boot_n_foot', 'boot_f_shin', 'boot_f_foot')]
    bases = {
        'TACTICAL_BOOTS': R.middle(a, boots, ('dark',)),
        'TACTICAL_GLOVE': R.middle(a, [P['glove_f']], ('dark',)),
        'TACTICAL_SKIN': R.his_skin(a),
    }
    R.write(out_ts, R.module(DOC, consts, bases, 'TACTICAL_KIT', kinds_of))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['boot_f_shin', 'boot_f_foot', 'boot_n_shin', 'boot_n_foot', 'glove_f'], os.path.join(study, 'boots-glove@8.png'), (36, 50, 76, 100))
    print('bases', bases)


if __name__ == '__main__':
    main()
