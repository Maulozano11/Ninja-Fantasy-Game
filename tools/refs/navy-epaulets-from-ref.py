"""The owner's ornate shoulder pieces on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the
accessory 'Officer's Shoulder Pieces', navy with gold edges and gold embroidery, one over each shoulder.

His second picture (navy-officer-variant-owner-reference.jpg) is the same coat with plain shoulders, so the
shoulder pieces come off his first cleanly: under them every coat has his plain shoulders. This script lifts
them out of his picture at our scale (tools/refs/navy_ref.py: shrunk to our male rig, cleaned with his palette
only), each pivoted on his shoulder joint, and writes src/sprite/items/navyEpauletsArt.ts. With a second
argument, a folder, it writes them beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-epaulets-from-ref.py src/sprite/items/navyEpauletsArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    N.simple_module('navy-epaulets-from-ref.py', 'high', sys.argv[1], 'EPAULET', "The owner's shoulder pieces on his navy officer", [
        ('N', 'epaulet_n', 'The near shoulder piece, pivoted on his near shoulder.', 'shoulderN', 90.0),
        ('F', 'epaulet_f', 'The far shoulder piece, pivoted on his far shoulder.', 'shoulderF', 90.0),
    ], [('CLOTH', ('dark', 'grey')), ('GOLD', ('gold',))], {'gold': 'gold', 'white': 'gold'}, sys.argv[2] if len(sys.argv) > 2 else None)
