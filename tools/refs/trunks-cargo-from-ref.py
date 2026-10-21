"""The owner's green cargo trousers from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the trousers out of it, every pixel in his exact
colour, cut into the pieces that ride the rig:

  the seat     the waist and the top of both legs, down to row T2_HIP: it rides the pelvis.
  the thighs   each leg's side of his inseam from 3 rows above the seat's end to its knee row
               (T2_KNEE): each turns with its thigh about the hip.
  the shins    each leg from 2 rows above its knee row down to his baggy hem over the boot: each
               turns with its shin about the knee.

His sword crosses both legs: there each leg is continued up and down his folds (trunks_ref.fill), so
other poses, where the sword hangs elsewhere, show no hole. The dark browns in the crotch are the
inseam's shadow and stay in the trousers. Every piece is pinned to our joint where it lies in his
picture, so at rest every pixel is his, where he drew it.

It writes the pieces as TypeScript (src/sprite/items/cargoPantsArt.ts) and, in <study>, his figure
beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-cargo-from-ref.py src/sprite/items/cargoPantsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's green cargo trousers, his pixels (tools/refs/trunks-cargo-from-ref.py from\n"
    '// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks2()
    A = lambda j, k: R.angle('trunks2', j, k)  # noqa: E731
    main_ = R.by_kind({}, 'main')
    pieces = [
        ('CARGO_SEAT', *P['seat'], 'The waist and the top of both legs: it rides the pelvis.', 'pelvis', A('pelvis', 'neck'), main_),
        ('CARGO_THIGH_F', *P['thigh_f'], 'The far thigh: it turns with the thigh about the hip.', 'hipF', A('hipF', 'kneeF'), main_),
        ('CARGO_SHIN_F', *P['shin_f'], 'The far leg from the knee to the hem: it turns with the shin about the knee.', 'kneeF', A('kneeF', 'ankleF'), main_),
        ('CARGO_THIGH_N', *P['thigh_n'], 'The near thigh: it turns with the thigh about the hip.', 'hipN', A('hipN', 'kneeN'), main_),
        ('CARGO_SHIN_N', *P['shin_n'], 'The near leg from the knee to the bloused hem: it turns with the shin about the knee.', 'kneeN', A('kneeN', 'ankleN'), main_),
    ]
    R.run('trunks2', out_ts, DOC, pieces, 'CARGO', {'main': 'CARGO_GREEN'})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P[n] for n in ('thigh_f', 'shin_f', 'thigh_n', 'shin_n', 'seat')], os.path.join(study, 'cargo@8.png'))


if __name__ == '__main__':
    main()
