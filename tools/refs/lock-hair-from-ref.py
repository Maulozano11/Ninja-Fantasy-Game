"""The owner's broad man's hair (docs/reference/bulky-owner-reference.jpg) as a hairstyle: blond spikes
standing up and out over the head, a fringe of strands over the brow, and a long lock falling from the
near temple down over the chest.

His picture is in his own pixels, one of them one fine pixel of ours (tools/refs/bulky_ref.py), his face
where our face template sits (our face anchor on his lash line's start, (49, 20)). This script lifts out
of it, every pixel in his exact colour:

  front   his hair over the head: his yellows, the browns round his strands and his black line round
          them (not the lines of his face: the ear's, the lash lines, the jaw), down to the row where
          the lock leaves the head.
  back    the same hair with what his face hides filled in (each hidden pixel takes his hair met first
          above it, then beside it), drawn behind the head; also his head's outline at the top (the
          game trims our skull to it).
  lock    the long lock from below the temple down over the chest, with its browns and line.

All three are pinned on our face anchor; the game leans the lock with the body. It writes
src/sprite/items/lockHairArt.ts and, with a second argument, a folder for his hair beside the pieces at
8x. The same picture always gives the same bytes:

  python3 -I tools/refs/lock-hair-from-ref.py src/sprite/items/lockHairArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's hair, his pixels (tools/refs/lock-hair-from-ref.py from\n"
    '// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# His hair's lit yellow, the face of most strands: the colour slot's default; his other yellows and
# browns move the way it does (his black line stays).
BASE = '#f0cc74'
# The eye cells (near and far eye, lash line and the row under it): their black is his face's.
EYES = [(49, 54, 20, 22), (56, 59, 20, 22)]
# Above this row the hair is filled in behind his face.
BACK_TO = 22


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    H, W, _ = a.shape
    line = K == 'line'
    skin = masks['face'] & ~line
    eyes = np.zeros((H, W), bool)
    for x0, x1, y0, y1 in EYES:
        eyes[y0:y1, x0:x1] = True

    def with_line(m):
        # His black line round his strands, not the line round his face's skin or across his eyes.
        return m | (line & R.near4(m) & ~R.near4(skin) & ~eyes)

    hair = masks['hair'] & ~line
    lock = masks['lock'] & ~line
    front = with_line(hair)
    # The lock is bounded by its own browns: no black of his round it (that is the shirt's).
    lock_m = lock & ~front
    # The back: the hair filled in where his face hides it (each row of his face, from its first pixel
    # to its last, down to BACK_TO); the gaps he left between his spikes stay open.
    want = front.copy()
    face = masks['face']
    for y in range(BACK_TO + 1):
        xs = np.nonzero(face[y])[0]
        if len(xs):
            want[y, xs.min():xs.max() + 1] = True
    col, got = R.continue_along(a, hair, want & ~front, np.array([0.0, -1.0]))
    for d in (np.array([1.0, 0.0]), np.array([-1.0, 0.0])):
        col, more = R.continue_along(col, got | hair, want & ~front & ~got, d, reach=12)
        got |= more & ~hair
    back = front | got
    anchor = R.ANCHOR
    pieces = [
        R.piece('LOCK_HAIR_BACK', 'His hair with what his face hides filled in, drawn behind the head; also his head\'s outline at the top. Its pivot is the cell on our face anchor.', col, back, anchor, 0.0),
        R.piece('LOCK_HAIR_FRONT', 'Every pixel of his hair over the head, his yellows, browns and black line. Its pivot is the cell on our face anchor.', a, front, anchor, 0.0),
        R.piece('LOCK_HAIR_LOCK', 'The long lock from below the near temple down over the chest. Its pivot is the cell on our face anchor; the game leans it with the body.', a, lock_m, anchor, R.joint_angle('pelvis', 'neck')),
    ]
    lum = lambda h: 0.299 * int(h[1:3], 16) + 0.587 * int(h[3:5], 16) + 0.114 * int(h[5:7], 16)
    lines = sorted({h for _, _, _, pal in pieces for h in pal.values() if lum(h) < 16})
    header = [
        "/** His hair's lit yellow, the colour slot's default: his other colours move the way it does. */",
        f"export const LOCK_HAIR_BASE = '{BASE}';",
        '',
        '/** His black line: kept as he drew it when the hair is recoloured. */',
        f'export const LOCK_HAIR_LINE: string[] = {lines!r};'.replace('"', "'"),
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from '../painted';", header, pieces, rest_name='LOCK_HAIR_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [(col, back), (a, front), (a, lock_m)], os.path.join(study, 'lock-hair@8.png'), box=(30, 0, 72, 56))
    print('front', int(front.sum()), 'back', int(back.sum()), 'lock', int(lock_m.sum()))


if __name__ == '__main__':
    main()
