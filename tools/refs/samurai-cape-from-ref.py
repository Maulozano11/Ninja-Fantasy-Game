"""The owner's samurai: his red cape, flowing behind him from the waist, from
docs/reference/samurai-owner-reference.jpg, shrunk and cleaned to our scale (tools/refs/samurai_ref.py
game()). Behind his near leg, where he drew none of it, his cloth is continued across to the far leg
(samurai_ref.pieces()). It hangs from the base of the neck behind the body, swaying in the wind as the other capes do.

  python3 -I tools/refs/samurai-cape-from-ref.py src/sprite/items/samuraiCapeArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    cape = P['cape']
    consts = [('SAMURAI_CAPE', *cape, 'His cape: red cloth flowing back from behind the waist, its folds and dark inside. It hangs from the base of the neck behind the body.', S.OUR_JOINTS['male']['neck'], 90.0)]
    bases = {'SAMURAI_CAPE_RED': S.middle(cape[1], cape[0], ('red', 'dark'))}
    return S.module(S.header('samurai-cape-from-ref.py', "The owner's samurai cape"), consts, bases, 'SAMURAI_CAPE')


if __name__ == '__main__':
    S.run(sys.argv, build)
