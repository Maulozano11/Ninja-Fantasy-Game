"""The owner's brown laced boots from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the boots out of it, every pixel in his exact colour:
on each leg the laced shaft from under his bloused trouser hem down to the ankle (it turns with the shin
about the ankle) and the foot (it stays flat on the ground like our feet). His sword crosses the far
shaft's front: there it is continued up from his laces below. Each piece is pinned to our ankle where it
lies in his picture, so at rest every pixel is his, where he drew it.

It writes the pieces as TypeScript (src/sprite/items/leatherBootsArt.ts) and, in <study>, his figure
beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-leather-boots-from-ref.py src/sprite/items/leatherBootsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's brown laced boots, his pixels (tools/refs/trunks-leather-boots-from-ref.py from\n"
    '// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks2()
    A = lambda j, k: R.angle('trunks2', j, k)  # noqa: E731
    main_ = R.by_kind({}, 'main')
    pieces = []
    for s, side in (('F', 'far'), ('N', 'near')):
        k = s.lower()
        shin = A('knee' + s, 'ankle' + s)
        pieces += [
            (f'BOOT_SHAFT_{s}', *P['boot_shaft_' + k], f'The {side} laced shaft: it turns with the shin about the ankle.', 'ankle' + s, shin, main_),
            (f'BOOT_FOOT_{s}', *P['boot_foot_' + k], f'The {side} foot: it stays flat on the ground.', 'ankle' + s, shin, main_),
        ]
    R.run('trunks2', out_ts, DOC, pieces, 'LEATHER_BOOT', {'main': 'LEATHER_BOOT_BROWN'})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P[n] for n in ('boot_shaft_f', 'boot_foot_f', 'boot_shaft_n', 'boot_foot_n')], os.path.join(study, 'leather-boots@8.png'))


if __name__ == '__main__':
    main()
