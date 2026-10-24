"""The owner's samurai: his red cape, flowing behind him from the waist, from
docs/reference/samurai-owner-reference.jpg, shrunk and cleaned to our scale (tools/refs/samurai_ref.py
game()): his cloth as he drew it. It hangs from behind the waist and swings back, whole, as the wind of
the pose takes it (samurai.ts).

  python3 -I tools/refs/samurai-cape-from-ref.py src/sprite/items/samuraiCapeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    cape = P['cape']
    consts = [
        ('SAMURAI_CAPE', *cape, 'His cape: red cloth flowing back from behind the waist, its folds and dark inside.', S.OUR_JOINTS['male']['neck'], 90.0),
        ('SAMURAI_CAPE_BAND', *P['cape_band'], "His cape's top carried on behind his tassets to the near hip.", S.OUR_JOINTS['male']['neck'], 90.0),
        ('SAMURAI_CAPE_FAR', *P['cape_f'], 'The edge of his cape he drew beside the far leg, behind it.', S.OUR_JOINTS['male']['neck'], 90.0),
    ]
    base = P['cape_base']
    bases = {'SAMURAI_CAPE_RED': S.middle(base[1], base[0], ('red', 'dark'))}
    return S.module(S.header('samurai-cape-from-ref.py', "The owner's samurai cape"), consts, bases, 'SAMURAI_CAPE')


if __name__ == '__main__':
    S.run(sys.argv, build)
