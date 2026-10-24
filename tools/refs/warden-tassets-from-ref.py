"""One part of the owner's three new male outfits (docs/reference/three-outfits-owner-reference.jpg), as
outfits_ref.ITEMS['warden-tassets'] describes it: his pixels at our scale (shrunk and cleaned by
tools/refs/outfits_ref.py), each piece with the joint it rides and his limb's angle.

  python3 -I tools/refs/warden-tassets-from-ref.py src/sprite/items/wardenTassetsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import outfits_ref as O  # noqa: E402

if __name__ == '__main__':
    O.run(sys.argv, lambda: O.build_item('warden-tassets'))
