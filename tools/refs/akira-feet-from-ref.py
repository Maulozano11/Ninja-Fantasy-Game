"""The owner's boot and sandal (Ember Boots / Ember Sandals) from his Akira picture
(docs/reference/akira-owner-reference.jpg), each as a matching pair.

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). He painted a boot on the near foot and a sandal on the far foot; then
he asked for both feet the same ("a akira ponle los pies iguales", 2026-10-21). This script lifts out
of his picture, every pixel in his exact colour:

  near boot     the brown leather boot on the near foot, seen from the front, its cuff and toe.
  far sandal    the sandal on the far foot pointing right: dark straps over the instep and toes, his
                skin between them (it follows the character's skin), the brown sole.

and gives each foot the other's too, his pixels moved whole to it, nothing redrawn:

  far boot      his near boot moved onto the far foot: its sole on his far sole's row, its cuff under
                his far leg as his near cuff is under his near shin (BOOT_TO_F).
  near sandal   his far sandal moved onto the near foot: its sole on his near sole's row, its heel
                under his near shin as his far heel is under his far leg (SANDAL_TO_N). His near
                shin ends higher over its sole than his far leg (the boot's cuff hid its last rows):
                down to the sandal's straps it is his near shin continued, his last rows cloned on.

Each stays flat on the ground like our feet. His legs stand wider than ours (akira_ref.LEG_SHIFT): each
foot is moved whole onto our leg with its leg, so it stands where our foot stands. It writes the pieces
as TypeScript (src/sprite/items/emberFeetArt.ts) and, in <study>, his figure beside the pieces at 8x.
The same picture always gives the same bytes:

  python3 -I tools/refs/akira-feet-from-ref.py src/sprite/items/emberFeetArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's boot and sandal, his pixels, each on both feet (tools/refs/akira-feet-from-ref.py\n"
    '// from docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# How far his near boot moves to the far foot, and his far sandal to the near foot (his pixels): his
# near sole is on row 98, his far sole on row 95; his near shin ends on x 36-42, his far leg on x 57-63.
BOOT_TO_F = (21, -3)
SANDAL_TO_N = (-21, 3)


def kind_of(h):
    k = R.kind(R.rgb(h))
    if k == 'line':
        return 'line'
    if k in ('skin', 'cream'):
        return 'skin'
    return 'leather'


def moved(m, col, d):
    """A piece's mask and colours moved whole by d = (dx, dy) of his pixels."""
    dx, dy = d
    H, W = m.shape
    m2 = np.zeros_like(m)
    c2 = np.zeros_like(col)
    ys, xs = np.nonzero(m)
    assert (ys + dy >= 0).all() and (ys + dy < H).all() and (xs + dx >= 0).all() and (xs + dx < W).all()
    m2[ys + dy, xs + dx] = True
    c2[ys + dy, xs + dx] = col[ys, xs]
    return m2, c2


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
    boot_f, boot_f_col = moved(masks['boot_n'], cols['boot_n'], BOOT_TO_F)
    sandal_n, sandal_n_col = moved(masks['sandal_f'], cols['sandal_f'], SANDAL_TO_N)
    # his near shin hidden under the boot's cuff, down to the sandal: in each of its bottom row's
    # columns, from under it to the sandal's first cell (his shin's last rows cloned on down)
    shin = masks['shin_n']
    last = int(np.nonzero((shin & ~masks['boot_n']).any(axis=1))[0].max())
    hidden = np.zeros_like(sandal_n)
    for x in np.nonzero(shin[last])[0]:
        y = last + 1
        while not sandal_n[y, x]:
            hidden[y, x] = True
            y += 1
    gap = int(np.nonzero(hidden.any(axis=1))[0].max()) - last
    R.clone_fill(cols['shin_n'], sandal_n_col, hidden, shin, [(0, -gap)])
    sandal_n |= hidden
    consts = [
        ('FOOT_SANDAL_F', masks['sandal_f'], cols['sandal_f'], 'The far sandal pointing right: straps over the instep and toes, the sole. It stands flat under the far ankle.', R.pivot_cell(J['ankleF'], F), R.angle('kneeF', 'ankleF'), F),
        ('FOOT_BOOT_N', masks['boot_n'], cols['boot_n'], 'The near boot, seen from the front. It stands flat under the near ankle.', R.pivot_cell(J['ankleN'], N), R.angle('kneeN', 'ankleN'), N),
        ('FOOT_BOOT_F', boot_f, boot_f_col, 'His near boot on the far foot. It stands flat under the far ankle.', R.pivot_cell(J['ankleF'], F), R.angle('kneeF', 'ankleF'), F),
        ('FOOT_SANDAL_N', sandal_n, sandal_n_col, 'His far sandal on the near foot, under his near shin continued down to it. It stands flat under the near ankle.', R.pivot_cell(J['ankleN'], N), R.angle('kneeN', 'ankleN'), N),
    ]
    R.run(DOC, 'FOOT', consts, bases, kind_of)


if __name__ == '__main__':
    main()
