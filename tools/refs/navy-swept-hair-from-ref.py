"""The owner's black hair from his dark-coated officer (docs/reference/navy-officer-dark-coat-owner-reference.jpg;
his words: "copia el pelo tambien"): the hair option 'Swept-Back Spikes', black, spiky, swept back, with loose
strands at the temple.

The picture is the same officer in the same pose and grid as his first; tools/refs/navy_ref.py shrinks his head
to our Roman head's size and cleans it with his palette only. This script lifts his hair out of that
(navy_ref.lift_hair): over the head every pixel of his hair, his line included; behind it the same with what his
face hides filled in from his own locks. Each is a PaintedPiece pivoted on the face anchor (his face is where
his first picture has it), written to src/sprite/items/navySweptHairArt.ts. With a second argument, a folder, it
writes them beside his head at our scale at 8x. Run from the repo root:

  python3 -I tools/refs/navy-swept-hair-from-ref.py src/sprite/items/navySweptHairArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    N.hair_module('navy-swept-hair-from-ref.py', 'dark', sys.argv[1], 'SWEPT_HAIR', "The owner's swept-back black hair on his officer", sys.argv[2] if len(sys.argv) > 2 else None)
