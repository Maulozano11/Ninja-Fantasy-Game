"""The owner's broad man's jeans (docs/reference/bulky-owner-reference.jpg), to colour as the player likes
(his words: "seria ese el jeans para colear"): loose light grey jeans, lit down the front of each leg,
creased at the knees, their hems over the shoes.

His picture is in his own pixels, one of them one fine pixel of ours, his figure on our bulky rig at
idle frame 0 (tools/refs/bulky_ref.py). This script lifts out of it, every pixel in his exact colour:

  hips    the waistband, seat and fly from under the shirt down to the tops of the legs; under the belt,
          the pouch and his near fist the jeans go on, and up under the shirt's hem three rows (each
          hidden pixel takes his jeans met first below it, then beside it). It hangs from the pelvis and leans with the body.
  thighs  each leg from the hip to just past the knee; under the pouch and its straps the near leg goes
          on (his jeans met first down the leg, then across), closed by his black line where its new
          edge is not his. Each turns with the thigh about the hip.
  shins   each leg from just above the knee to the hem: each turns with the shin about the knee.

The knife hangs in the gap between his legs: nothing of the jeans is filled behind it, and his line
round it is the knife's. His line pixels at the top of that gap (x 50-51, y 74-77) close the near leg's
inseam, so they are the near leg's, not the far leg's (where they would float loose once the far leg
turns), and so are his pixels of that inseam at the top of the knife (bulky_ref.KNIFE_INSEAM). Every piece marks its open edge (bulky_ref.seal_rows). His black line stays; every other colour
of his follows the colour slot. It writes src/sprite/items/jeansArt.ts and, with a second argument, a
folder for his jeans beside the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/jeans-from-ref.py src/sprite/items/jeansArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's jeans, his pixels (tools/refs/jeans-from-ref.py from\n"
    '// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# The hips: the jeans above this row (and their outline under the belt and his near fist).
HIPS_TO = 66
HIPS = [(37, 54.5), (62.5, 54.5), (64.5, 57), (64.5, 66), (37, 66)]
# Under the shirt's hem the waistband goes on up three rows (his waistband met first below), so a pose
# that lifts the shirt a row off the jeans shows waistband, not a gap.
UNDER_HEM = [(39, 52), (62, 52), (62, 56), (39, 56)]
# His line pixels at the top of the gap between the legs that close the near leg's inseam (x, y).
INSEAM_TOP = [(50, 74), (51, 74), (50, 77)]
# Each leg's side of the figure (polygons in his pixel corners): the inseam runs down x 50.5 to the
# crotch, then along the gap the knife hangs in.
LEG_N = [(28, 60), (50.5, 60), (50.5, 74), (50, 86), (48, 99), (28, 99)]
LEG_F = [(50.5, 60), (72, 60), (72, 99), (48, 99), (50, 86), (50.5, 74)]
# The near thigh's top under the pouch, its straps and his near fist: its outer line runs on up from
# x 37.
THIGH_N_HIDDEN = [(36.5, 62), (50.5, 62), (50.5, 78), (39, 78), (39, 75), (36.5, 75)]


def along(shape, joint, axis):
    ys, xs = np.mgrid[0:shape[0], 0:shape[1]]
    return (xs + 0.5 - joint[0]) * axis[0] + (ys + 0.5 - joint[1]) * axis[1]


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    black = R.his_line(a, K)
    H, W, _ = a.shape
    J = R.JOINTS
    jeans = masks['jeans']
    covers = masks['belt'] | masks['buckle'] | masks['pouch'] | masks['steel_n'] | masks['wrap_f']
    rows = np.arange(H)[:, None]
    made = []
    parts = []

    # The hips.
    hips = jeans & (rows < HIPS_TO)
    want = hips | (R.inside(HIPS, H, W) & covers) | (R.inside(UNDER_HEM, H, W) & masks['shirt'])
    hcol, hm = R.fill_hidden(a, K, hips, want, np.array([0.0, 1.0]), black, open_edge=rows >= HIPS_TO - 1)
    made.append(R.piece('JEANS_HIPS', 'The waistband, seat and fly down to the tops of the legs (going on under the belt, the pouch and the near fist). It hangs from the pelvis and leans with the body.', hcol, hm, J['pelvis'], R.joint_angle('pelvis', 'neck'), seal=True))
    parts.append((hcol, hm))

    legs = []
    for s, poly in (('N', LEG_N), ('F', LEG_F)):
        hip, knee, ankle = J['hip' + s], J['knee' + s], J['ankle' + s]
        thigh_axis = R.unit('hip' + s, 'knee' + s)
        shin_axis = R.unit('knee' + s, 'ankle' + s)
        leg = jeans & R.inside(poly, H, W) & (rows >= HIPS_TO - 6)
        tlen = float(np.hypot(knee[0] - hip[0], knee[1] - hip[1]))
        t = along((H, W), hip, thigh_axis)
        thigh = leg & (t < tlen + 2)
        want = thigh.copy()
        if s == 'N':
            want |= R.inside(THIGH_N_HIDDEN, H, W) & (covers | masks['pouch'] | (K == 'gap'))
            want &= ~masks['knife']
        tcol, tm = R.fill_hidden(a, K, thigh, want, thigh_axis, black, open_edge=(rows < HIPS_TO) | (t >= tlen + 1))
        u = along((H, W), knee, shin_axis)
        shin = leg & (u >= -2)
        legs.append((s, tcol, tm, shin, u))
    # His line pixels at the top of the gap between the legs, on the far leg's side of the inseam but
    # closing the near leg's: given to the near leg in the colours the far leg packed them in (the far
    # thigh's over the far shin's, as they lie at rest), and left out of the far leg; each after the
    # piece's own colours are packed, so the rest pack as before.
    inseam_top = np.zeros((H, W), bool)
    for x, y in INSEAM_TOP:
        inseam_top[y, x] = True
    _, tcol_f, tm_f, shin_f, _ = legs[1]
    seen = R.packed(a, shin_f)
    over = R.packed(tcol_f, tm_f)
    seen[tm_f] = over[tm_f]
    # And the pixels of the near leg's inseam at the top of the knife's region, in the colours the knife
    # packed them in.
    kin = R.cells(R.KNIFE_INSEAM, (H, W))
    seen[kin] = R.packed(a, masks['knife'])[kin]
    for s, tcol, tm, shin, u in legs:
        if s == 'N':
            gap_t = {'drop': masks['knife'], 'extra': (inseam_top | kin) & ~tm, 'extra_col': seen}
            gap_s = {'drop': masks['knife'], 'extra': inseam_top & (u >= -2) & ~shin, 'extra_col': seen}
        else:
            gap_t = gap_s = {'drop': masks['knife'] | inseam_top}
        hip, knee, ankle = J['hip' + s], J['knee' + s], J['ankle' + s]
        made.append(R.piece(f'JEANS_THIGH_{s}', f'The {"near" if s == "N" else "far"} leg from the hip to just past the knee: it turns with the thigh about the hip.', tcol, tm, hip, R.joint_angle('hip' + s, 'knee' + s), seal=True, **gap_t))
        made.append(R.piece(f'JEANS_SHIN_{s}', f'The {"near" if s == "N" else "far"} leg from just above the knee to the hem: it turns with the shin about the knee.', a, shin, knee, R.joint_angle('knee' + s, 'ankle' + s), seal=True, **gap_s))
    for s, tcol, tm, shin, _ in reversed(legs):
        parts += [(a, shin), (tcol, tm)]
    parts.append((hcol, hm))
    kinds = {}
    count = {}
    for col, m in parts:
        for y, x in zip(*np.nonzero(m)):
            h = R.hexc(col[y, x])
            count[h] = count.get(h, 0) + 1
            kinds[h] = 'line' if R.kind(col[y, x]) == 'line' else 'denim'
    base = max((h for h in kinds if kinds[h] == 'denim'), key=lambda h: (count[h], h))
    header = [
        "/** His jeans' commonest grey: the colour slot's default (at it, every pixel is his). */",
        f"export const JEANS_DENIM = '{base}';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from '../painted';", header, made, kinds=('JEANS_KIND', kinds), rest_name='JEANS_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, parts, os.path.join(study, 'jeans@8.png'), box=(26, 52, 74, 99))
    print('base', base, {n: rest for n, _, rest, _ in made})


if __name__ == '__main__':
    main()
