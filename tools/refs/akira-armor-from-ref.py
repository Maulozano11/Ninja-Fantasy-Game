"""The owner's Ember Leather Armor from his Akira picture (docs/reference/akira-owner-reference.jpg).

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the chest      the brown leather cuirass from the high collar to the wide belt: the collar's laced
                 neck line with its two studs, the two flame emblems, the plates' studs, the belt with
                 its stitched rows and steel buckle. It rides the torso, about the neck. Under the near
                 shoulder guard his chest is hidden: there it goes on to a new left line (x 41), each
                 cell taking his chest five cells to its right.
  the guards     the near shoulder guard, four layered leather lames with their studs over the upper
                 arm, and the far one, its lames past the chest; each with the dark band of the upper
                 arm under it. Each rides its shoulder and turns part of the way with the upper arm.

His chest, near arm and far shoulder stand where ours do, so every piece hangs from our joint exactly
where he drew it. It writes the pieces as TypeScript (src/sprite/items/emberLeatherArt.ts) and, in
<study>, his figure beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/akira-armor-from-ref.py src/sprite/items/emberLeatherArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's Ember Leather Armor, his pixels (tools/refs/akira-armor-from-ref.py from\n"
    '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(h):
    """His black line; the steel of the studs and buckle (greys, blue-greys, the buckle's glint); the
    flames' reds, oranges and yellows; his browns (the leather, its lit edges)."""
    k = R.kind(R.rgb(h))
    if k == 'line':
        return 'line'
    if k in ('grey', 'hair', 'white'):
        return 'steel'
    if k in ('red', 'gold'):
        return 'flame'
    return 'leather'


def main():
    a = R.native()
    masks, cols, _ = R.pieces(a)
    J = R.JOINTS
    pairs = [(masks[n], cols[n]) for n in ('chest', 'pauldron_n', 'pauldron_f')]
    bases = {
        'EMBER_LEATHER': R.middle(a, pairs, ('leather', 'skin')),
        'EMBER_STEEL': R.middle(a, pairs, ('grey',)),
        'EMBER_FLAME': R.middle(a, [pairs[0]], ('red', 'gold')),
    }
    consts = [
        ('EMBER_PAULDRON_F', masks['pauldron_f'], cols['pauldron_f'], 'The far shoulder guard, its lames past the chest: it rides the far shoulder.', J['shoulderF'], R.angle('shoulderF', 'elbowF'), (0, 0)),
        ('EMBER_CHEST', masks['chest'], cols['chest'], 'The cuirass from the high collar to the belt, the flame emblems and the steel buckle: it rides the torso about the neck.', J['neck'], R.angle('pelvis', 'neck'), (0, 0)),
        ('EMBER_PAULDRON_N', masks['pauldron_n'], cols['pauldron_n'], 'The near shoulder guard, four studded lames over the upper arm: it rides the near shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN'), (0, 0)),
    ]
    R.run(DOC, 'EMBER', consts, bases, kind_of)


if __name__ == '__main__':
    main()
