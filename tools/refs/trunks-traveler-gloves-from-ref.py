"""The owner's black fingerless gloves from his Trunks 2 picture (docs/reference/trunks2-owner-reference.jpg),
the Traveler's Gloves (hands_traveler_gloves; the Fingerless Gloves item became his Ren's gloves).

His picture is our male painted over in his own pixels (tools/refs/trunks_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts the gloves out of it, every pixel in his exact colour:
the near fist round the sword's grip (the grip shows through it where it does in his picture; the same
fist closes on nothing) with his fingertips bare under it, and the far fist hanging, its fingertips bare
too. Each rides its wrist, pinned where it lies in his picture, so at rest every pixel is his. His glove
greys follow the Glove slot and his fingertips the character's skin; his line and the grip stay.

It writes the pieces as TypeScript (src/sprite/items/travelerGlovesArt.ts) and, in <study>, his figure
beside them at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/trunks-traveler-gloves-from-ref.py src/sprite/items/travelerGlovesArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import trunks_ref as R  # noqa: E402

DOC = (
    "// The owner's black fingerless gloves (Traveler's Gloves), his pixels (tools/refs/trunks-traveler-gloves-from-ref.py from\n"
    '// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, K, M, P, _black = R.trunks2()
    grip = {R.hexc(a[y, x]) for y, x in zip(*R.np.nonzero(M['sword'] & P['glove_n'][0]))}
    kind = R.by_kind({'skin': 'skin', 'red': 'skin', 'brown': 'skin', 'purple': 'skin'}, 'main')
    slot = lambda h: 'line' if h in grip else kind(h)  # noqa: E731
    A = lambda j, k: R.angle('trunks2', j, k)  # noqa: E731
    pieces = [
        ('TRAVELER_GLOVE_F', *P['glove_f'], 'The far glove, a fist hanging: it rides the wrist.', 'wristF', A('wristF', 'handF'), slot),
        ('TRAVELER_GLOVE_N', *P['glove_n'], "The near glove round the sword's grip: it rides the wrist.", 'wristN', A('wristN', 'handN'), slot),
    ]
    # His glove's greys in tones for the hands he did not paint (open, pointing, relaxed): our hand
    # pictures in his glove.
    m = P['glove_n'][0] | P['glove_f'][0]
    t = R.tones(m & ~M['sword'], a, _black, ('grey', 'violet', 'blue'))
    extra = ('/** His glove for the hands he did not paint, by our hand pictures\' shades: line, crease, shadow, base, light. */\n'
             'export const TRAVELER_GLOVE_TONES = [' + ', '.join(f"'{h}'" for h in t) + '] as const;\n')
    R.run('trunks2', out_ts, DOC, pieces, 'TRAVELER_GLOVE', {'main': 'TRAVELER_GLOVE_BLACK'}, extra=extra)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [P['glove_f'], P['glove_n']], os.path.join(study, 'gloves@8.png'))


if __name__ == '__main__':
    main()
