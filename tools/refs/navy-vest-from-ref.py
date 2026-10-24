"""The owner's under-layers from his officer pictures (docs/reference/navy-officer-*-owner-reference.jpg): the
shirt or cravat and the vest worn under the open coats, each its own creator option.

  open      Shirt and Vest: a cream shirt with an open folded collar and a dark burgundy vest with small gold
            buttons, its points below the belt
  buttoned  Green Waistcoat and Cravat: a cream cravat at the throat and a dark green patterned waistcoat
  dark      Black Shirt and Brocade Waistcoat: a black shirt open at the throat and a dark red brocade
            waistcoat with small gold buttons

tools/refs/navy_ref.py shrinks each picture to our male rig and cleans it with his palette only, and cuts the
under-layer out of it, continued down and across under the coat from his own pixels (navy_ref.VEST_SHAPE), so
any of his coats' openings shows it whole and it can be worn without a coat. With a third argument, a folder,
it writes the piece beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-vest-from-ref.py open src/sprite/items/navyVestOpenArt.ts [studyDir]
  python3 -I tools/refs/navy-vest-from-ref.py buttoned src/sprite/items/navyVestGreenArt.ts [studyDir]
  python3 -I tools/refs/navy-vest-from-ref.py dark src/sprite/items/navyVestBrocadeArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

PREFIX = {'open': 'VEST_OPEN', 'buttoned': 'VEST_GREEN', 'dark': 'VEST_BROCADE'}

if __name__ == '__main__':
    pic = sys.argv[1]
    N.vest_module('navy-vest-from-ref.py', pic, sys.argv[2], PREFIX[pic], f"The owner's officer's under-layer ({pic})", sys.argv[3] if len(sys.argv) > 3 else None)
