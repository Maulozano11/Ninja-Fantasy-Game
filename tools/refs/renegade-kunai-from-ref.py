"""The owner's kunai from his Renegade picture (docs/reference/renegade-owner-reference.jpg), as the Kunai
(held_kunai).

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). He holds the kunai blade down in the near fist: its dark ring sticks
out above the fist's back, the wrapped handle shows under it, and the blade hangs at our idle blade's
angle, grey and white steel with rust on its lower edge, in his black line. This script lifts it out of
his pixels (SEG letter 'k': the fist round the handle is the tunic's arm, tools/refs/renegade-top-from-ref.py)
as one piece, its pivot where our grip passes through the fist (GRIP) and its angle our idle blade's (52),
so at rest every pixel is his; other poses turn it with RotSprite, like his other weapons
(src/sprite/items/weapons.ts drawPaintedWeapon).

Blade recolours his steel; Wrap recolours his rust and the handle; his black line stays. It writes
src/sprite/items/kunaiArt.ts and, in <study>, his fist and kunai beside the piece at 8x. The same picture
always gives the same bytes:

  python3 -I tools/refs/renegade-kunai-from-ref.py src/sprite/items/kunaiArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import renegade_ref as R  # noqa: E402

# His handle runs inside the fist from the ring (top left) to the blade (bottom right), a diagonal two
# pixels wide (y = x + 26 and y = x + 27, his pixels); he drew only its two ends. Hidden in the fist at
# rest, it shows when another pose turns the fist and the kunai apart, so it is filled with his handle's
# two colours in turn (HANDLE_COLOURS: the cells under the fist where it comes out), between his black
# lines on either side.
HANDLE_X = range(31, 37)
HANDLE_COLOURS = ((62, 35), (63, 35))

DOC = (
    "// The owner's kunai on his Renegade, his pixels (tools/refs/renegade-kunai-from-ref.py from\n"
    '// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, _ = R.pieces(a)
    k = masks['k'].copy()
    col = a.copy()
    line = a[R.SEG_LINE_PIXEL]
    seg = R.seg_grid(a.shape[:2])
    for x in HANDLE_X:
        for y, c in ((x + 26, a[HANDLE_COLOURS[x % 2]]), (x + 27, a[HANDLE_COLOURS[(x + 1) % 2]]), (x + 25, line), (x + 28, line)):
            if not masks['k'][y, x] and seg[y, x] in 'n#':  # only under the fist, not over the belt's ends
                k[y, x] = True
                col[y, x] = c
    bases = {
        'KUNAI_STEEL': R.base(a, masks, 'k', ('metal',)),
        'KUNAI_WRAP': R.base(a, masks, 'k', ('rust',)),
    }
    consts = [
        ('KUNAI_PIECE', 'k', k, 'His kunai: the ring above the fist, the handle under it, the blade hanging at our idle angle.', R.GRIP, float(R.GRIP_ANGLE)),
    ]
    text = R.module(a, masks, DOC, 'KUNAI', consts, bases, cols=col)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, {'k': k}, 'k', os.path.join(study, 'kunai@8.png'), box=(26, 50, 46, 74), cols=col)
    print('bases', bases, int(k.sum()))


if __name__ == '__main__':
    main()
