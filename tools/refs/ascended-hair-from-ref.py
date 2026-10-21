"""The owner's golden spikes from his Ascended paint-over (docs/reference/ascended-owner-reference.jpg), for Ascended
Spikes (`hair_ascended`, its id kept).

His picture is our male in the Ascended set painted over in his own pixels (tools/refs/ascended_ref.py: one
of his pixels is one fine pixel of our sprites). This script lifts out of it, every pixel in his exact
colour:

  front   every pixel of his hair over the head: the spikes standing up and back, the locks over the
          brow, the sideburn locks before the ears and at the nape, in his golds inside his dark brown
          line. Not his face: below the brows (his eyes, brows, ear and mouth) our face shows, and over
          the forehead only his strands are taken, so our forehead shows between them.
  back    the same hair with what his forehead and ear hide filled in (each hidden cell from the nearest
          of his strands above it), drawn behind the head; it is also his head's outline at the top (the
          game trims our skull to it).

Both are pinned on our face anchor (ascended_ref.FACE: the near eye's lash start), so at rest the hair is
where he drew it and it follows the head in every pose. His golds follow Hair; his dark line stays.

It writes src/sprite/items/ascendedHairArt.ts and, in <study>, the pieces at 10x (continued cells
crossed). The same picture always gives the same bytes:

  python3 -I tools/refs/ascended-hair-from-ref.py src/sprite/items/ascendedHairArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ascended_ref as A  # noqa: E402

DOC = (
    "// The owner's golden spikes on his Ascended paint-over, his pixels\n"
    '// (tools/refs/ascended-hair-from-ref.py from docs/reference/ascended-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)
# His line round the locks is near-black brown: darker than this (luma). His darkest golds are lighter.
LINE_LUMA = 24


def kind_of(_n, h):
    return 'line' if A.luma(A.np.array(A.rgb(h), float)) < LINE_LUMA else 'hair'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = A.native()
    masks, cols, filled, _K, _bg = A.pieces(a)
    bases = {'ASCENDED_HAIR_BASE': A.middle(a, masks, cols, ['hair'], lambda c: kind_of('', A.hexc(c)) == 'hair')}
    specs = [
        ('ASCENDED_HAIR_FRONT', 'hair', 'Every pixel of his hair over the head; its pivot is on our face anchor (the near eye\'s lash start).', A.FACE, 0),
        ('ASCENDED_HAIR_BACK', 'hair_back', 'His hair with what his forehead and ear hide filled in, behind the head; also his head\'s outline at the top.', A.FACE, 0),
    ]
    text = A.emit(masks, cols, specs, bases, kind_of, 'ASCENDED_HAIR', "'line' | 'hair'", DOC)
    if out_ts:
        A.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        A.sheet(masks, cols, filled, ['hair', 'hair_back'], os.path.join(study, 'hair@10.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
