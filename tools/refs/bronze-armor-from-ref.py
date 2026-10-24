"""The owner's bronze warrior's cuirass (docs/reference/bronze-warrior-owner-reference.jpg) as the 'armor_hoplite' item.

His bronze cuirass: the chest with its spirals, the leather strap across it, the dark steel band under the
pectorals, the lion-face belly plate, the belt with its buckle and the leather side; and the round bronze
clasp on his near shoulder, in front of the scarf. Brought down to our scale as tools/refs/bronze_ref.py says
(the body's scale, cleaned in his palette); the chest continued up under his scarf to the neck, so without the
cape the cuirass still closes round the neck.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-armor-from-ref.py src/sprite/items/hopliteArmorArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_ARMOR_BRONZE': R.middle_colour(p, ['cuirass', 'clasp'], ('warm',)),
        'HOPLITE_ARMOR_STEEL': R.middle_colour(p, ['cuirass'], ('grey',)),
    }


if __name__ == '__main__':
    R.run('bronze-armor-from-ref.py', sys.argv[1], "The owner's bronze cuirass (armor_hoplite).", [
        ('HOPLITE_CHEST', 'cuirass', 'His cuirass: rides the neck, leaning with the torso.'),
        ('HOPLITE_CLASP', 'clasp', 'The round bronze clasp on his near shoulder, in front of the scarf.'),
    ], 'HOPLITE_ARMOR', bases, sys.argv[2] if len(sys.argv) > 2 else None)
