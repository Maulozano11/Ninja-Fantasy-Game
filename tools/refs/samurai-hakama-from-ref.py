"""The owner's samurai: his hakama (the wide red trousers), from docs/reference/samurai-owner-reference.jpg,
shrunk and cleaned to our scale (tools/refs/samurai_ref.py game()). Each leg (his regions hakama_n and
hakama_f, parted at his crotch) rides its thigh about the hip; under the tassets and his knee guards, where
he drew none of it, his cloth is continued (samurai_ref.pieces()).

  python3 -I tools/refs/samurai-hakama-from-ref.py src/sprite/items/samuraiHakamaArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    consts = []
    for s, side in (('N', 'near'), ('F', 'far')):
        consts.append((f'SAMURAI_THIGH_{s}', *P['thigh_' + s.lower()], f'His hakama\'s {side} leg, wide and bloused over the knee. It rides the thigh about the hip.', S.his_joint('hip' + s), S.angle('hip' + s, 'knee' + s)))
    n = P['thigh_n']
    bases = {'SAMURAI_HAKAMA': S.middle(n[1], n[0], ('red', 'dark'))}
    return S.module(S.header('samurai-hakama-from-ref.py', "The owner's samurai hakama"), consts, bases, 'SAMURAI_HAKAMA')


if __name__ == '__main__':
    S.run(sys.argv, build)
