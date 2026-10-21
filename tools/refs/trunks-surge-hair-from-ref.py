"""The owner's golden spiky hair from his Trunks 3 picture (docs/reference/trunks3-owner-reference.jpg),
the Golden Surge (hair_surge).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites), his hair over our head. trunks_ref.hair() lifts it out as it does his
Drifter's Part (tools/refs/trunks-drifter-hair-from-ref.py): the front, every pixel of his golds and
oranges joined to the crown with his dark-brown line round them (not his brows, nor the skin round his
ear: its reddish shadows are never hair), and the back, the same with what his face hides filled in.
Both hang from our face anchor. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-surge-hair-from-ref.py src/sprite/items/surgeHairArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

if __name__ == '__main__':
    R.hair_script('trunks3', 'SURGE_HAIR', "The owner's golden spiky hair on his Trunks 3", 'trunks-surge-hair-from-ref.py', sys.argv[1:])
