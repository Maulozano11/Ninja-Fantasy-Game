"""The owner's naginata from his Cazador 1 (docs/reference/cazador1-owner-reference.jpg), for the Naginata
(`held_naginata`, its id kept).

His picture is our Hunter-nin painted over in his own pixels (tools/refs/cazador1_ref.py: one of his
pixels is one fine pixel of our sprites). He holds it low: the wooden shaft through the near fist, the
steel cap on its butt over the near shoulder, the steel blade (with its spike and the hook on its back)
across the legs, blood on its edge. This script lifts it out, every pixel in his exact colour. Behind the
near fist he drew none of the shaft: there it is his shaft above the fist continued along itself (its
cross-section, line and wood, carried down the shaft cell by cell), to where it comes out below the fist.

It is one piece, pinned on the grip (where our near fist holds a handle, src/sprite/grip.ts gripPoint)
and drawn at the angle he holds it, his shaft's (45 degrees down toward the blade): at rest it is every
pixel his and where he drew it, and in the other poses it turns about the grip. His steel follows Blade,
his wood Shaft; his black line and the blood stay.

It writes src/sprite/items/naginataArt.ts and, in <study>, the piece at 8x (continued cells crossed).
The same picture always gives the same bytes:

  python3 -I tools/refs/cazador1-naginata-from-ref.py src/sprite/items/naginataArt.ts [study]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador1_ref as C  # noqa: E402

DOC = (
    "// The owner's naginata on his Cazador 1, his pixels (tools/refs/cazador1-naginata-from-ref.py\n"
    '// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(_n, h):
    r, g, b = C.rgb(h)
    k = C.kind((r, g, b))
    if k == 'line':
        return 'line'
    if k == 'red' or r - g > 55 or (r - g > 40 and g - b < 10):
        return 'blood'
    if k in ('wood', 'skin'):
        return 'shaft'
    return 'blade'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    J = C.JOINTS
    # Our grip point at rest: the middle of the near fist, 0.9 design units (1.8 of his pixels) past the
    # hand joint along the hand (src/sprite/grip.ts gripPoint).
    (wx, wy), (hx, hy) = J['wristN'], J['handN']
    d = math.hypot(hx - wx, hy - wy)
    grip = (hx + 1.8 * (hx - wx) / d, hy + 1.8 * (hy - wy) / d)
    # The angle he holds it at: his shaft's two runs are both 45 degrees down toward the blade.
    (x0, y0), (x1, y1) = C.SHAFT_UP
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    is_ = lambda want: lambda c: kind_of('', C.hexc(c)) == want
    bases = {
        'NAGINATA_STEEL': C.middle(a, masks, cols, ['weapon'], is_('blade')),
        'NAGINATA_WOOD': C.middle(a, masks, cols, ['weapon'], is_('shaft')),
    }
    specs = [('NAGINATA', 'weapon', 'His naginata, pinned on the grip and pointing at his angle toward the blade.', grip, ang)]
    text = C.emit(masks, cols, specs, bases, kind_of, 'NAGINATA', "'line' | 'blade' | 'shaft' | 'blood'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, ['weapon'], os.path.join(study, 'naginata@8.png'))
    print('bases', bases, 'grip', grip, 'angle', ang)


if __name__ == '__main__':
    main()
