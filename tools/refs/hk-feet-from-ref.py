"""The owner's heroine knights: the lower legs and feet of each set, from
docs/reference/heroine-knights-owner-reference.jpg shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  ivory and gold knee cops, greaves and sabatons
  rogue    dark leggings with knee pads, buckled leather boots
  dragon   copper scale greaves and boots

Each shin rides the shin about the knee, each foot the ankle.

  python3 -I tools/refs/hk-feet-from-ref.py src/sprite/items/heroineKnightFeetArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

WHAT = {'paladin': ('knee cop and greave', 'sabaton'), 'rogue': ('knee pad and legging', 'buckled leather boot'), 'dragon': ('scale greave', 'scale boot')}
BASES = {
    'paladin': {'GREAVE': (('shinN', 'footN'), ('ivory', 'steel', 'warm')), 'GREAVE_TRIM': (('shinN', 'footN'), ('gold',))},
    'rogue': {'BOOT': (('footN', 'footF'), ('warm', 'plum', 'red')), 'BOOT_PAD': (('shinN', 'shinF'), ('plum', 'warm', 'steel', 'red'))},
    'dragon': {'GREAVE_SCALES': (('shinN', 'footN'), ('warm', 'red'))},
}


def build():
    docs = {}
    for f in R.SETS:
        sh, ft = WHAT[f]
        docs[f] = {}
        for s, side in (('N', 'near'), ('F', 'far')):
            docs[f]['shin' + s] = f"The {f}'s {side} {sh}. It rides the shin about the knee."
            docs[f]['foot' + s] = f"The {f}'s {side} {ft}. It rides the foot about the ankle."
    return R.set_module('hk-feet-from-ref.py', "The owner's heroine knights' greaves and boots", 'HK_FEET', ('shinN', 'footN', 'shinF', 'footF'), docs, BASES)


if __name__ == '__main__':
    R.run(sys.argv, build)
