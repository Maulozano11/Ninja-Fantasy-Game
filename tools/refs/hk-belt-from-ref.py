"""The owner's heroine knights: the belt of each set, from docs/reference/heroine-knights-owner-reference.jpg
shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  her gold belt with a blue gem at the buckle and the leather pouch on her near hip
  rogue    her crimson sash, its end hanging down her far hip, over a studded leather belt
  dragon   her leather belt with its ring buckle, pouches and vials

It rides the torso about the pelvis.

  python3 -I tools/refs/hk-belt-from-ref.py src/sprite/items/heroineKnightBeltArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

DOCS = {'paladin': "The paladin's belt: gold, a blue gem at the buckle, the leather pouch on her near hip. It rides the pelvis.",
        'rogue': "The rogue's crimson sash over a studded belt, its end hanging down her far hip. It rides the pelvis.",
        'dragon': "The dragon knight's leather belt: ring buckle, pouches and vials. It rides the pelvis."}
BASES = {
    'paladin': {'BELT_LEATHER': (('belt',), ('warm', 'red', 'plum')), 'BELT_GOLD': (('belt',), ('gold',)), 'BELT_GEM': (('belt',), ('blue',))},
    'rogue': {'SASH': (('belt',), ('red', 'plum')), 'SASH_BELT': (('belt',), ('steel', 'warm'))},
    'dragon': {'BELT_LEATHER': (('belt',), ('warm', 'red', 'plum')), 'BELT_METAL': (('belt',), ('steel', 'gold'))},
}


def build():
    return R.set_module('hk-belt-from-ref.py', "The owner's heroine knights' belts", 'HK_BELT', ('belt',), {f: {'belt': DOCS[f]} for f in R.SETS}, BASES)


if __name__ == '__main__':
    R.run(sys.argv, build)
