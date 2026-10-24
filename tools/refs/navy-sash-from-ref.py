"""The owner's sash on his dark-coated officer (docs/reference/navy-officer-dark-coat-owner-reference.jpg): the
waist option 'Officer's Sash', a burgundy sash tied at the waist with its end hanging at the far hip, and the
gold chain hanging below it, in place of the leather belt.

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only; this script lifts
the sash out of it, pivoted on the pelvis joint at the torso's angle, and writes src/sprite/items/navySashArt.ts.
With a second argument, a folder, it writes it beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-sash-from-ref.py src/sprite/items/navySashArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    N.simple_module('navy-sash-from-ref.py', 'dark', sys.argv[1], 'NAVY_SASH', "The owner's sash on his dark-coated officer", [
        ('', 'sash', "The sash, its hanging end and the gold chain. Its pivot is the cell on the pelvis joint, at the torso's angle.", 'pelvis', N.TORSO_ANGLE),
    ], [('CLOTH', ('wine', 'red')), ('GOLD', ('gold',))], {'gold': 'gold', 'white': 'gold', 'wine': 'cloth', 'red': 'cloth', 'brown': 'cloth'}, sys.argv[2] if len(sys.argv) > 2 else None)
