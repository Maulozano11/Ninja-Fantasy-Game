"""The owner's Roman general's hair (docs/reference/roman-general-owner-reference.jpg) as hair_general.

His curly, voluminous light-brown mane to the jaw, from the left figure (both figures share it), at the
head's scale (tools/refs/general_ref.py: our Roman head's size) and cleaned in his palette. It is stamped on
the face anchor, in front of the head.

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
    ], 'GENERAL_HAIR', bases)
