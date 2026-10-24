"""The owner's gloves and cuffs on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the
hands item 'Noble Cuffs', his pixels at our scale (tools/refs/noble_ref.py).

  cuffs   the purple cuffs with their gold bands, from below the elbow to the wrist: each rides its forearm
          about the elbow
  gloves  his near glove, black with a gold trim on its back, closed round the sword's grip; his far glove,
          fingerless, his bare fingers closed: each rides its hand about the wrist

It writes src/sprite/items/nobleHandsArt.ts:

  python3 -I tools/refs/noble-hands-from-ref.py src/sprite/items/nobleHandsArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


def kind_of(rgb, const):
    k = N.kind(rgb)
    return k if k in ('line', 'gold', 'skin', 'purple') else 'dark'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    consts = []
    for s in ('N', 'F'):
        consts.append((f'NOBLE_CUFF_{s}', *P['cuff_' + s.lower()], 'The cuff: it rides the forearm about the elbow.', J['elbow' + s], N.angle_of(J['elbow' + s], J['wrist' + s])))
        consts.append((f'NOBLE_GLOVE_{s}', *P['glove_' + s.lower()], 'The fist: it rides the hand about the wrist.', J['wrist' + s], N.angle_of(J['wrist' + s], J['hand' + s])))
    bases = {
        'NOBLE_GLOVES': N.middle(['glove_n', 'glove_f'], P, ('dark',)),
        'NOBLE_CUFFS': N.middle(['cuff_n', 'cuff_f'], P, ('purple',)),
        'NOBLE_CUFF_GOLD': N.middle(['cuff_n', 'cuff_f'], P, ('gold',)),
        'NOBLE_HAND_SKIN': N.middle(['glove_f'], P, ('skin',), 0.8),
    }
    N.run_part('noble-hands-from-ref.py', "The owner's gloves and cuffs on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_HANDS', kind_of)


if __name__ == '__main__':
    main()
