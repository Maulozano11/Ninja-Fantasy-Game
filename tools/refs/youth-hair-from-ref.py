"""The owner's hair from his Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg) as
the Wild Youth hairstyle (hair_youth), drawn as hair_valiant is (src/sprite/items/valiantHairArt.ts):
every pixel of his hair over the head, pivoted on our face anchor (the near eye's lash start), and behind
the head the same hair with what his face hides filled in (youth_ref.hair()).

His black hair is drawn in navy-black shades with grey-blue lights; his line is his black (lightness under
21), which stays when the hair is recoloured. The colour slot's default is his colour of middle lightness
among the rest; his other colours move the way it does (retintHex).

  python3 -I tools/refs/youth-hair-from-ref.py src/sprite/items/youthHairArt.ts [study dir]

The same picture always gives the same bytes.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import youth_ref as Y  # noqa: E402


def main():
    out_ts, study_dir = Y.argv_out()
    front, back, col, dline = Y.hair()
    rows, (ox, oy), palette = Y.pack(col, back)
    fx, fy = Y.face_anchor()
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(r)) for j, r in enumerate(rows)]
    line_chars = ''.join(sorted({rows[y - oy][x - ox] for y, x in zip(*np.nonzero(dline))}))
    a = Y.native()
    own = sorted((float(Y.luma(a[y, x])), Y.hexc(a[y, x])) for y, x in zip(*np.nonzero(front & ~dline)))
    want = own[len(own) // 2][1]
    dist = lambda h: sum(abs(int(h[i:i + 2], 16) - int(want[i:i + 2], 16)) for i in (1, 3, 5))  # noqa: E731
    base = min(sorted(v for k, v in palette.items() if k not in line_chars), key=dist)
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"  # noqa: E731
    out = ["// The owner's hair on his Joven salvaje, his pixels (tools/refs/youth-hair-from-ref.py from",
           f'// {Y.REF}). Generated: rerun the script to change it.', '',
           "import type { PaintedPart } from './capeArt';", '',
           '/** One character per colour of his (both parts share them). */', 'const YOUTH_HAIR_COLORS: Record<string, string> = {']
    out += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '']
    for part, name, pdoc in (
        (front_rows, 'YOUTH_HAIR_FRONT', "Every pixel of his hair, over the head: his colours and his line. Its pivot is the cell on our face anchor (the near eye's lash start)."),
        (rows, 'YOUTH_HAIR_BACK', "His hair with what his face hides filled in, drawn behind the head; also his head's outline at the top."),
    ):
        out += [f'/** {pdoc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{fx - ox}, {fy - oy}],', '  rows: [']
        out += [f"    '{r}'," for r in part]
        out += ['  ],', '  colors: YOUTH_HAIR_COLORS,', '};', '']
    out += ['/** His black line: kept as he drew it when the hair is recoloured. */',
            f"export const YOUTH_HAIR_LINE = '{line_chars}';", '',
            "/** His colour of middle lightness: the colour slot's default; his other colours follow it. */",
            f"export const YOUTH_HAIR_BASE = '{base}';", '']
    if out_ts:
        Y.write(out_ts, '\n'.join(out))
    if study_dir:
        Y.study(a, [(back, np.where(front[..., None], col, col // 2)), (front, col)], os.path.join(study_dir, 'youth-hair@8.png'), (28, 0, 70, 34))
    print('front', int(front.sum()), 'back', int(back.sum()), 'base', base, 'colours', len(palette))


if __name__ == '__main__':
    main()
