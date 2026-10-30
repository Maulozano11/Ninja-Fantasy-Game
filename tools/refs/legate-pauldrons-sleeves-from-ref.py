"""The owner's Roman legate's pauldrons and sleeves (docs/reference/roman-legate-owner-reference.jpg, the right figure).

  acc_legate_pauldrons   his bronze pauldrons with their hanging straps
  top_legate_sleeves     his dark red sleeves on the upper arms (below them our bare arm, in the character's skin)
Brought down to our scale and cleaned as tools/refs/legate_ref.py says, where he drew them round his neck,
which lies on ours.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/legate-pauldrons-sleeves-from-ref.py src/sprite/items/legateArmsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import legate_ref as L  # noqa: E402


def bases(p):
    return {
        'LEGATE_PAULDRON_BRONZE': L.middle(p, ['pauldron_n', 'pauldron_f'], ('warm',)),
        'LEGATE_SLEEVE_RED': L.middle(p, ['sleeve_n', 'sleeve_f'], ('red', 'purple', 'warm')),
    }


if __name__ == '__main__':
    L.run('legate-pauldrons-sleeves-from-ref.py', sys.argv[1], "The owner's Roman legate's pauldrons and sleeves.", [
        ('LEGATE_PAULDRON_N', 'pauldron_n', 'His near bronze pauldron with its straps: rides the near shoulder.'),
        ('LEGATE_PAULDRON_F', 'pauldron_f', 'His far bronze pauldron: rides the far shoulder.'),
        ('LEGATE_SLEEVE_N', 'sleeve_n', 'His near dark red sleeve: rides the near shoulder.'),
        ('LEGATE_SLEEVE_F', 'sleeve_f', 'His far dark red sleeve: rides the far shoulder.'),
    ], 'LEGATE_ARMS', bases)
