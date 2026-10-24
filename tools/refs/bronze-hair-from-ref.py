"""The owner's bronze warrior's hair (docs/reference/bronze-warrior-owner-reference.jpg) as the 'hair_hoplite' item.

His long wild black hair (at the head's scale) and his braid tied in bronze bands (at the body's scale, from
where it leaves his head): both stamped on the face anchor. Brought down to our scale as
tools/refs/bronze_ref.py says.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-hair-from-ref.py src/sprite/items/hopliteHairArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_HAIR_BASE': R.middle_colour(p, ['hair', 'braid'], ('hair', 'navy')),
        'HOPLITE_HAIR_BAND': R.middle_colour(p, ['braid'], ('warm',)),
    }


if __name__ == '__main__':
    R.run('bronze-hair-from-ref.py', sys.argv[1], "The owner's long black hair and braid (hair_hoplite).", [
        ('HOPLITE_HAIR', 'hair', 'His hair: stamped on the face anchor, over the face.'),
        ('HOPLITE_BRAID', 'braid', 'His braid in its bronze bands: stamped on the face anchor, behind the head and shoulders.'),
    ], 'HOPLITE_HAIR', bases, sys.argv[2] if len(sys.argv) > 2 else None)
