"""The owner's three new male outfits at our scale, every pixel of each figure where it lands in our male
idle frame 0: his picture (docs/reference/three-outfits-owner-reference.jpg) shrunk and cleaned by
tools/refs/outfits_ref.py game(), for src/sprite/outfits.test.ts (each preset in its outfit at rest is
this picture, pixel for pixel; on each, the head is his armoured figure's, which the three share).

  python3 -I tools/refs/outfits-test-pixels-from-ref.py src/sprite/outfitRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import outfits_ref as O  # noqa: E402


def build():
    out = [O.header('outfits-test-pixels-from-ref.py', "The owner's three outfits, his whole figures"), '',
           '/** Each figure in our male idle frame 0: rows of palette characters from the fine pixel `at`. */',
           "export const OUTFIT_REF: Record<'armored' | 'rogue' | 'tactical', { at: [number, number]; rows: string[]; colors: Record<string, string> }> = {"]
    for name in ('armored', 'rogue', 'tactical'):
        rgb, label = O.game(name)
        rows, origin, palette = O.pack(rgb, label != '')
        out.append(f'  {name}: {{')
        out.append(f'    at: [{origin[0]}, {origin[1]}],')
        out.append('    rows: [')
        out += [f"      '{r}'," for r in rows]
        out.append('    ],')
        out.append('    colors: {')
        out += [f"      '{k}': '{v}'," for k, v in palette.items()]
        out.append('    },')
        out.append('  },')
    out += ['};', '']
    return '\n'.join(out)


if __name__ == '__main__':
    O.run(sys.argv, build)
