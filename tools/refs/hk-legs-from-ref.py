"""The owner's heroine knights: the thighs of each set, from docs/reference/heroine-knights-owner-reference.jpg
shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  ivory and gold cuisses
  rogue    dark leggings, her bare thigh where her skirt is torn (in the character's skin)
  dragon   copper scale cuisses

Each rides the thigh about the hip.

  python3 -I tools/refs/hk-legs-from-ref.py src/sprite/items/heroineKnightLegsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

WHAT = {'paladin': 'ivory and gold cuisse', 'rogue': 'thigh in dark leggings, bare where her skirt is torn', 'dragon': 'copper scale cuisse'}
BASES = {
    'paladin': {'LEG_PLATE': (('thighN', 'thighF'), ('ivory', 'steel', 'warm')), 'LEG_TRIM': (('thighN', 'thighF'), ('gold',))},
    'rogue': {'LEGGINGS': (('thighN', 'thighF'), ('plum', 'warm', 'red', 'steel'))},
    'dragon': {'LEG_SCALES': (('thighN', 'thighF'), ('warm', 'red'))},
}


def build():
    docs = {f: {'thigh' + s: f"The {f}'s {side} {WHAT[f]}. It rides the thigh about the hip." for s, side in (('N', 'near'), ('F', 'far'))} for f in R.SETS}
    return R.set_module('hk-legs-from-ref.py', "The owner's heroine knights' thighs", 'HK_LEGS', ('thighN', 'thighF'), docs, BASES)


if __name__ == '__main__':
    R.run(sys.argv, build)
