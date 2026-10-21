"""The owner's head shape (docs/reference/aiden-owner-reference.jpg) as the 'valiant' face shape.

His Aiden is our Aiden painted over in his own pixels (tools/refs/aiden_ref.py). His head is our
male head's size, but his own: a small ear outlined behind the cheek, the near cheek in shadow, a
jaw that runs from under the ear straight down to a short, flat chin, a nose shadowed by one pixel
and a black line all round. This script lifts the head out of his pixels:

  his pixels   the skin of his face and ear and his black line, every colour as he painted it
  his hair     covers his skull and his temples: there the head is continued in his skin, in our
               male skull's outline (MAP), so every hairstyle, his and ours, covers it as it covers
               our head; inside it his base skin, his cheek shadow along both sides, his black line
               round it
  his features the eyes, his brow and lash row, the lock of hair over the nose bridge and the
               sideburn in front of the ear are taken out and his skin carried over them from
               above (the mouth from below), so the head is whole: the eyes, brows and mouth are
               drawn by our face template and eye options on top of it (src/sprite/body.ts)

and writes, in <out>:

  study/head@8.png    the head lifted out, at 8x
  study/his@8.png     his head there, at 8x

and, with a third argument, the game's module (src/sprite/headArt.ts): the head as a PaintedPiece
whose pivot is the cell on our face anchor (the near eye's lash row, two columns before the eye),
and the base skin he painted it in. The same picture always gives the same bytes. Run with
python3 -I:

  python3 -I tools/refs/aiden-head-from-ref.py docs/reference/aiden-owner-reference.jpg <out> src/sprite/headArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np

import aiden_ref as R

# The head, cell by cell, in his pixels from (MAP_X, MAP_Y):
#   H  his pixel (skin or line), kept as he painted it
#   e  one of his features over the face (brow and lash row, eye, a lock of hair, the sideburn):
#      his skin carried down from the pixel above
#   m  his mouth: his skin carried up from the pixel below
#   s  the skull under his hair: his base skin, his cheek shadow next to the line at the sides
#   o  the skull's outline under his hair: his black line
# The skull is our male head's outline (from our skull's top row down to the ear; the row above his
# hair's top gap is left out), so it lies inside his hair and under every hairstyle of ours.
MAP_X, MAP_Y = 40, 7
MAP = [
    '......oooooooo......',  # 7
    '....oossssssssoo....',  # 8
    '...osssssssssssso...',  # 9
    '..osssssssssssssso..',  # 10
    '..osssssssssssssso..',  # 11
    '.osssssssssssssssso.',  # 12
    '.osssssssssssssssso.',  # 13
    '.osssssssssssssssso.',  # 14
    '.osssssssssssssssso.',  # 15
    '.osssssssssHHssssso.',  # 16  his forehead between the bangs
    '.ossssssssHHHHsssso.',  # 17
    '.ossHHssssHHHHsssHH.',  # 18  the top of his ear; his temple and its line on the far side
    '.osHHHHeeHeeeHeeHeo.',  # 19  his ear; brow row, the lock over the nose bridge
    '.osHHHHeHeeeeeeHeeH.',  # 20  the lash row
    '..oHHHHeHHeeeHHHeeH.',  # 21  the eyes
    '...oHHHeHHHHHHHHHHH.',  # 22  the ear lobe; the sideburn in front of it
    '....HHHHHHHHHHHHHHH.',  # 23  under the ear his jaw line starts
    '......HHHHHHHHHHHHH.',  # 24  his nose shadow
    '.......HHHHHHmmmHH..',  # 25  his mouth
    '........HHHHHHHHHH..',  # 26
    '.........HHHHHHHH...',  # 27
    '..........HHHHHH....',  # 28  his chin
]
# Our face anchor (the cell the template's columns and rows start from) in his pixels: the template
# puts the near eye one column right of it, so its lash row lands on his brow row and its iris on his.
ANCHOR = (48, 19)
# His colours that the filled parts take: his cheek shadow (the band along his near cheek) and his
# black line (behind his ear). His base skin is the colour most of his face is painted in.
SHADOW_AT = (48, 21)
LINE_AT = (43, 19)


def head(a):
    """The head's mask and colours, in his pixels."""
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

    # His features: his skin carried over them, from above (the mouth from below), row by row.
    for y in range(MAP_Y, MAP_Y + len(MAP)):
        for x in range(MAP_X, MAP_X + len(MAP[0])):
            if kind[y, x] == 'e':
                col[y, x] = col[y - 1, x]
    for y in range(MAP_Y + len(MAP) - 1, MAP_Y - 1, -1):
        for x in range(MAP_X, MAP_X + len(MAP[0])):
            if kind[y, x] == 'm':
                col[y, x] = col[y + 1, x]
    return mask, col, '#%02x%02x%02x' % tuple(int(v) for v in base)


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    mask, col, base = head(a)
    rows, origin, palette = R.pack(col, mask)

    if len(sys.argv) > 3:
        doc = ("The owner's head (the 'valiant' face shape), his pixels: his skull, ear, cheeks, jaw and chin, "
               'his skin shading and black line; the face template draws the eyes, brows and mouth on it. '
               'Its pivot is the cell on the face anchor.')
        src = [
            "// The owner's head shape, his pixels (tools/refs/aiden-head-from-ref.py from",
            '// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            "/** The skin colour he painted the head in: a player's skin moves every colour of it as far. */",
            f"export const VALIANT_SKIN = '{base}';",
            '',
            R.ts_piece('VALIANT_HEAD', doc, rows, origin, palette, ANCHOR, 0),
        ]
        tmp = sys.argv[3] + '.tmp'
        with open(tmp, 'w') as f:
            f.write('\n'.join(src))
        os.replace(tmp, sys.argv[3])

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
    print(len(rows), 'rows,', len(palette), 'colours, base', base, 'origin', origin)


if __name__ == '__main__':
    main()
