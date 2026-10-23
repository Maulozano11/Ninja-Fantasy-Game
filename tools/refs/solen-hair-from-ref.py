"""The owner's hair on his Solen (docs/reference/solen-owner-reference.jpg) as a hairstyle.

His Solen is our Solen painted over in his own pixels (tools/refs/solen_ref.py: one of his pixels is one fine
pixel of our sprites). His hair is dark slate blue and spiky: short spikes all round the crown, two standing
up from the top, locks falling over the brow to the lash row with the forehead showing between them, a long
lock between the eyes, a sideburn before the ear and locks down beside the far cheek, all in his blue-greys
with lighter steel glints, inside his black line. This script lifts it out of his pixels, as
valiant-hair-from-ref.py does his Aiden's:

  front   every pixel of his hair, as he drew it: his blue-greys and his black line (round the locks,
          between them and at the tips of the spikes), not his forehead, ear, eyes or the cowl under it.
  back    the same hair with what his face hides filled in: behind the forehead between the strands of his
          fringe and behind his ear his hair goes on (each hidden pixel takes the colour of the nearest
          strand above it, so his strands run on down). Drawn behind the head, it shows only where a head is
          narrower than his; it is also his head's outline at the top (the game trims our skull to it).

Both pivot on our face anchor (the near eye's lash start), so they frame the eyes as he drew them on every
body and in every pose. It writes the game's module (src/sprite/items/founderHairArt.ts) and, in <study>,
his head beside the hair at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/solen-hair-from-ref.py src/sprite/items/founderHairArt.ts [study]
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

# Where his hair is: from the tips of the spikes on the crown (row 4) to the locks beside the far cheek
# (row 24); the cowl starts on row 25.
BOX = (36, 3, 66, 25)  # x0, y0, x1, y1 (exclusive)
# A pixel in the middle of the crown: his hair is what joins it.
SEED = (52, 10)
# Our face anchor (the near eye's lash start) on his picture.
ANCHOR = (49, 19)
# His forehead shows between the strands of his fringe down to this row (the row above his lash row).
FOREHEAD_TO = 18
# His ear (the skin before the sideburn), rows 19-22.
EAR_BOX = (44, 19, 46, 23)
# His hair's colours: his blue-greys and steel glints (solen_ref kinds).
HAIR_KINDS = ('navy', 'steel', 'grey')
# His mid blue-grey, the lit face of most of his locks: the colour slot's default. Recoloured, every other
# colour of his hair moves the way it does (his line stays).
BASE_Q = 0.5


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native(R.REF)
    H, W, _ = a.shape
    K = R.kinds(a)
    bg = R.background(a)
    ys, xs = np.mgrid[0:H, 0:W]
    x0, y0, x1, y1 = BOX
    box = (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)
    line = box & ~bg & (K == 'line')
    blue = box & ~bg & np.isin(K, HAIR_KINDS)

    # The hair: his blue-greys joined to the crown (through his blue-greys and his line).
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

    # His line round the hair: line pixels touching his blue-greys, then the line spikes standing out past
    # them (each touching the line already taken and the white round him), then the pixels that close his
    # line between two taken ones.
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
            src = next((col[q, x] for q in range(y - 1, y0 - 1, -1) if filled[q, x] and not line[q, x] and (hair[q, x] or hidden[q, x])), None)
            if src is None:
                src = next(col[y, q] for d in range(1, W) for q in (x - d, x + d) if 0 <= q < W and hair[y, q])
            col[y, x] = src
            filled[y, x] = True
    back = front | hidden

    rows, origin, palette = R.pack(col, back)
    ox, oy = origin
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(rows)]
    lum = lambda h: 0.299 * int(h[1:3], 16) + 0.587 * int(h[3:5], 16) + 0.114 * int(h[5:7], 16)
    line_chars = ''.join(ch for ch, h in palette.items() if R.kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]) == 'line')
    # His mid colour among his own hair pixels (not those filled in behind the face).
    own = sorted((lum(R.hexc(a[y, x])), R.hexc(a[y, x])) for y, x in zip(*np.nonzero(hair)))
    base = own[int(len(own) * BASE_Q)][1]
    base = next(h for h in palette.values() if np.abs(np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]) - np.array([int(base[i:i + 2], 16) for i in (1, 3, 5)])).max() <= 3)

    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = ANCHOR[0] - ox, ANCHOR[1] - oy
    out = [
        "// The owner's hair on his Solen, his pixels (tools/refs/solen-hair-from-ref.py from",
        '// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (both parts share them). */',
        'const FOUNDER_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '']
    for name, doc, rws in (
        ('FOUNDER_HAIR_FRONT', "Every pixel of his hair, over the head: his blue-greys and his black line. Its pivot is the cell on our face anchor (the near eye's lash start).", front_rows),
        ('FOUNDER_HAIR_BACK', "His hair with what his face hides filled in (behind the forehead between the strands of his fringe, and behind his ear), drawn behind the head; also his head's outline at the top.", rows),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in rws]
        out += ['  ],', '  colors: FOUNDER_HAIR_COLORS,', '};', '']
    out += [
        '/** His black line: kept as he drew it when the hair is recoloured. */',
        f"export const FOUNDER_HAIR_LINE = '{line_chars}';",
        '',
        "/** His mid blue-grey, the lit face of most locks: the colour slot's default; his other colours follow it. */",
        f"export const FOUNDER_HAIR_BASE = '{base}';",
        '',
    ]
    if out_ts:
        R.write(out_ts, '\n'.join(out))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, {'hair': back}, {'hair': col}, ['hair'], os.path.join(study, 'hair@8.png'), (x0, y0, x1, y1 + 2), {'hair': hidden})
    print('front', int(front.sum()), 'px; back', int(back.sum()), 'px;', len(palette), 'colours; line', line_chars, 'base', base)


if __name__ == '__main__':
    main()
