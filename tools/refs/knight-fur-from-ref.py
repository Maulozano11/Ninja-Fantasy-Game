"""The owner's paladin: his white fur mantle over the shoulders and round the neck, from
docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py: the near
side (over the near shoulder, behind the head) and the far side (over the far shoulder). Both ride the torso
about the neck.

  python3 -I tools/refs/knight-fur-from-ref.py src/sprite/items/knightFurArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402


def build():
    P = K.pieces('paladin')
    consts = [
        K.entry('paladin', 'fur', 'His fur mantle on the near side: over the near shoulder and behind the head.', P),
        K.entry('paladin', 'fur_f', 'His fur mantle on the far side, over the far shoulder.', P),
    ]
    bases = {'KNIGHT_FUR': K.base('paladin', ['fur', 'fur_f'], ('white', 'warm', 'steel', 'dark'), 0.6, P=P)}
    return K.module(K.header('knight-fur-from-ref.py', "The owner's paladin's fur mantle"), consts, bases, 'KNIGHT_FUR')


if __name__ == '__main__':
    K.run(sys.argv, build)
