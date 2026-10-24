"""The owner's samurai: his arms (the mail sleeves, the armoured kote on the forearms and the fingerless
gloves with his bare fingers), from docs/reference/samurai-owner-reference.jpg.

His picture shrunk and cleaned to our scale (tools/refs/samurai_ref.py game()), cut on each side into the
mail sleeve (about the shoulder; up under the shoulder guard his mail continued to the shoulder), the
kote (about the elbow) and the glove (about the wrist): his near hand open on the tassets, his far hand a
fist.

  python3 -I tools/refs/samurai-arms-from-ref.py src/sprite/items/samuraiArmsArt.ts
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
        consts += [
            (f'SAMURAI_SLEEVE_{s}', *P['sleeve_' + k], f'His {side} mail sleeve, from under the shoulder guard to the kote. It rides the upper arm about the shoulder.', S.his_joint('shoulder' + s), S.angle('shoulder' + s, 'elbow' + s)),
            (f'SAMURAI_KOTE_{s}', *P['kote_' + k], f'His {side} kote: the armoured forearm, its plates and gold rim, the red cord at the wrist. It rides the forearm about the elbow.', S.his_joint('elbow' + s), S.angle('elbow' + s, 'wrist' + s)),
            (f'SAMURAI_HAND_{s}', *P['hand_' + k], f'His {side} glove: ' + ('open on the tassets, his bare fingers' if s == 'N' else 'a fist, his bare fingers closed') + '. It rides the hand about the wrist.', S.his_joint('wrist' + s), S.angle('elbow' + s, 'wrist' + s)),
        ]
    kote = P['kote_n']
    bases = {
        'SAMURAI_ARM_IRON': S.middle(kote[1], kote[0], ('steel', 'dark', 'hair')),
        'SAMURAI_ARM_GOLD': S.middle(kote[1], kote[0], ('gold',)),
        'SAMURAI_ARM_CORD': S.middle(kote[1], kote[0], ('red',)),
    }
    return S.module(S.header('samurai-arms-from-ref.py', "The owner's samurai sleeves, kote and gloves"), consts, bases, 'SAMURAI_ARMS')


if __name__ == '__main__':
    S.run(sys.argv, build)
