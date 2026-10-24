"""The owner's three knights: their belts (the paladin's brown belt with its round gold buckle, the dark
knight's with its round iron buckle, the dragon knight's plated waist with its glowing gem), from
docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py. Each
rides the pelvis.

  python3 -I tools/refs/knight-waist-from-ref.py src/sprite/items/knightBeltArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402

BUCKLE = {'paladin': ('gold', 'steel', 'white'), 'dark': ('steel', 'warm', 'gold'), 'dragon': ('flame', 'gold')}


def build():
    consts = []
    bases = {}
    for f in K.FIGURES:
        P = K.pieces(f)
        consts.append(K.entry(f, 'belt', f"The {f} knight's belt and its buckle. It rides the pelvis.", P))
        rest = tuple(k for k in ('brown', 'dark', 'red', 'warm', 'steel') if k not in BUCKLE[f])
        bases[f'KNIGHT_{K.SET_NAME[f]}_LEATHER'] = K.base(f, ['belt'], rest, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_BUCKLE'] = K.base(f, ['belt'], BUCKLE[f], 0.6, P=P)
    return K.module(K.header('knight-waist-from-ref.py', "The owner's three knights' belts"), consts, bases, 'KNIGHT_BELT')


if __name__ == '__main__':
    K.run(sys.argv, build)
