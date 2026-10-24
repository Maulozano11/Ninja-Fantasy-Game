"""The owner's noble coat on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the top
'Noble Coat'.

His picture is brought to our scale by tools/refs/noble_ref.py (the body shrunk evenly by 2, cleaned with his
palette only). His coat is black cloth with gold piping: the torso round the chest's front (the front itself is
the armour 'Noble Breastplate', noble-front-from-ref.py), the sleeves in his dark plum cloth from under the
cape's mantles to the cuffs, and the tails below the belt (the front flaps over the thighs, the long near tail
with its gold ornament, the long far tail). This script lifts:

  body     the torso, with what the front, the mantles, the collar, the belt and the near arm hide continued
           from his cloth (each column down, then across), its sides and shoulders on his line
           (noble_ref.COAT_SHAPE): worn without the cape or the front it is still whole
  sleeves  each arm's sleeve cut at the elbow: the upper arm up under the mantle to the shoulder, the forearm
           down under the cuff to the wrist, his cloth run on along the arm
  tails    the tails, what the sword hides of them continued down each column

and writes src/sprite/items/nobleCoatArt.ts. Run from the repo root:

  python3 -I tools/refs/noble-coat-from-ref.py src/sprite/items/nobleCoatArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


# How far past the elbow (along the upper arm) the upper sleeve reaches: beyond it the cloth goes with the
# forearm, so the bent arm shows no corner of the upper sleeve poking out past the elbow.
SLEEVE_PAST = 1.0


def kind_of(rgb, const):
    k = N.kind(rgb)
    return k if k in ('line', 'gold') else 'cloth'


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    consts = [('NOBLE_COAT_BODY', *P['coat'], 'The torso: it rides the torso about the neck.', J['neck'], N.angle_of(J['pelvis'], J['neck']))]
    for s in ('N', 'F'):
        m, c = P['sleeve_' + s.lower()]
        up, lo = N.split(m, J['shoulder' + s], J['elbow' + s], J['wrist' + s], SLEEVE_PAST)
        consts.append((f'NOBLE_SLEEVE_{s}_UPPER', up, c, 'The upper sleeve: it rides the upper arm about the shoulder.', J['shoulder' + s], N.angle_of(J['shoulder' + s], J['elbow' + s])))
        consts.append((f'NOBLE_SLEEVE_{s}_LOWER', lo, c, 'The forearm\'s sleeve (under the cuff): it rides the forearm about the elbow.', J['elbow' + s], N.angle_of(J['elbow' + s], J['wrist' + s])))
    consts.append(('NOBLE_TAILS', *P['tails'], "The coat's tails below the belt: they hang from the pelvis.", J['pelvis'], N.angle_of(J['pelvis'], J['neck'])))
    bases = {
        'NOBLE_COAT': N.middle(['coat', 'tails'], P, ('dark',)),
        'NOBLE_COAT_GOLD': N.middle(['coat', 'tails'], P, ('gold',)),
    }
    N.run_part('noble-coat-from-ref.py', "The owner's noble coat on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_COAT', kind_of)


if __name__ == '__main__':
    main()
