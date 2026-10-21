"""The owner's blue sash from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg), for the Cloth Sash
(`waist_sash`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour: the band wound round the waist, with its navy seam, and the long panel hanging from it diagonally
across the far thigh, its folds running down it. It rides the torso about the pelvis, so at rest every pixel
lands where he drew it. His blues follow Sash, his navy folds and seams Edge; his black line stays.

It writes src/sprite/items/sashArt.ts and, in <study>, the piece at 10x. The same picture always gives the
same bytes:

  python3 -I tools/refs/ascended-sash-from-ref.py src/sprite/items/sashArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's blue sash on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-sash-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
# His navy folds and seams are darker than this (luma); his blues lighter.
EDGE_LUMA = 55


def kind_of(_n, h):
    L = A.luma(A.np.array(A.rgb(h), float))
    return 'line' if L <= 12 else 'edge' if L < EDGE_LUMA else 'main'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    J = A.JOINTS
    is_ = lambda want: lambda c: kind_of('', A.hexc(c)) == want
    bases = {
        'SASH_MAIN': A.middle(a, masks, cols, ['sash'], is_('main')),
        'SASH_EDGE': A.middle(a, masks, cols, ['sash'], is_('edge')),
    }
    specs = [('SASH_BAND', 'sash', 'The band round the waist and its panel across the far thigh: it rides the torso about the pelvis.', J['pelvis'], A.angle('pelvis', 'neck'))]
    text = A.emit(masks, cols, specs, bases, kind_of, 'SASH', "'line' | 'main' | 'edge'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, ['sash'], os.path.join(study, 'sash@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
