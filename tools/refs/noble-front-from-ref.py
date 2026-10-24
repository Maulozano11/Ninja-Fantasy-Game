"""The owner's chest front on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the armour
'Noble Breastplate' (the front of his suit).

At our scale (tools/refs/noble_ref.py) his front is the white ruffled cravat at the throat, the gold chains across
it and the front panel of his suit between its two gold piping lines down to the belt. What the collar, the
studs, his chin and the belt hide of it is his cloth continued down each column. Worn without it the coat's chest
is his cloth continued (noble-coat-from-ref.py). It writes src/sprite/items/nobleFrontArt.ts:

  python3 -I tools/refs/noble-front-from-ref.py src/sprite/items/nobleFrontArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


def kind_of(rgb, const):
    k = N.kind(rgb)
    return k if k in ('line', 'gold', 'white') else 'cloth'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    consts = [('NOBLE_FRONT', *P['front'], 'The cravat, the chains and the front panel: it rides the torso about the neck.', J['neck'], N.angle_of(J['pelvis'], J['neck']))]
    bases = {
        'NOBLE_FRONT_CLOTH': N.middle(['front'], P, ('dark',)),
        'NOBLE_FRONT_GOLD': N.middle(['front'], P, ('gold',)),
        'NOBLE_CRAVAT': N.middle(['front'], P, ('white',)),
    }
    N.run_part('noble-front-from-ref.py', "The owner's chest front on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_FRONT', kind_of)


if __name__ == '__main__':
    main()
