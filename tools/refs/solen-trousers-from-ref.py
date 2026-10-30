"""The owner's navy trousers on his Solen (docs/reference/solen-owner-reference.jpg).

His picture is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one
fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the legs   on each leg the navy trouser from under the skirt's hem to the sandal's strap band below the
             knee, with his gold studs (two by two on the near leg, two on the far one). Behind the sword's
             blade and under the skirt's hem each is continued (solen_ref.clone_fill: cloned from his cloth a
             shift away, his studs not cloned). Each rides its thigh about the knee.

His legs stand wider than ours, as in his Roman picture: his near leg 6 px further back, his far leg 2 px
back and 5 px lower (solen_ref.LEG_OUT, measured on his sandals, which are his Roman ones). Each trouser
leg stays where he drew it and turns about our knee moved LEG_OUT, unturned at rest; the game moves our
legs there under it while they stand as at rest (src/sprite/items/founderOut.ts founderLegOut). It writes
the pieces as TypeScript (src/sprite/items/founderTrousersArt.ts) and, in <study>, his figure beside the
pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-trousers-from-ref.py src/sprite/items/founderTrousersArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's navy trousers with gold studs, his pixels (tools/refs/solen-trousers-from-ref.py from\n"
    '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols, filled = R.pieces(a)
    J = R.JOINTS
    knee = lambda s: (J['knee' + s][0] + R.LEG_OUT[s][0], J['knee' + s][1] + R.LEG_OUT[s][1])
    bases = {
        'FOUNDER_TROUSERS': R.middle(a, masks, cols, ['thigh_n', 'thigh_f'], ('navy',), 0.6),
        'FOUNDER_TROUSERS_STUD': R.middle(a, masks, cols, ['thigh_n', 'thigh_f'], ('gold',)),
    }
    consts = [
        ('FOUNDER_THIGH_N', 'thigh_n', 'The near trouser leg, under the skirt to below the knee: it rides the thigh about the knee.', knee('N'), R.angle('hipN', 'kneeN')),
        ('FOUNDER_THIGH_F', 'thigh_f', 'The far trouser leg: it rides the thigh about the knee.', knee('F'), R.angle('hipF', 'kneeF')),
    ]
    extra = ('/** How far his legs stand from ours at rest (fine pixels): his trousers and sandals turn about our knees and ankles moved this far. */\n'
             f"export const FOUNDER_LEG_OUT: Record<'N' | 'F', [number, number]> = {{ N: [{R.LEG_OUT['N'][0]}, {R.LEG_OUT['N'][1]}], F: [{R.LEG_OUT['F'][0]}, {R.LEG_OUT['F'][1]}] }};")
    text = R.module(masks, cols, DOC, consts, bases, 'FOUNDER_TROUSERS', extra)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['thigh_f', 'thigh_n'], os.path.join(study, 'trousers@8.png'), (32, 60, 68, 84), filled)
    print('bases', bases)


if __name__ == '__main__':
    main()
