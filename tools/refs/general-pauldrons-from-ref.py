"""The owner's Roman general's two pairs of pauldrons (docs/reference/roman-general-owner-reference.jpg) as two options.

  acc_general_pauldrons          the left figure's gold-rimmed bronze pauldrons
  acc_general_studded_pauldrons  the right figure's studded pauldrons with their leather strips
Brought down to our scale and cleaned as tools/refs/general_ref.py says, each with its shoulder on ours.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/general-pauldrons-from-ref.py src/sprite/items/generalPauldronsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import general_ref as G  # noqa: E402


def bases(p):
    return {
        'GENERAL_PAULDRON_BRONZE': G.middle(p, [('L', 'pauldron_n'), ('L', 'pauldron_f')], ('warm',)),
        'GENERAL_STUDDED_BRONZE': G.middle(p, [('R', 'pauldron_n'), ('R', 'pauldron_f')], ('warm',)),
    }


if __name__ == '__main__':
    G.run('general-pauldrons-from-ref.py', sys.argv[1], "The owner's Roman general's two pairs of pauldrons.", [
        ('GENERAL_PAULDRON_N', 'L', 'pauldron_n', 'His near gold-rimmed pauldron: rides the near shoulder.'),
        ('GENERAL_PAULDRON_F', 'L', 'pauldron_f', 'His far gold-rimmed pauldron: rides the far shoulder.'),
        ('GENERAL_STUDDED_N', 'R', 'pauldron_n', 'His near studded pauldron with its strips: rides the near shoulder.'),
        ('GENERAL_STUDDED_F', 'R', 'pauldron_f', 'His far studded pauldron: rides the far shoulder.'),
    ], 'GENERAL_PAULDRONS', bases)
