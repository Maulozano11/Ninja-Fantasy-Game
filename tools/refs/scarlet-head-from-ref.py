"""The owner's Scarlet's head (docs/reference/scarlet-owner-reference.jpg) as the 'noble' face shape.

His picture is his own pixel art at 1.8 of his pixels to one of ours (tools/refs/scarlet_ref.py), so
his face is not lifted 1:1 as Aiden's was: it is lifted out of the reduced reference
(scarlet_ref.reduced(), tools/refs/scarlet-study.py), where his head is brought down to 0.68 with his
eyes on ours, in his colours. His face is not one of ours: it comes to a small pointed chin a row
below our chin (ours ends in a flat chin line six pixels wide), drawn in his browns with no black line
under it, his temple and far cheek run a column wider than our face at his eyes, and his skin is
shaded in his own warm tones (#f8d4b8 lit, #f2c8aa, #eabb9d, #e2af8c ... down to #512619 on his jaw
line), not in our skin ramp's. So the head is his, as the 'valiant' head is Aiden's:

  H  his pixel (skin, the lines of his jaw and chin, his smile, the dark line of his far edge),
     kept as he drew it: his face below the eyes, his far temple and the forehead between his bangs
  his eyes   the 'noble' eye shape draws them (src/sprite/nobleEyeArt.ts, tools/refs/scarlet-eyes-from-ref.py);
     here his skin is under them: his lid's #f2c8aa over the lash and under it, his #f8d4b8 under
     the white and iris, his far cheek's shades under the far eye, so another eye shape (or his eye
     shut or lowered) shows his skin round it
  his hair   covers his skull, his near cheek and the bridge of his nose: there the head is
     continued in his skin in our male skull's outline (so every hairstyle, his and ours, covers it
     as it covers our head) and in our tapered cheek's outline down to his jaw: his #f8d4b8 in the
     skull and the upper cheek, the cheek under the cheekbone in #f2c8aa as his face is next to his
     bangs, his #e2af8c along the line, his far edge's #0f0407 for the line
  his mouth  his small closed smile (a #9e654b pixel, a #be8867 one beside it) is his pixels: our face
     template has no mouth options (its mouth is part of the template), so his smile comes with his
     face, and the template draws no mouth on it

The cells are written below in our 256 x 256 frame at idle frame 0 (MAP: 'H' his pixel, '.' none,
any other character the colour of his it names in scarlet_ref.CHARS). It writes, in <out>:

  head@8.png      the head lifted out, at 8x
  reduced@8.png   the reduced reference there, at 8x
  his@8.png       his own pixels of his face, at 8x

and, with a third argument, the game's module (src/sprite/nobleHeadArt.ts): the head as a
PaintedPiece whose pivot is the cell on our face anchor (the template's first column on its lash
row), and the skin he drew it in. The same picture always gives the same bytes. Run from the
repository root with python3 -I:

  python3 -I tools/refs/scarlet-head-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/nobleHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import scarlet_ref as R  # noqa: E402

# Our face anchor at idle frame 0 (src/sprite/body.ts faceAnchor: the template's first column, its
# lash row), from our head joint and the male head's scale: (123, 139).
HEAD_SCALE = 0.78
ANCHOR = (int(np.floor(R.OUR_JOINTS['head'][0] - 3.8 * HEAD_SCALE)), int(np.floor(R.OUR_JOINTS['head'][1] + 2 * HEAD_SCALE)))
# The head, cell by cell, from (MAP_X, MAP_Y). Rows 126-138 are our male skull's outline (his hair
# covers his); from 135 his far temple runs a column, then two, wider than ours, as he drew it. From
# 139 (the anchor's row) the face: his line over the lash and his lash (the eye shape's), his eyes
# (rows 141-142), his cheeks, his smile (146), his jaw and chin (146-149).
MAP_X, MAP_Y = 114, 126
MAP = [
    '.......bbbbbbbb.........',  # 126  the skull's top
    '......b66666666b........',  # 127
    '....bb6666666666b.......',  # 128
    '....b666666666666b......',  # 129
    '...b66666666666666b.....',  # 130
    '..bZ66666666666666b.....',  # 131
    '..bZ66666666666666Zb....',  # 132
    '..bZ66666666666666Zb....',  # 133
    '..bZ66666666666666Zb....',  # 134
    '..bZ66666666666666HHb...',  # 135  his far temple between his locks
    '..bZ66666666666666HHb...',  # 136
    '..bZ6666666666H666HHHb..',  # 137  his forehead between his bangs; his temple
    '..bZ666666666HH666HHHb..',  # 138
    '..bZ66666664444444HH4H..',  # 139  his line over the lash is the eye shape's: his lid under it
    '..bZZ666664444446H444H..',  # 140  his lash is the eye shape's: his lid under it
    '...bZ666666H666HHH42XH..',  # 141  his eyes are the eye shape's: his skin under them
    '....bZ666664H66HHHHHHH..',  # 142
    '.....bZ44444HHHHHHHHHH..',  # 143  his cheeks; his near cheek under his bangs
    '......bZ444HHHHHHHHHH...',  # 144
    '.......bZ44HHHHHHHHHH...',  # 145
    '........bHHHHHHHHHHHb...',  # 146  his smile; his jaw line from here down to his chin
    '.........HHHHHHHHHHH....',  # 147
    '.........HHHHHHHHHH.....',  # 148
    '...........HHHHHHH......',  # 149  his chin
]
# The skin he drew his face in: the lit colour of most of it (his preset's skin).
SKIN = '#f8d4b8'


def head():
    """The head's colours in our frame (None where it is empty)."""
    idx = R.reduced_index()
    out = {}
    for j, row in enumerate(MAP):
        for i, ch in enumerate(row):
            x, y = MAP_X + i, MAP_Y + j
            if ch == '.':
                continue
            if ch == 'H':
                k = int(idx[y, x])
                assert k < len(R.PALETTE), (x, y)
                out[(x, y)] = R.PALETTE[k]
            else:
                out[(x, y)] = R.PALETTE[R.CHARS.index(ch)]
    return out


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    px = head()
    assert SKIN in R.PALETTE
    H, W = len(MAP), len(MAP[0])
    col = np.zeros((H, W, 3), np.int32)
    mask = np.zeros((H, W), bool)
    for (x, y), h in px.items():
        col[y - MAP_Y, x - MAP_X] = rgb(h)
        mask[y - MAP_Y, x - MAP_X] = True
    rows, origin, palette = R.pack(col, mask)

    if len(sys.argv) > 3:
        doc = ("The owner's Scarlet's head (the 'noble' face shape), his colours: his face, its warm "
               'shading, his smile, his jaw line and pointed chin, his far temple; his skull and near '
               'cheek (under his hair) in our tapered head\'s outline. The eye shape draws the eyes on it. '
               'Its pivot is the cell on the face anchor.')
        src = [
            "// The owner's Scarlet's head, his colours (tools/refs/scarlet-head-from-ref.py from",
            '// docs/reference/scarlet-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            "/** The skin colour he drew the head in: a player's skin moves every colour of it as far. */",
            f"export const NOBLE_SKIN = '{SKIN}';",
            '',
            R.ts_piece('NOBLE_HEAD', doc, rows, origin, palette, (ANCHOR[0] - MAP_X, ANCHOR[1] - MAP_Y), 0),
        ]
        tmp = sys.argv[3] + '.tmp'
        with open(tmp, 'w') as f:
            f.write('\n'.join(src))
        os.replace(tmp, sys.argv[3])

    # The study: the head (white where it is empty) and the reduced reference there.
    sheet = np.full((H + 2, W + 2, 3), 200, np.int32)
    sheet[1:-1, 1:-1] = np.where(mask[..., None], col, 255)
    R.save(sheet, os.path.join(out, 'head@8.png'))
    red = R.reduced()[MAP_Y - 1:MAP_Y + H + 1, MAP_X - 1:MAP_X + W + 1]
    R.save(np.where(red[..., 3:4] > 0, red[..., :3], 200), os.path.join(out, 'reduced@8.png'))
    a = R.native(ref)
    ex, ey = R.EYES['near']
    R.save(a[int(ey) - 12:int(ey) + 14, int(ex) - 10:int(R.EYES['far'][0]) + 8], os.path.join(out, 'his@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, anchor', ANCHOR, 'origin', (origin[0] + MAP_X, origin[1] + MAP_Y))


if __name__ == '__main__':
    main()
