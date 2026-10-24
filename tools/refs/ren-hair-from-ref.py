"""The owner's hair on his Ren (docs/reference/ren-owner-reference.jpg) as a hairstyle.

His Ren is our Ren painted over in his own pixels (tools/refs/ren_ref.py: one of his pixels is one fine
pixel of our sprites). His hair is spiky and black-blue: spikes standing up from the crown and fanning
out to both sides, a long fringe of strands over the brow and between the eyes with the forehead
showing between them, a lock down the near cheek over the ear and the nape, all in his blue-greys inside
his black line. This script lifts it out of his pixels (the piece 'hair' of ren_ref.pieces):

  front   every pixel of his hair as he drew it: his blue-greys and his black line round and between
          the strands (over his face only the line beside a strand; the lashes, nose and jaw are the
          face's). Where his picture shows skin between the strands, the head shows.
  back    the same hair with what his face hides filled in (behind the forehead between the strands,
          and behind his ear), each hidden cell taking the colour of his strand above it. Drawn behind
          the head, it shows only where a head is narrower than ours; it is also his head's outline at
          the top (the game trims our skull to it).

It writes the game's module (src/sprite/items/nightHairArt.ts): both parts with their pivot on our face
anchor (the near eye's lash row), his black line's characters and his base blue-grey (the colour
slot's default; his other colours move as far as it does). With a second argument, a folder, it writes
his head beside the parts at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/ren-hair-from-ref.py src/sprite/items/nightHairArt.ts [studyDir]
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import ren_ref as R  # noqa: E402


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = R.native()
    P = R.pieces(a)
    front, fcol = P['hair']
    back, bcol = P['hair_back']
    # One palette for both parts: pack the back (it holds the front's pixels and the filled ones).
    rows, origin, palette = R.pack(bcol, back)
    ox, oy = origin
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(rw)) for j, rw in enumerate(rows)]
    line = ''.join(ch for ch, h in palette.items() if R.kind([int(h[k:k + 2], 16) for k in (1, 3, 5)]) == 'line')
    base = R.packed(R.middle(a, P, ['hair'], ('dark',)), palette)
    px, py = R.ANCHOR[0] - ox, R.ANCHOR[1] - oy
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [
        "// The owner's hair on his Ren, his pixels (tools/refs/ren-hair-from-ref.py from",
        '// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (both parts share them). */',
        'const NIGHT_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '']
    for name, rws, doc in (
        ('NIGHT_HAIR_FRONT', front_rows, "Every pixel of his hair, over the head: his blue-greys and his black line. Its pivot is the cell on our face anchor (the near eye's lash row)."),
        ('NIGHT_HAIR_BACK', rows, "His hair with what his face hides filled in (behind the forehead between his strands, and behind his ear), drawn behind the head; also his head's outline at the top."),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in rws]
        out += ['  ],', '  colors: NIGHT_HAIR_COLORS,', '};', '']
    out += [
        '/** His black line: kept as he drew it when the hair is recoloured. */',
        f"export const NIGHT_HAIR_LINE = '{line}';",
        '',
        '/** His middle blue-grey: the colour slot\'s default; his other colours move as far as it does. */',
        f"export const NIGHT_HAIR_BASE = '{base}';",
        '',
    ]
    R.write(out_ts, '\n'.join(out))
    if study:
        os.makedirs(study, exist_ok=True)
        R.study(a, P, ['hair'], os.path.join(study, 'hair@8.png'), (34, 0, 68, 32))
        R.study(a, P, ['hair_back'], os.path.join(study, 'hair-back@8.png'), (34, 0, 68, 32))
    print(len(palette), 'colours; base', base, 'line', line, 'pivot', (px, py))


if __name__ == '__main__':
    main()
