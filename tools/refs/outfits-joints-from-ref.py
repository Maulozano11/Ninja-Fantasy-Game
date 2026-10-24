"""The owner's three new male outfits: his joints, read off each figure of
docs/reference/three-outfits-owner-reference.jpg at our scale (tools/refs/outfits_ref.py HIS): where the
game stands our rig's joints at rest while his arms or legs are worn (src/sprite/outfitRig.ts).

  python3 -I tools/refs/outfits-joints-from-ref.py src/sprite/outfitJointsArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import outfits_ref as O  # noqa: E402


def build():
    out = [O.header('outfits-joints-from-ref.py', "The owner's joints in his three outfits"), '',
           "/** His joints in our frame (fine pixels) for each of his figures: where the game stands our rig's joints at rest in his outfit. */",
           "export const OUTFIT_HIS: Record<'armored' | 'rogue' | 'tactical', Record<string, [number, number]>> = {"]
    for name in ('armored', 'rogue', 'tactical'):
        out.append(f'  {name}: {{')
        for j in O.HIS[name]:
            x, y = O.joint(name, j)
            out.append(f'    {j}: [{x:.2f}, {y:.2f}],')
        out.append('  },')
    out += ['};', '']
    return '\n'.join(out)


if __name__ == '__main__':
    O.run(sys.argv, build)
