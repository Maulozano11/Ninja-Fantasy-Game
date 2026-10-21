"""The owner's lilac hair from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg), the
Drifter's Part (hair_drifter).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites), his hair over our head. trunks_ref.hair() lifts it out:

  front   every pixel of his hair as he drew it: his lilacs and navy shades joined to the crown and his
          black line round them. Not his forehead, ear or eyes, nor anything of his under our lash row
          between the eyes: where his picture shows face, our head shows (our face draws its eyes and
          brows).
  back    the same hair with what his face hides filled in (behind the forehead between the strands of
          his fringe, behind his ear: each hidden pixel takes the colour of his nearest strand above
          it), drawn behind the head; also the head's outline at the top (the game trims our skull to
          it).

Both parts hang from our face anchor (the near eye's lash start), as the owner's Valiant hair does, so
they frame the eyes as he drew them on every body and in every pose. The same picture always gives the
same bytes:

  python3 -I tools/refs/trunks-drifter-hair-from-ref.py src/sprite/items/drifterHairArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

if __name__ == '__main__':
    R.hair_script('trunks2', 'DRIFTER_HAIR', "The owner's lilac hair on his Trunks 2", 'trunks-drifter-hair-from-ref.py', sys.argv[1:])
