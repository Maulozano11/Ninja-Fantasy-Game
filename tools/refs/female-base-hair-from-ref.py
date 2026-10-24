"""The hair of the owner's bare female body -> src/sprite/items/baseHairArt.ts.

His bare female body (docs/reference/female-base-owner-reference.jpg, see female_base_ref.py) wears
her black hair in a messy ponytail: a mass of tufts over the crown, the tail tied high at the back, a
fringe swept to the far side over the far eye, a lock hanging before the near cheek. Every pixel of it
here is his, for the creator's hair option (items/hair.ts, 'hair_messy_ponytail'):

- HAIR: his hair pixels (his black line and greys), cut from his face: over the head every non-skin
  pixel above the brow; down the near side the lock before the cheek (left of the ear and the cheek);
  down the far side the hair beside the far eye. His near eye, his face's line round the jaw and
  chin, his ear and his skin are not hair.
- SKULL: his hair with his face filled in (everything of his head above the eyes): the head under it
  is trimmed to it, so no edge of our skull shows past his hair (items/hair.ts trimSkull).

Both ride the face anchor as he drew them: our female face anchor at idle frame 0 is his pixel
(50, 19) (body.ts faceAnchor: the near eye's lash column and row of our template), so at rest his hair
sits on our head where it sits on his.

Run from the repo root:
    python3 -I tools/refs/female-base-hair-from-ref.py
Generated output says so: rerun the script to change it, never edit the module.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import female_base_ref as R  # noqa: E402

OUT = os.path.join(R.REPO, 'src', 'sprite', 'items', 'baseHairArt.ts')
N = R.native()
BG = R.background(N)
IDX, COLS = R.palette(N, BG)
# Our female face anchor at idle frame 0, in his pixels.
ANCHOR = (50, 19)


def lum(i):
    return float(R.luma(R.hex_rgb(COLS[i]).astype(float)))


def warm(i):
    r, g, b = R.hex_rgb(COLS[i])
    return r - b > 40


def is_hair(x, y):
    """His hair: dark and cool (his greys and line), in the parts of the head he covers with it."""
    if BG[y, x] or warm(IDX[y, x]) or lum(IDX[y, x]) > 110:
        return False
    if y <= 14:
        return True                      # the crown, the tail and the fringe
    if 16 <= y <= 18 and 50 <= x <= 54:
        return False                     # his near eye
    if y <= 21 and x <= 49:
        return True                      # the tail's ends and the lock before the near cheek
    if y <= 18 and x >= 55:
        return True                      # the fringe over the far eye
    if y <= 20 and x >= 60:
        return True                      # its ends beside the far cheek
    if 22 <= y <= 25 and 46 <= x <= 49:
        return True                      # the lock's tip
    return False


HAIR = {(x, y) for y in range(0, 26) for x in range(R.CELLS) if is_hair(x, y)}
# The head above the eyes: his hair and what it frames (forehead, the ear, the near eye's lid).
FACE = {(x, y) for y in range(0, 19) for x in range(R.CELLS) if not BG[y, x]}
SKULL = HAIR | FACE

CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def rows_of(px, keys, fill=None):
    xs = [q[0] for q in px]
    ys = [q[1] for q in px]
    x0, y0 = min(xs), min(ys)
    out = []
    for y in range(y0, max(ys) + 1):
        out.append(''.join((keys[IDX[y, x]] if fill is None else fill) if (x, y) in px else '.' for x in range(x0, max(xs) + 1)))
    return out, (ANCHOR[0] - x0, ANCHOR[1] - y0)


def main():
    used = sorted({IDX[y, x] for x, y in HAIR}, key=lambda i: (-sum(1 for q in HAIR if IDX[q[1], q[0]] == i), COLS[i]))
    keys = {i: CHARS[k] for k, i in enumerate(used)}
    hair_rows, pivot = rows_of(HAIR, keys)
    skull_rows, skull_pivot = rows_of(SKULL, keys, 'a')
    line = ''.join(keys[i] for i in used if lum(i) < 22)
    base = COLS[used[[lum(i) >= 22 for i in used].index(True)]]
    q = lambda s: "'" + s + "'"
    out = ['// The hair of the owner\'s bare female body, his pixels (tools/refs/female-base-hair-from-ref.py from',
           '// docs/reference/female-base-owner-reference.jpg). Generated: rerun the script to change it.',
           '',
           "import type { PaintedPart } from './capeArt';",
           '',
           '/** His messy ponytail over the head, its pivot on the face anchor (the near eye\'s lash column and row). */',
           'export const BASE_HAIR: PaintedPart = {',
           f'  pivot: [{pivot[0]}, {pivot[1]}],',
           '  rows: [']
    out += [f'    {q(r)},' for r in hair_rows]
    out += ['  ],', '  colors: {']
    out += [f"    {keys[i]}: '{COLS[i]}'," for i in used]
    out += ['  },', '};', '',
            '/** His head above the eyes (his hair and what it frames): our skull is trimmed to it. */',
            'export const BASE_HAIR_SKULL: PaintedPart = {',
            f'  pivot: [{skull_pivot[0]}, {skull_pivot[1]}],',
            '  rows: [']
    out += [f'    {q(r)},' for r in skull_rows]
    out += ['  ],', "  colors: { a: '#000000' },", '};', '',
            '/** His line\'s characters (never recoloured) and his main grey (the hair colour slot moves it). */',
            f"export const BASE_HAIR_LINE = '{line}';",
            f"export const BASE_HAIR_BASE = '{base}';",
            '']
    open(OUT, 'w').write('\n'.join(out))
    print('wrote', os.path.relpath(OUT, R.REPO), len(HAIR), 'hair pixels', len(used), 'colours')


if __name__ == '__main__':
    main()
