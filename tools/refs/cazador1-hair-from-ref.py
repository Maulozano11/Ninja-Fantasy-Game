"""The owner's messy black hair from his Cazador 1 (docs/reference/cazador1-owner-reference.jpg), for the
Low Tail (`hair_lowtail`, its id kept: the hair the first Hunter-nin wears).

His picture is our Hunter-nin painted over in his own pixels (tools/refs/cazador1_ref.py: one of his
pixels is one fine pixel of our sprites). This script lifts his hair out of it, every pixel in his exact
colour: the messy black mop with its blue-grey glints, the strands that fall over the brow and between
the eyes, the locks down the sides of the face to the shoulders, and the one pixel of ear he left
showing through it. It is one piece over the head, pinned on our face anchor (the near eye's lash
start), as the owner's Valiant hair is: it frames the eyes as he drew it on every body and in every pose.
Where his horns stand in it the hair is continued from his hair beside them, so it stays whole under
another mask or none. His ear follows the character's skin; his black line stays.

It writes src/sprite/items/hunterHairArt.ts and, in <study>, the piece at 8x (continued cells crossed).
The same picture always gives the same bytes:

  python3 -I tools/refs/cazador1-hair-from-ref.py src/sprite/items/hunterHairArt.ts [study]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cazador1_ref as C  # noqa: E402

DOC = (
    "// The owner's messy black hair on his Cazador 1, his pixels (tools/refs/cazador1-hair-from-ref.py\n"
    '// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.\n'
)


def kind_of(_n, h):
    k = C.kind(C.rgb(h))
    return 'line' if k == 'line' else 'skin' if k in ('skin', 'wood', 'red') else 'hair'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a = C.native()
    masks, cols, filled, _K, _bg = C.pieces(a)
    bases = {
        'HUNTER_HAIR_BASE': C.middle(a, masks, cols, ['hair'], lambda c: kind_of('', C.hexc(c)) == 'hair'),
        # His ear recolours from his lit skin (cazador1_ref.his_skin), as all his skin does.
        'HUNTER_HAIR_SKIN': C.his_skin(a, masks, cols),
    }
    specs = [('HUNTER_HAIR', 'hair', 'His hair over the head, pinned on the face anchor.', C.FACE, 0.0)]
    text = C.emit(masks, cols, specs, bases, kind_of, 'HUNTER_HAIR', "'line' | 'hair' | 'skin'", DOC)
    if out_ts:
        C.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        C.sheet(masks, cols, filled, ['hair'], os.path.join(study, 'hair@8.png'))
    print('bases', bases)


if __name__ == '__main__':
    main()
