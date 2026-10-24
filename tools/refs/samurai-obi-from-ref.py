"""The owner's samurai: his obi (the gold rope sash knotted at the front), from
docs/reference/samurai-owner-reference.jpg, shrunk and cleaned to our scale (tools/refs/samurai_ref.py
game()). It rides the torso about the pelvis.

  python3 -I tools/refs/samurai-obi-from-ref.py src/sprite/items/samuraiObiArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    P = S.pieces()
    obi = P['obi']
    consts = [('SAMURAI_OBI', *obi, 'His obi: the gold rope sash round the waist and its knot hanging at the front. It rides the torso about the pelvis.', S.OUR_JOINTS['male']['pelvis'], S.rest_angle('male', 'pelvis', 'neck'))]
    bases = {'SAMURAI_OBI_GOLD': S.middle(obi[1], obi[0], ('gold', 'dark', 'steel'))}
    return S.module(S.header('samurai-obi-from-ref.py', "The owner's samurai obi"), consts, bases, 'SAMURAI_OBI')


if __name__ == '__main__':
    S.run(sys.argv, build)
