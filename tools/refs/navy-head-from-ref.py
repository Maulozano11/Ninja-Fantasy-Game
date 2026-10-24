"""The owner's head on his navy officer (docs/reference/navy-officer-owner-reference.jpg) as the 'navy' face shape.

His picture is drawn at about twice our scale; tools/refs/navy_ref.py shrinks his head to our Roman head's size
and cleans it with his palette only (the owner's "Reducir y limpiar yo"). This script lifts the head out of that:

  his face   the skin of his face, ear and jaw, his brows, nose and mouth and his black line round them, every
             colour as the reduction gives it (his own colours)
  his eyes   his lashes, whites and irises (navy_ref.EYES) are taken out and his skin carried over them from
             the row above: the eye options draw the eyes on top (his own: navyEyeArt.ts,
             tools/refs/navy-eyes-from-ref.py)
  his skull  under his hair, the head is continued in his skin inside our male skull's outline, with his black
             line round it, so every hairstyle, his and ours, covers it as it covers our head; only where his
             hair covers it at rest, so at rest every pixel is his

and writes the game's module (src/sprite/navyHeadArt.ts): the head as a PaintedPiece whose pivot is the cell on
our face anchor, and the base skin he painted it in. With a second argument, a folder, it writes his head at our
scale beside the piece at 8x. The same picture always gives the same bytes. Run from the repo root:

  python3 -I tools/refs/navy-head-from-ref.py src/sprite/navyHeadArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import navy_ref as N  # noqa: E402

def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    mask, col, base = N.head_piece()
    rows, origin, palette = N.pack(col, mask)
    doc = ("The owner's head (the 'navy' face shape), his pixels at our scale: his face, ear, jaw, brows and mouth, "
           'his skin shading and black line, and our skull continued in his skin under his hair; the eye options draw '
           'the eyes on it. Its pivot is the cell on the face anchor.')
    src = [
        N.header('navy-head-from-ref.py', "The owner's head on his navy officer").rstrip(),
        '',
        "import type { PaintedPiece } from './painted';",
        '',
        "/** The skin colour he painted him in: a player's skin moves every colour of it as far. */",
        f"export const NAVY_SKIN = '{base}';",
        '',
        '/** How far his head stands above ours on a male body (fine pixels): where his picture has it (romanNeck.ts headUp). */',
        f'export const NAVY_HEAD_UP = {N.HEAD_UP};',
        '',
        N.ts_piece('NAVY_HEAD', doc, rows, origin, palette, N.ANCHOR, 0),
    ]
    N.write(out_ts, '\n'.join(src))
    if study:
        os.makedirs(study, exist_ok=True)
        g, m, _, _ = N.game('high')
        box = (slice(4, 34), slice(34, 68))
        a = N.rgba(g, m)[box]
        b = N.rgba(col, mask)[box]
        N.save(np.concatenate([a, np.zeros((a.shape[0], 2, 4), np.uint8), b], axis=1), os.path.join(study, 'head@8.png'))
    print(len(rows), 'rows,', len(palette), 'colours, base', base, 'origin', origin)


if __name__ == '__main__':
    main()
