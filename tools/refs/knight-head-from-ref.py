"""The owner's knights: their face (the 'knight' face shape), from docs/reference/three-knights-owner-reference.jpg.

His three knights share one head; the paladin's is lifted. It is shrunk at its own scale, to our Roman head's
size (tools/refs/knights_ref.py HEAD_SCALE), and cleaned. The face is his skin, nose, mouth, jaw and the line
round them (knights_ref.pieces()); where his eyes are, the skin under them (his row under the eyes, carried
up) so any eye shape can be drawn on it (his own are knightEyeArt.ts). Under his hair, where he drew no
skull, his forehead's skin is continued up and round to a skull (an oval about our head's middle), closed by
his line, only where his hair covers it at rest: it shows only under another hairstyle. Stamped on the face
anchor of our head (his eyes stand on our male's eye row: the head is not raised).

  python3 -I tools/refs/knight-head-from-ref.py src/sprite/knightHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import knights_ref as K  # noqa: E402

# The skull's oval in our frame (fine pixels): its middle and its half widths.
SKULL = ((127.0, 134.0), (8.5, 9.5))


def build():
    P = K.pieces('paladin')
    face, col = P['face']
    hair = P['hair'][0]
    ox, oy = K.offset('paladin')
    face = face.copy()
    col = col.copy()
    line = K.line_rgb()
    kd = lambda y, x: K.kind(col[y, x])
    # the skin under his eyes: his row under the eyes carried up over the lashes, glints and irises
    ny = K.FACE_ANCHOR[1] - oy
    for e in (0, 1):
        ex = K.FACE_ANCHOR[0] + K.EYE_COLS[e] - ox
        for x in range(ex, ex + K.EYE_W[e]):
            for y in (ny, ny + 1):
                if not (face[y, x] and kd(y, x) == 'skin'):
                    col[y, x] = col[ny + 2, x]
                face[y, x] = True
    # the skull under his hair
    (cx, cy), (rx, ry) = SKULL
    H, W = face.shape
    yy, xx = np.mgrid[0:H, 0:W]
    oval = ((xx + ox + 0.5 - cx) / rx) ** 2 + ((yy + oy + 0.5 - cy) / ry) ** 2 <= 1
    skin = [tuple(col[y, x]) for y, x in zip(*np.nonzero(face)) if y > ny and kd(y, x) == 'skin']
    forehead = np.array(max(sorted(set(skin)), key=skin.count))
    skull = oval & (yy < ny) & hair & ~face
    edge = skull & ~(np.roll(oval, 1, 0) & np.roll(oval, -1, 0) & np.roll(oval, 1, 1) & np.roll(oval, -1, 1))
    col[skull] = forehead
    col[edge] = line
    face = face | skull
    consts = [('KNIGHT_HEAD', 'paladin', face, col, "The owner's knights' face (the 'knight' face shape): his skin, nose, mouth and jaw; his forehead continued to a skull under his hair; the skin under his eyes.", K.FACE_ANCHOR, 0.0)]
    skin_mid = K.middle(col, face & ~skull, ('skin',))
    text = K.module(K.header('knight-head-from-ref.py', "The owner's knights' face"), consts, {'KNIGHT_SKIN': skin_mid}, 'KNIGHT_HEAD', "import type { PaintedPiece } from './painted';")
    return text + (f'\n/** How much higher than ours he drew the head (fine pixels): on the male bodies the game raises the head that far under his face. */\nexport const KNIGHT_HEAD_UP = {K.HEAD_UP};\n\n'
                   f"/** Where his eyes start from the face anchor's column: the near eye, the far eye. */\nexport const KNIGHT_EYE_COLS: [number, number] = [{K.EYE_COLS[0]}, {K.EYE_COLS[1]}];\n")


if __name__ == '__main__':
    K.run(sys.argv, build)
