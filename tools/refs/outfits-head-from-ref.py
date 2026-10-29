"""The owner's three new male outfits: his face (the 'wanderer' face shape), from
docs/reference/three-outfits-owner-reference.jpg (the armoured figure's head, which the three share).

His head is shrunk at its own scale, to our Roman head's size (tools/refs/outfits_ref.py HEAD_SCALE), and
cleaned. The face is his skin, nose, mouth, jaw and the line round them (outfits_ref.head_pieces()); where
his eyes are, the skin under them (his row under the eyes carried up) so any eye shape can be drawn on it
(his own are outfitEyeArt.ts). Under his hair, where he drew no skull, his forehead's skin is continued up
and round to a skull (an oval about our head's middle), closed by his line, only where his hair covers it
at rest: it shows only under another hairstyle. Stamped on the face anchor of our head, where he drew it.

  python3 -I tools/refs/outfits-head-from-ref.py src/sprite/outfitHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import outfits_ref as O  # noqa: E402

# The skull's oval in our frame (fine pixels): its middle and its half widths.
SKULL = ((126.5, 134.5), (8.0, 9.5))


def build(prefix='OUTFIT', script='outfits-head-from-ref.py', shape='wanderer', what="The owner's face from his three outfits"):
    P = O.head_pieces()
    face, col = P['face']
    hair = P['hair'][0]
    face = face.copy()
    col = col.copy()
    line = O.line_rgb()
    K = lambda y, x: O.kind(col[y, x])
    ax, ay = O.FACE_ANCHOR
    # the skin under his eyes: the skin of his row under the eyes carried up over the lash and the eye
    below = ay + O.EYE_ROWS
    for ex, w in ((ax + O.EYE_COLS[0], O.EYE_W[0]), (ax + O.EYE_COLS[1], O.EYE_W[1])):
        for x in range(ex, ex + w):
            src = col[below, x] if K(below, x) == 'skin' else None
            if src is None:
                continue
            for y in range(O.LASH_ROW, below):
                if K(y, x) in ('line', 'white', 'blue', 'steel', 'dark', 'hair') and (face[y, x] or hair[y, x]):
                    col[y, x] = src
                    face[y, x] = True
    # the skull under his hair
    (cx, cy), (rx, ry) = SKULL
    H, W = face.shape
    yy, xx = np.mgrid[0:H, 0:W]
    oval = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1
    skin = [tuple(col[y, x]) for y, x in zip(*np.nonzero(face)) if y < ay and K(y, x) == 'skin']
    forehead = np.array(max(sorted(set(skin)), key=skin.count))
    skull = oval & (yy < ay) & hair & ~face
    edge = skull & ~(np.roll(oval, 1, 0) & np.roll(oval, -1, 0) & np.roll(oval, 1, 1) & np.roll(oval, -1, 1))
    col[skull] = forehead
    col[edge] = line
    face = face | skull
    consts = [(f'{prefix}_HEAD', face, col, f"{what} (the '{shape}' face shape): his skin, nose, mouth and jaw; his forehead continued to a skull under his hair; the skin under his eyes.", O.FACE_ANCHOR, 0.0)]
    # (his one skin tone, the armoured face's, is the base every piece of his skin recolours from)
    bases = {f'{prefix}_SKIN': O.skin_base()}
    text = O.module(O.header(script, what), consts, bases, f'{prefix}_HEAD', "import type { PaintedPiece } from './painted';")
    return text + f"\n/** Where his eyes start from the face anchor's column: the near eye, the far eye. */\nexport const {prefix}_EYE_COLS: [number, number] = [{O.EYE_COLS[0]}, {O.EYE_COLS[1]}];\n"


if __name__ == '__main__':
    O.run(sys.argv, build)
