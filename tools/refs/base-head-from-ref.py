"""The owner's bare female body's head (docs/reference/female-base-owner-reference.jpg) as the 'base' face shape.

The owner (2026-10-28) found the messy ponytail sitting badly on the 'fine' and 'aurelia' heads: that hair
was cut from this picture, so it fits the head he drew it on and no other. His decision ("1"): this head
comes into the game as its own face shape, 'base', and the ponytail is compatible with it alone. The rule
for every hair from now on: a hair lives on the head it was painted over.

Like his Solen's head (tools/refs/solen-face-from-ref.py, face shape 'founder') this head is lifted whole:
his skin, his line, his eye (brow, lash, white, iris) and his mouth, every pixel as he painted it, and it
is stamped on the face anchor as it is; the face template draws its eyes over only when his picture does
not show them (a shut or lowered lid, another eye shape, a clan's eye). His skin follows the character's;
his iris follows the eye colour.

Under his hair there is no skull in the picture. It is continued in his base skin inside the skull of our
'fine' female head (rendered bald by the game, tools/refs/base_head_skull.json, written by
`npx tsx tools/refs/base-head-skull.ts`), his line round it: so the bald head, hair_none and any hair
later allowed on this head cover it as they cover ours.

Grid: female_base_ref.py (his pixel = one fine pixel; his (x, y) at our (x + 73, y + 120); the female
face anchor at idle is his (50, 19)). Writes src/sprite/baseHeadArt.ts and, with --study <dir>, his head
and ours side by side at 8x. Same input, same bytes.

    python3 -I tools/refs/base-head-from-ref.py [--study <dir>]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import female_base_ref as R  # noqa: E402

ANCHOR = (50, 19)                 # the face anchor in his pixels: the near eye's lash column and row
BOX = (40, 2, 66, 30)             # his head, x0 y0 x1 y1 (exclusive), in his pixels
# His hair's colours (items/baseHairArt.ts BASE_HAIR.colors, his line 'a'/'e' included): any pixel of these in
# the head box is hair, not head.
HAIR = {'#070819', '#363844', '#1f1f2b', '#56586b', '#141320', '#27262e'}
LINE = '#000000'
# His eye (brow, lash, white, iris): dark pixels here are his eye, not hair. His pixels, x0 y0 x1 y1.
EYE = (49, 15, 57, 22)
# His chin line is this many rows under the lash row; below it is the neck (femaleBaseArt's piece).
CHIN_ROWS = 8
SKULL_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'base_head_skull.json')
OUT_TS = os.path.join(R.REPO, 'src', 'sprite', 'baseHeadArt.ts')


def near(h, s, tol=R.TOL):
    a, b = R.hex_rgb(h), R.hex_rgb(s)
    return max(abs(x - y) for x, y in zip(a, b)) <= tol


def main():
    study = sys.argv[sys.argv.index('--study') + 1] if '--study' in sys.argv else None
    n = R.native()
    bg = R.background(n)
    idx, cols = R.palette(n, bg)
    x0, y0, x1, y1 = BOX
    W, H = x1 - x0, y1 - y0
    cells = [['.'] * W for _ in range(H)]
    kinds = {}
    skin_cols = []
    # 1. his head pixels: everything in the box that is not page, not hair and not below the chin line
    chin_rows = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if bg[y, x]:
                continue
            h = cols[idx[y, x]]
            in_eye = EYE[0] <= x < EYE[2] and EYE[1] <= y < EYE[3]
            if not in_eye and any(near(h, c) for c in HAIR):
                continue
            if y > ANCHOR[1] + CHIN_ROWS:
                continue
            cells[y - y0][x - x0] = h
    # 3. the skull under his hair, from our 'fine' head rendered bald (fine pixels in our frame -> his grid)
    skull = json.load(open(SKULL_JSON))
    skin_base = None
    # his base skin: the most common skin colour of the face
    counts = {}
    for row in cells:
        for c in row:
            if c != '.' and not R.is_line(c) and not R.is_cloth(c):
                counts[c] = counts.get(c, 0) + 1
    skin_base = max(counts, key=counts.get)
    for fx, fy in skull:
        hx, hy = fx - R.OFFSET[0], fy - R.OFFSET[1]
        if x0 <= hx < x1 and y0 <= hy < y1 and cells[hy - y0][hx - x0] == '.' and hy < ANCHOR[1]:
            cells[hy - y0][hx - x0] = skin_base
    # 4. the line round the continued skull: a skin cell with page on a side gets his line outside it
    for yy in range(H):
        for xx in range(W):
            if cells[yy][xx] != skin_base:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ax, ay = xx + dx, yy + dy
                if 0 <= ax < W and 0 <= ay < H and cells[ay][ax] == '.' and (ay + y0) < ANCHOR[1] + 2:
                    cells[ay][ax] = LINE
    # 5. letters
    letters = {}
    alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    rows = []
    for row in cells:
        s = ''
        for c in row:
            if c == '.':
                s += '.'
            else:
                if c not in letters:
                    letters[c] = alphabet[len(letters)]
                s += letters[c]
        rows.append(s)
    # trim empty rows/cols
    while rows and set(rows[0]) == {'.'}:
        rows.pop(0); y0 += 1
    while rows and set(rows[-1]) == {'.'}:
        rows.pop()
    while rows and all(r[0] == '.' for r in rows):
        rows = [r[1:] for r in rows]; x0 += 1
    while rows and all(r[-1] == '.' for r in rows):
        rows = [r[:-1] for r in rows]
    pivot = (ANCHOR[0] - x0, ANCHOR[1] - y0)
    kind = {}
    for c in letters:
        if R.is_line(c):
            kind[c] = 'line'
        elif near(c, '#ffffff', 40) or R.luma(np.array(R.hex_rgb(c))) > 215:
            kind[c] = 'white'
        elif R.hex_rgb(c)[2] > R.hex_rgb(c)[0] and R.luma(np.array(R.hex_rgb(c))) < 120:
            kind[c] = 'iris'
        else:
            kind[c] = 'skin'
    iris = next((c for c in kind if kind[c] == 'iris'), '#2a3a55')
    ts = ['// The owner\'s bare female body\'s head, his pixels (tools/refs/base-head-from-ref.py from',
          '// docs/reference/female-base-owner-reference.jpg): the \'base\' face shape, the head his messy ponytail',
          '// was drawn on. Generated: rerun the script to change it.', '',
          "import type { PaintedPiece } from './painted';", '',
          '/** The skin he painted it in: a player\'s skin moves every colour of it as far. */',
          f"export const BASE_SKIN = '{skin_base}';", '',
          '/** His iris: the eye colour moves it as far. */',
          f"export const BASE_IRIS = '{iris}';", '',
          '/** What each of his colours is. */',
          "export const BASE_FACE_KIND: Record<string, 'line' | 'skin' | 'iris' | 'white'> = {"]
    for c in sorted(kind):
        ts.append(f"  '{c}': '{kind[c]}',")
    ts += ['};', '', '/** His head, skull to chin, its pivot on the face anchor (the near eye\'s lash column and row). */',
           'export const BASE_HEAD: PaintedPiece = {', f'  pivot: [{pivot[0]}, {pivot[1]}],', '  angle: 0.00,', '  rows: [']
    for r in rows:
        ts.append(f"    '{r}',")
    ts += ['  ],', '  colors: {']
    for c, l in letters.items():
        ts.append(f"    {l}: '{c}',")
    ts += ['  },', '};', '']
    open(OUT_TS, 'w').write('\n'.join(ts))
    print(f'{OUT_TS}: {len(rows)} rows x {len(rows[0])} cols, pivot {pivot}, {len(letters)} colours, skin {skin_base}, iris {iris}')
    if study:
        os.makedirs(study, exist_ok=True)
        K = 8
        his = np.asarray(Image.open(R.REF).convert('RGB'))[int(y0 * R.PITCH):int((y0 + len(rows)) * R.PITCH), int(x0 * R.PITCH):int((x0 + len(rows[0])) * R.PITCH)]
        Image.fromarray(his).resize((len(rows[0]) * K, len(rows) * K), Image.NEAREST).save(os.path.join(study, 'his@8.png'))
        im = Image.new('RGB', (len(rows[0]) * K, len(rows) * K), (255, 0, 255))
        px = im.load()
        inv = {v: k for k, v in letters.items()}
        for yy, r in enumerate(rows):
            for xx, ch in enumerate(r):
                if ch == '.':
                    continue
                col = R.hex_rgb(inv[ch])
                for dy in range(K):
                    for dx in range(K):
                        px[xx * K + dx, yy * K + dy] = tuple(col)
        im.save(os.path.join(study, 'head@8.png'))


if __name__ == '__main__':
    main()
