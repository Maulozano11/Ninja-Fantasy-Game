"""The owner's heroine knights: her joints at rest, her face anchor and her grip, from
docs/reference/heroine-knights-owner-reference.jpg shrunk to our scale (tools/refs/heroine_knights_ref.py).

His three women stand alike (one body in one pose): his joints, read off his paladin, in our frame. While
she wears his sets the game stands the rig's joints on them at rest (src/sprite/heroineKnightsRig.ts), so
every piece of hers turns about the joint he drew it round.

  python3 -I tools/refs/hk-joints-from-ref.py src/sprite/heroineKnightsJointsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import heroine_knights_ref as R  # noqa: E402


def build():
    out = [R.header('hk-joints-from-ref.py', "The owner's heroine knights' joints"), '',
           '/** His joints at rest in our female idle frame 0 (fine pixels): where she turns as he drew her. */',
           'export const HK_HIS: Record<string, [number, number]> = {']
    for j in R.HIS_NATIVE:
        x, y = R.his_joint(j)
        out.append(f'  {j}: [{x:.3f}, {y:.3f}],')
    out += ['};', '',
            '/** Her face anchor in our frame: her near eye\'s lash row and first column. */',
            f'export const HK_FACE_ANCHOR: [number, number] = [{R.FACE_ANCHOR[0]}, {R.FACE_ANCHOR[1]}];', '',
            '/** Where her eyes start from the face anchor\'s column: the near eye, the far eye. */',
            f'export const HK_EYE_COLS: [number, number] = [0, {R.FAR_EYE}];', '']
    return '\n'.join(out)


if __name__ == '__main__':
    R.run(sys.argv, build)
