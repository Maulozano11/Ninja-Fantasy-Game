"""The owner's dark purple trousers and their belt from his Trunks 3 picture
(docs/reference/trunks3-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the trousers out of it, every pixel in his exact
colour, cut as his Trunks 2 trousers are (tools/refs/trunks-cargo-from-ref.py): the seat with the belt
and its grey buckle under the jacket's hem (it rides the pelvis), each thigh (about the hip) and each
shin down to the hem (about the ankle, as the boot's shaft turns, so the hem never parts from the
boot), and 2 rows on under the hem into the boot's shaft in his black line (drawn over boots only).
His sword crosses both legs: there each leg is continued up and down his folds, the far leg's inner
black line running on from where it shows, beside the white he left between the legs, straight down
to his boot's top (trunks_ref.T3_LEG). Each piece is pinned to our joint where it lies in his
picture, so at rest every pixel is his, where he drew it. His purples follow the Leggings slot and the
light purple crests down the sides of the legs the Side Seam slot; his line and the buckle's greys
stay.

It writes the pieces as TypeScript (src/sprite/items/leggingsArt.ts) and, in <study>, his figure beside
them at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-leggings-from-ref.py src/sprite/items/leggingsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's dark purple trousers and their belt, his pixels (tools/refs/trunks-leggings-from-ref.py\n"
    '// from docs/reference/trunks3-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# His side crests: the purples lighter than this (luma).
CREST = 70


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, _K, _M, P, _black = R.trunks3()
    A = lambda j, k: R.angle('trunks3', j, k)  # noqa: E731
    kind = R.by_kind({'grey': 'line', 'pale': 'line'}, 'main')

    def slot(h):
        k = kind(h)
        rgb = R.np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])
        return 'seam' if k == 'main' and R.luma(rgb) > CREST else k

    pieces = [
        ('LEGGINGS_SEAT', *P['seat'], 'The belt, its buckle, the waist and the top of both legs: it rides the pelvis.', 'pelvis', A('pelvis', 'neck'), slot),
        ('LEGGINGS_THIGH_F', *P['thigh_f'], 'The far thigh: it turns with the thigh about the hip.', 'hipF', A('hipF', 'kneeF'), slot),
        ('LEGGINGS_SHIN_F', *P['shin_f'], 'The far leg from the knee to the hem: it turns with the shin about the ankle, as the boot does.', 'ankleF', A('kneeF', 'ankleF'), slot),
        ('LEGGINGS_THIGH_N', *P['thigh_n'], 'The near thigh: it turns with the thigh about the hip.', 'hipN', A('hipN', 'kneeN'), slot),
        ('LEGGINGS_SHIN_N', *P['shin_n'], 'The near leg from the knee to the hem: it turns with the shin about the ankle, as the boot does.', 'ankleN', A('kneeN', 'ankleN'), slot),
        ('LEGGINGS_INTO_BOOT_F', *P['into_boot_f'], 'The far leg on under its hem into the boot (his line; drawn over boots only): it turns with the shin about the ankle.', 'ankleF', A('kneeF', 'ankleF'), slot),
        ('LEGGINGS_INTO_BOOT_N', *P['into_boot_n'], 'The near leg on under its hem into the boot (his line; drawn over boots only): it turns with the shin about the ankle.', 'ankleN', A('kneeN', 'ankleN'), slot),
    ]
    R.run('trunks3', out_ts, DOC, pieces, 'LEGGINGS', {'main': 'LEGGINGS_PURPLE', 'seam': 'LEGGINGS_CREST'})
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P[n] for n in ('thigh_f', 'shin_f', 'thigh_n', 'shin_n', 'seat')], os.path.join(study, 'leggings@8.png'))


if __name__ == '__main__':
    main()
