"""The owner's Roman general's hair (docs/reference/general-head-v2-owner-reference.png) as hair_general.

His curly, voluminous light-brown mane to the jaw, from his second picture of the general's head, drawn at
the game's scale and read cell by cell (tools/refs/general_ref.py head_pieces), with his line round it. It is
stamped on the face anchor, in front of the head.

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/general-hair-from-ref.py src/sprite/items/generalHairArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import general_ref as G  # noqa: E402


def bases(p):
    return {'GENERAL_HAIR_BASE': G.middle(p, [('L', 'hair')], ('warm', 'hair', 'grey'))}


if __name__ == '__main__':
    G.run('general-hair-from-ref.py', sys.argv[1], "The owner's Roman general's curly mane.", [
        ('GENERAL_HAIR', 'L', 'hair', 'His curly mane: stamped on the face anchor, in front of the head.'),
    ], 'GENERAL_HAIR', bases, refs=(G.HEAD_REF,))
