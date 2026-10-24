"""The sorceress's crimson sash tied at the hip, its ends hanging: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-sorceress-sash-from-ref.py src/sprite/items/sorceressSashArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'sorceress'
SCRIPT = os.path.basename(__file__)
PREFIX = 'NIGHT_SASH'
WHAT = "The sorceress's crimson sash tied at the hip, its ends hanging"


def build():
    return R.waist(OUTFIT, SCRIPT, PREFIX, 'sash', {None: 'sash'}, WHAT, tails_from=127)


if __name__ == '__main__':
    R.run(sys.argv, build)
