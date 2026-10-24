"""The owner's belt on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the waist option
'Officer's Belt', dark brown leather with a round gold buckle.

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only; this script lifts
the belt out of it, pivoted on the pelvis joint at the torso's angle, and writes src/sprite/items/navyBeltArt.ts.
With a second argument, a folder, it writes it beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-belt-from-ref.py src/sprite/items/navyBeltArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    N.simple_module('navy-belt-from-ref.py', 'high', sys.argv[1], 'NAVY_BELT', "The owner's belt on his navy officer", [
        ('', 'belt', "The belt and its round gold buckle. Its pivot is the cell on the pelvis joint, at the torso's angle.", 'pelvis', N.TORSO_ANGLE),
    ], [('LEATHER', ('brown',)), ('GOLD', ('gold',))], {'gold': 'gold', 'white': 'gold', 'brown': 'leather', 'red': 'leather', 'wine': 'leather', 'grey': 'metal'}, sys.argv[2] if len(sys.argv) > 2 else None)
