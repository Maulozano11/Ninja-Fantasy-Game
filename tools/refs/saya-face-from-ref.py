"""The owner's Saya's face (docs/reference/saya-game-scale-owner-reference.jpg) as the 'shade' face shape.

His game-scale Saya ("aquí hay otra", the picture he drew at our sprite scale) is 1024 x 1024 picture pixels
for 100 x 100 of hers: one of her pixels is 10.24 picture pixels, the grid starting at the picture's corner,
and one of hers is one of ours. Her face is lifted 1:1, as Aiden's head was: each cell is her pixel there
(the median of the cell's middle, a JPEG), snapped to her face's tones, each tone the mean of its cells.

Her face as he drew it (her pixels x 49-58, from the forehead between her bangs down to the chin, row 28):

  skin    her flat light skin (b), lit at the far cheek under the eye (l), her shadow (s) at the near
          cheek's edge, under the bangs and down the far jaw, and a deeper tone (n) for her nose and her
          mouth: a single row of three under the nose; a dark chin shadow (z) at the near jaw
  line    her black line (k): the far side of the face (x 58 from the eyes down), the jaw curving in to
          the chin, the chin's row (row 28); and the ear (x 44) showing between her side hair and the bangs
  eyes    her eye cells (the template's: the near eye x 48-52, the far x 56-58, rows 19-21) are her skin
          here; the eye options draw over them (her own, the 'shade' eyes, sayaEyeArt.ts, land on hers)

Under her bangs and side locks the hair covers the face: there the cells are left empty, and the game
puts our template's near cheek under them (body.ts), so another hairstyle still shows a whole face. One
cell her hair hides is filled by continuing her line: the face's black line at x 57 row 25, under the far
lock's brown, between her line above (x 58) and below (x 57 row 26).

Her face's anchor is our face anchor (body.ts faceAnchor: the near eye's lash row and first column): her
x 48 on her lash row 19, the cell the hair (saya-hair-from-ref.py) and eyes (saya-eyes-from-ref.py) are
placed by. Her far eye is 8 cells further on (her x 56), one nearer than our template's far eye, as
Aiden's is on his head: the face shape moves the far eye there.

Writes, in <out>:

  face@16.png   her face as lifted (white where it is empty), and her own pixels there, at 16x

and, with a third argument, the game's module (src/sprite/sayaFaceArt.ts). The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/saya-face-from-ref.py docs/reference/saya-game-scale-owner-reference.jpg <out> src/sprite/sayaFaceArt.ts
"""

import os
import sys

import numpy as np
from PIL import Image

# One of her pixels in picture pixels, and her grid's size: 1024 / 100, the grid from the picture's corner.
PITCH = 10.24
SIZE = 100
# Her tones round the face, to snap each cell to (the nearest one); each is then the mean of its cells.
# The face's: k b l s n z. The others are what borders it: hair, scarf, eyes, background.
SNAP = {
    'k': '#020101', 'b': '#f3be9c', 'l': '#f6ccab', 's': '#d68d77', 'n': '#ce816b', 'z': '#6a3b31',
    # not the face
    '.': '#ffffff', 'W': '#ddd9d5', 'u': '#1b487a', 'v': '#3877a1',
    'X': '#d8ad5f', 'h': '#f5d67a', 'y': '#7e4f35', 'o': '#e7c26c', 'H': '#f9edb6', 't': '#734b29',
    'T': '#edc653', 'P': '#bd8e50', 'q': '#744a30', 'E': '#905d3a', 'J': '#a36e3f',
    'A': '#641b29', 'D': '#b43234', 'a': '#431627',
}
SKIN = 'blsnz'
LINE = 'k'
# The box her face is read from (x0, y0, x1, y1), and her anchor in it (her x 48, lash row 19).
BOX = (44, 17, 59, 29)
ANCHOR = (48, 19)
# Her face from the eyes down is x 49 on; left of it her side hair (and under it our cheek). The ear is
# the one cell further in that shows skin: x 44 on the lash row and the two under it.
FACE_X0 = 49
EAR = [(44, 19), (44, 20), (44, 21)]
# Her chin: the last row. Her z is a face tone only at the jaw (her side hair has the same brown).
CHIN = 28
# The eye cells: the near eye x 48-52 and the far x 56-58, rows 19-21 (the template's eye cells).
EYE_CELLS = {(x, y) for y in range(19, 22) for x in list(range(48, 53)) + list(range(56, 59))}
# A cell her hair hides that continues her line (see above).
FILL = {(57, 25): 'k'}


def native(ref):
    """Her pixels: the median of each cell's inside (6 x 6 picture pixels), (SIZE, SIZE, 3)."""
    a = np.asarray(Image.open(ref).convert('RGB')).astype(int)
    assert a.shape[:2] == (1024, 1024), a.shape
    out = np.zeros((SIZE, SIZE, 3), int)
    for j in range(SIZE):
        for i in range(SIZE):
            x0 = int(round(i * PITCH + 2.5))
            y0 = int(round(j * PITCH + 2.5))
            out[j, i] = np.median(a[y0:y0 + 6, x0:x0 + 6].reshape(-1, 3), 0)
    return out


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def snapped(N):
    keys = list(SNAP)
    P = np.array([hexrgb(SNAP[k]) for k in keys])
    d = np.abs(N[:, :, None, :] - P[None, None]).sum(3)
    return np.array(keys)[d.argmin(2)]


def build(ch):
    """Her face's cells in the box: a face character or '.'."""
    x0, y0, x1, y1 = BOX
    rows = []
    for y in range(y0, y1):
        row = ''
        for x in range(x0, x1):
            c = ch[y, x]
            face = (x >= FACE_X0 or (x, y) in EAR) and y <= CHIN
            if (x, y) in FILL:
                row += FILL[(x, y)]
            elif (x, y) in EYE_CELLS:
                # the eye options draw here: her skin under them where she shows skin, her flat skin under
                # her eyes, her line where the eye is the face's edge
                row += c if c in SKIN or (x == 58 and c == LINE) else 'b'
            elif face and c in SKIN and not (c == 'z' and x != 51):
                row += c
            elif face and y >= ANCHOR[1] and c == LINE and any(ch[y + dy, x + dx] in SKIN for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                # her black line round the face (from the lash row down; above it the hair's)
                row += c
            else:
                row += '.'
        rows.append(row)
    return rows


def tones(N, ch, rows):
    """Each face tone: the mean of her cells of that tone in her face (the cells kept, as she drew them)."""
    x0, y0 = BOX[:2]
    out = {}
    for k in SKIN + LINE:
        px = [N[y0 + j, x0 + i] for j, row in enumerate(rows) for i, c in enumerate(row) if c == k and ch[y0 + j, x0 + i] == k]
        out[k] = '#%02x%02x%02x' % tuple(np.round(np.mean(px, 0)).astype(int))
    return out


def write_ts(path, rows, colors):
    used = sorted({c for r in rows for c in r if c != '.'}, key=(SKIN + LINE).index)
    px, py = ANCHOR[0] - BOX[0], ANCHOR[1] - BOX[1]
    out = ['// The owner\'s Saya\'s face in her pixels and colours (tools/refs/saya-face-from-ref.py from',
           '// docs/reference/saya-game-scale-owner-reference.jpg, his picture at our scale). Generated: rerun the script to change it.',
           '',
           "import type { PaintedPiece } from './painted';",
           '',
           "/** Her skin's flat tone: a player's skin moves every skin colour of her face as far (her black line stays). */",
           f"export const SAYA_FACE_SKIN = '{colors['b']}';",
           '',
           "/** Her black line. */",
           f"export const SAYA_FACE_LINE = '{LINE}';",
           '',
           "/** Her eye cells' column offsets from the anchor: the near eye's first and the far eye's first (her x 48 and x 56). */",
           f'export const SAYA_FACE_EYES = {{ near: 0, far: {56 - ANCHOR[0]} }};',
           '',
           "/** The owner's Saya's face (the 'shade' face shape), her pixels: the ear, her cheeks, nose, mouth, jaw and chin, her skin shading and black line, from the forehead between her bangs to the chin ('.' where her hair covers it). Its pivot is the cell on the face anchor (her near eye's lash row). */",
           'export const SAYA_FACE: PaintedPiece = {',
           f'  pivot: [{px}, {py}],',
           '  angle: 0,',
           '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {k}: '{colors[k]}'," for k in used]
    out += ['  },', '};', '']
    src = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(src)
    os.replace(tmp, path)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    N = native(ref)
    ch = snapped(N)
    rows = build(ch)
    colors = tones(N, ch, rows)
    if len(sys.argv) > 3:
        write_ts(sys.argv[3], rows, colors)
    x0, y0, x1, y1 = BOX
    w, h = x1 - x0, y1 - y0
    sheet = np.full((h, 2 * w + 1, 3), 200, np.int32)
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            sheet[j, i] = hexrgb(colors[c]) if c != '.' else (255, 255, 255)
    sheet[:, w + 1:] = N[y0:y1, x0:x1]
    Image.fromarray(np.asarray(sheet, np.uint8)).resize((sheet.shape[1] * 16, h * 16), Image.NEAREST).save(os.path.join(out, 'face@16.png'))
    print('\n'.join(rows))
    print(' '.join(f'{k}={v}' for k, v in colors.items()))


if __name__ == '__main__':
    main()
