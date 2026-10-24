"""The owner's gloves on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the hands option
'Officer's Gloves', black leather; his near fist closed round the scabbard, his far fist on the sabre's grip.

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only; this script lifts
each glove out of it, pivoted on his wrist at his angle, and writes src/sprite/items/navyGlovesArt.ts. With a
second argument, a folder, it writes them beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-gloves-from-ref.py src/sprite/items/navyGlovesArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    items = [(s, f'glove_{s.lower()}', f'The {side} fist, pivoted on his {side} wrist at his angle.', 'wrist' + s, N.angle_of(N.joint('wrist' + s), N.joint('hand' + s)))
             for s, side in (('N', 'near'), ('F', 'far'))]
    N.simple_module('navy-gloves-from-ref.py', 'high', sys.argv[1], 'NAVY_GLOVE', "The owner's gloves on his navy officer", items,
                    [('LEATHER', ('grey',))], {'gold': 'leather', 'white': 'leather', 'brown': 'leather', 'grey': 'leather'}, sys.argv[2] if len(sys.argv) > 2 else None)
