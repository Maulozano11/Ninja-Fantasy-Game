"""The owner's green cargo trousers from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the trousers out of it, every pixel in his exact
colour, cut into the pieces that ride the rig:

  the seat     the waist and the top of both legs, down to row T2_HIP: it rides the pelvis.
  the thighs   each leg's side of his inseam from 3 rows above the seat's end to its knee row
               (T2_KNEE): each turns with its thigh about the hip.
  the shins    each leg from 2 rows above its knee row down to his baggy hem over the boot: each
               turns with its shin about the ankle, as the boot's shaft does, so the hem never parts
               from the boot.
  into boot    each leg 2 rows on under its hem into the boot's shaft, in his black line, under the
               boot at rest (drawn over boots only).
  the gap      the browns he drew between the legs (the cape's inside, under the crotch and over the
               boots): no leg's, so a leg that moves never drags them along; drawn only at rest.

Each leg is only what lies inside its own black line (trunks_ref.T2_LEG).

His sword crosses both legs: there each leg is continued up and down his folds (trunks_ref.fill), so
other poses, where the sword hangs elsewhere, show no hole: each leg's inner black line runs on there
from where it shows to his boot's top. Every piece is pinned to our joint where it lies in his
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
# His green the colour slot recolours from (his colour of middle lightness when the trousers were first
# lifted, the item's default colour, which characters saved).
BASE = '#333b2b'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks2()
    A = lambda j, k: R.angle('trunks2', j, k)  # noqa: E731
    main_ = R.by_kind({}, 'main')
    pieces = [
        ('CARGO_SEAT', *P['seat'], 'The waist and the top of both legs: it rides the pelvis.', 'pelvis', A('pelvis', 'neck'), main_),
        ('CARGO_THIGH_F', *P['thigh_f'], 'The far thigh: it turns with the thigh about the hip.', 'hipF', A('hipF', 'kneeF'), main_),
        ('CARGO_SHIN_F', *P['shin_f'], 'The far leg from the knee to the hem: it turns with the shin about the ankle, as the boot does.', 'ankleF', A('kneeF', 'ankleF'), main_),
        ('CARGO_THIGH_N', *P['thigh_n'], 'The near thigh: it turns with the thigh about the hip.', 'hipN', A('hipN', 'kneeN'), main_),
        ('CARGO_SHIN_N', *P['shin_n'], 'The near leg from the knee to the bloused hem: it turns with the shin about the ankle, as the boot does.', 'ankleN', A('kneeN', 'ankleN'), main_),
        ('CARGO_INTO_BOOT_F', *P['into_boot_f'], 'The far leg on under its hem into the boot (his line; drawn over boots only): it turns with the shin about the ankle.', 'ankleF', A('kneeF', 'ankleF'), main_),
        ('CARGO_INTO_BOOT_N', *P['into_boot_n'], 'The near leg on under its hem into the boot (his line; drawn over boots only): it turns with the shin about the ankle.', 'ankleN', A('kneeN', 'ankleN'), main_),
        ('CARGO_GAP', *P['gap'], "The browns between his legs (the cape's inside), no leg's: drawn only while the legs stand as he drew them.", 'hipF', A('hipF', 'kneeF'), main_),
    ]
    R.run('trunks2', out_ts, DOC, pieces, 'CARGO', {'main': 'CARGO_GREEN'}, {'main': BASE})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P[n] for n in ('thigh_f', 'shin_f', 'thigh_n', 'shin_n', 'seat')], os.path.join(study, 'cargo@8.png'))


if __name__ == '__main__':
    main()
