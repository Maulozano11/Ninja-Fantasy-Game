"""The owner's Scarlet's head (docs/reference/scarlet-owner-reference.jpg) as the 'noble' face shape.

Since 2026-10-23 his head is the reference painted at our scale (tools/refs/scarlet_standard.py face()):
the owner's Roman face, the male face standard (roman-head-from-ref.py, his pixels), in Scarlet's skin, his
mouth his own, the eyes drawn by the 'noble' eye shape. This script writes it as it stands there (head()).
What follows describes the first version, lifted out of the reduction.

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
import scarlet_standard as STD  # noqa: E402

# Our face anchor at idle frame 0 (src/sprite/body.ts faceAnchor: the template's first column, its
# lash row), from our head joint and the male head's scale: (123, 139).
HEAD_SCALE = 0.78
ANCHOR = (int(np.floor(R.OUR_JOINTS['head'][0] - 3.8 * HEAD_SCALE)), int(np.floor(R.OUR_JOINTS['head'][1] + 2 * HEAD_SCALE)))
# The box of our frame the head is written from (x, y, width, height): the skull, the face and the chin.
MAP_X, MAP_Y, MAP_W, MAP_H = 112, 124, 26, 28
# The skin he drew his face in: the lit colour of most of it (his preset's skin).
SKIN = '#f8d4b8'


def head():
    """The head's colours in our frame: his face as scarlet_standard paints it."""
    lay = STD.face()
    return {(int(x), int(y)): R.PALETTE[lay[y, x]] for y, x in zip(*np.nonzero(lay != 255))}


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    px = head()
    assert SKIN in R.PALETTE
    H, W = MAP_H, MAP_W
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
