"""The owner's half mask with teal stripes and small teal ears from his Cazador 2
(docs/reference/cazador2-owner-reference.jpg), for the Lynx Mask (`face_catmask`, its id kept).

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). This script
lifts out of it, every pixel in his exact colour:

  the mask   the white mask over the lower face, from under the eyes to the chin, with its teal stripes
             across the cheeks and a touch of pink on the far cheek;
  the ears   the two small ears standing out of the hair, white and teal in his black line.

Both are pinned on our face anchor, as the hair is, so they sit on the face as he drew them; the mask lies
under the hair, the ears over it. His white follows Porcelain and his teal Paint; his black line stays.

It writes src/sprite/items/lynxMaskArt.ts and, in <study>, the pieces at 8x. The same picture always gives
the same bytes:

  python3 -I tools/refs/cazador2-mask-from-ref.py src/sprite/items/lynxMaskArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador2_ref as C  # noqa: E402

DOC = (
    "// The owner's half mask and ears on his Cazador 2, his pixels (tools/refs/cazador2-mask-from-ref.py\n"
    '// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(_n, h):
    r, g, b = C.rgb(h)
    if C.kind((r, g, b)) == 'line':
        return 'line'
    # His teal: green and blue well over red.
    return 'paint' if g > r + 30 and b > r + 30 else 'porcelain'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    is_ = lambda want: lambda c: kind_of('', C.hexc(c)) == want
    bases = {
        'LYNX_PORCELAIN': C.middle(a, masks, cols, ['mask'], is_('porcelain'), 0.7),
        'LYNX_PAINT': C.middle(a, masks, cols, ['mask', 'ears'], is_('paint')),
    }
    specs = [
        ('LYNX_MASK', 'mask', 'The half mask over the lower face, pinned on the face anchor.', C.FACE, 0.0),
        ('LYNX_EARS', 'ears', 'The two small ears over the hair, pinned on the face anchor.', C.FACE, 0.0),
    ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'LYNX_MASK', "'line' | 'porcelain' | 'paint'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, ['mask', 'ears'], os.path.join(study, 'mask@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
