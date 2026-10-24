"""The owner's boots on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the feet item
'Noble Boots', black boots with gold trim, his pixels at our scale (tools/refs/noble_ref.py).

Each boot is cut where its foot starts (noble_ref.BOOT_FOOT_FROM): the shaft (with its gold band) turns with
the shin about his ankle and runs on two rows under the foot's top so no gap opens at the ankle; the foot stands
on the ground. What the sword hides of the near boot is his leather continued across. It writes
src/sprite/items/nobleBootsArt.ts:

  python3 -I tools/refs/noble-boots-from-ref.py src/sprite/items/nobleBootsArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


def kind_of(rgb, const):
    k = N.kind(rgb)
    return k if k in ('line', 'gold') else 'leather'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    consts = []
    for s in ('N', 'F'):
        n = 'boot_' + s.lower()
        consts.append((f'NOBLE_BOOT_SHIN_{s}', *P[n + '_shin'], 'The shaft: it turns with the shin about his ankle.', J['ankle' + s], N.angle_of(J['knee' + s], J['ankle' + s])))
        consts.append((f'NOBLE_BOOT_FOOT_{s}', *P[n + '_foot'], 'The foot: it stands on the ground under his ankle.', J['ankle' + s], 0))
    names = ['boot_n_shin', 'boot_n_foot', 'boot_f_shin', 'boot_f_foot']
    bases = {'NOBLE_BOOTS': N.middle(names, P, ('dark',)), 'NOBLE_BOOT_GOLD': N.middle(names, P, ('gold',))}
    N.run_part('noble-boots-from-ref.py', "The owner's boots on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_BOOTS', kind_of)


if __name__ == '__main__':
    main()
