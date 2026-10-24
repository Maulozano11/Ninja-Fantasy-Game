"""The owner's black belt and studded skirt from his Ren picture (docs/reference/ren-owner-reference.jpg).

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). This script lifts out of it, every pixel in his exact colour, two items:

  the belt    the broad black belt round the waist, lit along its top: it rides the pelvis, leaning
              with the torso (src/sprite/items/nightBeltArt.ts).
  the skirt   the long black skirt of panels from the belt to below the knees: his seams between the
              panels, two rows of silver studs down the front panels and a row down the far one, the
              slits showing the trousers under it. It rides the pelvis, leaning with the torso
              (src/sprite/items/nightSkirtArt.ts). Under his near fist, the guard and the blade his
              panels, seams and studs run on down their columns (his studs every 4 rows) and its near
              side and hem close on his line (ren_ref.pieces).

His waist stands where ours does, so at rest both are where he drew them. In <study> it writes his
figure beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/ren-belt-skirt-from-ref.py src/sprite/items/nightBeltArt.ts src/sprite/items/nightSkirtArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ren_ref as R  # noqa: E402


def doc(what):
    return (
        f"// The owner's {what} on his Ren, his pixels (tools/refs/ren-belt-skirt-from-ref.py from\n"
        '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.\n'
    )


def kinds_of(rgb, const):
    k = R.kind(rgb)
    return 'silver' if k in ('blue', 'white') else k


def main():
    belt_ts, skirt_ts = sys.argv[1], sys.argv[2]
    study = sys.argv[3] if len(sys.argv) > 3 else None
    a = R.native()
    P = R.pieces(a)
    J = R.JOINTS
    torso = R.angle('pelvis', 'neck')
    R.write(belt_ts, R.module(doc('black belt'), [
        ('NIGHT_BELT', *P['belt'], 'The broad black belt round the waist: it rides the pelvis, leaning with the torso.', J['pelvis'], torso),
    ], {'NIGHT_BELT_BASE': R.middle(a, P, ['belt'], ('dark',))}, 'NIGHT_BELT', kinds_of))
    R.write(skirt_ts, R.module(doc('studded skirt'), [
        ('NIGHT_SKIRT', *P['skirt'], 'The long skirt of black panels with silver studs, from the belt to below the knees: it rides the pelvis, leaning with the torso.', J['pelvis'], torso),
    ], {
        'NIGHT_SKIRT_BASE': R.middle(a, P, ['skirt'], ('dark',)),
        'NIGHT_STUDS': R.middle(a, P, ['skirt'], ('silver', 'blue', 'white')),
    }, 'NIGHT_SKIRT', kinds_of))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['skirt', 'belt'], os.path.join(study, 'belt-skirt@8.png'), (30, 44, 72, 82))


if __name__ == '__main__':
    main()
