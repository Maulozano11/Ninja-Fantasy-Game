"""The owner's bronze warrior's second set (docs/reference/bronze-warrior-leather-chest-owner-reference.jpg) as three items.

His second picture of the warrior changes only his chest and shoulders. The owner, 2026-10-24: "si solo agrega
ese conjunto (el pecho y hombreras y mangas)". So only these are lifted from it, each its own creator option:
  armor_hoplite_leather          the dark quilted leather cuirass laced up the front with bronze bars, its spiral
                                 bronze edge panels, the belt with its square buckle, and the high navy collar
                                 with its gold trim and the square clasp on it (in front of the scarf)
  acc_hoplite_iron_pauldrons     his dark iron pauldrons with their gold-edged plates
  top_hoplite_sleeves            his short navy sleeves with gold cuffs, on the upper arms under the pauldrons
Brought down to our scale as his first picture is (tools/refs/bronze_ref.py: the body's scale, cleaned in his
palette); the chest continued up under the collar and the scarf to the neck.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-leather-from-ref.py src/sprite/items/hopliteLeatherArt.ts [study.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402


def bases(p):
    return {
        'HOPLITE_LEATHER_MAIN': R.middle_colour(p, ['lchest'], ('warm',)),
        'HOPLITE_LEATHER_COLLAR': R.middle_colour(p, ['lcollar', 'sleeve_n', 'sleeve_f'], ('navy',)),
        'HOPLITE_LEATHER_IRON': R.middle_colour(p, ['lpauldron_n', 'lpauldron_f'], ('grey',)),
        'HOPLITE_LEATHER_GOLD': R.middle_colour(p, ['lpauldron_n', 'lpauldron_f', 'sleeve_n', 'sleeve_f'], ('warm',)),
    }


if __name__ == '__main__':
    R.run('bronze-leather-from-ref.py', sys.argv[1], "The owner's leather chest, iron pauldrons and navy sleeves (his second set).", [
        ('HOPLITE_LCHEST', 'lchest', 'His leather chest with its belt: rides the neck, leaning with the torso.'),
        ('HOPLITE_LCOLLAR', 'lcollar', 'His high navy collar and the square clasp on it, in front of the scarf.'),
        ('HOPLITE_LPAULDRON_N', 'lpauldron_n', 'His near iron pauldron: rides the near shoulder.'),
        ('HOPLITE_LPAULDRON_F', 'lpauldron_f', 'His far iron pauldron: rides the far shoulder.'),
        ('HOPLITE_SLEEVE_N', 'sleeve_n', 'His near navy sleeve and gold cuff: rides the near shoulder.'),
        ('HOPLITE_SLEEVE_F', 'sleeve_f', 'His far navy sleeve and gold cuff: rides the far shoulder.'),
    ], 'HOPLITE_LEATHER', bases, sys.argv[2] if len(sys.argv) > 2 else None, R.REF_LEATHER)
