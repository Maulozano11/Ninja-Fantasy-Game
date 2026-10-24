"""The owner's bronze warrior's cape and scarf (docs/reference/bronze-warrior-owner-reference.jpg) as the 'cape_hoplite' item.

His deep purple cape hanging behind him from the shoulders and flaring out behind the near arm, and the
scarf of the same cloth wrapped round his neck. Brought down to our scale as tools/refs/bronze_ref.py says;
the cape continued behind his body and legs (a step shows it between them).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-cape-from-ref.py src/sprite/items/hopliteCapeArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_CAPE_CLOTH': R.middle_colour(p, ['cape', 'scarf'], ('purple',)),
    }


if __name__ == '__main__':
    R.run('bronze-cape-from-ref.py', sys.argv[1], "The owner's purple cape and scarf (cape_hoplite).", [
        ('HOPLITE_CAPE', 'cape', 'His cape behind him: hangs from the neck.'),
        ('HOPLITE_SCARF', 'scarf', "His scarf round the neck, in front of the chest and the head's neck."),
    ], 'HOPLITE_CAPE', bases, sys.argv[2] if len(sys.argv) > 2 else None)
