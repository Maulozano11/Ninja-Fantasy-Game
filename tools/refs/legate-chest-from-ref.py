"""The owner's Roman legate's chest (docs/reference/roman-legate-owner-reference.jpg, the right figure) as armor_legate.

His grey-steel cuirass with the gold eagle and spirals, brought down to our scale and cleaned as
tools/refs/legate_ref.py says, with his neck on ours, continued up under his beard to the neck and under the
pauldrons and sleeves.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/legate-chest-from-ref.py src/sprite/items/legateChestArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import legate_ref as L  # noqa: E402


def bases(p):
    return {
        'LEGATE_STEEL': L.middle(p, ['cuirass'], ('grey', 'hair', 'navy')),
        'LEGATE_GOLD': L.middle(p, ['cuirass'], ('warm',)),
    }


if __name__ == '__main__':
    L.run('legate-chest-from-ref.py', sys.argv[1], "The owner's Roman legate's grey cuirass with the gold eagle.", [
        ('LEGATE_CHEST', 'cuirass', 'His grey cuirass: rides the neck, leaning with the torso.'),
    ], 'LEGATE_CHEST', bases)
