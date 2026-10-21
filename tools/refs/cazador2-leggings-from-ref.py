"""The owner's dark leggings from his Cazador 2 (docs/reference/cazador2-owner-reference.jpg), for the new
Hunter Leggings (`bottom_hunter_leggings`) on the female bodies (the male bodies wear his Cazador 1 trousers,
tools/refs/cazador1-trousers-from-ref.py).

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). This script
lifts out of it, every pixel in his exact colour: the waist band under the vest (it rides the torso about
the pelvis), each leg's thigh from the hip to our knee (about her hip; the near one's cloth behind the kunai
continued down each column from his cloth above) and its shin from our knee down (about her knee: his
leggings to the top of his boots, then his last rows above the boot repeated down her shin to her ankle and
hemmed by his line). The thigh and shin share two rows about the knee. Her legs are longer than our female
body's: each piece turns about her own joint (cazador2_ref.HIS_LEGS), carried by our leg's angles. His cloth
follows Leggings; his black line stays.

It writes src/sprite/items/huntressLeggingsArt.ts and, in <study>, the pieces at 8x (continued cells
crossed). The same picture always gives the same bytes:

  python3 -I tools/refs/cazador2-leggings-from-ref.py src/sprite/items/huntressLeggingsArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador2_ref as C  # noqa: E402

DOC = (
    "// The owner's dark leggings on his Cazador 2, his pixels (tools/refs/cazador2-leggings-from-ref.py\n"
    '// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.\n'
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
        'LEGGINGS_CLOTH': C.middle(a, masks, cols, NAMES, is_cloth),
        # His cloth in shadow (a fifth of it is darker), for the seat between the legs as they part.
        'LEGGINGS_SEAT': C.middle(a, masks, cols, NAMES, is_cloth, 0.2),
    }
    specs = [
        ('LEGGINGS_WAIST', 'waist', 'The waist band under the vest: it rides the torso about the pelvis.', J['pelvis'], C.angle('pelvis', 'neck')),
        ('LEGGINGS_THIGH_N', 'thigh_n', 'The near leg, hip to knee: it turns with our thigh about her hip.', C.HIS_LEGS['N']['hip'], C.angle('hipN', 'kneeN')),
        ('LEGGINGS_SHIN_N', 'shin_n', 'The near leg, knee to ankle: it turns with our shin about her knee.', C.HIS_LEGS['N']['knee'], C.angle('kneeN', 'ankleN')),
        ('LEGGINGS_THIGH_F', 'thigh_f', 'The far leg, hip to knee: it turns with our thigh about her hip.', C.HIS_LEGS['F']['hip'], C.angle('hipF', 'kneeF')),
        ('LEGGINGS_SHIN_F', 'shin_f', 'The far leg, knee to ankle: it turns with our shin about her knee.', C.HIS_LEGS['F']['knee'], C.angle('kneeF', 'ankleF')),
    ]
    text = C.emit(masks, cols, specs, bases, kind_of, 'LEGGINGS', "'line' | 'cloth'", DOC, C.his_legs_ts('LEGGINGS_LEGS'))
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, NAMES, os.path.join(study, 'leggings@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
