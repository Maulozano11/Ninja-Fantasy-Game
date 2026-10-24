"""The owner's sword on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the held item
'Jewel Sabre', a long glowing pale-blue blade, a gold cross-guard with a red jewel and a gold grip; his pixels at
our scale (tools/refs/noble_ref.py). The grip his near fist hides is his gold run on along the blade's line from
the guard, his line on its sides. Its pivot is the cell on our near hand joint, where his fist holds it; its
angle the blade's. It writes src/sprite/items/jewelSabreArt.ts:

  python3 -I tools/refs/noble-sabre-from-ref.py src/sprite/items/jewelSabreArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS
# His blade's line, guard to point, in his own pixels (noble_ref.GRIP lies on it).
BLADE = ((78.0, 126.0), (114.0, 195.0))


def kind_of(rgb, const):
    k = N.kind(rgb)
    if k in ('line', 'gold', 'red'):
        return k
    if k in ('blue', 'white', 'core'):
        return 'blade'
    return 'gold'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    ang = N.angle_of(*BLADE)
    consts = [('JEWEL_SABRE', *P['sabre'], 'The sabre: its pivot on the near hand joint, where his fist holds it; its angle the blade\'s.', J['handN'], ang)]
    bases = {
        'JEWEL_SABRE_BLADE': N.middle(['sabre'], P, ('blue',)),
        'JEWEL_SABRE_GOLD': N.middle(['sabre'], P, ('gold',)),
        'JEWEL_SABRE_JEWEL': N.middle(['sabre'], P, ('red',), 0.7),
    }
    N.run_part('noble-sabre-from-ref.py', "The owner's sword on his noble swordsman", out_ts, study, consts, bases, 'JEWEL_SABRE', kind_of)


if __name__ == '__main__':
    main()
