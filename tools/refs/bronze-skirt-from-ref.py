"""The owner's bronze warrior's skirt (docs/reference/bronze-warrior-owner-reference.jpg) as the 'skirt_hoplite' item.

His navy pteruges skirt: the leather straps with their bronze studs and gold tassels, the bronze plate on
the near hip, and the gold meander border round the hem. Brought down to our scale as tools/refs/bronze_ref.py
says (the body's scale, cleaned in his palette); continued up under the cuirass's lower lip.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-skirt-from-ref.py src/sprite/items/hopliteSkirtArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_SKIRT_NAVY': R.middle_colour(p, ['skirt'], ('navy',)),
        'HOPLITE_SKIRT_LEATHER': R.middle_colour(p, ['skirt'], ('warm',)),
    }


if __name__ == '__main__':
    R.run('bronze-skirt-from-ref.py', sys.argv[1], "The owner's navy pteruges skirt (skirt_hoplite).", [
        ('HOPLITE_SKIRT', 'skirt', 'His skirt: hangs from the pelvis; the game cuts it into panels down his seams.'),
    ], 'HOPLITE_SKIRT', bases, sys.argv[2] if len(sys.argv) > 2 else None)
