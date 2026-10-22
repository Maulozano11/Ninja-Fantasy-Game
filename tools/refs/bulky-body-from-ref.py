"""The owner's broad man's arms (docs/reference/bulky-owner-reference.jpg) as our bulky body's skin.

His picture (tools/refs/bulky_ref.py: one of his pixels is one fine pixel of ours, our bulky rig built to
his proportions) shows his bare arms between the short sleeves and the bracers: on the near arm the lower
upper arm and the elbow, muscular, lit from the left; on the far arm the lower upper arm, darker. This
script lifts them out as four painted pieces that ride our arms (src/sprite/painted.ts):

  upper arm   his skin and black line from the sleeve's hem to the elbow, continued up to the shoulder
              under the sleeve (each hidden pixel takes his pixel met first walking down the arm from
              it, so his muscle and its line run on up), closed by his line where nothing of his is.
  forearm     wholly under his bracers: his skin at the elbow continued down the forearm the same way,
              walking back up it.

Each upper arm turns about the shoulder and each forearm about the elbow; at rest every pixel he drew is
where he drew it. The hands stay our hand pictures (his fists are in his bracers: brawler-bracers-from-
ref.py). It writes src/sprite/bulkyBodyArt.ts and, with a second argument, a folder for his picture beside
the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/bulky-body-from-ref.py src/sprite/bulkyBodyArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's arms as our bulky body's skin, his pixels (tools/refs/bulky-body-from-ref.py\n"
    '// from docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# His lit skin, the most common colour of his bare arms: the character's skin colour stands for it.
BASE = '#f2bd97'


def along(mask, joint, axis, lo, hi):
    """The pixels of a mask whose centres lie between lo and hi px along `axis` from `joint`."""
    ys, xs = np.mgrid[0:mask.shape[0], 0:mask.shape[1]]
    t = (xs + 0.5 - joint[0]) * axis[0] + (ys + 0.5 - joint[1]) * axis[1]
    return mask & (t >= lo) & (t < hi)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    J = R.JOINTS
    black = R.his_line(a, K)
    made = []
    parts = []
    for s, sleeve, cover in (('N', 'sleeve_n', 'steel_n'), ('F', 'sleeve_f', 'wrap_f')):
        # His skin and its black line (fill_hidden continues only his skin, never the line along the
        # sleeve's hem or the bracer's edge, which would run on as a black band).
        skin = masks['arm_' + s.lower()]
        sh, el, wr = J['shoulder' + s], J['elbow' + s], J['wrist' + s]
        up = R.unit('shoulder' + s, 'elbow' + s)
        fore = R.unit('elbow' + s, 'wrist' + s)
        upper_len = float(np.hypot(el[0] - sh[0], el[1] - sh[1]))
        fore_len = float(np.hypot(wr[0] - el[0], wr[1] - el[1]))
        # The upper arm: his skin down to 2 px past the elbow, and under the sleeve his skin walked up.
        have = along(skin, sh, up, -99, upper_len + 2)
        want = along(have | masks[sleeve], sh, up, -99, upper_len + 2)
        col, m = R.fill_hidden(a, K, have, want, up, black)
        # Split at the shoulder: the cap rides the shoulder (following the arm part of the way), the
        # tube turns with the arm.
        t = R.along_t(m.shape, sh, up)
        cap, tube = m & (t < R.CAP_T), m & (t >= R.CAP_T - R.CAP_OVERLAP)
        side = 'near' if s == 'N' else 'far'
        ang = R.joint_angle('shoulder' + s, 'elbow' + s)
        made.append(R.piece(f'BULKY_UPPER_ARM_{s}', f'The {side} upper arm, below the shoulder to the elbow: his skin below the sleeve, continued up under it. It turns about the shoulder.', col, tube, sh, ang, seal=True))
        made.append(R.piece(f'BULKY_SHOULDER_{s}', f'The {side} shoulder\'s round, continued under the sleeve: it rides the shoulder and follows the arm part of the way.', col, cap, sh, ang, seal=True))
        parts.append((col, m))
        # The forearm: under his bracer, his skin at the elbow walked down to the wrist.
        elbow_skin = along(skin, el, fore, -4, 3)
        want = along(masks[cover], el, fore, -3, fore_len + 1) | elbow_skin
        col, m = R.fill_hidden(a, K, elbow_skin, want, -fore, black)
        made.append(R.piece(f'BULKY_FOREARM_{s}', f'The {"near" if s == "N" else "far"} forearm, elbow to wrist: his skin at the elbow, continued down under his bracer. It turns about the elbow.', col, m, el, R.joint_angle('elbow' + s, 'wrist' + s), seal=True))
        parts.append((col, m))
    header = [
        '/** His lit skin, which the character\'s skin colour stands for: every colour of his moves as far, his black line stays. */',
        f"export const BULKY_SKIN = '{BASE}';",
        '',
        "/** His black line (never recoloured). */",
        f"export const BULKY_SKIN_LINE = '{R.hexc(black)}';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from './painted';", header, made, rest_name='BULKY_SKIN_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, parts, os.path.join(study, 'bulky-arms@8.png'))
    print('pieces', [(n, rest) for n, _, rest, _ in made])


if __name__ == '__main__':
    main()
