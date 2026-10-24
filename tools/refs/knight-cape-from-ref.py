"""The owner's three knights: their capes (the paladin's red cape edged in gold, the dark knight's tattered
dark red cape, the dragon knight's red cape with its glowing ember veins), from
docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py: both
panels he drew beside the body and, along each row, the cloth carried on behind the body between them (it
hangs behind him: moved, the body never shows a hole in it).

  python3 -I tools/refs/knight-cape-from-ref.py src/sprite/items/knightCapeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402

EDGE = {'paladin': ('gold',), 'dark': ('gold',), 'dragon': ('flame', 'gold')}


def build():
    consts = []
    bases = {}
    for f in K.FIGURES:
        P = K.pieces(f)
        consts.append(K.entry(f, 'cape', f"The {f} knight's cape. It hangs from his shoulders.", P))
        bases[f'KNIGHT_{K.SET_NAME[f]}_CAPE_RED'] = K.base(f, ['cape'], ('red', 'dark', 'brown'), 0.6, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_CAPE_EDGE'] = K.base(f, ['cape'], EDGE[f], 0.6, P=P) or bases[f'KNIGHT_{K.SET_NAME[f]}_CAPE_RED']
    return K.module(K.header('knight-cape-from-ref.py', "The owner's three knights' capes"), consts, bases, 'KNIGHT_CAPE')


if __name__ == '__main__':
    K.run(sys.argv, build)
