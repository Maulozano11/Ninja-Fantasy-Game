"""The owner's heroine knights: the cape of each set, from docs/reference/heroine-knights-owner-reference.jpg
shrunk and cleaned to our scale (tools/refs/heroine_knights_ref.py).

  paladin  her red cape with gold-embroidered edges
  rogue    her crimson hooded cape, the hood down round her high collar and over her near shoulder (MANTLE_N,
           MANTLE_F: they ride the shoulders), tattered at the hem as he drew it
  dragon   her red cape with glowing ember veins

The cape hangs from behind the shoulders, riding the torso about the neck.

  python3 -I tools/refs/hk-cape-from-ref.py src/sprite/items/heroineKnightCapeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402

DOCS = {
    'paladin': {'cape': "The paladin's red cape, its edges embroidered in gold. It hangs from behind the shoulders."},
    'rogue': {'cape': "The rogue's crimson cape, tattered at the hem. It hangs from behind the shoulders.",
              'pauldN': "The rogue's hood, down over her near shoulder and round her high collar. It rides the upper arm about the shoulder.",
              'pauldF': "The rogue's high collar on her far side. It rides the upper arm about the shoulder."},
    'dragon': {'cape': "The dragon knight's red cape with glowing ember veins. It hangs from behind the shoulders."},
}
BASES = {
    'paladin': {'CAPE_RED': (('cape',), ('red', 'plum', 'warm')), 'CAPE_GOLD': (('cape',), ('gold',))},
    'rogue': {'CAPE_RED': (('cape', 'pauldN'), ('red', 'plum', 'warm'))},
    'dragon': {'CAPE_RED': (('cape',), ('red', 'plum', 'warm')), 'CAPE_EMBER': (('cape',), ('ember', 'gold'))},
}


def build():
    parts = {'paladin': ('cape',), 'rogue': ('cape', 'pauldN', 'pauldF'), 'dragon': ('cape',)}
    text = R.set_module('hk-cape-from-ref.py', "The owner's heroine knights' capes", 'HK_CAPE', parts, DOCS, BASES)
    return text.replace('HK_ROGUE_PAULD_N', 'HK_ROGUE_MANTLE_N').replace('HK_ROGUE_PAULD_F', 'HK_ROGUE_MANTLE_F')


if __name__ == '__main__':
    R.run(sys.argv, build)
