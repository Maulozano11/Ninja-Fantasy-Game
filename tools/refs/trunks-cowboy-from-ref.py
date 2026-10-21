"""The owner's tan open-toed boots from his Trunks 3 picture (docs/reference/trunks3-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). He drew the boots of this slot (it was the Cowboy Boots) as tan leather
boots to mid-shin with an open front over the toes. This script lifts them out, every pixel in his
exact colour: on each leg the shaft from under the trouser hem down to the ankle (it turns with the shin
about the ankle) and the foot with the bare toes (it stays flat on the ground). His sword crosses the
far shaft's front: there it is continued up from below. Each piece is pinned to our ankle where it lies
in his picture, so at rest every pixel is his. His tans follow the Leather slot and his toes the
character's skin; his line stays.

It writes the pieces as TypeScript (src/sprite/items/openToeBootsArt.ts) and, in <study>, his figure
beside them at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-cowboy-from-ref.py src/sprite/items/openToeBootsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's tan open-toed boots, his pixels (tools/refs/trunks-cowboy-from-ref.py from\n"
    '// docs/reference/trunks3-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks3()
    A = lambda j, k: R.angle('trunks3', j, k)  # noqa: E731
    # His toes: his skin and its rosy shadows in the open fronts (the rows under each foot's strap).
    toes = set()
    for s, bx in (('n', R.box(35, 92, 47, 97)), ('f', R.box(63, 91, 72, 96))):
        m, c = P['boot_foot_' + s]
        toes |= {R.hexc(c[y, x]) for y, x in zip(*R.np.nonzero(m & R.region(bx))) if R.kind(c[y, x]) in ('skin', 'red')}
    kind = R.by_kind({}, 'main')
    slot = lambda h: 'skin' if h in toes else kind(h)  # noqa: E731
    pieces = []
    for s, side in (('F', 'far'), ('N', 'near')):
        k = s.lower()
        shin = A('knee' + s, 'ankle' + s)
        pieces += [
            (f'OPEN_BOOT_SHAFT_{s}', *P['boot_shaft_' + k], f'The {side} shaft: it turns with the shin about the ankle.', 'ankle' + s, shin, slot),
            (f'OPEN_BOOT_FOOT_{s}', *P['boot_foot_' + k], f'The {side} foot, the toes bare: it stays flat on the ground.', 'ankle' + s, shin, slot),
        ]
    R.run('trunks3', out_ts, DOC, pieces, 'OPEN_BOOT', {'main': 'OPEN_BOOT_TAN'})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P[n] for n in ('boot_shaft_f', 'boot_foot_f', 'boot_shaft_n', 'boot_foot_n')], os.path.join(study, 'open-boots@8.png'))


if __name__ == '__main__':
    main()
