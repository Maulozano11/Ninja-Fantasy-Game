"""The owner's heroine knights: her longsword, from docs/reference/heroine-knights-owner-reference.jpg (his
paladin's: he drew the same sword in all three hands, within a pixel), shrunk and cleaned to our scale
(tools/refs/heroine_knights_ref.py).

The sword is made of parts the player picks a version of, as the katana's are (the owner: "la espada ponlos
como para escoger la guarda como la katana"):

  HK_SWORD_BLADE  his long pale-blue blade from the guard to the point
  HK_SWORD_GUARD  his silver cross-guard with the blue gem, its quillons, the grip past the fist and the pommel
                  (the 'cross' guard; the default)

Both are cut along the line across the blade's foot (GUARD_CUT) and pivot on the grip under her near fist
(heroine_knights_ref.grip()), at the blade's angle as he drew it: at rest every pixel is his. Another guard is
another piece with the same pivot and angle (its own part script or a block here), added to HK_GUARDS in
src/sprite/items/heroineKnightSword.ts.

  python3 -I tools/refs/hk-sword-from-ref.py src/sprite/items/heroineKnightSwordArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_knights_ref as R  # noqa: E402

# The blade's foot (our frame): the guard is what lies before this line across the blade (x + y <= GUARD_CUT),
# the blade what lies past it.
GUARD_CUT = R.BLADE_FOOT


def blade_angle(m, col):
    """The blade's angle as he drew it (degrees): the line through his blade's light pixels."""
    ys, xs = np.nonzero(m & np.array([[R.kind(col[y, x]) in ('cyan', 'white') for x in range(R.GRID)] for y in range(R.GRID)]))
    sel = xs + ys > GUARD_CUT
    ys, xs = ys[sel], xs[sel]
    k, _ = np.polyfit(ys, xs, 1)
    return float(np.degrees(np.arctan2(1.0, k)))


def build():
    m, col = R.sword_piece()
    yy, xx = np.mgrid[0:R.GRID, 0:R.GRID]
    guard = m & (xx + yy <= GUARD_CUT)
    blade = m & ~guard
    ang = blade_angle(m, col)
    g = R.grip()
    consts = [
        ('HK_SWORD_BLADE', blade, col, "Her longsword's blade: his long pale-blue blade from the guard to the point. It pivots on the grip under her near fist.", g, ang, False),
        ('HK_SWORD_GUARD', guard, col, "Her longsword's guard (the 'cross' guard): his silver cross-guard with the blue gem, the grip past her fist and the pommel. It pivots on the grip.", g, ang, False),
    ]
    bases = {'HK_SWORD_STEEL': R.middle(col, blade, ('cyan', 'white', 'steel')), 'HK_SWORD_HILT': R.middle(col, guard, ('steel', 'ivory', 'white')),
             'HK_SWORD_GEM': R.middle(col, guard, ('blue',))}
    return R.module(R.header('hk-sword-from-ref.py', "The owner's heroine knights' longsword"), consts, bases, 'HK_SWORD')


if __name__ == '__main__':
    R.run(sys.argv, build)
