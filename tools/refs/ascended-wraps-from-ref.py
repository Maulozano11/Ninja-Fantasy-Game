"""The owner's bandaged forearms and fists from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg),
for the Bandage Wraps (`hands_wraps`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour:

  the forearms   each forearm bound in bandages from under the sleeve's cuff to the wrist. Each rides its
                 forearm about the elbow. Under the cuff his turns are repeated on up to our elbow, so the
                 arm stays bound when it bends.
  the fists      each hand bound across the back, the fingers bare (the near one closed, the far one
                 hanging loosely closed). Each rides its hand about the wrist; it shares two rows with the
                 forearm there, so the wrist stays closed as it bends.

The far arm is read cell by cell (docs/SPRITE_STYLE_GUIDE.md, the far shoulder and arm). Every piece is
pinned with its pivot on our joint and stamped at its limb's angle at rest, so at rest every pixel lands
where he drew it. His bandage follows Bandage, his bare fingers the character's skin; his dark line stays.

It writes src/sprite/items/wrapsArt.ts and, in <study>, the pieces at 10x (continued cells crossed). The
same picture always gives the same bytes:

  python3 -I tools/refs/ascended-wraps-from-ref.py src/sprite/items/wrapsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's bandaged forearms and fists on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-wraps-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
NAMES = ['wrap_f', 'fist_f', 'wrap_n', 'fist_n']


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    J = A.JOINTS
    kind_of = lambda _n, h: A.bandage_kind(A.rgb(h))
    is_ = lambda want: lambda c: A.bandage_kind(c) == want
    bases = {
        'WRAPS_CLOTH': A.middle(a, masks, cols, ['wrap_n', 'wrap_f', 'fist_n', 'fist_f'], is_('cloth'), 0.6),
        # His lit skin stands for the character's skin colour, which our bodies show in the light.
        'WRAPS_SKIN': A.his_skin(a, masks, cols),
    }
    specs = [
        ('WRAPS_FORE_N', 'wrap_n', 'The near forearm bound from under the cuff to the wrist: it rides the forearm about the elbow.', J['elbowN'], A.angle('elbowN', 'wristN')),
        ('WRAPS_FIST_N', 'fist_n', 'The near fist, bound across the back, the fingers bare: it rides the hand about the wrist.', J['wristN'], A.angle('wristN', 'handN')),
        ('WRAPS_FORE_F', 'wrap_f', 'The far forearm bound from under the cuff to the wrist: it rides the forearm about the elbow.', J['elbowF'], A.angle('elbowF', 'wristF')),
        ('WRAPS_FIST_F', 'fist_f', 'The far hand, loosely closed, bound across the back: it rides the hand about the wrist.', J['wristF'], A.angle('wristF', 'handF')),
    ]
    text = A.emit(masks, cols, specs, bases, kind_of, 'WRAPS', "'line' | 'cloth' | 'skin'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, NAMES, os.path.join(study, 'wraps@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
