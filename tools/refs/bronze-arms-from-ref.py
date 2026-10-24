"""The owner's bronze warrior's arms (docs/reference/bronze-warrior-owner-reference.jpg) as the 'hands_hoplite_bracers' item.

His bare muscular arms below the pauldrons, his spiral bronze bracers with their fingerless wraps, and his
fists. Each arm in three pieces turned about our joints: the upper arm (continued up under the pauldron to
the shoulder), the bracer, the fist. Brought down to our scale as tools/refs/bronze_ref.py says.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-arms-from-ref.py src/sprite/items/hopliteArmsArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_ARMS_BRONZE': R.middle_colour(p, ['bracer_n', 'bracer_f'], ('warm',)),
        'HOPLITE_ARMS_SKIN': R.middle_colour(p, ['arm_n', 'arm_f', 'fist_n', 'fist_f'], ('skin',)),
    }


if __name__ == '__main__':
    R.run('bronze-arms-from-ref.py', sys.argv[1], "The owner's bare arms, bronze bracers and fists (hands_hoplite_bracers).", [
        ('HOPLITE_ARM_N', 'arm_n', 'His near upper arm: rides the near shoulder.'),
        ('HOPLITE_BRACER_N', 'bracer_n', 'His near bracer: rides the near elbow.'),
        ('HOPLITE_FIST_N', 'fist_n', 'His near fist in its wrap: rides the near wrist.'),
        ('HOPLITE_ARM_F', 'arm_f', 'His far upper arm: rides the far shoulder.'),
        ('HOPLITE_BRACER_F', 'bracer_f', 'His far bracer: rides the far elbow.'),
        ('HOPLITE_FIST_F', 'fist_f', 'His far fist in its wrap: rides the far wrist.'),
    ], 'HOPLITE_ARMS', bases, sys.argv[2] if len(sys.argv) > 2 else None)
