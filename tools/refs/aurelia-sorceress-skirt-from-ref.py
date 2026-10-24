"""The sorceress's long tattered purple skirt, split at the sides, with its crimson under-skirt: the owner's pixels from his sheet of Aurelia's outfits
(docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale and cleaned with his palette by
tools/refs/aurelia_outfits_ref.py ("Reducir y limpiar yo"), cut into the pieces the item stamps on our fitted
female (src/sprite/items/aureliaOutfits.ts). At rest every pixel is the cleaned reduction's.

  python3 -I tools/refs/aurelia-sorceress-skirt-from-ref.py src/sprite/items/sorceressSkirtArt.ts

The same picture always gives the same bytes. (AURELIA_OUTFITS_CACHE=<dir> keeps his snapped picture between
runs, for speed only.)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

OUTFIT = 'sorceress'
SCRIPT = os.path.basename(__file__)
PREFIX = 'NIGHT_SKIRT'
WHAT = "The sorceress's long tattered purple skirt, split at the sides, with its crimson under-skirt"


def build():
    return R.skirt(OUTFIT, SCRIPT, PREFIX, 'sash', {'panel': {'gold': 'gold', 'crimson': 'trim', None: 'cloth'}, 'lining': {None: 'lining'}}, WHAT, slits=(('N', 'slit_n'), ('F', 'slit_f')))


if __name__ == '__main__':
    R.run(sys.argv, build)
