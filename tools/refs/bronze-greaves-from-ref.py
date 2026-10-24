"""The owner's bronze warrior's legs, greaves and shoes (docs/reference/bronze-warrior-owner-reference.jpg) as the 'feet_hoplite_greaves' item.

His bare thighs below the skirt (continued up under it to the hip), his engraved bronze greaves over the
knees and shins, and his brown shoes. Each leg in three pieces turned about our joints. Brought down to our
scale as tools/refs/bronze_ref.py says.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-greaves-from-ref.py src/sprite/items/hopliteGreavesArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_GREAVES_BRONZE': R.middle_colour(p, ['greave_n', 'greave_f'], ('warm',)),
        'HOPLITE_GREAVES_SHOE': R.middle_colour(p, ['shoe_n', 'shoe_f'], ('warm',)),
        'HOPLITE_GREAVES_SKIN': R.middle_colour(p, ['thigh_n', 'thigh_f'], ('skin',)),
    }


if __name__ == '__main__':
    R.run('bronze-greaves-from-ref.py', sys.argv[1], "The owner's bare thighs, bronze greaves and shoes (feet_hoplite_greaves).", [
        ('HOPLITE_THIGH_N', 'thigh_n', 'His near thigh: rides the near hip.'),
        ('HOPLITE_GREAVE_N', 'greave_n', 'His near greave: rides the near knee.'),
        ('HOPLITE_SHOE_N', 'shoe_n', 'His near shoe: rides the near ankle.'),
        ('HOPLITE_THIGH_F', 'thigh_f', 'His far thigh: rides the far hip.'),
        ('HOPLITE_GREAVE_F', 'greave_f', 'His far greave: rides the far knee.'),
        ('HOPLITE_SHOE_F', 'shoe_f', 'His far shoe: rides the far ankle.'),
    ], 'HOPLITE_GREAVES', bases, sys.argv[2] if len(sys.argv) > 2 else None)
