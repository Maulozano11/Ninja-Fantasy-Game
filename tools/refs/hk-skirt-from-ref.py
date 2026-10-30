"""The owner's heroine knights: the skirt of each set, from docs/reference/heroine-knights-owner-reference.jpg
shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  her red tabard down the front, embroidered in gold, a blue gem at its foot
  rogue    her torn dark skirt, its hem tattered as he drew it
  dragon   her green tabard with gold trim

It hangs from the waist, riding the pelvis.

  python3 -I tools/refs/hk-skirt-from-ref.py src/sprite/items/heroineKnightSkirtArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

DOCS = {'paladin': "The paladin's red tabard, embroidered in gold. It hangs from the waist.",
        'rogue': "The rogue's torn dark skirt, its hem tattered. It hangs from the waist.",
        'dragon': "The dragon knight's green tabard with gold trim. It hangs from the waist."}
BASES = {
    'paladin': {'TABARD': (('skirt',), ('red', 'plum', 'warm')), 'TABARD_TRIM': (('skirt',), ('gold',))},
    'rogue': {'SKIRT_CLOTH': (('skirt',), ('plum', 'warm', 'red', 'steel'))},
    'dragon': {'TABARD': (('skirt',), ('green', 'cyan')), 'TABARD_TRIM': (('skirt',), ('gold',))},
}


def build():
    return R.set_module('hk-skirt-from-ref.py', "The owner's heroine knights' skirts", 'HK_SKIRT', ('skirt',), {f: {'skirt': DOCS[f]} for f in R.SETS}, BASES)


if __name__ == '__main__':
    R.run(sys.argv, build)
