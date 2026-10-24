"""The owner's three knights at our scale, every pixel of each figure where it lands in our male idle frame 0:
his picture (docs/reference/three-knights-owner-reference.jpg) shrunk and cleaned by tools/refs/knights_ref.py
game() (the head the paladin's on the three, the dark knight's blade the paladin's), for
src/sprite/knights.test.ts (each preset in its set at rest is this picture, pixel for pixel).

  python3 -I tools/refs/knight-test-pixels-from-ref.py src/sprite/knightRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import knights_ref as K  # noqa: E402


def build():
    out = [K.header('knight-test-pixels-from-ref.py', "The owner's three knights, their whole figures"), '',
           '/** Each figure in our male idle frame 0: rows of palette characters from the fine pixel `at`. */',
           'export const KNIGHT_REF: Record<string, { at: [number, number]; rows: string[]; colors: Record<string, string> }> = {']
    for f in K.FIGURES:
        rgb, label = K.game(f)
        rows, origin, pal = K.pack(rgb, label != '')
        ox, oy = K.offset(f)
        out.append(f'  {f}: {{')
        out.append(f'    at: [{origin[0] + ox}, {origin[1] + oy}],')
        out.append('    rows: [')
        out += [f"      '{r}'," for r in rows]
        out.append('    ],')
        out.append('    colors: {')
        out += [f"      '{k}': '{v}'," for k, v in pal.items()]
        out.append('    },')
        out.append('  },')
    out += ['};', '']
    return '\n'.join(out)


if __name__ == '__main__':
    K.run(sys.argv, build)
