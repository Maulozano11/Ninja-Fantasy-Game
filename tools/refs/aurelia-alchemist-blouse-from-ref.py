"""The alchemist's cream blouse sleeves: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-alchemist-blouse-from-ref.py src/sprite/items/alchemistBlouseArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'alchemist'
SCRIPT = os.path.basename(__file__)
PREFIX = 'ALCH_BLOUSE'
WHAT = "The alchemist's cream blouse sleeves"


def build():
    return R.sleeves(OUTFIT, SCRIPT, PREFIX, ('sleeve_n', 'sleeve_f'), {'leather': 'trim', 'dark': 'trim', None: 'cloth'}, WHAT, span_fore=1.0)


if __name__ == '__main__':
    R.run(sys.argv, build)
