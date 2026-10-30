"""The owner's Roman general's short navy sleeves and magenta scarf (docs/reference/roman-general-owner-reference.jpg).

  top_general_sleeves   his short navy sleeves on the upper arms (below them our bare arm, in the character's skin)
  acc_general_scarf     his magenta scarf round the neck, with the round clasp pinning it (recolourable)
He drew them on both figures, a little differently: each cuirass wears its own figure's (items/general.ts).
Brought down to our scale and cleaned as tools/refs/general_ref.py says (the sleeves with their shoulder on
ours, the scarf with its neck on ours).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/general-sleeves-scarf-from-ref.py src/sprite/items/generalClothArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import general_ref as G  # noqa: E402


def bases(p):
    return {
        'GENERAL_SLEEVE_NAVY': G.middle(p, [(f, n) for f in 'LR' for n in ('sleeve_n', 'sleeve_f')], ('navy',)),
        'GENERAL_SCARF_CLOTH': G.middle(p, [('L', 'scarf'), ('R', 'scarf')], ('purple',)),
        'GENERAL_SCARF_CLASP': G.middle(p, [('L', 'scarf'), ('R', 'scarf')], ('warm',)),
    }


if __name__ == '__main__':
    G.run('general-sleeves-scarf-from-ref.py', sys.argv[1], "The owner's Roman general's sleeves and scarf.", [
        ('GENERAL_SLEEVE_N', 'L', 'sleeve_n', 'His near navy sleeve (spiral cuirass): rides the near shoulder.'),
        ('GENERAL_SLEEVE_F', 'L', 'sleeve_f', 'His far navy sleeve (spiral cuirass): rides the far shoulder.'),
        ('GENERAL_SCARF', 'L', 'scarf', 'His magenta scarf and its clasp (spiral cuirass): rides the neck, in front of the head and chest.'),
        ('GENERAL_M_SLEEVE_N', 'R', 'sleeve_n', 'His near navy sleeve (muscle cuirass): rides the near shoulder.'),
        ('GENERAL_M_SLEEVE_F', 'R', 'sleeve_f', 'His far navy sleeve (muscle cuirass): rides the far shoulder.'),
        ('GENERAL_M_SCARF', 'R', 'scarf', 'His magenta scarf and its clasp (muscle cuirass): rides the neck, in front of the head and chest.'),
    ], 'GENERAL_CLOTH', bases)
