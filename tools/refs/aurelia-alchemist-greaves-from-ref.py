"""The alchemist's tan leggings, steel knee cops and greaves over brown boots: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-alchemist-greaves-from-ref.py src/sprite/items/alchemistGreavesArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'alchemist'
SCRIPT = os.path.basename(__file__)
PREFIX = 'ALCH_GREAVES'
WHAT = "The alchemist's tan leggings, steel knee cops and greaves over brown boots"


def build():
    return R.boots(OUTFIT, SCRIPT, PREFIX, ('leg_n', 'leg_f'), {'steel': 'metal', 'skin': 'cloth', 'gold': 'cloth', 'cream': 'cloth', None: 'leather'}, WHAT)


if __name__ == '__main__':
    R.run(sys.argv, build)
