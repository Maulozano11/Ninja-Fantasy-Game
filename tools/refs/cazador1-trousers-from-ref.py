"""The owner's black trousers from his Cazador 1 (docs/reference/cazador1-owner-reference.jpg), for the new
Hunter Leggings (`bottom_hunter_leggings`) on the male bodies (the female ones wear his Cazador 2 leggings).

His picture is our Hunter-nin painted over in his own pixels (tools/refs/cazador1_ref.py: one of his
pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the waist   the dark band under the vest (it rides the torso about the pelvis);
  the thighs  each leg from the hip to our knee (about the hip): the near one's folds with the
              naginata's shaft and blade over it continued down each column from his cloth above;
  the shins   each leg from our knee down (about the knee): his trousers to the top of his boots, then,
              where his boots hide them, his last rows above the boot repeated down the leg to our
              ankle, moved across as our shin slants, closed by his black line as a hem. The thigh and
              the shin share two rows about the knee, so it stays closed as it bends.

His cloth follows Leggings; his black line stays.

It writes src/sprite/items/hunterTrousersArt.ts and, in <study>, the pieces at 8x (continued cells
crossed). The same picture always gives the same bytes:

  python3 -I tools/refs/cazador1-trousers-from-ref.py src/sprite/items/hunterTrousersArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador1_ref as C  # noqa: E402

DOC = (
    "// The owner's black trousers on his Cazador 1, his pixels (tools/refs/cazador1-trousers-from-ref.py\n"
    '// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
NAMES = ['waist', 'thigh_f', 'shin_f', 'thigh_n', 'shin_n']


def kind_of(_n, h):
    return 'line' if C.kind(C.rgb(h)) == 'line' else 'cloth'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    J = C.JOINTS
    is_cloth = lambda c: kind_of('', C.hexc(c)) == 'cloth'
    bases = {
        'TROUSERS_CLOTH': C.middle(a, masks, cols, NAMES, is_cloth),
        # His cloth in shadow (a fifth of it is darker), for the seat between the legs as they part.
        'TROUSERS_SEAT': C.middle(a, masks, cols, NAMES, is_cloth, 0.2),
    }
    specs = [
        ('TROUSERS_WAIST', 'waist', 'The waist band under the vest: it rides the torso about the pelvis.', J['pelvis'], C.angle('pelvis', 'neck')),
        ('TROUSERS_THIGH_N', 'thigh_n', 'The near trouser leg, hip to knee: it rides the thigh about the hip.', J['hipN'], C.angle('hipN', 'kneeN')),
        ('TROUSERS_SHIN_N', 'shin_n', 'The near trouser leg, knee to ankle: it rides the shin about the knee.', J['kneeN'], C.angle('kneeN', 'ankleN')),
        ('TROUSERS_THIGH_F', 'thigh_f', 'The far trouser leg, hip to knee: it rides the thigh about the hip.', J['hipF'], C.angle('hipF', 'kneeF')),
        ('TROUSERS_SHIN_F', 'shin_f', 'The far trouser leg, knee to ankle: it rides the shin about the knee.', J['kneeF'], C.angle('kneeF', 'ankleF')),
    ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'TROUSERS', "'line' | 'cloth'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, NAMES, os.path.join(study, 'trousers@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
