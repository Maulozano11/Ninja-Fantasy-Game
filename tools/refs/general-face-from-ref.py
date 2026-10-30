"""The owner's Roman general's face and eyes (docs/reference/general-head-v2-owner-reference.png) as the 'general' face and eye shapes.

His strong tanned face with dark brown eyes under a straight brow, from his second picture of the general's
head, drawn at the game's scale and read cell by cell (tools/refs/general_ref.py head_pieces): his skin and
his eyes, his brows, lashes and the jaw's lines, his lash on the face anchor's row, with a skull under the
hair and his neck continued under the scarf. His eyes are also the 'general' eye shape, cell by cell where
they are on his face (general_ref.HEAD_EYES), with the lid states the game needs (bronze_ref.eye_states).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/general-face-from-ref.py src/sprite/generalHeadArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bronze_ref as R  # noqa: E402
import general_ref as G  # noqa: E402


def main(out):
    p = {('L', 'face'): G.head_pieces()['face']}
    given = G.head_given()
    m, c, _ = p[('L', 'face')]
    text = R.module(G.header('general-face-from-ref.py', "The owner's Roman general's face and eyes (face and eye shape 'general').", f' {out}', (G.HEAD_REF,)),
                    [('GENERAL_HEAD', p[('L', 'face')], 'His head, skull to neck: stamped on the face anchor.', 'face')], 'GENERAL_HEAD',
                    {'GENERAL_SKIN': G.middle(p, [('L', 'face')], ('skin',), 0.75)}, painted='./painted')
    text = text.replace("import type { PaintedPiece } from './painted';", "import type { PaintedEye } from './eyeArt';\nimport type { PaintedPiece } from './painted';")
    t = [text] + R.eyes_ts('GENERAL', *R.eye_states(m, c, given))
    t += ['/** How many rows over ours his head stands on a male body (src/sprite/generalHead.ts). */', f'export const GENERAL_HEAD_UP = {G.HEAD_UP};', '']
    R.write(out, '\n'.join(t))


if __name__ == '__main__':
    main(sys.argv[1])
