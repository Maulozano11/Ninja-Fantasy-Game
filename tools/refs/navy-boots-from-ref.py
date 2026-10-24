"""The owner's boots on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the feet option
'Officer's Boots', tall black boots with folded brown cuffs trimmed in gold.

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only; this script lifts
each boot out of it in two: the shaft with its folded cuff (it turns with the shin about his ankle) and the foot
(flat on the ground), and writes src/sprite/items/navyBootsArt.ts. With a second argument, a folder, it writes
them beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-boots-from-ref.py src/sprite/items/navyBootsArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    items = []
    for s, side in (('N', 'near'), ('F', 'far')):
        ang = N.angle_of(N.joint('knee' + s), N.joint('ankle' + s))
        items += [(f'SHIN_{s}', f'boot_{s.lower()}_shin', f'The {side} boot\'s shaft and its folded cuff, pivoted on his {side} ankle at his shin\'s angle.', 'ankle' + s, ang),
                  (f'FOOT_{s}', f'boot_{s.lower()}_foot', f'The {side} boot\'s foot, pivoted on his {side} ankle.', 'ankle' + s, 0.0)]
    N.simple_module('navy-boots-from-ref.py', 'high', sys.argv[1], 'NAVY_BOOTS', "The owner's boots on his navy officer", items,
                    [('LEATHER', ('dark', 'grey')), ('CUFF', ('brown', 'wine')), ('GOLD', ('gold',))],
                    {'gold': 'gold', 'white': 'gold', 'brown': 'cuff', 'wine': 'cuff', 'red': 'cuff'}, sys.argv[2] if len(sys.argv) > 2 else None)
