"""The owner's purple hair in a high messy ponytail from his Cazador 2 (docs/reference/cazador2-owner-reference.jpg),
for the High Ponytail (`hair_pony`, its id kept: the hair the second Hunter-nin wears).

His picture is our second Hunter-nin painted over in his own pixels (tools/refs/cazador2_ref.py). This script
lifts her hair out of it, every pixel in his exact colour: the messy crown with its violet glints, the high
ponytail bursting out behind it, the strands over the brow and down the sides of the face to the shoulders,
and the bits of cheek he left showing beside them. It is one piece over the head, pinned on our face anchor
(the near eye's lash start), as his other hair is; where her face is his picture is left out (the face is
drawn there), and under the mask's ears the hair is continued from his hair beside them. Her skin follows
the character's skin; his black line stays. It also writes where her face shows between her strands (the
head under the hair keeps those cells, so the face shows through her hair as he painted it).

It writes src/sprite/items/ponyHairArt.ts and, in <study>, the piece at 8x (continued cells crossed). The
same picture always gives the same bytes:

  python3 -I tools/refs/cazador2-hair-from-ref.py src/sprite/items/ponyHairArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador2_ref as C  # noqa: E402

DOC = (
    "// The owner's purple high messy ponytail on his Cazador 2, his pixels (tools/refs/cazador2-hair-from-ref.py\n"
    '// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(_n, h):
    k = C.kind(C.rgb(h))
    return 'line' if k == 'line' else 'skin' if k in ('skin', 'wood', 'red') else 'hair'


def gaps():
    """Where her face shows between her strands (cazador2_ref.FACE_CELLS), as rows ('#') pinned on the face
    anchor like the hair."""
    ys, xs = C.FACE_CELLS.nonzero()
    x0, y0 = int(xs.min()), int(ys.min())
    rows = [''.join('#' if C.FACE_CELLS[y, x] else '.' for x in range(x0, int(xs.max()) + 1)) for y in range(y0, int(ys.max()) + 1)]
    out = ['/** Where her face shows between her strands, pinned on the face anchor: the head under her hair is kept there. */',
           "export const PONY_FACE_GAPS: Pick<PaintedPiece, 'rows' | 'pivot'> = {",
           f'  pivot: [{C.FACE[0] - x0}, {C.FACE[1] - y0}],',
           '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '};']
    return '\n'.join(out)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    bases = {
        'PONY_HAIR_BASE': C.middle(a, masks, cols, ['hair'], lambda c: kind_of('', C.hexc(c)) == 'hair'),
        'PONY_HAIR_SKIN': C.his_skin(a, masks, cols),
    }
    specs = [('PONY_HAIR', 'hair', 'Her hair over the head, pinned on the face anchor.', C.FACE, 0.0)]
    text = C.emit(masks, cols, specs, bases, kind_of, 'PONY_HAIR', "'line' | 'hair' | 'skin'", DOC, gaps())
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, ['hair'], os.path.join(study, 'hair@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
