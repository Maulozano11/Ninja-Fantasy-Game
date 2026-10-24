"""The owner's samurai: his face (the 'samurai' face shape), from docs/reference/samurai-owner-reference.jpg.

His head is shrunk at its own scale, to our Roman head's size (tools/refs/samurai_ref.py HEAD_SCALE), and
cleaned. The face is his skin, nose, mouth, jaw and the line round them (samurai_ref.pieces()); where his
eyes are, the skin under them (his row under the glints, carried up) so any eye shape can be drawn on it
(his own are samuraiEyeArt.ts). Under his hair, where he drew no skull, his forehead's skin is continued
up and round to a skull (an oval about our head's middle), closed by his line, only where his hair covers
it at rest: it shows only under another hairstyle. Stamped on the face anchor of our head raised HEAD_UP.

  python3 -I tools/refs/samurai-head-from-ref.py src/sprite/samuraiHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import samurai_ref as S  # noqa: E402

# The skull's oval in our frame (fine pixels): its middle and its half widths.
SKULL = ((126.5, 134.0), (8.0, 9.5))


def build():
    P = S.pieces()
    rgb, label = S.game()
    face, col = P['face']
    hair = P['hair'][0]
    ox, oy = S.OFFSET
    face = face.copy()
    col = col.copy()
    line = S.line_rgb()
    K = lambda y, x: S.kind(col[y, x])
    # the skin under his eyes: his row under the glints carried up over the lashes and glints
    ny = S.FACE_ANCHOR[1] - oy
    for (ex, w) in ((S.FACE_ANCHOR[0] + S.EYE_COLS[0], S.EYE_W[0]), (S.FACE_ANCHOR[0] + S.EYE_COLS[1], S.EYE_W[1])):
        for x in range(ex - ox, ex - ox + w):
            for y in (ny, ny + 1):
                if K(y, x) in ('line', 'white'):
                    col[y, x] = col[ny + 2, x]
                    face[y, x] = True
    # the skull under his hair
    (cx, cy), (rx, ry) = SKULL
    H, W = face.shape
    yy, xx = np.mgrid[0:H, 0:W]
    oval = ((xx + ox + 0.5 - cx) / rx) ** 2 + ((yy + oy + 0.5 - cy) / ry) ** 2 <= 1
    top = np.nonzero(face.any(axis=1))[0].min()
    skin = [tuple(col[y, x]) for y, x in zip(*np.nonzero(face)) if y < ny and K(y, x) == 'skin']
    forehead = np.array(max(sorted(set(skin)), key=skin.count))
    skull = oval & (yy < ny) & hair & ~face
    # his line over the forehead (the hair's edge) is skin under another hairstyle
    for y, x in zip(*np.nonzero(face & oval & (yy < ny - 1))):
        if K(y, x) == 'line' and all(oval[y + dy, x + dx] for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))):
            col[y, x] = forehead
    edge = skull & ~(np.roll(oval, 1, 0) & np.roll(oval, -1, 0) & np.roll(oval, 1, 1) & np.roll(oval, -1, 1))
    col[skull] = forehead
    col[edge] = line
    face = face | skull
    consts = [('SAMURAI_HEAD', face, col, "The owner's samurai face (the 'samurai' face shape): his skin, nose, mouth and jaw; his forehead continued to a skull under his hair; the skin under his eyes.", S.FACE_ANCHOR, 0.0)]
    skin_mid = S.middle(col, face & ~skull, ('skin',))
    text = S.module(S.header('samurai-head-from-ref.py', "The owner's samurai face"), consts, {'SAMURAI_SKIN': skin_mid}, 'SAMURAI_HEAD', "import type { PaintedPiece } from './painted';")
    return text + f'\n/** How much higher than ours he drew the head, on his longer neck (fine pixels): on the male bodies the game raises the head that far under his face. */\nexport const SAMURAI_HEAD_UP = {S.HEAD_UP};\n\n/** Where his eyes start from the face anchor\'s column: the near eye, the far eye. */\nexport const SAMURAI_EYE_COLS: [number, number] = [{S.EYE_COLS[0]}, {S.EYE_COLS[1]}];\n'


if __name__ == '__main__':
    S.run(sys.argv, build)
