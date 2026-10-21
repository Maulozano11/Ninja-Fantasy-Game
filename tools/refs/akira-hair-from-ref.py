"""The owner's spiky black hair on his Akira (docs/reference/akira-owner-reference.jpg), as the Lion Fringe.

His picture is our Akira painted over in his own pixels (tools/refs/akira_ref.py: one of his pixels is
one fine pixel of our sprites). His hair is black with blue lights: tall spikes standing up from the
crown, shaggy locks fanning out over both temples and the back of the head, a fringe of strands over
the brow with the forehead showing between them and a lock falling to the jaw before the ear, all in
his blue-blacks inside his black line. This script lifts it out of his pixels, as the Aiden hair is
lifted (tools/refs/valiant-hair-from-ref.py):

  front   every cell of his hair, as he drew it: his blue-blacks and his black line round and between
          the locks. Not his forehead, ear or face (our head shows there), nor his eyes' lash line and
          the lines of his face below the brow (FACE_BOX: our face draws them).
  back    the same hair with what his forehead hides between the strands of his fringe filled in
          (each hidden cell takes the nearest cell of his hair above it, so his strands run on down).
          Drawn behind the head it shows only where a head is narrower than ours; it is also his
          head's outline at the top (the game trims our skull to it).

It writes the game's module (src/sprite/items/lionHairArt.ts) and, with a study folder, the front, the
back (continued cells marked) and his head at 8x. The same picture always gives the same bytes. From
the repo root:

  python3 -I tools/refs/akira-hair-from-ref.py src/sprite/items/lionHairArt.ts [study]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import akira_ref as R  # noqa: E402

# Where his hair is: from the tips of the spikes (row 2) to the locks at the jaw (row 27).
BOX = (34, 1, 68, 28)  # x0, y0, x1, y1 (exclusive)
# A cell in the middle of the crown: his hair is what joins it.
SEED = (52, 12)
# Our face template's anchor (the near eye's lash start, body.ts faceAnchor) on his picture: our male
# head joint is his (53, 18), and the anchor is 3 fine pixels left of it and 1 below.
ANCHOR = (50, 19)
# His face from the lash row down (x0, y0, x1, y1, exclusive): its lines are our face's, not the hair's.
FACE_BOX = (49, 20, 59, 28)
# His black line is darker than this (luma); his darkest blue-blacks are lighter.
LINE_LUMA = 14
# His forehead shows between the strands of his fringe down to this row (the row above the lash row).
FOREHEAD_TO = 19


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    H, W, _ = a.shape
    K = R.kinds(a)
    bg = R.his_background(a, K)
    ys, xs = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = BOX
    box = (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)
    fx0, fy0, fx1, fy1 = FACE_BOX
    face = (xs >= fx0) & (xs < fx1) & (ys >= fy0) & (ys < fy1)
    # his darkest blue-blacks (the shadows between the locks) are as dark as a line by kind: a cell is
    # his line only darker than LINE_LUMA, else it is hair when blue over red
    L = R.luma(a)
    dark_blue = (K == 'line') & (L >= LINE_LUMA) & (a[..., 2] > a[..., 0])
    line = box & ~bg & (K == 'line') & ~dark_blue & ~face
    blue = box & ~bg & ((K == 'hair') | dark_blue) & ~face

    # the hair: his blue-blacks joined to the crown (through them and his line)
    hair = np.zeros((H, W), bool)
    seen = np.zeros((H, W), bool)
    stack = [(SEED[1], SEED[0])]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or seen[y, x] or not (blue[y, x] or line[y, x]):
            continue
        seen[y, x] = True
        if blue[y, x]:
            hair[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    def n4(m):
        p = np.pad(m, 1)
        return [p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]

    # his line round the hair: line cells touching it, then the line spikes standing out past them
    # (touching the line taken and the white round him), then cells closing his line between two taken
    ink = line & np.logical_or.reduce(n4(hair))
    while True:
        more = line & ~ink & np.logical_or.reduce(n4(ink)) & np.logical_or.reduce(n4(bg))
        if not more.any():
            break
        ink |= more
    ink |= line & ~ink & (np.sum(n4(ink), axis=0) >= 2)
    # his thick black between the locks: line cells inside the hair's outline that touch no colour
    for _ in range(3):
        ink |= line & ~ink & (np.sum(n4(ink | hair), axis=0) >= 3)
    front = hair | ink

    # the back: the front, and his forehead between the strands of the fringe
    hidden = np.zeros((H, W), bool)
    for y in range(y0, FOREHEAD_TO + 1):
        cols = np.nonzero(front[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    hidden &= ~bg & ~front
    col = a.copy()
    filled = front.copy()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not hidden[y, x]:
                continue
            src = next((col[q, x] for q in range(y - 1, y0 - 1, -1) if filled[q, x] and (hair[q, x] or hidden[q, x])), None)
            if src is None:
                src = next(col[y, q] for d in range(1, W) for q in (x - d, x + d) if 0 <= q < W and hair[y, q])
            col[y, x] = src
            filled[y, x] = True
    back = front | hidden

    rows, (ox, oy), palette = R.pack(col, back)
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(rows)]
    line_chars = ''.join(ch for ch, h in palette.items() if R.hex_luma(h) < LINE_LUMA)
    lights = sorted((R.hex_luma(h), h) for ch, h in palette.items() if ch not in line_chars)
    # his mid blue-black, the face of most of his locks: the colour slot's default; recoloured, every
    # other colour of his hair (not his line) moves the way it does
    counts = {}
    for y, x in zip(*np.nonzero(hair & (K == 'hair'))):
        h = R.hexc(a[y, x])
        counts[h] = counts.get(h, 0) + 1
    order = sorted(((R.hex_luma(h), h) for h in counts for _ in range(counts[h])))
    base = order[len(order) // 2][1]
    base = min(palette.values(), key=lambda h: sum(abs(p - q) for p, q in zip(R.rgb(h), R.rgb(base))))
    assert lights
    if out:
        write_ts(out, rows, front_rows, palette, (ANCHOR[0] - ox, ANCHOR[1] - oy), line_chars, base)
    if study:
        os.makedirs(study, exist_ok=True)

        def rgba(rws, mark=None):
            im = np.zeros((H, W, 4), np.uint8)
            for j, rw in enumerate(rws):
                for i, ch in enumerate(rw):
                    if ch != '.':
                        im[oy + j, ox + i] = R.rgb(palette[ch]) + [255]
                        if mark is not None and mark[oy + j, ox + i] and (i + j) % 2:
                            im[oy + j, ox + i] = [0, 200, 255, 255]
            return im[y0:y1, x0:x1]

        R.save(rgba(front_rows), os.path.join(study, 'hair@8.png'))
        R.save(rgba(rows, hidden), os.path.join(study, 'back@8.png'))
        R.save(a[y0:y1, x0:x1], os.path.join(study, 'his@8.png'))
    print('front', int(front.sum()), 'px; back', int(back.sum()), 'px;', len(palette), 'colours; base', base)


def write_ts(path, rows, front_rows, palette, pivot, line_chars, base):
    import re

    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [
        "// The owner's hair on his Akira, his pixels (tools/refs/akira-hair-from-ref.py from",
        '// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (both parts share them). */',
        'const LION_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '']
    for part, name, doc in (
        (front_rows, 'LION_HAIR_FRONT', "Every cell of his hair, over the head: his blue-blacks and his black line. Its pivot is the cell on our face anchor (the near eye's lash start)."),
        (rows, 'LION_HAIR_BACK', 'His hair with what his forehead hides between the strands of the fringe filled in, drawn behind the head; also his head\'s outline at the top.'),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{pivot[0]}, {pivot[1]}],', '  rows: [']
        out += [f"    '{rw}'," for rw in part]
        out += ['  ],', '  colors: LION_HAIR_COLORS,', '};', '']
    out += [
        '/** His black line: kept as he drew it when the hair is recoloured. */',
        f"export const LION_HAIR_LINE = '{line_chars}';",
        '',
        "/** His mid blue-black, the face of most locks: the colour slot's default; his other colours follow it. */",
        f"export const LION_HAIR_BASE = '{base}';",
        '',
    ]
    R.write(path, '\n'.join(out))


if __name__ == '__main__':
    main()
