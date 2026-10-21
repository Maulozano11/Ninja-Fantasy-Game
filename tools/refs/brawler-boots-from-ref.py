"""The owner's broad man's shoes (docs/reference/bulky-owner-reference.jpg): low brown leather boots, the
near one seen from the front, the far one pointing right, lit on the toe cap, with a dark sole.

His picture is in his own pixels, one of them one fine pixel of ours, his figure on our bulky rig at
idle frame 0 (tools/refs/bulky_ref.py). This script lifts out of it, every pixel in his exact colour,
each boot from its sole up to the rows his jeans' hem covers, where the boot goes on up to just above the
ankle (each hidden pixel takes his leather met first below it), closed by his black line at its new top
and sides. Each boot is stamped on our ankle and stays flat on the ground like our feet; at rest it is
where he drew it. His black line stays; his browns follow the colour slot. It writes
src/sprite/items/brawlerBootsArt.ts and, with a second argument, a folder for his shoes beside the
pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/brawler-boots-from-ref.py src/sprite/items/brawlerBootsArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

DOC = (
    "// The owner's broad man's shoes, his pixels (tools/refs/brawler-boots-from-ref.py from\n"
    '// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
# How many rows above his topmost leather each boot goes on under the hem, and from how many of his top
# rows the boot's width there is taken (the near boot's top is half hidden by the hem; the far boot's
# toe starts below its top rows).
UP = 3
WIDTH_ROWS = {'N': 6, 'F': 2}


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    masks, K = R.labels(a)
    black = R.his_line(a, K)
    H, W, _ = a.shape
    J = R.JOINTS
    made = []
    parts = []
    for s in ('N', 'F'):
        boot = masks['boot_' + s.lower()]
        leather = boot & (K != 'line')
        top = int(np.nonzero(leather.any(axis=1))[0].min())
        xs = np.nonzero(leather[top:top + WIDTH_ROWS[s]].any(axis=0))[0]
        # Only where his jeans hide it: elsewhere above his boot is the white round him.
        want = np.zeros((H, W), bool)
        want[top - UP:top, xs.min():xs.max() + 1] = True
        want = boot | (want & masks['jeans'])
        col, m = R.fill_hidden(a, K, boot, want, np.array([0.0, 1.0]), black)
        made.append(R.piece(f'BOOT_{s}', f'The {"near boot, seen from the front" if s == "N" else "far boot, pointing right"}: it stands on our ankle, flat on the ground.', col, m, J['ankle' + s], 0.0))
        parts.append((col, m))
    kinds = {}
    count = {}
    for col, m in parts:
        for y, x in zip(*np.nonzero(m)):
            h = R.hexc(col[y, x])
            count[h] = count.get(h, 0) + 1
            kinds[h] = 'line' if R.kind(col[y, x]) == 'line' else 'leather'
    base = max((h for h in kinds if kinds[h] == 'leather'), key=lambda h: (count[h], h))
    header = [
        "/** His boots' commonest brown: the colour slot's default (at it, every pixel is his). */",
        f"export const BOOT_LEATHER = '{base}';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from '../painted';", header, made, kinds=('BOOT_KIND', kinds), rest_name='BOOT_REST')
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, parts, os.path.join(study, 'boots@8.png'), box=(28, 82, 72, 99))
    print('base', base, {n: rest for n, _, rest, _ in made})


if __name__ == '__main__':
    main()
