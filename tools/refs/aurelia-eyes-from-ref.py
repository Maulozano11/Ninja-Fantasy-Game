"""Aurelia's eyes (docs/reference/aurelia-escala-juego-owner-reference.jpg) as the 'dawn' eye shape.

The owner drew Aurelia again at our game's scale ("aqui tienes tus referencias perfectas del modelo de
mujer"): 1932 x 1932 picture pixels, 19.32 for each of his pixels (100 x 100 of them, the grid starting
at the picture's corner; measured from where the colour changes along every row and column), and one
of his pixels is one of ours. So her eyes are copied pixel for pixel, as Aiden's were
(tools/refs/aiden-eyes-from-ref.py): each of his pixels is the middle of its cell (its median; the
cells are flat but for the JPEG's few levels of noise), and pixels he drew in one colour are one
colour (the cells within NEAR of each other take their mean). Nothing is blended or redrawn.

His near eye is 4 of his pixels wide and 3 tall (x 51-54, y 16-18), the size of ours: a navy lash
row that ends in a dark brown tip at the outer corner, the brown running down a row; under it a
greyed white, then a white, his blue iris (two pixels) over a lighter blue and a light blue. His far
eye (x 58-59) is two pixels: his blue over a light blue (a little darker than the near one's), and
the navy lash down its outer side. The rest of the face round them is skin (his skin is the face's
own: it follows the player's skin tone), as on our template, so his pixels go on our template's eye
cells with the template's letters, and the face, the eye options' code and Ocular Surge read them as
they read ours:

  L  his lash (navy and brown)    h  his greyed white    w  his white
  d  his blue (the iris)          i  his lighter and light blues (the iris moves the way the eye
                                     colour moves his blue, IRIS)
  o D s b l   the face's own skin there (no pixel of his)

His near eye sits where ours does (the template's columns 0-3; column 4 is skin). His far eye starts
7 of his pixels from the near one, ours 9 (our face is wider): his two columns go on our far eye's
first two, and our third (the face's edge on those rows) is the face's outline.

Two lid states the game needs that his picture does not show are made of his own pixels:

  lowered  (reading) the lid comes down over the top of the eye: his lash row moves down a row, the
           face's skin over it, his eye's lower row under it
  closed   (knocked out) the eye is shut: his lash row across the middle, the face's skin above and
           under it

His brows are under her bangs (no brow shows); the face draws our hair-coloured brows there, under
the hair, as for the other eyes. It writes, in <out>:

  study/eyes@16.png   his eyes on our cells, open, lowered and closed, at 16x (white where the face's
                      skin shows)
  study/hers@16.png   her face in his pixels, at 16x

and, with a second argument, the game's module (src/sprite/aureliaEyeArt.ts). The same picture always
gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/aurelia-eyes-from-ref.py <out> src/sprite/aureliaEyeArt.ts
"""

import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PICTURE = os.path.join(ROOT, 'docs', 'reference', 'aurelia-escala-juego-owner-reference.jpg')
# One of his pixels in picture pixels, and where his grid starts.
PITCH = 19.32
PHASE = (0.0, 0.0)
# Cells linked by steps closer than this (RGB distance) are one colour of his: his navy's cells differ
# by up to 13 (the JPEG), his two blues by 26, everything else by more.
NEAR = 16
# Each cell of our eye cells: (letter, his pixel (x, y)) or a skin letter alone (the face shows).
MAP = {
    'near': [
        # the lash row: his dark brown outer tip, his navy lash
        [('L', (51, 16)), ('L', (52, 16)), ('L', (53, 16)), ('L', (54, 16)), 'b'],
        # the brown running down, his greyed white, his blue twice
        [('L', (51, 17)), ('h', (52, 17)), ('d', (53, 17)), ('d', (54, 17)), 'b'],
        # the cheek under the outer corner, his white, his lighter blue, his light blue
        ['s', ('w', (52, 18)), ('i', (53, 18)), ('i', (54, 18)), 'b'],
    ],
    'far': [
        # his lash, then the face's edge
        [('L', (58, 16)), ('L', (59, 16)), 'o'],
        # his blue, the lash running down the eye's outer side
        [('d', (58, 17)), ('L', (59, 17)), 'o'],
        # his light blue, the lash
        [('i', (58, 18)), ('L', (59, 18)), 'o'],
    ],
}
# The colour his iris follows: his blue (the iris's main colour, both eyes' top row). A player who
# picks it keeps his pixels exactly; another eye colour moves them as far.
IRIS_AT = (54, 17)
# The face's skin under the lowered and closed lids (our CLOSED_EYES and lowered rows).
SKIN_ROWS = {'near': ('bbbbb', 'sbbbb'), 'far': ('bbo', 'bbo')}


def native():
    """His pixels: the median of each grid cell (away from its edges), (H, W, 3) ints."""
    a = np.asarray(Image.open(PICTURE).convert('RGB')).astype(int)
    n = int(round((a.shape[0] - PHASE[1]) / PITCH))
    out = np.zeros((n, n, 3), int)
    for y in range(n):
        for x in range(n):
            y0, y1 = int(PHASE[1] + y * PITCH + 4), int(PHASE[1] + (y + 1) * PITCH - 4)
            x0, x1 = int(PHASE[0] + x * PITCH + 4), int(PHASE[0] + (x + 1) * PITCH - 4)
            out[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    return out


def hexof(c):
    return '#' + ''.join(f'{int(v):02x}' for v in c)


def colours(N, cells):
    """His colour (hex) for each cell: cells linked by steps within NEAR are one colour, their mean."""
    cells = sorted(set(cells))
    group = {p: k for k, p in enumerate(cells)}
    for p in cells:
        for q in cells:
            if group[p] != group[q] and np.linalg.norm(N[p[1], p[0]] - N[q[1], q[0]]) < NEAR:
                old = group[q]
                for r in cells:
                    if group[r] == old:
                        group[r] = group[p]
    groups = [[p for p in cells if group[p] == k] for k in sorted(set(group.values()))]
    out = {}
    for g in groups:
        mean = np.round(np.mean([N[p[1], p[0]] for p in g], axis=0))
        for p in g:
            out[p] = hexof(mean)
    return out


def eyes(hexes):
    """Each eye open: (letters rows, colour rows with None where the face's skin shows)."""
    out = {}
    for name, rows in MAP.items():
        letters, cols = [], []
        for row in rows:
            letters.append(''.join(c if isinstance(c, str) else c[0] for c in row))
            cols.append([None if isinstance(c, str) else hexes[c[1]] for c in row])
        out[name] = (letters, cols)
    return out


def lidded(open_eyes, closed):
    """The lowered or closed lid, from his open eye: his lash row moves down a row; over it the face's
    skin, under it the eye's lower row (lowered) or the face's skin (closed)."""
    out = {}
    for name, (letters, cols) in open_eyes.items():
        top, bottom = SKIN_ROWS[name]
        n = len(letters[0])
        rows_l = [top, letters[0], bottom if closed else letters[2]]
        rows_c = [[None] * n, cols[0], [None] * n if closed else cols[2]]
        out[name] = (rows_l, rows_c)
    return out


def luma(h):
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 0.299 * r + 0.587 * g + 0.114 * b


def palette(states):
    """One character per colour of his the eyes use, darkest first."""
    used = {c for st in states for name in ('near', 'far') for row in st[name][1] for c in row if c}
    chars = 'abcdefghijklmnopqrstuvwxyz'
    return {h: chars[k] for k, h in enumerate(sorted(used, key=lambda h: (luma(h), h)))}


def encode(cols, pal):
    return [''.join('.' if c is None else pal[c] for c in row) for row in cols]


def write_ts(path, states, pal, iris):
    out = [
        "// Aurelia's eyes, the owner's pixels at our scale (tools/refs/aurelia-eyes-from-ref.py from",
        '// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedEye } from './eyeArt';",
        '',
        '/** His colours, one character each. */',
        'export const DAWN_EYE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {k}: '{h}'," for h, k in pal.items()]
    out += ['};', '']
    docs = {
        'open': 'Her eyes as he drew them: the navy lash with its brown outer tip; his greyed white and blue; his white and light blues.',
        'lowered': 'Reading: his lash comes down a row over the eye; under it the eye\'s lower row.',
        'closed': 'Knocked out: his lash across the shut eye, the face\'s skin above and under it.',
    }
    out += ['/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template\'s own eye cells and rows. */',
            'export const DAWN_EYES: Record<\'open\' | \'lowered\' | \'closed\', { near: PaintedEye; far: PaintedEye }> = {']
    for state, st in states.items():
        out += [f'  /** {docs[state]} */', f'  {state}: {{']
        for name in ('near', 'far'):
            letters, cols = st[name]
            out += [f'    {name}: {{', f'      letters: [{", ".join(repr(r) for r in letters)}],',
                    f'      rows: [{", ".join(repr(r) for r in encode(cols, pal))}],', '    },']
        out += ['  },']
    out += ['};', '',
            "/** His blue, the colour her iris follows: the player's eye colour moves her iris as far. */",
            f"export const DAWN_IRIS = '{iris}';", '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def save(arr, path, k):
    img = Image.fromarray(arr.astype(np.uint8), 'RGB')
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    tmp = path + '.tmp.png'
    img.save(tmp)
    os.replace(tmp, path)


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    N = native()
    cells = [c[1] for rows in MAP.values() for row in rows for c in row if not isinstance(c, str)]
    hexes = colours(N, cells + [IRIS_AT])
    opened = eyes(hexes)
    states = {'open': opened, 'lowered': lidded(opened, False), 'closed': lidded(opened, True)}
    pal = palette(states.values())
    if len(sys.argv) > 2:
        write_ts(sys.argv[2], states, pal, hexes[IRIS_AT])

    # The study: her face in his pixels, and each state on our cells (the far eye 9 columns right of
    # the near one's first, as on our face) over white where the face's skin shows.
    save(N[12:26, 47:63], os.path.join(out, 'study', 'hers@16.png'), 16)
    w, h = 12, 3
    sheet = np.full((h * 3 + 4, w + 2, 3), 200, np.int32)
    for k, st in enumerate(states.values()):
        for name, x0 in (('near', 0), ('far', 9)):
            for r, row in enumerate(st[name][1]):
                for c, px in enumerate(row):
                    sheet[1 + k * (h + 1) + r, 1 + x0 + c] = rgb(px) if px else (255, 255, 255)
    save(sheet, os.path.join(out, 'study', 'eyes@16.png'), 16)
    print(len(pal), 'colours:', ' '.join(f'{k}={h}' for h, k in pal.items()), 'iris', hexes[IRIS_AT])


if __name__ == '__main__':
    main()
