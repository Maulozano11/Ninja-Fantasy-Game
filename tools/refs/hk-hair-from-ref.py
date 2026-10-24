"""The owner's heroine knights: her hair (long wavy auburn hair with a gold clip), from
docs/reference/heroine-knights-owner-reference.jpg (his paladin's head, which all three share), shrunk and
cleaned (tools/refs/heroine_knights_ref.py).

  HK_HAIR       her hair over her head and round her face, the gold clip in it (in front: hairFront)
  HK_HAIR_BACK  her long hair falling down her back past her near shoulder (behind her: hairBack)

Both ride the head on the face anchor.

  python3 -I tools/refs/hk-hair-from-ref.py src/sprite/items/heroineKnightHairArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402


def build():
    P = R.head_pieces()
    consts = [
        ('HK_HAIR', *P['hair'], 'Her hair over her head and round her face, the gold clip in it. It rides the head on the face anchor.', R.FACE_ANCHOR, 0.0, False),
        ('HK_HAIR_BACK', *P['hairBack'], 'Her long hair falling down her back past her near shoulder. It rides the head on the face anchor.', R.FACE_ANCHOR, 0.0, False),
    ]
    m, c = P['hair']
    bases = {'HK_HAIR_BASE': R.middle(c, m, ('red', 'warm', 'plum')), 'HK_HAIR_CLIP': R.middle(c, m, ('gold',))}
    return R.module(R.header('hk-hair-from-ref.py', "The owner's heroine knights' hair"), consts, bases, 'HK_HAIR')


if __name__ == '__main__':
    R.run(sys.argv, build)
