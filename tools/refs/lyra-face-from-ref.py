"""Lyra's face, from the owner's picture of her at our game scale, as the face shape 'fine'.

docs/reference/lyra-game-scale-owner-reference.jpg (1932x1932) is his Lyra drawn at OUR sprite scale:
one of his pixels (19.32 picture pixels) is one fine pixel of ours. Her face is lifted 1:1, as Aiden's
head was (aiden-head-from-ref.py), on the same grid and with the same colours as her hair
(lyra-hair-from-ref.py: PHASE, the median of each of his pixels, his JPEG's near-equal shades of one
colour merged into the commonest of them), so face and hair meet pixel for pixel.

His face is narrower than our face template: his far eye's lash starts 6 columns after the near one
(ours 9), his far cheek line is at column 8 from the near lash (ours 11), his mouth is two pixels of
dark red at the near corner of the chin. In his pixels (x, y), the face is, row by row:

  rows 13-16  the forehead between the locks of his fringe
  row 17      the brows (near x 52-55, far x 58)
  rows 18-19  the eyes: the near lash x 51-54 over its brown corner, white, green and dark green;
              the far eye x 57-58; his far face line at x 59
  rows 20-25  cheeks, the nose's shade (x 55-56, row 23), the mouth (x 51-52, row 25), his far line
  row 26      the line under the chin (x 53-57), the shade under the jaw (x 51-52)

The piece takes every pixel of his face (FACE below). Where his brows and eyes are, it takes the skin
under them instead, continuing his pixels from below (each such cell takes the colour of the first
pixel of his face under it that is not an eye or brow pixel): the eye shapes draw their eyes and brows
on it (the 'keen' eyes his own, where he drew them). His line on the far side and under the chin is
in the piece, so the face closes without her hair. Not in it: the near side his hair hides (the face
template's near cheek shows there, under any hair), the skull above the forehead (ours), the neck
(the long neck, src/sprite/neck.ts, draws it).

The pivot is his near eye's lash start (51, 18), which the face anchor (src/sprite/body.ts faceAnchor)
puts on our face. The game draws each colour in the player's skin: his skin colour (SKIN) becomes the
skin, his shades and his line keep their distance from it in lightness, hue and saturation (as
Aiden's head does, body.ts skinTone), so in his skin every pixel is his.

Writes, in <out>: face@12.png (his crop | the piece | the piece with his eyes and brows back on it, at
12x) and, with a second argument, the game's module (src/sprite/lyraFaceArt.ts). The same picture
always gives the same bytes. From the repo root:

  python3 -I tools/refs/lyra-face-from-ref.py <out> [src/sprite/lyraFaceArt.ts]
"""

import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

REF = 'docs/reference/lyra-game-scale-owner-reference.jpg'
# The grid and colours of lyra-hair-from-ref.py.
PITCH = 19.32
PHASE = (-0.14, 0.05)
N = 100
MERGE = 10

# His near eye's lash start: the face anchor.
ANCHOR = (51, 18)
# His face: per row, the columns taken (inclusive).
FACE = {
    13: (54, 57), 14: (53, 58), 15: (53, 58), 16: (52, 58), 17: (51, 59), 18: (51, 59), 19: (51, 59),
    20: (50, 59), 21: (49, 59), 22: (49, 59), 23: (50, 58), 24: (50, 58), 25: (50, 58), 26: (51, 57),
}
# His brows and eyes (the eye shapes draw these): the cells the piece fills with the skin under them.
FEATURES = {(52, 17), (53, 17), (54, 17), (55, 17), (58, 17),
            (51, 18), (52, 18), (53, 18), (54, 18), (57, 18), (58, 18),
            (51, 19), (52, 19), (53, 19), (54, 19), (57, 19), (58, 19)}
# His base skin: the colour the player's skin replaces.
SKIN_AT = (54, 21)

CHARS = 'kabcdefghijlmnopqrstuvwxyz'


def native():
    """His pixels: the median of each pixel's interior, as an (N, N, 3) int array (as the hair's)."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
    out = np.zeros((N, N, 3), np.int32)
    for j in range(N):
        for i in range(N):
            x0 = int(round(PHASE[0] + i * PITCH))
            y0 = int(round(PHASE[1] + j * PITCH))
            b = a[max(y0 + 4, 0):y0 + 15, max(x0 + 4, 0):x0 + 15].reshape(-1, 3)
            out[j, i] = np.median(b, axis=0)
    return out


def palette(nat):
    """Each of his pixels as one of his colours (None for the white around her), as the hair's."""
    count = Counter(tuple(int(v) for v in p) for p in nat.reshape(-1, 3))
    reps = []
    for k, n in count.most_common():
        if min(k) > 235:
            continue
        for r in reps:
            if max(abs(a - b) for a, b in zip(k, r)) <= MERGE:
                break
        else:
            reps.append(k)
    col = {}
    for y in range(N):
        for x in range(N):
            p = tuple(int(v) for v in nat[y, x])
            col[x, y] = None if min(p) > 235 else min(reps, key=lambda r: sum(abs(a - b) for a, b in zip(p, r)))
    return col


def lift():
    col = palette(native())
    face = {}
    for y, (a, b) in FACE.items():
        for x in range(a, b + 1):
            if (x, y) in FEATURES:
                q = next(q for q in range(y + 1, y + 6) if (x, q) not in FEATURES)
                face[x, y] = col[x, q]
            else:
                face[x, y] = col[x, y]
            assert face[x, y] is not None, (x, y)
    return col, face


def main():
    col, face = lift()
    used = sorted(set(face.values()), key=lambda c: (sum(c), c))
    assert len(used) <= len(CHARS)
    ch = {c: CHARS[i] for i, c in enumerate(used)}
    hexs = lambda c: '#%02x%02x%02x' % c
    xs = [x for x, _ in face]
    ys = [y for _, y in face]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    rows = [''.join(ch[face[x, y]] if (x, y) in face else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]

    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    preview(col, face, x0, y0, x1, y1, os.path.join(out, 'face@12.png'))
    if len(sys.argv) > 2:
        lines = [
            "// Lyra's face, the owner's picture of her at our game scale, his pixels (tools/refs/lyra-face-from-ref.py",
            '// from docs/reference/lyra-game-scale-owner-reference.jpg). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPart } from './items/capeArt';",
            '',
            '/**',
            ' * Her face (face shape \'fine\'): forehead, cheeks, nose shade, mouth, chin and his line round the far',
            ' * side and under the chin, with the skin under her eyes and brows (the eye shapes draw those). Its pivot',
            ' * is her near eye\'s lash start, on our face anchor.',
            ' */',
            'export const LYRA_FACE: PaintedPart = {',
            f'  pivot: [{ANCHOR[0] - x0}, {ANCHOR[1] - y0}],',
            '  rows: [',
        ]
        lines += [f"    '{r}'," for r in rows]
        lines += ['  ],', '  colors: {']
        lines += [f"    {ch[c]}: '{hexs(c)}'," for c in used]
        lines += ['  },', '};', '',
                  "/** His skin, the colour the player's skin replaces (his shades and line keep their distance from it). */",
                  f"export const LYRA_FACE_SKIN = '{hexs(col[SKIN_AT])}';",
                  '/** His far eye\'s lash starts this many columns after the near one\'s (ours: 9). */',
                  'export const LYRA_FACE_FAR_EYE = 6;',
                  '']
        tmp = sys.argv[2] + '.tmp'
        with open(tmp, 'w') as f:
            f.write('\n'.join(lines))
        os.replace(tmp, sys.argv[2])
    print(len(face), 'pixels', len(used), 'colours', 'skin', hexs(col[SKIN_AT]))


def preview(col, face, x0, y0, x1, y1, path):
    """His crop | the piece | the piece with his brows and eyes back on it, at 12x."""
    W, H = x1 - x0 + 3, y1 - y0 + 3
    im = np.full((H, 3 * W, 3), 226, np.uint8)
    for y in range(y0 - 1, y1 + 2):
        for x in range(x0 - 1, x1 + 2):
            c = col[x, y]
            im[y - y0 + 1, x - x0 + 1] = c if c is not None else (255, 255, 255)
    for k in (1, 2):
        for (x, y), c in face.items():
            im[y - y0 + 1, k * W + x - x0 + 1] = col[x, y] if k == 2 and (x, y) in FEATURES and col[x, y] is not None else c
            if k == 2 and (x, y) in FEATURES and col[x, y] is None:
                im[y - y0 + 1, k * W + x - x0 + 1] = (255, 255, 255)
    Image.fromarray(im).resize((im.shape[1] * 12, im.shape[0] * 12), Image.NEAREST).save(path)


if __name__ == '__main__':
    main()
