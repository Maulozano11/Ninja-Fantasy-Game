"""The owner's spiky brown hair from his Renegade picture (docs/reference/renegade-owner-reference.jpg), as
the Short Crop (hair_crop), the hair Renegado 2 wears.

His picture is our Renegado 2 painted over in his own pixels (tools/refs/renegade_ref.py: one of his pixels
is one fine pixel of our sprites). His hair stands up in short spikes all over the crown, with a shaved
side over the near temple (his browns over his skin), a few dark strands over the forehead and his brows
over the eyes. This script lifts it out of his pixels (SEG letter 'h'):

  front   every pixel of his hair as he drew it: his browns, the shaved side, his brows and his black
          line round them. Not his forehead, ear or eyes: there our face shows.
  back    the same hair with what his face hides filled in (behind the forehead, above our face
          anchor's row), each hidden pixel taking the colour of his nearest hair above it. Drawn behind
          the head, it is his head's outline at the top (the game trims our skull to it).

Both are stamped with their pivot on our face anchor (the near eye's lash start), like the owner's hair
on Aiden (src/sprite/items/hair.ts paintedHair). It writes src/sprite/items/renegadeHairArt.ts and, in
<study>, his head beside the hair at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/renegade-hair-from-ref.py src/sprite/items/renegadeHairArt.ts [study]
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import renegade_ref as R  # noqa: E402

DOC = (
    "// The owner's spiky hair on his Renegade, his pixels (tools/refs/renegade-hair-from-ref.py from\n"
    '// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    H, W, _ = a.shape
    masks, line = R.pieces(a)
    front = masks['h']
    seg = R.seg_grid((H, W))
    # Behind his face above our anchor's row, his hair goes on: the face's own pixels there and the line
    # round them (everything of his head above that row is hair or face).
    hidden = ((seg == 'e') | line) & ~front
    hidden[R.ANCHOR[1]:] = False
    col = a.copy()
    hair = front & ~line
    for y, x in zip(*np.nonzero(hidden)):
        if line[y, x]:
            continue  # his line round the face stays his line
        src = next((q for q in range(y - 1, -1, -1) if hair[q, x]), None)
        if src is not None:
            col[y, x] = a[src, x]
        else:
            q = min(np.nonzero(hair[y])[0], key=lambda q: (abs(q - x), q))
            col[y, x] = a[y, q]
    back = front | hidden

    rows, origin, palette = R.pack(col, back)
    ox, oy = origin
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(rows)]
    base = R.base(a, {'h': hair}, 'h', ('hair',))
    line_chars = ''.join(ch for ch, h in palette.items() if R.luma(np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], float)) < R.LINE_LUMA)
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = R.ANCHOR[0] - ox, R.ANCHOR[1] - oy
    text = [DOC, "import type { PaintedPart } from './capeArt';", '']
    text.append('/** His mid brown, the lit face of most of his spikes: recoloured, every other brown of his moves the way it does. */')
    text.append(f"export const RENEGADE_HAIR_BASE = '{base}';")
    text.append('')
    text.append("/** His black line's characters: they keep their colour when the hair is recoloured. */")
    text.append(f"export const RENEGADE_HAIR_LINE = '{line_chars}';")
    text.append('')
    text += ['/** One character per colour of his (both parts share them). */', 'const RENEGADE_HAIR_COLORS: Record<string, string> = {']
    text += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    text += ['};', '']
    for part, name, doc in (
        (front_rows, 'RENEGADE_HAIR_FRONT', "Every pixel of his hair, over the head: his spikes, the shaved side, his brows and his black line. Its pivot is the cell on our face anchor (the near eye's lash start)."),
        (rows, 'RENEGADE_HAIR_BACK', "His hair with what his face hides filled in (behind the forehead), drawn behind the head; also his head's outline at the top."),
    ):
        text += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        text += [f"    '{rw}'," for rw in part]
        text += ['  ],', '  colors: RENEGADE_HAIR_COLORS,', '};', '']
    if out_ts:
        R.write(out_ts, '\n'.join(text))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, {'h': front, 'B': back}, 'h', os.path.join(study, 'hair@8.png'), box=(34, 0, 68, 30))
        R.study(a, {'h': front, 'B': back}, 'B', os.path.join(study, 'hair-back@8.png'), box=(34, 0, 68, 30), cols=col)
    print('front', int(front.sum()), 'back', int(back.sum()), 'colours', len(palette), 'base', base, 'line', line_chars)


if __name__ == '__main__':
    main()
