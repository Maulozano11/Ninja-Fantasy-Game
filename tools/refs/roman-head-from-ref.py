"""The owner's face from his Roman paint-over (docs/reference/roman-owner-reference.jpg) as the 'roman' face shape.

The owner asked for it on 2026-10-21 ("copia la cara"): his face, 1:1, as a new head option like Aiden's
'valiant' head (tools/refs/aiden-head-from-ref.py). His Roman picture is our male painted over in his own
pixels (tools/refs/roman_ref.py), and he painted the head HEAD_UP pixels higher than ours (his eyes,
ear and chin all sit that much higher on a longer neck). A head option sits on our head, under every
hairstyle, headband and mask placed on it, so his face is registered on ours by its eyes and ear: his
pixel (x, y) lands on our (x, y + HEAD_UP) relative to the face anchor. His face is his: an ear outlined
behind the cheek, a high cheekbone, his jaw running from under the ear down to a short chin with a black
line under it, the shadow of the neck behind the jaw, his nose shadow and his mouth.

This script lifts the head out of his pixels, cell by cell (MAP):

  his pixels   his face, ear, jaw, chin, nose and mouth and his black line round them, every colour as
               he painted it (the mouth too: the face template draws no mouth on this head)
  his hair     covers his skull: there the head is continued in his skin, in our male skull's outline
               (the same cells as the 'valiant' head's skull, round the face anchor), so every hairstyle
               covers it as it covers our head; inside it his base skin, his cheek shadow next to the line
               at the sides, his black line round it. The shadow his bangs cast on his forehead is not
               kept (on a bald head it read as a scar), and behind the ear the skull's line runs into his
               ear's own line (no strip of skull between two black lines)
  his eyes     the brow-and-lash line, the whites and the irises (and the strands of his hair and
               sideburn that cross the forehead and temple) are taken out and his skin carried over them
               from below, so the head is whole: the eyes are drawn by the eye options on top of it (his
               own are the 'roman' eye shape, tools/refs/roman-eyes-from-ref.py)

and writes, in <out>:

  study/head@8.png    the head lifted out, at 8x
  study/his@8.png     his head there, at 8x

and, with a third argument, the game's module (src/sprite/romanHeadArt.ts): the head as a PaintedPiece
whose pivot is the cell on our face anchor, and the skin he painted it on. The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/roman-head-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402

# How much higher than ours he painted the head: his near iris is on row 18 and ours on row 21 (in his
# pixels), his ear's lobe on row 19 and ours on 22, his chin's line on row 25 and ours on 28.
HEAD_UP = 3

# The head, cell by cell, in his pixels from (MAP_X, MAP_Y):
#   H  his pixel (skin or line), kept as he painted it
#   e  one of his features over the face (the eyes' line, whites and irises, a strand of his hair or
#      sideburn over the forehead and temple): his skin carried up from the pixel below
#   s  the skull under his hair: his base skin, his cheek shadow next to the line at the sides
#   o  the skull's outline under his hair: his black line
MAP_X, MAP_Y = 41, 4
MAP = [
    '......oooooooo......',  # 4   our male skull, round the face anchor (as the 'valiant' head's)
    '....oossssssssoo....',  # 5
    '...osssssssssssso...',  # 6
    '..osssssssssssssso..',  # 7
    '..osssssssssssssso..',  # 8
    '.osssssssssssssssso.',  # 9
    '.osssssssssssssssso.',  # 10
    '.osssssssssssssssso.',  # 11
    '.osssssssssssssssso.',  # 12
    '.osssssssssssssssso.',  # 13  his forehead: skull skin where his bangs cast their shadow
    '.osssssssssssssssHo.',  # 14
    '..ooHHssssssHHssHHo.',  # 15  the top of his ear; the skull's line runs into it
    '...HHHHsssseeHeHHeH.',  # 16  his ear (its back line the head's); strands of hair over the forehead; his face's far line
    '...HHHHeHeeeeeHHeeH.',  # 17  the brow-and-lash line over both eyes; the sideburn at the temple
    '...HHHHeeHeeeHHHeeH.',  # 18  the whites and irises; the sideburn in front of the ear
    '...HHHHHeHHHHHHHHHH.',  # 19  the ear lobe; a strand on the cheek
    '.....HHHHHHHHHHHHHH.',  # 20  his line under the ear lobe; his jaw line starts; his nose shadow
    '......HHHHHHHHHHHHH.',  # 21
    '.....HHHHHHHHHHHHH..',  # 22  his mouth; the neck's shadow behind the jaw
    '.....HHHHHHHHHHHHH..',  # 23
    '.....HHHHHHHHHHHH...',  # 24
    '......HHHHHHHHHHH...',  # 25  his chin's line
]
# Our face anchor (the template's first column and its lash row) in his pixels, with the head moved down
# HEAD_UP: the eye options put the near eye a column right of it and his brow-and-lash line a row under it.
ANCHOR = (49, 19 - HEAD_UP)
# His colours the skull takes: his cheek shadow (next to the jaw line under the ear) and his black line.
SHADOW_AT = (48, 20)
LINE_AT = (47, 20)


def head(a):
    """The head's mask and colours, in his pixels (where he painted them)."""
    H, W, _ = a.shape
    kind = np.full((H, W), '.', dtype='<U1')
    for j, row in enumerate(MAP):
        for i, ch in enumerate(row):
            kind[MAP_Y + j, MAP_X + i] = ch
    col = a.copy()
    mask = kind != '.'

    # His base skin: the commonest colour of his face (colours within 3 counted as one, as pack does).
    seen = []
    for y, x in zip(*np.nonzero(kind == 'H')):
        c = a[y, x]
        if R.luma(c[None])[0] < 140:
            continue
        for k, (ref, n) in enumerate(seen):
            if np.abs(ref - c).max() <= 3:
                seen[k] = (ref, n + 1)
                break
        else:
            seen.append((c, 1))
    base = max(seen, key=lambda s: s[1])[0]
    shadow = a[SHADOW_AT[1], SHADOW_AT[0]]
    line = a[LINE_AT[1], LINE_AT[0]]

    # The skull: base skin, his cheek shadow next to the line on the back and far sides, his line.
    for y, x in zip(*np.nonzero(kind == 's')):
        side = x <= ANCHOR[0] - 5 or x >= ANCHOR[0] + 8
        col[y, x] = shadow if side and any(kind[y + dy, x + dx] == 'o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) else base
    col[kind == 'o'] = line

    # His features: his skin carried up over them from below, row by row from the bottom.
    for y in range(MAP_Y + len(MAP) - 1, MAP_Y - 1, -1):
        for x in range(MAP_X, MAP_X + len(MAP[0])):
            if kind[y, x] == 'e':
                col[y, x] = col[y + 1, x]
    return mask, col


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    mask, col = head(a)
    rows, origin, palette = R.pack(col, mask)

    if len(sys.argv) > 3:
        doc = ("The owner's face from his Roman paint-over (the 'roman' face shape), his pixels: his skull, ear, cheeks, "
               'jaw, chin, nose and mouth, his skin shading and black line; the eye options draw the eyes on it. '
               'Its pivot is the cell on the face anchor.')
        src = [
            "// The owner's Roman face, his pixels (tools/refs/roman-head-from-ref.py from",
            '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            "/** The skin he painted the face on: a player's skin moves every colour of it as far. */",
            f"export const ROMAN_SKIN = '{R.PAINTED_SKIN}';",
            '',
            R.ts_piece('ROMAN_HEAD', doc, rows, origin, palette, ANCHOR, 0),
        ]
        R.write(sys.argv[3], '\n'.join(src))

    rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
    ox, oy = origin
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                h = palette[ch]
                rgba[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
    box = (slice(MAP_Y - 2, MAP_Y + len(MAP) + 2), slice(MAP_X - 2, MAP_X + len(MAP[0]) + 2))
    R.save(rgba[box], os.path.join(out, 'study', 'head@8.png'))
    R.save(a[box], os.path.join(out, 'study', 'his@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, origin', origin)


if __name__ == '__main__':
    main()
