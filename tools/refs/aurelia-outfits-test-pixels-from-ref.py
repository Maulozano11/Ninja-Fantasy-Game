"""Aurelia's two outfits at rest, every pixel of the owner's pieces at our scale as the game lays them: the reference
src/sprite/aureliaOutfits.test.ts checks the sorceress and alchemist presets' idle frame 0 against, pixel for pixel.

  python3 -I tools/refs/aurelia-outfits-test-pixels-from-ref.py src/sprite/aureliaOutfitsRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aurelia_outfits_ref as R  # noqa: E402

if __name__ == '__main__':
    R.run(sys.argv, lambda: R.ref_module(os.path.basename(__file__)))
