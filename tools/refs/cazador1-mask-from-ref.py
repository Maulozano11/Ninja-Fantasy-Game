"""The owner's oni mask from his Cazador 1 (docs/reference/cazador1-owner-reference.jpg), for the Oni Mask
(`face_foxmask`, its id kept: the owner's redesign of the old fox mask).

His picture is our Hunter-nin painted over in his own pixels (tools/refs/cazador1_ref.py: one of his
pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the mask    the white porcelain face with its beige shading, the red markings (the brows, the stripes
              over the cheeks, the grin) and the dark eye holes. Under the strands of his hair that fall
              over its brow the mask is continued from his porcelain beside them, so it stays whole
              under another hair.
  the horns   his two red horns, standing out of the hair over the brow.

Both are pinned on our face anchor (the near eye's lash start), as his hair is, so they sit on the face
as he drew them on every body and in every pose; the mask lies under the hair, the horns over it. His
porcelain, red and eye holes follow the item's three colour slots; his black line stays.

It writes src/sprite/items/oniMaskArt.ts and, in <study>, the pieces at 8x (continued cells crossed).
The same picture always gives the same bytes:

  python3 -I tools/refs/cazador1-mask-from-ref.py src/sprite/items/oniMaskArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador1_ref as C  # noqa: E402

DOC = (
    "// The owner's oni mask and horns on his Cazador 1, his pixels (tools/refs/cazador1-mask-from-ref.py\n"
    '// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(n, h):
    k = C.kind(C.rgb(h))
    if k == 'line':
        return 'line'
    if n == 'horns' or k == 'red':
        return 'paint'
    return 'eyes' if k == 'dark' else 'porcelain'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    is_ = lambda want: lambda c: kind_of('mask', C.hexc(c)) == want
    bases = {
        # His porcelain's lit white (most of it is lighter than its beige shading).
        'ONI_PORCELAIN': C.middle(a, masks, cols, ['mask'], is_('porcelain'), 0.7),
        'ONI_PAINT': C.middle(a, masks, cols, ['mask', 'horns'], lambda c: kind_of('horns', C.hexc(c)) == 'paint' and C.kind(c) == 'red'),
        'ONI_EYES': C.middle(a, masks, cols, ['mask'], is_('eyes')),
    }
    specs = [
        ('ONI_MASK', 'mask', 'The porcelain mask over the face, pinned on the face anchor.', C.FACE, 0.0),
        ('ONI_HORNS', 'horns', 'The two red horns over the hair, pinned on the face anchor.', C.FACE, 0.0),
    ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'ONI_MASK', "'line' | 'porcelain' | 'paint' | 'eyes'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, ['mask', 'horns'], os.path.join(study, 'mask@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
