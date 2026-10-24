"""The owner's knights: their hair (brown, spiky and tousled over the brow), from
docs/reference/three-knights-owner-reference.jpg, the paladin's head shrunk to our Roman head's size and
cleaned (tools/refs/knights_ref.py). Every pixel of his head that is not his face: his locks and his line.
Stamped on the face anchor.

  python3 -I tools/refs/knight-hair-from-ref.py src/sprite/items/knightHairArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402


def build():
    P = K.pieces('paladin')
    m, c = P['hair']
    consts = [('KNIGHT_HAIR', 'paladin', m, c, 'His hair: brown spiky locks lit in amber, over the brow and the ears.', K.FACE_ANCHOR, 0.0)]
    bases = {'KNIGHT_HAIR_BASE': K.middle(c, m, ('brown', 'red', 'dark'))}
    return K.module(K.header('knight-hair-from-ref.py', "The owner's knights' hair"), consts, bases, 'KNIGHT_HAIR')


if __name__ == '__main__':
    K.run(sys.argv, build)
