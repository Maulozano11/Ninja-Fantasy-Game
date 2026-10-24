"""The owner's bronze warrior's diadem (docs/reference/bronze-warrior-owner-reference.jpg) as the 'acc_hoplite_diadem' accessory.

His bronze diadem across the forehead with its small emblem. Brought down to our scale (the head's) as
tools/refs/bronze_ref.py says.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-diadem-from-ref.py src/sprite/items/hopliteDiademArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_DIADEM_BRONZE': R.middle_colour(p, ['diadem'], ('warm',)),
    }


if __name__ == '__main__':
    R.run('bronze-diadem-from-ref.py', sys.argv[1], "The owner's bronze diadem (acc_hoplite_diadem).", [
        ('HOPLITE_DIADEM', 'diadem', 'His diadem: stamped on the face anchor, over the hair.'),
    ], 'HOPLITE_DIADEM', bases, sys.argv[2] if len(sys.argv) > 2 else None)
