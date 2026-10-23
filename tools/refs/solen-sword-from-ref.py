"""The owner's ice crystal sword as his Solen holds it (docs/reference/solen-owner-reference.jpg).

It is his repaint of the Ice Crystal Sword (held_ice_crystal, first lifted from his crystal sword picture by
tools/refs/crystal-sword-from-ref.py): the item draws these pixels now (the owner, 2026-10-21: "4 si").

His Solen holds a long sword in the near fist, hanging across the legs at his angle (35 degrees): a small
ice-blue pommel above the bracer, a dark blue wrapped grip, a steel cross-guard set across the blade below
the fist, and a long ice-blue blade with a near-white edge, all in his black line. One of his pixels is one
fine pixel of our sprites (tools/refs/solen_ref.py).

This script takes the sword out of his pixels: what lies along the sword's line (solen_ref.SWORD_AT,
SWORD_ANGLE, SWORD_PARTS) in the sword's colours (his ice blues, his steel guard, his dark blue grip; not
the trousers' navy the blade crosses) and the black line that bounds it. Every pixel keeps his exact colour,
one palette character per colour of his (colours within 3 share one). His fist and bracer hide the grip
between the pommel and the guard: it is continued with his own grip a hand's width up the sword (its two
blues and their wrap, in his black line), so the sword is whole when our fist holds it elsewhere.

The template is drawn at his angle and pivots on the grip cell under our near hand joint at rest: his grip
line passes through our near hand joint, so our idle pose holds this sword at his angle with its pivot
there, and at rest every pixel is his. It writes the module (src/sprite/items/iceSwordArt.ts) and, in
<study>, his figure beside the sword at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-sword-from-ref.py src/sprite/items/iceSwordArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's ice crystal sword as his Solen holds it, his pixels (tools/refs/solen-sword-from-ref.py from\n"
    '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)

# The grip his fist and bracer hide, along the sword (t, from solen_ref.SWORD_AT): from his last grip pixel
# above the bracer to the guard's middle; it takes his grip GRIP_FROM px further up the sword.
HIDDEN_GRIP = (-36.5, -26.5)
GRIP_FROM = 5.0
GRIP_HALF = 1.1  # the grip's half width; his line round it is the next pixel out


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    m, c, f = masks['sword'], cols['sword'], filled['sword']
    H, W, _ = a.shape
    t, s = R.sword_frame(H, W)
    black = R.his_line(a)
    d = np.array([np.cos(np.radians(R.SWORD_ANGLE)), np.sin(np.radians(R.SWORD_ANGLE))])
    hid = (t >= HIDDEN_GRIP[0]) & (t < HIDDEN_GRIP[1]) & (np.abs(s) <= GRIP_HALF + 1)
    # (not where his cape shows past the grip, below it and left of his fist)
    K = R.kinds(a)
    for y, x in zip(*np.nonzero(hid & ~m & (K != 'grey'))):
        if abs(s[y, x]) > GRIP_HALF:
            c[y, x] = black
        else:
            sx, sy = int(np.floor(x + 0.5 - GRIP_FROM * d[0])), int(np.floor(y + 0.5 - GRIP_FROM * d[1]))
            c[y, x] = a[sy, sx] if m[sy, sx] and R.kind(a[sy, sx]) != 'line' else black
        m[y, x] = True
        f[y, x] = True
    J = R.JOINTS
    bases = {
        'ICE_SWORD_BLADE': R.middle(a, masks, cols, ['sword'], ('ice',)),
    }
    consts = [
        ('ICE_SWORD', 'sword', 'The sword as he painted it in Solen\'s near fist, hanging across the legs: drawn at his angle, pivoting on the grip under our near hand joint, so held at rest it is every pixel his.', J['handN'], R.SWORD_ANGLE),
    ]
    text = R.module(masks, cols, DOC, consts, bases, 'ICE_SWORD')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['sword'], os.path.join(study, 'sword@8.png'), (20, 46, 86, 96), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
