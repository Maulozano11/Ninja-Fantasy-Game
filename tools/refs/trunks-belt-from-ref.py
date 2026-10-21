"""The owner's belt from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the belt out of it, every pixel in his exact colour:
the brown belt with its brass H buckle, the flapped pouch on the near hip and the strap hanging on the
far hip. It rides the pelvis, pinned where it lies in his picture, so at rest every pixel is his. His
buckle's pale brass follows the Buckle slot, his browns the Leather slot; his black line stays.

It writes the piece as TypeScript (src/sprite/items/beltArt.ts) and, in <study>, his figure beside it at
8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-belt-from-ref.py src/sprite/items/beltArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's belt with its H buckle and pouches, his pixels (tools/refs/trunks-belt-from-ref.py from\n"
    '// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
BUCKLE = R.box(54, 50, 60, 55)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks2()
    # His buckle: the H (x 54-59, rows 50-54), its brass lighter than the belt's leather showing through it.
    m, c = P['belt']
    buckle = {R.hexc(c[y, x]) for y, x in zip(*R.np.nonzero(m & R.region(BUCKLE))) if R.luma(c[y, x]) > 100}
    kind = R.by_kind({}, 'main')
    slot = lambda h: 'line' if kind(h) == 'line' else ('buckle' if h in buckle else 'main')  # noqa: E731
    pieces = [('BELT', *P['belt'], 'The belt, its H buckle, the near pouch and the far strap: it rides the pelvis.', 'pelvis', R.angle('trunks2', 'pelvis', 'neck'), slot)]
    R.run('trunks2', out_ts, DOC, pieces, 'BELT', {'main': 'BELT_LEATHER', 'buckle': 'BELT_BUCKLE'})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P['belt']], os.path.join(study, 'belt@8.png'))


if __name__ == '__main__':
    main()
