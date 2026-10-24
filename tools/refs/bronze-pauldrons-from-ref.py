"""The owner's bronze warrior's pauldrons (docs/reference/bronze-warrior-owner-reference.jpg) as the 'acc_hoplite_pauldrons' accessory.

His big spiral-engraved bronze pauldrons with the leather strips (and their bronze studs) hanging under
them: the near one over the near shoulder in front of everything there, the far one behind the scarf.
Brought down to our scale as tools/refs/bronze_ref.py says (the body's scale, cleaned in his palette).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-pauldrons-from-ref.py src/sprite/items/hoplitePauldronsArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_PAULDRON_BRONZE': R.middle_colour(p, ['pauldron_n', 'pauldron_f'], ('warm',)),
    }


if __name__ == '__main__':
    R.run('bronze-pauldrons-from-ref.py', sys.argv[1], "The owner's bronze pauldrons (acc_hoplite_pauldrons).", [
        ('HOPLITE_PAULDRON_N', 'pauldron_n', 'His near pauldron and its strips: rides the near shoulder.'),
        ('HOPLITE_PAULDRON_F', 'pauldron_f', 'His far pauldron and its strips: rides the far shoulder.'),
    ], 'HOPLITE_PAULDRON', bases, sys.argv[2] if len(sys.argv) > 2 else None)
