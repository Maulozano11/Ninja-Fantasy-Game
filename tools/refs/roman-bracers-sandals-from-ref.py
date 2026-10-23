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
  the knees     on the male bodies his legs come whole: on each leg his knee between the skirt and the
                strap band (on the near leg the bottom of his thigh too), his skin and his black line,
                cut along our knee into what rides the thigh and what rides the shin with the laced
                shin; and his far leg reaches 6 px further down than ours, his sole where he drew it, so
                at rest every pixel of his legs below the skirt is his, where he painted it (each leg
                moved onto ours as the sandals are: ROMAN_KIT_LEG_SHIFT). The female bodies keep their
                own knees, and the sandals' pivot on our ankle.

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
        # above our sole (the skin script registers his legs' skin the same way).
        return R.sandal_pivot(masks, s)

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
    # On the male bodies his legs come whole: each leg's knee (his skin and black line between the skirt and
    # the strap band) rides our leg with the laced shin, and his far leg reaches down to where he drew it
    # (roman_ref.sandal_reach), so at rest every pixel of his legs below the skirt is where he painted it,
    # moved onto ours as the sandals are (roman_ref.leg_shift). Each knee is cut along our knee: what lies
    # on the thigh's side rides the thigh about the knee, the rest rides the shin with the laced shin.
    reach = {s: R.sandal_reach(masks, s) for s in 'NF'}
    shift = {s: R.leg_shift(masks, s) for s in 'NF'}
    ankle = {s: (J['ankle' + s][0] + reach[s][0], J['ankle' + s][1] + reach[s][1]) for s in 'NF'}
    knee = {s: (J['knee' + s][0] - shift[s][0], J['knee' + s][1] - shift[s][1]) for s in 'NF'}
    whole = R.knees(a, masks)
    for s in 'NF':
        k = s.lower()
        masks['knee_thigh_' + k], masks['knee_shin_' + k] = R.knee_split(whole['knee_' + k], s, shift[s])
        cols['knee_thigh_' + k] = cols['knee_shin_' + k] = a
    consts = [
        ('BRACER_N', 'bracer_n', 'The near bronze bracer, elbow to wrist: it rides the forearm about the elbow.', J['elbowN'], R.angle('elbowN', 'wristN')),
        ('BRACER_F', 'bracer_f', 'The far bronze bracer, dark with a bronze edge: it rides the forearm about the elbow.', far_elbow, R.angle('elbowF', 'wristF'), J['elbowF']),
        ('SANDAL_SHIN_N', 'shin_n', 'The near laced shin, from the strap band under the knee to the ankle: it turns with the shin about the ankle.', sandal_pivot('N'), R.angle('kneeN', 'ankleN'), ankle['N']),
        ('SANDAL_FOOT_N', 'foot_n', 'The near sandal, seen from the front: straps over the toes, the brown sole.', sandal_pivot('N'), R.angle('kneeN', 'ankleN'), ankle['N']),
        ('SANDAL_SHIN_F', 'shin_f', 'The far laced shin: it turns with the shin about the ankle.', sandal_pivot('F'), R.angle('kneeF', 'ankleF'), ankle['F']),
        ('SANDAL_FOOT_F', 'foot_f', 'The far sandal pointing right: straps over the instep and toes, the brown sole.', sandal_pivot('F'), R.angle('kneeF', 'ankleF'), ankle['F']),
        ('SANDAL_KNEE_THIGH_N', 'knee_thigh_n', 'His near knee on the thigh\'s side of our knee (the bottom of his thigh), male bodies: it rides the thigh about the knee.', knee['N'], R.angle('hipN', 'kneeN'), J['kneeN']),
        ('SANDAL_KNEE_SHIN_N', 'knee_shin_n', 'His near knee on the shin\'s side of our knee, down to the strap band, male bodies: it rides the shin with the laced shin (the same pivot).', sandal_pivot('N'), R.angle('kneeN', 'ankleN'), ankle['N']),
        ('SANDAL_KNEE_THIGH_F', 'knee_thigh_f', 'His far knee on the thigh\'s side of our knee, male bodies: it rides the thigh about the knee.', knee['F'], R.angle('hipF', 'kneeF'), J['kneeF']),
        ('SANDAL_KNEE_SHIN_F', 'knee_shin_f', 'His far knee on the shin\'s side of our knee, down to the strap band, male bodies: it rides the shin with the laced shin (the same pivot).', sandal_pivot('F'), R.angle('kneeF', 'ankleF'), ankle['F']),
    ]
    # His far knee lies wholly on the shin's side of our knee: no piece rides that thigh.
    consts = [c for c in consts if masks[c[1]].any()]
    made = {c[0] for c in consts}
    knee_of = lambda s, part: f'SANDAL_KNEE_{part}_{s}' if f'SANDAL_KNEE_{part}_{s}' in made else 'null'
    text = R.module(a, masks, cols, DOC, consts, bases, 'ROMAN_KIT')
    text += '\n'.join([
        '',
        "/** Each leg's knee pieces (male bodies): what rides the thigh about the knee, what rides the shin with the laced shin, and how far the knee is bent at rest (the shin's angle less the thigh's). */",
        "export const ROMAN_KIT_KNEES: Record<'N' | 'F', { thigh: PaintedPiece | null; shin: PaintedPiece | null; bend: number }> = {",
        *[f"  {s}: {{ thigh: {knee_of(s, 'THIGH')}, shin: {knee_of(s, 'SHIN')}, bend: {R.angle('knee' + s, 'ankle' + s) - R.angle('hip' + s, 'knee' + s):.2f} }}," for s in 'NF'],
        '};',
        '',
        "/** How far below our ankle (fine pixels, the shin at rest) the sandals' pivot lands on the male bodies: his far leg reaches down to where he drew it. */",
        "export const ROMAN_KIT_REACH: Record<'N' | 'F', [number, number]> = {",
        *[f'  {s}: [{reach[s][0]}, {reach[s][1]}],' for s in 'NF'],
        '};',
        '',
        f"/** How far each of his legs is moved onto our male's at rest, in whole fine pixels: his pixel (x, y) lands on ({R.OFFSET[0]} + x + dx, {R.OFFSET[1]} + y + dy) of our idle frame 0. */",
        "export const ROMAN_KIT_LEG_SHIFT: Record<'N' | 'F', [number, number]> = {",
        *[f'  {s}: [{shift[s][0]}, {shift[s][1]}],' for s in 'NF'],
        '};',
        '',
    ])
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, masks, cols, ['bracer_f', 'knee_thigh_f', 'knee_shin_f', 'shin_f', 'foot_f', 'knee_thigh_n', 'knee_shin_n', 'shin_n', 'foot_n', 'bracer_n'], os.path.join(study, 'bracers-sandals@8.png'))
    print('bases', bases, 'pivots', sandal_pivot('N'), sandal_pivot('F'), 'reach', reach, 'shift', shift)


if __name__ == '__main__':
    main()
