"""The owner's three knights: their legs (the thighs, under the skirt: the 'bottom' item; the knee guards,
greaves and sabatons or boots: the 'feet' item), from docs/reference/three-knights-owner-reference.jpg,
shrunk and cleaned by tools/refs/knights_ref.py. Each thigh about its hip (his cloth carried on under what
hides it), each knee guard about its knee, each greave about its ankle along the shin, each sabaton about
its ankle.

  python3 -I tools/refs/knight-legs-from-ref.py src/sprite/items/knightLegsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402

TRIM = {'paladin': ('gold',), 'dark': ('gold', 'brown'), 'dragon': ('flame', 'gold')}


def build():
    consts = []
    bases = {}
    for f in K.FIGURES:
        P = K.pieces(f)
        for s, side in (('n', 'near'), ('f', 'far')):
            consts += [
                K.entry(f, 'thigh_' + s, f"The {f} knight's {side} thigh, under the skirt. It rides the thigh about the hip.", P),
                K.entry(f, 'knee_' + s, f"The {f} knight's {side} knee guard. It rides the shin about the knee.", P),
                K.entry(f, 'shin_' + s, f"The {f} knight's {side} greave. It rides the shin about the ankle.", P),
                K.entry(f, 'foot_' + s, f"The {f} knight's {side} sabaton. It stands under the ankle.", P),
            ]
        legs = ['knee_n', 'shin_n', 'foot_n', 'knee_f', 'shin_f', 'foot_f']
        rest = tuple(k for k in ('steel', 'dark', 'warm', 'white', 'red', 'brown') if k not in TRIM[f])
        bases[f'KNIGHT_{K.SET_NAME[f]}_GREAVE'] = K.base(f, legs, rest, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_GREAVE_TRIM'] = K.base(f, legs, TRIM[f], 0.6, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_THIGH'] = K.base(f, ['thigh_n', 'thigh_f'], ('dark', 'steel', 'warm', 'brown', 'red', 'flame'), P=P)
    return K.module(K.header('knight-legs-from-ref.py', "The owner's three knights' legs"), consts, bases, 'KNIGHT_LEGS')


if __name__ == '__main__':
    K.run(sys.argv, build)
