"""The sorceress's black shoulders and wide split purple bell sleeves: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-sorceress-sleeves-from-ref.py src/sprite/items/sorceressSleevesArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'sorceress'
SCRIPT = os.path.basename(__file__)
PREFIX = 'NIGHT_SLEEVES'
WHAT = "The sorceress's black shoulders and wide split purple bell sleeves"


def build():
    return R.sleeves(OUTFIT, SCRIPT, PREFIX, ('sleeve_n', 'sleeve_f'), {'purple': 'cloth', 'crimson': 'cloth', 'gold': 'gold', 'skin': 'skin', None: 'trim'}, WHAT, span_fore=0.0)


if __name__ == '__main__':
    R.run(sys.argv, build)
