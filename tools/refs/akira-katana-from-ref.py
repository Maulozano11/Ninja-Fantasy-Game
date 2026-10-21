"""The owner's katana (Ember Katana) from his Akira picture (docs/reference/akira-owner-reference.jpg).

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour, the katana
in Akira's near fist: the gold pommel with its red tassel, the white wrapped hilt, the gold guard ring
and the long steel blade with its lit edge, hanging across the legs at his angle. The wrap his forearm
and fist hide is his wrap (and its lines) cloned on along the hilt's axis.

It is drawn at his angle and pivots on the grip at the middle of our near fist (grip.ts gripPoint), so
held at rest it is every pixel his. It writes the piece as TypeScript (src/sprite/items/emberKatanaArt.ts)
and, in <study>, his figure beside it at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/akira-katana-from-ref.py src/sprite/items/emberKatanaArt.ts [study]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import akira_ref as R  # noqa: E402

DOC = (
    "// The owner's katana, his pixels (tools/refs/akira-katana-from-ref.py from\n"
    '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# The blade's line, pommel to tip (his pixels): the angle he drew the katana at.
POMMEL, TIP = (25.5, 52.0), (81.0, 92.5)


def kind_of(h):
    """His black line; the tassel's reds; the gold of the pommel and guard (his yellows and their dark
    brown-golds); the blade's steel (cool greys, blue-greys and its white edge); the wrap (warm creams
    and whites); the guard ring's dark inside."""
    r, g, b = R.rgb(h)
    if max(r, g, b) < 40:
        return 'line'
    if r > 120 and g < 0.4 * r:
        return 'tassel'
    if r - b > 50 and r >= g:
        return 'gold'
    if b >= r - 4:
        return 'steel'
    if r > 140:
        return 'wrap'
    return 'dark'


def main():
    a = R.native()
    masks, cols, _ = R.pieces(a)
    J = R.JOINTS
    hx, hy = J['handN']
    wx, wy = J['wristN']
    d = math.hypot(hx - wx, hy - wy)
    grip = (hx + 1.8 * (hx - wx) / d, hy + 1.8 * (hy - wy) / d)
    m, c = masks['katana'], cols['katana']
    found = {}
    for y, x in zip(*R.np.nonzero(m)):
        found.setdefault(kind_of(R.hexc(c[y, x])), []).append((float(R.luma(c[y, x])), R.hexc(c[y, x])))
    mid = lambda k, q=0.5: sorted(found[k])[int(len(found[k]) * q)][1]
    bases = {
        'KATANA_STEEL': mid('steel'),
        'KATANA_GOLD': mid('gold', 0.75),
        'KATANA_WRAP': mid('wrap'),
        'KATANA_TASSEL': mid('tassel'),
    }
    ang = math.degrees(math.atan2(TIP[1] - POMMEL[1], TIP[0] - POMMEL[0]))
    consts = [
        ('EMBER_KATANA', m, c, 'The katana in the near fist at his angle, pivoting on the grip at the middle of our near fist.', grip, ang, (0, 0)),
    ]
    R.run(DOC, 'KATANA', consts, bases, kind_of)


if __name__ == '__main__':
    main()
