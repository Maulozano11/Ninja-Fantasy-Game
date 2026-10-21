"""The owner's bronze bracers and laced gladiator sandals from his Roman picture
(docs/reference/roman-owner-reference.jpg).

His picture is our male painted over in his own pixels (tools/refs/roman_ref.py: one of his pixels is
one fine pixel of our sprites). This script lifts out of it, every pixel in his exact colour:

  the bracers   the bronze bracer on each forearm, from below the elbow to the wrist (the near one
                broad and lit, the far one dark with a bronze edge). Each rides its forearm about the
                elbow. His near arm stands where ours does, so at rest the near bracer is where he drew
                it; he tucked the far arm in (3 px nearer the body than ours), so the far bracer is
                moved out onto our far forearm.
  the sandals   on each leg, the laced shin (a dark strap band under the knee, then the laces crossing
                over his skin down to the ankle), which turns with the shin about the ankle, and the
                sandal with its straps over the toes and its brown sole, which stays flat on the ground
                like our feet. His legs stand wider than ours (his near foot about 6 px further back,
                his far foot 6 px lower), so each sandal is moved onto our leg: his ankle on ours across,
                his sole on our sole up and down. His skin between the laces follows the character's.

It writes the pieces as TypeScript (src/sprite/items/bracersSandalsArt.ts) and, in <study>, his figure
beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/roman-bracers-sandals-from-ref.py src/sprite/items/bracersSandalsArt.ts <study>
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402

DOC = (
    "// The owner's bronze bracers and laced gladiator sandals, his pixels (tools/refs/roman-bracers-sandals-from-ref.py\n"
    '// from docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    masks, cols = R.pieces(a)
    J = R.JOINTS

    def sandal_pivot(s):
        # The cell that lands on our ankle: his ankle across, and as far above his sole as our ankle is
        # above our sole.
        sole = int(np.nonzero(masks['foot_' + s.lower()].any(axis=1))[0].max())
        return (R.HIS_ANKLES[s][0], sole - (R.OUR_SOLES[s] - J['ankle' + s][1]))

    # He drew the far arm tucked in, its forearm FAR_ARM_IN px nearer the body than ours: the far bracer's
    # pivot is his elbow, so it lands on our forearm (moved that far out) and turns about our elbow.
    far_elbow = (J['elbowF'][0] - R.FAR_ARM_IN, J['elbowF'][1])
    bases = {
        'BRACER_BRONZE': R.middle(a, masks, cols, ['bracer_n', 'bracer_f'], ('bronze',)),
        'SANDAL_LEATHER': R.middle(a, masks, cols, ['shin_n', 'shin_f', 'foot_n', 'foot_f'], ('leather',)),
        # His lit skin (four fifths of his skin pixels are darker) stands for the character's skin colour,
        # which our bodies show in the light.
        'SANDAL_SKIN': R.middle(a, masks, cols, ['shin_n', 'shin_f', 'foot_n', 'foot_f'], ('skin',), 0.8),
    }
    consts = [
        ('BRACER_N', 'bracer_n', 'The near bronze bracer, elbow to wrist: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN')),
        ('BRACER_F', 'bracer_f', 'The far bronze bracer, dark with a bronze edge: it rides the forearm about the elbow.', far_elbow, R.angle('elbowF', 'wristF'), J['elbowF']),
        ('SANDAL_SHIN_N', 'shin_n', 'The near laced shin, from the strap band under the knee to the ankle: it turns with the shin about the ankle.', sandal_pivot('N'), R.angle('kneeN', 'ankleN'), J['ankleN']),
        ('SANDAL_FOOT_N', 'foot_n', 'The near sandal, seen from the front: straps over the toes, the brown sole.', sandal_pivot('N'), R.angle('kneeN', 'ankleN'), J['ankleN']),
        ('SANDAL_SHIN_F', 'shin_f', 'The far laced shin: it turns with the shin about the ankle.', sandal_pivot('F'), R.angle('kneeF', 'ankleF'), J['ankleF']),
        ('SANDAL_FOOT_F', 'foot_f', 'The far sandal pointing right: straps over the instep and toes, the brown sole.', sandal_pivot('F'), R.angle('kneeF', 'ankleF'), J['ankleF']),
    ]
    text = R.module(a, masks, cols, DOC, consts, bases, 'ROMAN_KIT')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['bracer_f', 'shin_f', 'foot_f', 'shin_n', 'foot_n', 'bracer_n'], os.path.join(study, 'bracers-sandals@8.png'))
    print('bases', bases, 'pivots', sandal_pivot('N'), sandal_pivot('F'))


if __name__ == '__main__':
    main()
