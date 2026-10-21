"""The owner's near boot and far sandal (Ember Boot and Sandal) from his Akira picture
(docs/reference/akira-owner-reference.jpg).

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  near boot     the brown leather boot on the near foot, seen from the front, its cuff and toe.
  far sandal    the sandal on the far foot pointing right: dark straps over the instep and toes, his
                skin between them (it follows the character's skin), the brown sole.

Each stays flat on the ground like our feet. His legs stand wider than ours (akira_ref.LEG_SHIFT): each
foot is moved whole onto our leg with its leg, so it stands where our foot stands. It writes the pieces
as TypeScript (src/sprite/items/emberFeetArt.ts) and, in <study>, his figure beside the pieces at 8x.
The same picture always gives the same bytes:

  python3 -I tools/refs/akira-feet-from-ref.py src/sprite/items/emberFeetArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's near boot and far sandal, his pixels (tools/refs/akira-feet-from-ref.py from\n"
    '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(h):
    k = R.kind(R.rgb(h))
    if k == 'line':
        return 'line'
    if k in ('skin', 'cream'):
        return 'skin'
    return 'leather'


def main():
    a = R.native()
    masks, cols, _ = R.pieces(a)
    J = R.JOINTS
    N, F = R.LEG_SHIFT['N'], R.LEG_SHIFT['F']
    pairs = [(masks[n], cols[n]) for n in ('boot_n', 'sandal_f')]
    bases = {
        'FOOT_LEATHER': R.middle(a, pairs, ('leather',)),
        # The skin of the figure he painted over: his skin follows the character's skin from it.
        'FOOT_SKIN': R.PAINTED_SKIN,
    }
    consts = [
        ('FOOT_SANDAL_F', masks['sandal_f'], cols['sandal_f'], 'The far sandal pointing right: straps over the instep and toes, the sole. It stands flat under the far ankle.', R.pivot_cell(J['ankleF'], F), R.angle('kneeF', 'ankleF'), F),
        ('FOOT_BOOT_N', masks['boot_n'], cols['boot_n'], 'The near boot, seen from the front. It stands flat under the near ankle.', R.pivot_cell(J['ankleN'], N), R.angle('kneeN', 'ankleN'), N),
    ]
    R.run(DOC, 'FOOT', consts, bases, kind_of)


if __name__ == '__main__':
    main()
