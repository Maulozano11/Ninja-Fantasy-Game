"""The owner's broad man's bracers (docs/reference/bulky-owner-reference.jpg): on the near arm a steel
gauntlet from below the elbow over the fist, a dark band at its top; on the far arm white wrappings
round the forearm and the fist, the knuckles' skin showing.

His picture is in his own pixels, one of them one fine pixel of ours, his figure on our bulky rig at
idle frame 0 (tools/refs/bulky_ref.py). This script lifts out of it, every pixel in his exact colour:

  steel bracer   the near gauntlet's forearm, elbow to wrist, with its dark band: it rides the forearm
                 about the elbow.
  steel fist     the near gauntlet's fist, past the wrist: it hangs from the wrist like our hands.
  wrap bracer    the far forearm's wrappings, elbow to wrist: it rides the forearm about the elbow.
  wrap fist      the far fist in its wrappings, his skin at the knuckles: it hangs from the wrist.

Each kind of his colours ('line', 'skin', 'steel', 'band', 'wrap') is exported, so the item follows its
colour slots and the character's skin, his black line staying. It writes
src/sprite/items/brawlerBracersArt.ts and, with a second argument, a folder for his arms beside the
pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/brawler-bracers-from-ref.py src/sprite/items/brawlerBracersArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's steel gauntlet and wrapped bracer, his pixels (tools/refs/brawler-bracers-\n"
    '// from-ref.py from docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def along(mask, joint, axis):
    ys, xs = np.mgrid[0:mask.shape[0], 0:mask.shape[1]]
    return (xs + 0.5 - joint[0]) * axis[0] + (ys + 0.5 - joint[1]) * axis[1]


def kind_of(h, piece):
    """What a colour of his is in these pieces: his line, his skin, the steel's greys, the dark band's
    browns and blacks, the wrappings' whites."""
    c = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
    k = R.kind(c)
    if k == 'line':
        return 'line'
    if k in ('skin', 'tan') and piece.startswith('WRAP'):
        return 'skin'
    L = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    if piece.startswith('STEEL'):
        return 'band' if (k == 'brown' or L < 60) else 'steel'
    return 'band' if k == 'brown' else 'wrap'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    J = R.JOINTS
    made = []
    parts = []
    for s, region, name in (('N', 'steel_n', 'STEEL'), ('F', 'wrap_f', 'WRAP')):
        el, wr, hd = J['elbow' + s], J['wrist' + s], J['hand' + s]
        fore = R.unit('elbow' + s, 'wrist' + s)
        t = along(masks[region], el, fore)
        flen = float(np.hypot(wr[0] - el[0], wr[1] - el[1]))
        m = masks[region]
        # The fist: what lies past the wrist. Its skin (on the far fist) is his too.
        fist = m & (t >= flen - 0.5)
        bracer = m & (t < flen + 1.5)
        side = 'near' if s == 'N' else 'far'
        made.append(R.piece(f'{name}_BRACER_{s}', f'The {side} {"steel gauntlet" if name == "STEEL" else "wrappings"} from below the elbow to the wrist: it rides the forearm about the elbow.', a, bracer, el, R.joint_angle('elbow' + s, 'wrist' + s)))
        made.append(R.piece(f'{name}_FIST_{s}', f'The {side} fist in its {"steel gauntlet" if name == "STEEL" else "wrappings"}: it hangs from the wrist like our hands.', a, fist, wr, R.joint_angle('wrist' + s, 'hand' + s)))
        parts += [(a, bracer), (a, fist)]
    kinds = {}
    for n, _, _, pal in made:
        for h in pal.values():
            kinds.setdefault(h, kind_of(h, n))
    # The slots' defaults: his commonest steel grey, band dark and wrapping white.
    count = {}
    for col, m in parts:
        for y, x in zip(*np.nonzero(m)):
            h = R.hexc(col[y, x])
            count[h] = count.get(h, 0) + 1
    pick = lambda k: max((h for h in kinds if kinds[h] == k), key=lambda h: (count.get(h, 0), h))
    header = [
        "/** His commonest colour of each kind: the colour slots' defaults (at these, every pixel is his). */",
        f"export const BRACER_STEEL = '{pick('steel')}';",
        f"export const BRACER_BAND = '{pick('band')}';",
        f"export const BRACER_WRAP = '{pick('wrap')}';",
        "/** His lit skin at the knuckles: the character's skin colour stands for it. */",
        "export const BRACER_SKIN = '#f2bd97';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from '../painted';", header, made, kinds=('BRACER_KIND', kinds), rest_name='BRACER_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, parts, os.path.join(study, 'bracers@8.png'), box=(20, 46, 80, 74))
    print({n: rest for n, _, rest, _ in made}, 'steel', pick('steel'), 'band', pick('band'), 'wrap', pick('wrap'))


if __name__ == '__main__':
    main()
