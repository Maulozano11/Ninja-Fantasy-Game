"""The alchemist's belt with its buckle, potion vials and satchel: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-alchemist-belt-from-ref.py src/sprite/items/alchemistBeltArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'alchemist'
SCRIPT = os.path.basename(__file__)
PREFIX = 'ALCH_BELT'
WHAT = "The alchemist's belt with its buckle, potion vials and satchel"


def build():
    return R.waist(OUTFIT, SCRIPT, PREFIX, 'belt', {'steel': 'metal', 'crimson': 'glass', 'teal': 'glass', 'violet': 'glass', 'green': 'glass', 'cream': 'glass', 'gold': 'gold', None: 'leather'}, WHAT, tails_from=131)


if __name__ == '__main__':
    R.run(sys.argv, build)
