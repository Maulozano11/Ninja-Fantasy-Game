"""The owner's hair on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the hair option
'Officer's Tousle', his brown tousled hair.

His head is shrunk to our Roman head's size and cleaned with his palette only (tools/refs/navy_ref.py). This
script lifts his hair out of that (navy_ref.lift_hair): over the head every pixel of his hair, his line
included; behind it the same with what his face hides filled in from his own locks. Each is a PaintedPiece
pivoted on the face anchor, written to src/sprite/items/navyHairArt.ts. With a second argument, a folder, it
writes them beside his head at our scale at 8x. Run from the repo root:

  python3 -I tools/refs/navy-hair-from-ref.py src/sprite/items/navyHairArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    N.hair_module('navy-hair-from-ref.py', 'high', sys.argv[1], 'NAVY_HAIR', "The owner's hair on his navy officer", sys.argv[2] if len(sys.argv) > 2 else None)
