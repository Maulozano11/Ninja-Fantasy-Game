"""The owner's kunai from his Cazador 2 (docs/reference/cazador2-owner-reference.jpg), for the Kunai
(`held_kunai`, its id kept).

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). She holds it
point down: the ring over the near fist, the steel blade below it running down toward the knee. This script
lifts it out, every pixel in his exact colour; in the fist he drew none of its grip, so there it is his ring's
dark wrap carried along the kunai's axis to the blade, between two lines of his black.

It is one piece, pinned on the grip (where our near fist holds a handle, src/sprite/grip.ts gripPoint) and
drawn at the angle she holds it: at rest it is every pixel his and where he drew it (his picture at
cazador2_ref.BODY). His steel follows Blade, the ring and grip Wrap; his black line stays.

It writes src/sprite/items/kunaiArt.ts and, in <study>, the piece at 8x. The same picture always gives the
same bytes:

  python3 -I tools/refs/cazador2-kunai-from-ref.py src/sprite/items/kunaiArt.ts [study]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import cazador2_ref as C  # noqa: E402

DOC = (
    "// The owner's kunai on his Cazador 2, his pixels (tools/refs/cazador2-kunai-from-ref.py\n"
    '// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# The rows of the ring and the grip (the rest is the blade).
GRIP_ROWS = 59


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    m = masks['kunai']
    grip_hex = {C.hexc(cols['kunai'][y, x]) for y, x in zip(*np.nonzero(m)) if y < GRIP_ROWS}
    blade_hex = {C.hexc(cols['kunai'][y, x]) for y, x in zip(*np.nonzero(m)) if y >= GRIP_ROWS}

    def kind_of(_n, h):
        if C.kind(C.rgb(h)) == 'line':
            return 'line'
        # A colour on the blade is steel; one only on the ring and grip is the wrap.
        return 'blade' if h in blade_hex or h not in grip_hex else 'wrap'

    J = C.JOINTS
    (wx, wy), (hx, hy) = J['wristN'], J['handN']
    d = math.hypot(hx - wx, hy - wy)
    grip = (hx + 1.8 * (hx - wx) / d, hy + 1.8 * (hy - wy) / d)
    (x0, y0), (x1, y1) = C.KUNAI_AXIS
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    is_ = lambda want: lambda c: kind_of('', C.hexc(c)) == want
    bases = {
        'KUNAI_STEEL': C.middle(a, masks, cols, ['kunai'], is_('blade')),
        'KUNAI_WRAP': C.middle(a, masks, cols, ['kunai'], is_('wrap')),
    }
    specs = [('KUNAI_ART', 'kunai', 'Her kunai, pinned on the grip and pointing at her angle toward the point.', grip, ang)]
    text = C.emit(masks, cols, specs, bases, kind_of, 'KUNAI', "'line' | 'blade' | 'wrap'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, ['kunai'], os.path.join(study, 'kunai@8.png'))
    print('bases', bases, 'grip', grip, 'angle', ang)


if __name__ == '__main__':
    main()
