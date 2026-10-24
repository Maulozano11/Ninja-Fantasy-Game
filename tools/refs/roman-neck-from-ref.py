"""The owner's neck from his Roman paint-over (docs/reference/roman-owner-reference.jpg), under his 'roman' face.

The owner asked for it on 2026-10-23, seeing his Roman look in the game with our head: "porque no tenemos
la forma de cabeza y cuello de romano en el juego ? cambialo inmediatamente me gusta mas el de mi dibujo".
He painted the head HEAD_UP pixels higher than ours (tools/refs/roman-head-from-ref.py) on a longer neck:
under his chin's black line his neck shows down to the cuirass's collar, lit on the near side and in his
darker red in the shadow under the jaw. The game raises the head on the male bodies under his face
(src/sprite/romanNeck.ts), and this is the neck it shows there: his skin pixels between his face and the
collar, every one as he painted it, cell by cell:

  his neck     his skin below the face piece (the head's cells) and above the cuirass's collar line, not his
               hair, nor the cuirass's or the shoulder guard's pixels (tools/refs/roman_ref.py pieces)
  continued    below his last row, where the collar hides it, each column of the neck goes on down in his
               lowest pixel of that column, between his black line on both sides (NECK_MORE rows), so that
               where a pose lifts the head off the collar the neck goes on in his pixels

The neck rides the head (its pivot is the cell of his on our face anchor, as the face's is), and the game
draws it only above the neck joint, where the collar is: so at rest every pixel is where he drew it.

It writes, in <out>:

  study/neck@8.png    the neck lifted out (the continued rows marked), at 8x
  study/his@8.png     his head and collar there, at 8x

and, with a third argument, the game's module (src/sprite/romanNeckArt.ts). The same picture always gives
the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/roman-neck-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanNeckArt.ts
"""

import importlib.util
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402


def _script(name):
    """One of the sibling scripts (their file names have dashes), for its cell maps."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), name)
    spec = importlib.util.spec_from_file_location(name.replace('-', '_')[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


HEAD = _script('roman-head-from-ref.py')

# Where his neck is: between his face (the head's cells, down to row 25) and the collar line (row 28).
REGION = [(44, 20), (60, 20), (60, 28), (44, 28)]
# How many rows the neck goes on below his last row, behind the collar.
NECK_MORE = 6


def neck(a):
    """The neck's mask and colours, in his pixels, and the mask of the rows continued."""
    H, W, _ = a.shape
    bg = R.background(a) | (R.luma(a) > 225)
    K = np.array([[R.kind(a[y, x]) for x in range(W)] for y in range(H)])
    masks, _cols = R.pieces(a)
    owned = np.zeros((H, W), bool)
    for m in masks.values():
        owned |= m
    head = np.zeros((H, W), bool)
    for j, row in enumerate(HEAD.MAP):
        for i, ch in enumerate(row):
            if ch != '.':
                head[HEAD.MAP_Y + j, HEAD.MAP_X + i] = True
    mask = R.inside(REGION, H, W) & ~bg & ~owned & ~head & (K == 'skin')
    col = a.copy()

    # Below his last row: each column in his lowest pixel of it, his black line on both sides.
    line = R.his_line(a)
    ys, xs = np.nonzero(mask)
    last = int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    more = np.zeros((H, W), bool)
    for y in range(last + 1, last + 1 + NECK_MORE):
        for x in range(x0 - 1, x1 + 2):
            more[y, x] = True
            if x < x0 or x > x1:
                col[y, x] = line
            else:
                low = int(np.nonzero(mask[:, x])[0].max())
                col[y, x] = a[low, x]
    return mask | more, col, more


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    mask, col, more = neck(a)
    rows, origin, palette = R.pack(col, mask)

    if len(sys.argv) > 3:
        doc = ("The owner's neck under his Roman face, his pixels: his skin between his chin and the cuirass's collar, "
               'and below it each column going on in his lowest pixel between his black line. Its pivot is the cell on '
               'the face anchor (it rides the head, as the face does); the game draws it above the neck joint only.')
        src = [
            "// The owner's Roman neck, his pixels (tools/refs/roman-neck-from-ref.py from",
            '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            R.ts_piece('ROMAN_NECK', doc, rows, origin, palette, HEAD.ANCHOR, 0),
        ]
        R.write(sys.argv[3], '\n'.join(src))

    rgba = np.zeros(a.shape[:2] + (4,), np.uint8)
    ox, oy = origin
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                h = palette[ch]
                rgba[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
                if more[oy + j, ox + i] and (i + j) % 2:
                    rgba[oy + j, ox + i] = [0, 200, 255, 255]
    box = (slice(16, 36), slice(40, 64))
    R.save(rgba[box], os.path.join(out, 'study', 'neck@8.png'))
    R.save(a[box], os.path.join(out, 'study', 'his@8.png'))
    print(int((mask & ~more).sum()), 'of his pixels,', int(more.sum()), 'continued;', len(palette), 'colours, origin', origin)


if __name__ == '__main__':
    main()
