"""The owner's head on his Ren (docs/reference/ren-owner-reference.jpg) as the 'night' face shape.

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). His face is narrower than ours: a small ear outlined behind the near cheek, the
near cheek in shadow under his hair, a nose shadowed by two pixels, a three-pixel mouth, a short chin
over a shadowed neck, and his black line round it. This script lifts the head out of his pixels:

  his pixels   the skin of his face, ear and neck and his black line, every colour as he painted it
               (H in MAP), his mouth included (the face template draws none on this head)
  his hair     covers his skull, his temples and his near cheek: there the head is continued in his
               skin (s: his base skin, his cheek shadow by the line at the sides, inside our male
               skull's outline, as for his Aiden head; c: his cheek carried on from beside it), so
               every hairstyle, his and ours, covers it as it covers our head; o is his black line
  his eyes     his lashes, whites and irises, and the strands of hair crossing them, are taken out
               and his skin carried over them from above (e): the eyes are drawn on top by the eye
               options (his own: src/sprite/nightEyeArt.ts, tools/refs/ren-eyes-from-ref.py)

and writes the game's module (src/sprite/nightHeadArt.ts): the head as a PaintedPiece whose pivot is
the cell on our face anchor (the near eye's lash row), and the base skin he painted it in. With a
second argument, a folder, it writes his head beside ours at 8x. The same picture always gives the same
bytes. Run from the repo root:

  python3 -I tools/refs/ren-face-from-ref.py src/sprite/nightHeadArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref as R  # noqa: E402

# The head, cell by cell, in his pixels from (MAP_X, MAP_Y):
#   H  his pixel (skin or line), kept as he painted it
#   e  his eyes, lashes and the strands crossing them: his skin carried down from the cell above
#   c  his near cheek under the hair: his cheek carried on from the right, row by row
#   s  the skull under his hair: his base skin, his cheek shadow next to the line at the sides
#   o  the head's outline under his hair: his black line
# Rows 7-15 are our male skull's outline (as in tools/refs/aiden-head-from-ref.py); from row 16 his
# forehead shows between his strands, from row 19 his face.
MAP_X, MAP_Y = 40, 7
MAP = [
    '......oooooooo........',  # 7
    '....oossssssssoo......',  # 8
    '...osssssssssssso.....',  # 9
    '..osssssssssssssso....',  # 10
    '..osssssssssssssso....',  # 11
    '.osssssssssssssssso...',  # 12
    '.osssssssssssssssso...',  # 13
    '.osssssssssssssssso...',  # 14
    '.osssssssssssssssso...',  # 15
    '.osssssssssHssssssso..',  # 16  his forehead between the strands
    '.osssssssssHssssssHo..',  # 17
    '.ossssssssHssHsssHso..',  # 18
    '.osHHHssseeeeeHeHeeeo.',  # 19  his ear and its line; the lash row
    '..oHHHccceeeeeHHeeee..',  # 20  the eyes; his line between them
    '..oHHHHccHeeeHHHHeee..',  # 21
    '...oHHHcHHHHHHHHHHHH..',  # 22  the ear lobe
    '....oHHcHHHHHHHHHHHH..',  # 23
    '......HHHHHHHHHHHHHH..',  # 24  his near cheek's line
    '.......HHHHHHHHHHHHH..',  # 25  his mouth
    '........HHHHHHHHHHHH..',  # 26
    '.........HHHHHHHH.....',  # 27
    '..........HHHHHH......',  # 28  his chin
    '..........HHHHHH......',  # 29  his neck under it
]
assert all(len(r) == len(MAP[0]) for r in MAP), 'MAP rows differ in length'
# His cheek shadow (the band along the near cheek) for the skull's sides.
SHADOW_AT = (48, 23)


def head(a):
    """The head's mask and colours, in his pixels."""
    H, W, _ = a.shape
    kind = np.full((H, W), '.', dtype='<U1')
    for j, row in enumerate(MAP):
        for i, ch in enumerate(row):
            kind[MAP_Y + j, MAP_X + i] = ch
    col = a.copy()
    base = np.array([int(R.night_skin(a)[k:k + 2], 16) for k in (1, 3, 5)])
    shadow = a[SHADOW_AT[1], SHADOW_AT[0]]
    black = R.his_line(a)
    for y, x in zip(*np.nonzero(kind == 's')):
        side = x <= R.ANCHOR[0] - 5 or x >= R.ANCHOR[0] + 9
        edge = any(kind[y + dy, x + dx] == 'o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        col[y, x] = shadow if side and edge else base
    col[kind == 'o'] = black
    for y in range(MAP_Y, MAP_Y + len(MAP)):
        for x in range(MAP_X, MAP_X + len(MAP[0])):
            if kind[y, x] == 'e':
                col[y, x] = col[y - 1, x]
    for y in range(MAP_Y, MAP_Y + len(MAP)):
        for x in range(MAP_X + len(MAP[0]) - 1, MAP_X - 1, -1):
            if kind[y, x] == 'c':
                col[y, x] = col[y, x + 1]
    return kind != '.', col, R.hexc(base)


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    mask, col, base = head(a)
    rows, origin, palette = R.pack(col, mask)
    doc = ("The owner's head (the 'night' face shape), his pixels from his Ren: his skull, ear, cheeks, mouth, "
           'chin and the top of his neck, his skin shading and black line; the eye options draw the eyes on it. '
           'Its pivot is the cell on the face anchor.')
    src = [
        "// The owner's head on his Ren, his pixels (tools/refs/ren-face-from-ref.py from",
        '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from './painted';",
        '',
        "/** The skin colour he painted Ren in: a player's skin moves every colour of it as far. */",
        f"export const NIGHT_SKIN = '{base}';",
        '',
        R.ts_piece('NIGHT_HEAD', doc, rows, origin, palette, R.ANCHOR, 0),
    ]
    R.write(out_ts, '\n'.join(src))
    if study:
        os.makedirs(study, exist_ok=True)
        rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
        rgba[mask, :3] = col[mask]
        rgba[mask, 3] = 255
        box = (slice(MAP_Y - 2, MAP_Y + len(MAP) + 2), slice(MAP_X - 2, MAP_X + len(MAP[0]) + 2))
        his = np.concatenate([a[box], np.full(a[box].shape[:2] + (1,), 255)], axis=2)
        R.save(np.concatenate([his, np.zeros((his.shape[0], 2, 4), np.int32), rgba[box]], axis=1), os.path.join(study, 'head@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, base', base, 'origin', origin)


if __name__ == '__main__':
    main()
