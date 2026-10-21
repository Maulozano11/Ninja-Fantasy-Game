"""The owner's hair on his Aiden (docs/reference/aiden-owner-reference.jpg) as a hairstyle.

His picture is our Aiden painted over in his own pixels (aiden_ref.py: one of his pixels is one fine
pixel of our sprites). His hair is brown and spiky: two spikes standing up from the crown, locks
fanning out over the back of the head and the far temple, a fringe of strands over the brow with the
forehead showing between them, a lock falling between the eyes, a sideburn lock in front of the ear
and a tuft at the nape, all in his browns inside his black line. This script lifts it out of his
pixels:

  front   every pixel of his hair, as he drew it: his browns and his black line (the line round the
          locks, between them, and round the ear they frame). Not his forehead, ear or eyes, nor the
          short brown brow over his near eye (apart from the hair; our face draws the brows): where
          his picture shows skin, our head shows.
  back    the same hair with what his face hides filled in: behind the forehead between the strands
          of his fringe and behind his ear, his hair goes on (each hidden pixel takes the brown of the
          nearest strand above it, so his strands run on down). Drawn behind the head, it shows only
          where a head is narrower than ours; it is also his head's outline at the top (the game
          trims our skull to it).

and writes, in <out>:

  hair.json             rows and palette (one character per colour of his, shared by both parts),
                        the pivot (where our face template's anchor goes: the near eye's lash start),
                        his black line's characters and his base brown
  study/hair@8.png      the front lifted out, at 8x
  study/back@8.png      the back, with the filled-in pixels marked
  study/his@8.png       his head there, at 8x

and, with a third argument, the game's module (src/sprite/items/valiantHairArt.ts). The same picture
always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/valiant-hair-from-ref.py <out> [src/sprite/items/valiantHairArt.ts]
"""

import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aiden_ref as R  # noqa: E402

# Where his hair is: from the tips of the two spikes on the crown (row 5) to the tuft at the nape
# (row 24); his collar starts on row 25.
BOX = (36, 3, 66, 25)  # x0, y0, x1, y1 (exclusive)
# A pixel in the middle of the crown: his hair is what joins it.
SEED = (50, 10)
# Our face template's anchor (the near eye's lash start, body.ts faceAnchor) on his picture: our
# male head joint is his (51, 18), and the anchor is 3 fine pixels left of it and 1 below.
ANCHOR = (48, 19)
# His forehead shows between the strands of his fringe down to this row (the row above his eyes).
FOREHEAD_TO = 19
# His ear, framed by the sideburn lock: the skin left of it, rows 19-23.
EAR_BOX = (43, 19, 47, 24)
# His black line: darker than this (luma). His darkest browns, between the locks, are lighter.
LINE_LUMA = 24
# His mid brown, the lit face of most of his locks: the colour slot's default. Recoloured, every other
# brown of his moves the way it does (his line stays).
BASE = '#76391b'


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native()
    H, W, _ = a.shape
    bg = R.background(a)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = R.luma(a)
    ys, xs = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = BOX
    box = (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)

    # His black line: near-black, warm or neutral (the lashes of his eyes are a cold navy-black).
    line = box & ~bg & (L < LINE_LUMA) & (r >= b)
    # His browns: red over green over blue, the blue low against the red (his skin, even in its
    # shadows, keeps more blue: c77562, 864034), the green not under the blue (his red irises).
    brown = box & ~bg & ~line & (r >= 0x30) & (r < 0xc8) & (b < 0.37 * r) & (g + 2 >= b)

    # The hair: his browns joined to the crown (through his browns and his line).
    hair = np.zeros((H, W), bool)
    seen = np.zeros((H, W), bool)
    stack = [(SEED[1], SEED[0])]
    while stack:
        y, x = stack.pop()
        if seen[y, x] or not (brown[y, x] or line[y, x]):
            continue
        seen[y, x] = True
        if brown[y, x]:
            hair[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    def n4(m):
        p = np.pad(m, 1)
        return [p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]

    # His line round the hair: line pixels touching his browns, then the line spikes standing out
    # past them (each touching the line already taken and the white around him), then the pixels
    # that close his line between two taken ones (under the ear).
    ink = line & np.logical_or.reduce(n4(hair))
    while True:
        more = line & ~ink & np.logical_or.reduce(n4(ink)) & np.logical_or.reduce(n4(bg))
        if not more.any():
            break
        ink |= more
    ink |= line & ~ink & (np.sum(n4(ink), axis=0) >= 2)
    front = hair | ink

    # The back: the front, and what his face hides behind the fringe and the ear.
    hidden = np.zeros((H, W), bool)
    for y in range(y0, FOREHEAD_TO + 1):
        cols = np.nonzero(front[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    ex0, ey0, ex1, ey1 = EAR_BOX
    hidden[ey0:ey1, ex0:ex1] = True
    hidden &= ~bg & ~front
    col = a.copy()
    filled = front.copy()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not hidden[y, x]:
                continue
            # the nearest of his browns above it (his strands run on down), else beside it
            src = next((col[q, x] for q in range(y - 1, y0 - 1, -1) if filled[q, x] and not line[q, x] and (hair[q, x] or hidden[q, x])), None)
            if src is None:
                src = next(col[y, q] for d in range(1, W) for q in (x - d, x + d) if 0 <= q < W and hair[y, q])
            col[y, x] = src
            filled[y, x] = True
    back = front | hidden

    rows, origin, palette = R.pack(col, back)
    ox, oy = origin
    grid = [list(rw) for rw in rows]
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(grid)]
    # His black line keeps its colour when the hair is recoloured; his browns follow the base.
    lum = lambda h: 0.299 * int(h[1:3], 16) + 0.587 * int(h[3:5], 16) + 0.114 * int(h[5:7], 16)
    line_chars = ''.join(ch for ch, h in palette.items() if lum(h) < LINE_LUMA)
    assert BASE in palette.values(), 'the base brown is not one of his colours'
    meta = {
        'source': R.REF,
        'origin': [ox, oy],
        'pivot': [ANCHOR[0] - ox, ANCHOR[1] - oy],
        'front': front_rows,
        'back': rows,
        'palette': palette,
        'line': line_chars,
        'base': BASE,
    }
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    def rgba(rws, mark=None):
        im = np.zeros((H, W, 4), np.uint8)
        for j, rw in enumerate(rws):
            for i, ch in enumerate(rw):
                if ch != '.':
                    h = palette[ch]
                    im[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]
                    if mark is not None and mark[oy + j, ox + i] and (i + j) % 2:
                        im[oy + j, ox + i] = [0, 200, 255, 255]
        return im[y0:y1, x0:x1]

    R.save(rgba(front_rows), os.path.join(out, 'study', 'hair@8.png'))
    R.save(rgba(rows, hidden), os.path.join(out, 'study', 'back@8.png'))
    R.save(a[y0:y1 + 2, x0:x1], os.path.join(out, 'study', 'his@8.png'))
    print('front', int(front.sum()), 'px; back', int(back.sum()), 'px;', len(palette), 'colours; line', line_chars)


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/valiantHairArt.ts)."""
    import re

    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = meta['pivot']
    out = [
        "// The owner's hair on his Aiden, his pixels (tools/refs/valiant-hair-from-ref.py from",
        '// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
    ]
    for part, name, doc in (
        ('front', 'VALIANT_HAIR_FRONT', 'Every pixel of his hair, over the head: his browns and his black line. Its pivot is the cell on our face anchor (the near eye\'s lash start).'),
        ('back', 'VALIANT_HAIR_BACK', 'His hair with what his face hides filled in (behind the forehead between the strands of his fringe, and behind his ear), drawn behind the head; also his head\'s outline at the top.'),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]]
        out += ['  ],', '  colors: VALIANT_HAIR_COLORS,', '};', '']
    pal = ['/** One character per colour of his (both parts share them). */', 'const VALIANT_HAIR_COLORS: Record<string, string> = {']
    pal += [f"  {key(k)}: '{v}'," for k, v in meta['palette'].items()]
    pal += ['};', '']
    out[5:5] = pal
    out += [
        "/** His black line: kept as he drew it when the hair is recoloured. */",
        f"export const VALIANT_HAIR_LINE = '{meta['line']}';",
        '',
        "/** His mid brown, the lit face of most locks: the colour slot's default; his other browns follow it. */",
        f"export const VALIANT_HAIR_BASE = '{meta['base']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
