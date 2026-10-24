"""The owner's head on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg) as the 'noble'
face shape.

His picture is drawn at twice our scale; tools/refs/noble_ref.py shrinks his head to our Roman head's size and
cleans it with his palette only (the owner's "Reducir y limpiar yo"). This script lifts the head out of that:

  his face   the skin of his face, ear and jaw, his mouth and his black line round them, every colour as the
             reduction gives it (his own colours)
  his eyes   his lashes, whites and irises (noble_ref.EYES) are taken out and his skin carried over them
             from the row above: the eye options draw the eyes on top (his own: nobleEyeArt.ts,
             tools/refs/noble-eyes-from-ref.py)
  his skull  under his hair, the head is continued in his skin inside our male skull's outline (the
             outline his Ren head has, tools/refs/ren-face-from-ref.py), with his black line round it, so
             every hairstyle, his and ours, covers it as it covers our head; only where his hair covers it
             at rest, so at rest every pixel is his

and writes the game's module (src/sprite/nobleHeadArt.ts): the head as a PaintedPiece whose pivot is the
cell on our face anchor, and the base skin he painted it in. With a second argument, a folder, it writes his
head at our scale beside the piece at 8x. The same picture always gives the same bytes. Run from the repo root:

  python3 -I tools/refs/noble-head-from-ref.py src/sprite/nobleHeadArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import noble_ref as N  # noqa: E402

# Our male skull's outline (rows 7-18 of the game picture from x 40 as his Ren head has it, raised with his head): o the line,
# s the skull.
SKULL_X, SKULL_Y = 40, 7 - N.HEAD_UP
SKULL = [
    '......oooooooo........',  # 7
    '....oossssssssoo......',  # 8
    '...osssssssssssso.....',  # 9
    '..osssssssssssssso....',  # 10
    '..osssssssssssssso....',  # 11
    '.osssssssssssssssso...',  # 12
    '.osssssssssssssssso...',  # 13
    '.osssssssssssssssso...',  # 14
    '.osssssssssssssssso...',  # 15
    '.ossssssssssssssssso..',  # 16
    '.ossssssssssssssssso..',  # 17
    '.ossssssssssssssssso..',  # 18
]


def skin_base(g, mask):
    """His base skin: the commonest skin colour of his face."""
    seen = {}
    for y, x in zip(*np.nonzero(mask)):
        if N.kind(g[y, x]) == 'skin':
            h = N.hexc(g[y, x])
            seen[h] = seen.get(h, 0) + 1
    return max(sorted(seen), key=lambda h: seen[h])


def head():
    g, m, part, GK = N.game()
    pcs = N.pieces()
    face, col = pcs['face']
    face = face.copy()
    col = col.copy()
    base = skin_base(g, face)
    bc = np.array([int(base[k:k + 2], 16) for k in (1, 3, 5)])
    # his eyes out, his skin carried down over them from the row above
    for name, (x0, y0, w, h) in N.EYES.items():
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if N.eye_letter(g[y, x]) != 's':
                    col[y, x] = col[y - 1, x] if N.kind(col[y - 1, x]) == 'skin' else bc
                    face[y, x] = True
    # the skull under his hair
    hair = np.isin(part, ('hair', 'headband'))
    for j, row in enumerate(SKULL):
        for i, ch in enumerate(row):
            y, x = SKULL_Y + j, SKULL_X + i
            if ch == '.' or face[y, x] or not hair[y, x]:
                continue
            face[y, x] = True
            col[y, x] = N.his_line() if ch == 'o' else bc
    return face, col, base


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    mask, col, base = head()
    rows, origin, palette = N.pack(col, mask)
    doc = ("The owner's head (the 'noble' face shape), his pixels at our scale: his face, ear, jaw and mouth, his "
           'skin shading and black line, and our skull continued in his skin under his hair; the eye options draw '
           'the eyes on it. Its pivot is the cell on the face anchor.')
    src = [
        N.header('noble-head-from-ref.py', "The owner's head on his noble swordsman").rstrip(),
        '',
        "import type { PaintedPiece } from './painted';",
        '',
        "/** The skin colour he painted him in: a player's skin moves every colour of it as far. */",
        f"export const NOBLE_SKIN = '{base}';",
        '',
        '/** How far his head stands above ours on a male body (fine pixels): where his picture has it (romanNeck.ts headUp). */',
        f'export const NOBLE_HEAD_UP = {N.HEAD_UP};',
        '',
        N.ts_piece('NOBLE_HEAD', doc, rows, origin, palette, N.ANCHOR, 0),
    ]
    N.write(out_ts, '\n'.join(src))
    if study:
        os.makedirs(study, exist_ok=True)
        g, m, _, _ = N.game()
        box = (slice(4, 32), slice(30, 66))
        a = N.rgba(g, m)[box]
        b = N.rgba(col, mask)[box]
        N.save(np.concatenate([a, np.zeros((a.shape[0], 2, 4), np.uint8), b], axis=1), os.path.join(study, 'head@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, base', base, 'origin', origin)


if __name__ == '__main__':
    main()
