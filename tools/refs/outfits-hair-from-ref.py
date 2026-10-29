"""The owner's three new male outfits: his hair (the Wanderer Spikes), from
docs/reference/three-outfits-owner-reference.jpg (the armoured figure's head, which the three share, at
our Roman head's size): his spiky blue-black locks over the brow and the ears, his line round them.
Stamped on the face anchor, as his face is.

  python3 -I tools/refs/outfits-hair-from-ref.py src/sprite/items/outfitHairArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import outfits_ref as O  # noqa: E402


def build(prefix='OUTFIT', script='outfits-hair-from-ref.py', what="The owner's hair from his three outfits", doc='His hair: spiky blue-black locks lit in blue-grey, over the brow and the ears.'):
    m, c = O.head_pieces()['hair']
    consts = [(f'{prefix}_HAIR', m, c, doc, O.FACE_ANCHOR, 0.0)]
    bases = {f'{prefix}_HAIR_BASE': O.middle(c, m, ('hair', 'dark', 'steel'))}
    return O.module(O.header(script, what), consts, bases, f'{prefix}_HAIR')


if __name__ == '__main__':
    O.run(sys.argv, build)
