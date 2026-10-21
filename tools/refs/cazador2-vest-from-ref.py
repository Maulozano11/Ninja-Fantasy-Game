"""The owner's female armoured vest, shoulder guard, arm wraps and bare arms from his Cazador 2
(docs/reference/cazador2-owner-reference.jpg), for the Shadow Ops Chestguard (`armor_shadowops`) on the
female bodies: "mismo pechera que la de hombre pero version femenina", the Cazador 1's chest armour
(tools/refs/cazador1-vest-from-ref.py) in a female version.

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). This
script lifts out of it, every pixel in his exact colour:

  the vest       the dark grey breastplate shaped to her chest and the banded belly over the dark
                 under-suit, from the high collar to the vest's lower line. It rides the torso about
                 the neck. Under the near shoulder guard it is continued as the Cazador 1's is.
  the near arm   the layered shoulder guard, her bare skin above the elbow, the grey striped arm wrap
                 (about the elbow) and the fist round the kunai's grip (about the wrist).
  the far arm    her bare upper arm (the skin he shows under the vest's side, continued up behind the
                 vest to her shoulder), the striped arm wrap (about the elbow) and the far fist (about
                 the wrist). Read cell by cell: at rest every pixel is his, where he drew it; behind the
                 vest each is continued to the width of our far arm and closed by his line.

Every piece is pinned with its pivot on our female joint, so at rest it lands where he drew it (his
picture at cazador2_ref.BODY). His plates follow Plates, his under-suit Under-suit and his skin the
character's skin; his black line stays.

It writes src/sprite/items/shadowOpsFemaleArt.ts and, in <study>, the pieces at 8x (continued cells
crossed). The same picture always gives the same bytes:

  python3 -I tools/refs/cazador2-vest-from-ref.py src/sprite/items/shadowOpsFemaleArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador2_ref as C  # noqa: E402

DOC = (
    "// The owner's female armoured vest, shoulder guard, arm wraps and bare arms on his Cazador 2, his pixels\n"
    '// (tools/refs/cazador2-vest-from-ref.py from docs/reference/cazador2-owner-reference.jpg).\n'
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
        'SHADOW_F_PLATE': C.middle(a, masks, cols, ['vest', 'guard_n', 'fore_n', 'fore_f'], is_('plate')),
        'SHADOW_F_SUIT': C.middle(a, masks, cols, ['vest'], is_('suit')),
        # Her lit skin (cazador2_ref.his_skin) stands for the character's skin colour.
        'SHADOW_F_SKIN': C.his_skin(a, masks, cols),
    }
    specs = [
        ('SHADOW_F_VEST', 'vest', 'The vest over the under-suit, collar to lower line: it rides the torso about the neck.', J['neck'], C.angle('pelvis', 'neck')),
        ('SHADOW_F_GUARD_N', 'guard_n', 'The layered near shoulder guard: it rides the upper arm about the shoulder.', J['shoulderN'], C.angle('shoulderN', 'elbowN')),
        ('SHADOW_F_UPPER_N', 'upper_n', 'The near arm\'s bare skin under the guard, above the elbow: it rides the upper arm.', J['shoulderN'], C.angle('shoulderN', 'elbowN')),
        ('SHADOW_F_FORE_N', 'fore_n', 'The near striped arm wrap: it rides the forearm about the elbow.', J['elbowN'], C.angle('elbowN', 'wristN')),
        ('SHADOW_F_FIST_N', 'fist_n', 'The near fist round the kunai\'s grip: it rides the hand about the wrist.', J['wristN'], C.angle('wristN', 'handN')),
        ('SHADOW_F_UPPER_F', 'upper_f', 'The far bare upper arm to the elbow: it rides the upper arm about the shoulder.', J['shoulderF'], C.angle('shoulderF', 'elbowF')),
        ('SHADOW_F_FORE_F', 'fore_f', 'The far striped arm wrap: it rides the forearm about the elbow.', J['elbowF'], C.angle('elbowF', 'wristF')),
        ('SHADOW_F_FIST_F', 'fist_f', 'The far fist: it rides the hand about the wrist.', J['wristF'], C.angle('wristF', 'handF')),
    ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'SHADOW_F', "'line' | 'plate' | 'suit' | 'skin'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, NAMES, os.path.join(study, 'vest@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
