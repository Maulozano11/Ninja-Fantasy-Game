"""The owner's Roman general's two cuirasses (docs/reference/roman-general-owner-reference.jpg) as two armor options.

  armor_general_spiral   the left figure's bronze cuirass with gold spirals all over and a lion face, and its
                         belt with the buckle
  armor_general_muscle   the right figure's gold muscle cuirass (sculpted abs and pecs, a lion face at the
                         chest, spirals at the shoulders), and its belt
Brought down to our scale and cleaned as tools/refs/general_ref.py says, each with its neck on ours, continued
up under the scarf to the neck and under the pauldrons and sleeves.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/general-cuirass-from-ref.py src/sprite/items/generalCuirassArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import general_ref as G  # noqa: E402


def bases(p):
    return {
        'GENERAL_SPIRAL_BRONZE': G.middle(p, [('L', 'cuirass')], ('warm',)),
        'GENERAL_MUSCLE_GOLD': G.middle(p, [('R', 'cuirass')], ('warm',)),
    }


if __name__ == '__main__':
    G.run('general-cuirass-from-ref.py', sys.argv[1], "The owner's Roman general's two cuirasses.", [
        ('GENERAL_SPIRAL_CHEST', 'L', 'cuirass', 'His spiral cuirass with its belt: rides the neck, leaning with the torso.'),
        ('GENERAL_MUSCLE_CHEST', 'R', 'cuirass', 'His muscle cuirass with its belt: rides the neck, leaning with the torso.'),
    ], 'GENERAL_CHEST', bases)
