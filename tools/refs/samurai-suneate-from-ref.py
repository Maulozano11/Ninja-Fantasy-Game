"""The owner's samurai: his suneate (the round knee guards and the armoured shin guards with their red ties)
and his footwear (dark sandal-boots with gold straps), from docs/reference/samurai-owner-reference.jpg,
shrunk and cleaned to our scale (tools/refs/samurai_ref.py game()). On each leg: the knee guard about the
knee, the shin guard about the ankle along the shin, the foot about the ankle.

  python3 -I tools/refs/samurai-suneate-from-ref.py src/sprite/items/samuraiSuneateArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    consts = []
    for s, side in (('N', 'near'), ('F', 'far')):
        k = s.lower()
        shin = S.angle('knee' + s, 'ankle' + s)
        consts += [
            (f'SAMURAI_KNEE_{s}', *P['knee_' + k], f'His {side} knee guard, a round plate with gold studs. It rides the shin about the knee.', S.his_joint('knee' + s), shin),
            (f'SAMURAI_SHIN_{s}', *P['shin_' + k], f'His {side} shin guard: the plates, the red ties. It rides the shin about the ankle.', S.his_joint('ankle' + s), shin),
            (f'SAMURAI_FOOT_{s}', *P['foot_' + k], f'His {side} sandal-boot with its gold straps. It stands on the ankle, flat on the ground.', S.his_joint('ankle' + s), shin),
        ]
    sh = P['shin_n']
    ft = P['foot_n']
    bases = {
        'SAMURAI_GREAVE': S.middle(sh[1], sh[0], ('steel', 'dark', 'hair')),
        'SAMURAI_GREAVE_TIE': S.middle(sh[1], sh[0], ('red',)),
        'SAMURAI_BOOT': S.middle(ft[1], ft[0], ('steel', 'dark', 'hair')),
        'SAMURAI_BOOT_GOLD': S.middle(ft[1], ft[0], ('gold',)),
    }
    return S.module(S.header('samurai-suneate-from-ref.py', "The owner's samurai knee and shin guards and sandal-boots"), consts, bases, 'SAMURAI_SUNEATE')


if __name__ == '__main__':
    S.run(sys.argv, build)
