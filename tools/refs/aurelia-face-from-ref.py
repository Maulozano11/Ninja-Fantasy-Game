"""Aurelia's face, ear and jaw from the owner's picture at our scale, as the face shape 'aurelia'.

The owner, 2026-10-23, seeing his game-scale Aurelia beside ours: "igual que romano copia la forma de
cara cuello y peinado pixel a pixel me gusta mas la de mi dibujo". Her face was our face template with
her eyes on it: wider, our red open mouth, our jaw and chin a row and more lower. This lifts his.

docs/reference/aurelia-escala-juego-owner-reference.jpg is his Aurelia at OUR scale (1932 x 1932,
19.32 picture pixels each, from 0: one of his pixels is one fine pixel of ours). The cells are read as
her hair's are (tools/refs/aurelia-hair-from-ref.py: native, classify, its KEY of his colours), so face
and hair meet pixel for pixel.

His face, in his pixels (x, y): the lash row is 16 (the near eye x 51-54, the far eye x 58-59, his navy
lash closing the face's far side at x 59), the cheeks rows 17-23 with his blush (57, 20) and (58, 21)
and his mouth, two dark pinks at (55, 22) and (56, 22); his black line down the far cheek (59, 21),
(58, 22), (57, 23), the jaw's line at (51, 23) over the shaded (52, 23), and the chin's line along row
24 (x 52-56), where his collar starts right under it: his neck shows nowhere. His ear is two columns at
x 45-46, rows 16-18: its dark line behind, its skin and inner pink in front, between her bun and her
near lock. The piece (MAP below):

  H  his pixel, as he painted it
  e  under an eye (the eye shapes draw the eyes: his own are 'dawn', tools/refs/aurelia-eyes-from-ref.py,
     on the cells he drew them in) and under the brown tip of a bang strand at (55, 16) (her hair's):
     his skin carried up from the first cell below that is not an eye
  c  his near cheek under her near lock: his lit skin (the lock covers it at rest; another hairstyle
     shows it)
  o  his black line where her hair hides the face's edge: under the ear, the near cheek and jaw under the
     lock, the far edge under the far lock (rows 19-20); hidden at rest, it closes the face under another
     hairstyle

Above the lash row her face is her hair's: his forehead shows only between her bang strands (the hair
item's skin cells). The skull above it is the face template's, as on Lyra's face, trimmed to her hair by
her hair (and stopped at his far line, body.ts), and the rig carries her head where he drew it over her
body (src/sprite/aureliaHead.ts): his lash's first cell (51, 16) is the face anchor, which lies at our
(124, 136) at the female idle frame 0, so every pixel of his here lands at our (x + 73, y + 120), where
the rest of her lies (tools/refs/aurelia_rig.py AT).

The game draws his skin colours in the player's skin (body.ts skinTone: his lit skin SKIN becomes the
skin, his shades and blush keep their distance from it); his black and dark lines stay his.

Writes the game's module (src/sprite/aureliaFaceArt.ts) and, with --preview <dir>, his crop | the piece
| the piece under his eyes, at 12x (face@12.png). The same picture always gives the same bytes. From
the repo root:

  python3 -I tools/refs/aurelia-face-from-ref.py src/sprite/aureliaFaceArt.ts [--preview <dir>]
"""

import importlib.util
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('aurelia_hair', os.path.join(HERE, 'aurelia-hair-from-ref.py'))
HAIR = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(HAIR)
ROOT = os.path.dirname(os.path.dirname(HERE))

# His near eye's lash start: the face anchor.
ANCHOR = (51, 16)
# The piece, from his (MAP_X, MAP_Y).
MAP_X, MAP_Y = 44, 16
MAP = [
    # 4444455555555556
    # 4567890123456789 0
    '.HHcccceeeeeHHeH.',  # 16  his ear; the lash row (the eyes, a bang tip at 55, his skin between them)
    '.HHcccceeeeHHHeH.',  # 17  his ear; the eyes, his cheek between them
    '.HHccccHeeeHHHeH.',  # 18  his ear; his shade under the near eye's corner
    '.oocccc' + 'HHHHHHHHo.',  # 19  the line under his ear; his cheek, the far edge under the far lock
    '..occccc' + 'HHHHHHHo.',  # 20  the near lock's edge over the cheek (51); his blush
    '..occcc' + 'HHHHHHHHH.',  # 21  his blush; his far line
    '...occc' + 'HHHHHHHH..',  # 22  his mouth; his far line
    '...oooo' + 'HHHHHHH...',  # 23  the jaw under the lock; his jaw's line, its shade, his far line
    '........' + 'HHHHH....',  # 24  the chin's line, the collar's top
]
assert all(len(r) == len(MAP[0]) for r in MAP), [len(r) for r in MAP]

# His lit skin, black line and the colour his skin follows.
SKIN = 'v'
LINE = 'k'
# His face's colours: the hair's KEY (its skin, shades, mouth and lines) and the light he put on the far
# cheek (57, 19), which the hair's KEY does not have.
KEY = dict(HAIR.KEY, X='#fbdac4')
# Which of them are skin (they follow the player's skin); the rest (his lines) stay his.
SKIN_KEYS = 'vpsjX'

CHARS = 'abcdefghijlmnopqrstuvwxyz'


def lift():
    N = HAIR.native(HAIR.REF)
    keys = list(KEY)
    pal = np.array([HAIR.rgb(KEY[k]) for k in keys])
    d = np.abs(N[:, :, None, :] - pal[None, None]).max(3)
    lab, dist = np.array(keys)[d.argmin(2)], d.min(2)
    cell = {}
    worst = 0
    for j, row in enumerate(MAP):
        y = MAP_Y + j
        for i, m in enumerate(row):
            x = MAP_X + i
            if m == '.':
                continue
            if m == 'H':
                ch = str(lab[y, x])
                worst = max(worst, int(dist[y, x]))
            elif m == 'e':
                q = next(q for q in range(y + 1, y + 6) if MAP[q - MAP_Y][x - MAP_X] not in 'e')
                ch = str(lab[q, x])
            elif m == 'c':
                ch = SKIN
            else:
                ch = LINE
            assert ch in SKIN_KEYS or ch in 'ka', (x, y, m, ch)
            cell[x, y] = ch
    return N, lab, cell, worst


def main():
    args = sys.argv[1:]
    prev = None
    if '--preview' in args:
        k = args.index('--preview')
        prev = args[k + 1]
        del args[k:k + 2]
    N, lab, cell, worst = lift()
    used = sorted(set(cell.values()), key=list(KEY).index)
    letter = {c: CHARS[i] for i, c in enumerate(used)}
    rows = [''.join(letter[cell[MAP_X + i, MAP_Y + j]] if (MAP_X + i, MAP_Y + j) in cell else '.' for i in range(len(MAP[0]))) for j in range(len(MAP))]
    px, py = ANCHOR[0] - MAP_X, ANCHOR[1] - MAP_Y
    out = [
        "// Aurelia's face, the owner's pixels at our scale (tools/refs/aurelia-face-from-ref.py from",
        '// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './items/capeArt';",
        '',
        '/**',
        " * Her face (face shape 'aurelia'): his ear, cheeks, blush, mouth, jaw and chin with his black line, from",
        " * the lash row down; under her eyes his skin (the eye shapes draw them). Its pivot is her near eye's lash",
        ' * start, on the face anchor.',
        ' */',
        'export const AURELIA_FACE: PaintedPart = {',
        f'  pivot: [{px}, {py}],',
        '  rows: [',
    ]
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {letter[c]}: '{KEY[c]}'," for c in used]
    out += ['  },', '};', '',
            "/** His lit skin: the player's skin replaces it, his shades, blush and mouth keep their distance from it. */",
            f"export const AURELIA_FACE_SKIN = '{KEY[SKIN]}';",
            '',
            "/** His lines (his black and his ear's dark line): never tinted. */",
            f"export const AURELIA_FACE_LINE = '{''.join(letter[c] for c in used if c not in SKIN_KEYS)}';",
            '',
            "/** His far eye's lash starts this many columns after the near one's (ours: 9). */",
            f'export const AURELIA_FACE_FAR_EYE = {58 - ANCHOR[0]};',
            '',
            '/** The first column past his face\'s far line above the lash row, counted from the near eye\'s (the skull stops before it). */',
            f'export const AURELIA_FACE_FAR_LINE = {60 - ANCHOR[0]};',
            '']
    if args:
        tmp = args[0] + '.tmp'
        with open(tmp, 'w') as f:
            f.write('\n'.join(out))
        os.replace(tmp, args[0])
    if prev:
        os.makedirs(prev, exist_ok=True)
        preview(N, lab, cell, os.path.join(prev, 'face@12.png'))
    print(len(cell), 'pixels', len(used), 'colours; worst cell', worst, 'off its colour')


def preview(N, lab, cell, path):
    """His crop | the piece | the piece with his eyes and bang tip back on it, at 12x."""
    x0, y0, x1, y1 = MAP_X - 1, MAP_Y - 1, MAP_X + len(MAP[0]) + 1, MAP_Y + len(MAP) + 1
    W, H = x1 - x0, y1 - y0
    rgb = lambda c: np.array([int(KEY[c][k:k + 2], 16) for k in (1, 3, 5)])
    im = np.full((H, 3 * W + 2, 3), 226, np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            im[y - y0, x - x0] = N[y, x]
    for k in (1, 2):
        for (x, y), c in cell.items():
            m = MAP[y - MAP_Y][x - MAP_X]
            im[y - y0, k * (W + 1) + x - x0] = N[y, x] if k == 2 and m == 'e' else rgb(c)
    Image.fromarray(im).resize((im.shape[1] * 12, im.shape[0] * 12), Image.NEAREST).save(path)


if __name__ == '__main__':
    main()
