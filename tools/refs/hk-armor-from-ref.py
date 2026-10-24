"""The owner's heroine knights: the armour of each set (the breastplate or corset, and the shoulder pieces), from
docs/reference/heroine-knights-owner-reference.jpg shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  ivory and gold plate with a blue gem at the chest, and her ornate gold pauldrons (a blue gem at
           the near one)
  rogue    a dark plum leather corset with studs and buckles over mail, her high collar's clasp (her crimson
           hood and its collar are the cape's: hk-cape-from-ref.py)
  dragon   copper dragon-scale armour and the dragon-head pauldron on her near shoulder (its green eye), the
           scales on her far shoulder

Each piece is his pixels with his line round them; the torso rides the neck at the torso's angle, a shoulder
piece the upper arm about the shoulder.

  python3 -I tools/refs/hk-armor-from-ref.py src/sprite/items/heroineKnightArmorArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

DOCS = {
    'paladin': {'torso': "The paladin's breastplate: ivory and gold plate, a blue gem at the chest, her gorget. It rides the torso about the neck.",
                'pauldN': "The paladin's near pauldron: ornate gold-edged lames and a blue gem. It rides the upper arm about the shoulder.",
                'pauldF': "The paladin's far pauldron. It rides the upper arm about the shoulder."},
    'rogue': {'torso': "The rogue's corset: dark plum leather, studs and buckles, mail at the top, the collar's gold clasp. It rides the torso about the neck."},
    'dragon': {'torso': "The dragon armour's chest: copper dragon scales. It rides the torso about the neck.",
               'pauldN': "The dragon-head pauldron: a copper dragon's head with a green eye on her near shoulder. It rides the upper arm about the shoulder.",
               'pauldF': "The dragon armour's far shoulder scales. It rides the upper arm about the shoulder."},
}
BASES = {
    'paladin': {'PLATE': (('torso',), ('ivory', 'steel', 'warm')), 'TRIM': (('torso',), ('gold',)), 'GEM': (('torso',), ('blue',))},
    'rogue': {'LEATHER': (('torso',), ('plum', 'warm', 'red')), 'METAL': (('torso',), ('steel', 'gold'))},
    'dragon': {'SCALES': (('torso',), ('warm', 'red')), 'EYE': (('pauldN',), ('green', 'cyan'))},
}


def build():
    parts = ('torso', 'pauldN', 'pauldF')
    docs = {f: {n: DOCS[f].get(n, '') for n in parts} for f in R.SETS}
    # the rogue's shoulders are her cape's mantle (hk-cape-from-ref.py)
    text = R.set_module('hk-armor-from-ref.py', "The owner's heroine knights' armour", 'HK_ARMOR',
                        {'paladin': parts, 'rogue': ('torso',), 'dragon': parts}, docs, BASES)
    return text


if __name__ == '__main__':
    R.run(sys.argv, build)
