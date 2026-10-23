"""The owner's broad man's shirt (docs/reference/bulky-owner-reference.jpg): a tight black short-sleeved
shirt with a high collar, silver seams and his muscle shading (chest, abdomen, the sleeves' bands).

His picture is in his own pixels, one of them one fine pixel of ours, his figure on our bulky rig at
idle frame 0 (tools/refs/bulky_ref.py). This script lifts out of it, every pixel in his exact colour:

  torso    collar to hem, with its seams; where his long lock lies over the chest his shirt goes on
           under it (each hidden pixel takes his shirt met first beside it, toward the side the lock
           leaves more of, then the other way), and under the near sleeve three pixels. It rides the
           torso about the neck. Its open edge is marked (bulky_ref.seal_rows), as on every piece.
  sleeves  each sleeve from the shoulder to its banded hem; it turns with the upper arm about the
           shoulder.

His black line stays as he drew it; the item recolours his blacks and his silvers by two colour slots.
It writes src/sprite/items/seamShirtArt.ts and, with a second argument, a folder for his shirt beside the
pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/seam-shirt-from-ref.py src/sprite/items/seamShirtArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

# From this row down the lock lies on the shirt (above it, on the neck and the collar's side).
TOP_UNDER_LOCK = 29

DOC = (
    "// The owner's broad man's shirt, his pixels (tools/refs/seam-shirt-from-ref.py from\n"
    '// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def shirt_kind(h):
    """'seam' for his silvers and whites (light), 'cloth' for his blacks and blue-greys, 'line' for his black."""
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if R.kind([r, g, b]) == 'line':
        return 'line'
    return 'seam' if L > 120 else 'cloth'


def lift():
    """His shirt lifted out of his picture: his picture `a`, the torso's colours `col` and mask `tm` (his
    shirt continued under the lock, `got` what was continued), what continues it under the near sleeve
    (`under`, `got_n`), and the parts' masks and kinds (`masks`, the sleeves among them; `K`). Also used by
    seam-shirt-male-from-ref.py, which passes his shirt onto the Roman's chest."""
    a = R.native()
    masks, K = R.labels(a)
    black = R.his_line(a, K)
    J = R.JOINTS
    H, W, _ = a.shape
    torso = masks['shirt']
    # Under the lock: every row of the torso from its first pixel to its last.
    want = torso.copy()
    lock = masks['lock']
    for y in range(H):
        xs = np.nonzero(torso[y])[0]
        if len(xs):
            want[y, xs.min():xs.max() + 1] |= lock[y, xs.min():xs.max() + 1]
    # Over the near shoulder the lock lies on the shirt's top edge: the shirt goes on under it there too.
    want[TOP_UNDER_LOCK:, :] |= lock[TOP_UNDER_LOCK:, :]
    col = a.copy()
    inner = torso & (K != 'line')
    got = np.zeros((H, W), bool)
    for d in (np.array([1.0, 0.0]), np.array([-1.0, 0.0])):
        col, more = R.continue_along(col, inner | got, want & ~torso & ~got, d, reach=12)
        got |= more & ~inner
    tm = torso | got
    # Closed by his line where its new edge is not his.
    col = R.cap(col, tm, torso, black)
    # Under the near sleeve (the near arm lies over the shirt) the shirt goes on up to three pixels, his
    # shirt met first across toward the chest in the colours it is packed in, so a swinging arm opens no
    # hole between them. Added after the torso's colours are packed, so those pack as before.
    under, got_n = R.continue_along(R.packed(col, tm), tm & (K != 'line'), masks['sleeve_n'] & ~tm, np.array([1.0, 0.0]), reach=3)
    got_n &= ~tm
    return {'a': a, 'masks': masks, 'K': K, 'col': col, 'tm': tm, 'got': got, 'under': under, 'got_n': got_n}


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    S = lift()
    a, masks, col, tm, got, under, got_n = S['a'], S['masks'], S['col'], S['tm'], S['got'], S['under'], S['got_n']
    J = R.JOINTS
    pieces = [
        R.piece('SHIRT_TORSO', 'The shirt from collar to hem, its seams and his muscle shading; his shirt goes on under the long lock and under the near sleeve. It rides the torso about the neck.', col, tm, J['neck'], R.joint_angle('pelvis', 'neck'), seal=True, extra=got_n, extra_col=under),
    ]
    sleeves = []
    for s in ('N', 'F'):
        m = masks['sleeve_' + s.lower()]
        t = R.along_t(m.shape, J['shoulder' + s], R.unit('shoulder' + s, 'elbow' + s))
        cap, tube = m & (t < R.CAP_T), m & (t >= R.CAP_T - R.CAP_OVERLAP)
        side = 'near' if s == 'N' else 'far'
        ang = R.joint_angle('shoulder' + s, 'elbow' + s)
        pieces.append(R.piece(f'SHIRT_SLEEVE_{s}', f'The {side} sleeve below the shoulder, to its banded hem: it turns with the upper arm about the shoulder.', a, tube, J['shoulder' + s], ang, seal=True))
        pieces.append(R.piece(f'SHIRT_CAP_{s}', f'The {side} sleeve over the shoulder: it rides the shoulder and follows the arm part of the way.', a, cap, J['shoulder' + s], ang, seal=True))
        sleeves += [tube, cap]
    kinds = {}
    for _, _, _, pal in pieces:
        for h in pal.values():
            kinds[h] = shirt_kind(h)
    cloth = sorted((h for h in kinds if kinds[h] == 'cloth'), key=lambda h: sum(int(h[i:i + 2], 16) for i in (1, 3, 5)))
    seam = sorted((h for h in kinds if kinds[h] == 'seam'), key=lambda h: sum(int(h[i:i + 2], 16) for i in (1, 3, 5)))
    # The colour slots' defaults: his commonest black and his commonest silver.
    count = {}
    for (_, _, _, pal), m, c in zip(pieces, [tm] + sleeves, [col, a, a, a, a]):
        for y, x in zip(*np.nonzero(m)):
            h = R.hexc(c[y, x])
            count[h] = count.get(h, 0) + 1
    base = max(cloth, key=lambda h: count.get(h, 0))
    silver = max(seam, key=lambda h: count.get(h, 0))
    header = [
        "/** His shirt's commonest black and his commonest silver: the colour slots' defaults (at these, every pixel is his). */",
        f"export const SHIRT_CLOTH = '{base}';",
        f"export const SHIRT_SEAM = '{silver}';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from '../painted';", header, pieces, kinds=('SHIRT_KIND', kinds), rest_name='SHIRT_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, [(a, masks['sleeve_f']), (col, tm), (a, masks['sleeve_n'])], os.path.join(study, 'shirt@8.png'), box=(20, 24, 76, 62))
    print('torso', int(tm.sum()), 'filled', int(got.sum()), 'base', base, 'seam', silver)


if __name__ == '__main__':
    main()
