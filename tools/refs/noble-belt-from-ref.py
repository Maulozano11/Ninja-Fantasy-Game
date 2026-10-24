"""The owner's belt on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the waist item
'Noble Belt', a brown belt with a round gold buckle, his pixels at our scale (tools/refs/noble_ref.py). What his
near arm hides of it is his leather continued across. It writes src/sprite/items/nobleBeltArt.ts:

  python3 -I tools/refs/noble-belt-from-ref.py src/sprite/items/nobleBeltArt.ts [studyDir]
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
    consts = [('NOBLE_BELT', *P['belt'], 'The belt and its buckle: it rides the pelvis.', J['pelvis'], N.angle_of(J['pelvis'], J['neck']))]
    bases = {'NOBLE_BELT_LEATHER': N.middle(['belt'], P, ('brown', 'dark')), 'NOBLE_BELT_GOLD': N.middle(['belt'], P, ('gold',))}
    N.run_part('noble-belt-from-ref.py', "The owner's belt on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_BELT', kind_of)


if __name__ == '__main__':
    main()
