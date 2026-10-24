"""The owner's samurai: his kusazuri (the layered tassets hanging from the waist over the hakama), from
docs/reference/samurai-owner-reference.jpg, shrunk and cleaned to our scale (tools/refs/samurai_ref.py
game()). The game cuts it in panels down his seams (samurai.ts KUSAZURI_PANELS, columns of the piece), each
lying on its thigh and hanging from the hip.

  python3 -I tools/refs/samurai-kusazuri-from-ref.py src/sprite/items/samuraiKusazuriArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    ks = P['kusazuri']
    consts = [('SAMURAI_KUSAZURI', *ks, 'His kusazuri: the lacquered tassets, their gold rims and red lacing, from the sash to above the knees. It rides the pelvis; the game cuts it in panels down his seams.', S.OUR_JOINTS['male']['pelvis'], 90.0)]
    bases = {
        'SAMURAI_TASSET_LACQUER': S.middle(ks[1], ks[0], ('steel', 'dark', 'hair')),
        'SAMURAI_TASSET_LACING': S.middle(ks[1], ks[0], ('red',)),
        'SAMURAI_TASSET_GOLD': S.middle(ks[1], ks[0], ('gold',)),
    }
    return S.module(S.header('samurai-kusazuri-from-ref.py', "The owner's samurai kusazuri"), consts, bases, 'SAMURAI_KUSAZURI')

if __name__ == '__main__':
    S.run(sys.argv, build)
