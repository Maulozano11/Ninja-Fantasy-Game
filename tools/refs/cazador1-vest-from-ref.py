"""The owner's armoured vest, shoulder guard, arm guards and bare arms from his Cazador 1
(docs/reference/cazador1-owner-reference.jpg), for the Shadow Ops Chestguard (`armor_shadowops`, its id
kept).

His picture is our Hunter-nin painted over in his own pixels (tools/refs/cazador1_ref.py: one of his
pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the vest       the dark grey chest plate and its banded belly over the black under-suit, from the
                 high collar (and the neck in shadow above it) to the vest's lower line. It rides the
                 torso about the neck. Under the near shoulder guard it is continued: its left line goes
                 on up to the collar, each column takes his colour from the vest below.
  the near arm   the layered shoulder guard (it rides the upper arm about the shoulder, partway with the
                 torso as the owner's other guards do), the bare skin above the elbow, then the grey arm
                 guard with the skin over it (about the elbow), and the fist round the naginata's shaft
                 (about the wrist).
  the far arm    the under-suit's black sleeve and the bare skin to the elbow (about the shoulder), the
                 grey arm guard (about the elbow) and the far fist (about the wrist). Read cell by cell
                 (docs/SPRITE_STYLE_GUIDE.md, the far shoulder and arm): at rest every pixel is his and
                 where he drew it. Behind the vest each is continued to the width of our far arm, from
                 his sleeve, skin and guard along each row, and closed by his line, so the arm stays
                 whole when it swings out from behind the body.

Every piece is pinned with its pivot on our joint, so at rest it lands where he drew it. His plates
follow Plates, his under-suit Under-suit and his skin the character's skin; his black line stays.

It writes src/sprite/items/shadowOpsArt.ts and, in <study>, the pieces at 8x (continued cells crossed).
The same picture always gives the same bytes:

  python3 -I tools/refs/cazador1-vest-from-ref.py src/sprite/items/shadowOpsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador1_ref as C  # noqa: E402

DOC = (
    "// The owner's armoured vest, shoulder guard, arm guards and bare arms on his Cazador 1, his pixels\n"
    '// (tools/refs/cazador1-vest-from-ref.py from docs/reference/cazador1-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
NAMES = ['upper_f', 'fore_f', 'fist_f', 'vest', 'upper_n', 'fore_n', 'fist_n', 'guard_n']


def kind_of(_n, h):
    k = C.kind(C.rgb(h))
    if k == 'line':
        return 'line'
    if k in ('skin', 'wood', 'red'):
        return 'skin'
    return 'suit' if k == 'dark' else 'plate'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    J = C.JOINTS
    is_ = lambda want: lambda c: kind_of('', C.hexc(c)) == want
    bases = {
        'SHADOW_PLATE': C.middle(a, masks, cols, ['vest', 'guard_n', 'fore_n', 'fore_f'], is_('plate')),
        'SHADOW_SUIT': C.middle(a, masks, cols, ['vest', 'upper_f'], is_('suit')),
        # His lit skin (cazador1_ref.his_skin) stands for the character's skin colour.
        'SHADOW_SKIN': C.his_skin(a, masks, cols),
    }
    specs = [
        ('SHADOW_VEST', 'vest', 'The vest over the under-suit, collar to lower line: it rides the torso about the neck.', J['neck'], C.angle('pelvis', 'neck')),
        ('SHADOW_GUARD_N', 'guard_n', 'The layered near shoulder guard: it rides the upper arm about the shoulder.', J['shoulderN'], C.angle('shoulderN', 'elbowN')),
        ('SHADOW_UPPER_N', 'upper_n', 'The near arm\'s bare skin under the guard, above the elbow: it rides the upper arm.', J['shoulderN'], C.angle('shoulderN', 'elbowN')),
        ('SHADOW_FORE_N', 'fore_n', 'The near arm guard with the skin above it: it rides the forearm about the elbow.', J['elbowN'], C.angle('elbowN', 'wristN')),
        ('SHADOW_FIST_N', 'fist_n', 'The near fist round the shaft: it rides the hand about the wrist.', J['wristN'], C.angle('wristN', 'handN')),
        ('SHADOW_UPPER_F', 'upper_f', 'The far sleeve of the under-suit and the bare skin to the elbow: it rides the upper arm about the shoulder.', J['shoulderF'], C.angle('shoulderF', 'elbowF')),
        ('SHADOW_FORE_F', 'fore_f', 'The far arm guard: it rides the forearm about the elbow.', J['elbowF'], C.angle('elbowF', 'wristF')),
        ('SHADOW_FIST_F', 'fist_f', 'The far fist: it rides the hand about the wrist.', J['wristF'], C.angle('wristF', 'handF')),
    ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'SHADOW', "'line' | 'plate' | 'suit' | 'skin'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, NAMES, os.path.join(study, 'vest@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
