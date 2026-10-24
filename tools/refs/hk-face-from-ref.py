"""The owner's heroine knights: her face (the 'gallant' face shape), from
docs/reference/heroine-knights-owner-reference.jpg (his paladin's head, which all three share), shrunk on its
own at the body's scale with his eyes, brows, nose and mouth kept first (tools/refs/heroine_knights_ref.py
head_kept()), and cleaned.

The face is her skin, brows, eyes, nose, mouth, cheeks and chin and his line round them; above her brows only
her forehead's skin (heroine_knights_ref.head_pieces()). Under her hair, where he drew no skull, her
forehead's skin is continued up and round to a skull (an oval about our head's middle), closed by his line,
only where her hair covers it at rest: it shows only under another hairstyle. Her eyes are in it as he drew
them (the 'gallant' eye shape draws them again over it; another eye shape draws its own). Stamped on the face
anchor.

  python3 -I tools/refs/hk-face-from-ref.py src/sprite/heroineKnightFaceArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_knights_ref as R  # noqa: E402

# The skull's oval in our frame (fine pixels): its middle and its half widths.
SKULL = ((126.0, 135.0), (8.0, 8.5))


def build():
    P = R.head_pieces()
    face, col = P['face']
    hair = P['hair'][0]
    face = face.copy()
    col = col.copy()
    line = R.his_line()
    ny = R.FACE_ANCHOR[1]
    (cx, cy), (rx, ry) = SKULL
    yy, xx = np.mgrid[0:R.GRID, 0:R.GRID]
    oval = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1
    skin = [tuple(col[y, x]) for y, x in zip(*np.nonzero(face)) if y < ny and R.kind(col[y, x]) == 'skin']
    forehead = np.array(max(sorted(set(skin)), key=skin.count))
    skull = oval & (yy < ny) & hair & ~face
    edge = skull & ~(np.roll(oval, 1, 0) & np.roll(oval, -1, 0) & np.roll(oval, 1, 1) & np.roll(oval, -1, 1))
    col[skull] = forehead
    col[edge] = line
    face = face | skull
    consts = [('HK_FACE', face, col, "Her face (the 'gallant' face shape): his skin, brows, eyes, nose, mouth and chin; her forehead continued to a skull under her hair.", R.FACE_ANCHOR, 0.0, True)]
    skin_mid = R.middle(col, face & ~skull, ('skin',), skin_ok=True)
    return R.module(R.header('hk-face-from-ref.py', "The owner's heroine knights' face"), consts, {'HK_FACE_SKIN': skin_mid}, 'HK_FACE', "import type { PaintedPiece } from './painted';")


if __name__ == '__main__':
    R.run(sys.argv, build)
