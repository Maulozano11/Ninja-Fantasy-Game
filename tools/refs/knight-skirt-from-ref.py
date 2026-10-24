"""The owner's three knights: what hangs from their belts in three panels (the paladin's plated skirt with
its gold-trimmed front tasset, the dark knight's studded leather tabard between his plates, the dragon
knight's scaled tassets), from docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by
tools/refs/knights_ref.py: the near panel, the front panel and the far panel, each hung from the waist (where
the sword hides one, his pixels carried on along the row).

  python3 -I tools/refs/knight-skirt-from-ref.py src/sprite/items/knightSkirtArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402

TRIM = {'paladin': ('gold',), 'dark': ('brown', 'gold'), 'dragon': ('flame', 'gold')}


def build():
    consts = []
    bases = {}
    for f in K.FIGURES:
        P = K.pieces(f)
        for n, what in (('tasset_n', 'near'), ('tasset_c', 'front'), ('tasset_f', 'far')):
            consts.append(K.entry(f, n, f"The {f} knight's {what} panel, hung from the waist.", P))
        panels = ['tasset_n', 'tasset_c', 'tasset_f']
        rest = tuple(k for k in ('steel', 'dark', 'warm', 'white', 'red', 'brown') if k not in TRIM[f])
        bases[f'KNIGHT_{K.SET_NAME[f]}_SKIRT'] = K.base(f, panels, rest, P=P)
        bases[f'KNIGHT_{K.SET_NAME[f]}_SKIRT_TRIM'] = K.base(f, panels, TRIM[f], 0.6, P=P)
    return K.module(K.header('knight-skirt-from-ref.py', "The owner's three knights' skirts"), consts, bases, 'KNIGHT_SKIRT')


if __name__ == '__main__':
    K.run(sys.argv, build)
