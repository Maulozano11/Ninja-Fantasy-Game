"""The alchemist's long green tabard skirt with its gold trim and emblem: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-alchemist-tabard-from-ref.py src/sprite/items/alchemistTabardArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'alchemist'
SCRIPT = os.path.basename(__file__)
PREFIX = 'ALCH_TABARD'
WHAT = "The alchemist's long green tabard skirt with its gold trim and emblem"


def build():
    return R.skirt(OUTFIT, SCRIPT, PREFIX, 'belt', {'panel': {'gold': 'gold', 'leather': 'trim', None: 'cloth'}, 'lining': {'gold': 'gold', None: 'lining'}}, WHAT)


if __name__ == '__main__':
    R.run(sys.argv, build)
