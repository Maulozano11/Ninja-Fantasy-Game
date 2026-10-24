"""The sorceress's black gloves with buckled cuffs: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-sorceress-gloves-from-ref.py src/sprite/items/sorceressGlovesArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'sorceress'
SCRIPT = os.path.basename(__file__)
PREFIX = 'NIGHT_GLOVES'
WHAT = "The sorceress's black gloves with buckled cuffs"


def build():
    return R.hands(OUTFIT, SCRIPT, PREFIX, (('cuff_n', 'hand_n'), ('cuff_f', 'hand_f')), {'steel': 'metal', None: 'glove'}, WHAT)


if __name__ == '__main__':
    R.run(sys.argv, build)
