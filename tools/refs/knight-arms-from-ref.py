"""The owner's three knights: their arms (the upper arm under the pauldron, the vambrace on the forearm and
the gauntlet or glove on the hand), from docs/reference/three-knights-owner-reference.jpg.

His picture shrunk and cleaned to our scale (tools/refs/knights_ref.py game()), cut on each side into the
upper arm (about the shoulder; up under the pauldron his plate carried on to the shoulder), the forearm
(about the elbow) and the hand (about the wrist): his near fist round the sword's grip, his far hand hanging.

  python3 -I tools/refs/knight-arms-from-ref.py src/sprite/items/knightArmsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402

TRIM = {'paladin': ('gold',), 'dark': ('gold',), 'dragon': ('flame', 'gold')}


def build():
    consts = []
    bases = {}
    for f in K.FIGURES:
        P = K.pieces(f)
        for s, side in (('n', 'near'), ('f', 'far')):
            consts += [
                K.entry(f, 'upper_' + s, f"The {f} knight's {side} upper arm, from under the pauldron to the elbow. It rides the upper arm about the shoulder.", P),
                K.entry(f, 'fore_' + s, f"The {f} knight's {side} vambrace. It rides the forearm about the elbow.", P),
                K.entry(f, 'hand_' + s, f"The {f} knight's {side} " + ('fist round the sword\'s grip' if s == 'n' else 'hand') + '. It rides the hand about the wrist.', P),
            ]
        arms = ['upper_n', 'fore_n', 'upper_f', 'fore_f']
        rest = tuple(k for k in ('steel', 'dark', 'warm', 'white', 'red') if k not in TRIM[f])
        bases[f'KNIGHT_{K.SET_NAME[f]}_ARM_PLATE'] = K.base(f, arms, rest, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_ARM_TRIM'] = K.base(f, arms, TRIM[f], 0.6, P=P) or K.base(f, ['chest'], TRIM[f], 0.6, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_GLOVE'] = K.base(f, ['hand_f'], ('brown', 'dark', 'red', 'warm'), P=P)
    return K.module(K.header('knight-arms-from-ref.py', "The owner's three knights' arms"), consts, bases, 'KNIGHT_ARMS')


if __name__ == '__main__':
    K.run(sys.argv, build)
