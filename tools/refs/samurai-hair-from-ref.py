"""The owner's samurai: his hair (messy black hair, the topknot tied in red cord), from
docs/reference/samurai-owner-reference.jpg, his head shrunk to our Roman head's size and cleaned
(tools/refs/samurai_ref.py). Every pixel of his head that is not his face: his locks, his line and the red
cord. Stamped on the face anchor of his head (the game raises it HEAD_UP on his face).

  python3 -I tools/refs/samurai-hair-from-ref.py src/sprite/items/samuraiHairArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    hair = P['hair']
    consts = [('SAMURAI_HAIR', *hair, 'His hair: the messy black locks lit in blue-grey, over the brow and the ears, and the topknot tied in red cord.', S.FACE_ANCHOR, 0.0)]
    bases = {'SAMURAI_HAIR_BASE': S.middle(hair[1], hair[0], ('hair', 'dark', 'steel')), 'SAMURAI_HAIR_CORD': S.middle(hair[1], hair[0], ('red',))}
    return S.module(S.header('samurai-hair-from-ref.py', "The owner's samurai hair"), consts, bases, 'SAMURAI_HAIR')


if __name__ == '__main__':
    S.run(sys.argv, build)
