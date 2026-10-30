"""The owner's heroine knights: her joints at rest and her skin, from
docs/reference/heroine-knights-owner-reference.jpg shrunk to our scale (tools/refs/heroine_knights_ref.py).

His three women stand alike (one body in one pose): his joints, read off his paladin, in our frame. While
she wears his sets the game stands the rig's joints on them at rest (src/sprite/heroineKnightsRig.ts), so
every piece of hers turns about the joint he drew it round. Her skin is the base the character's skin is
retinted from where a set shows it (the rogue's bare thigh).

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
            "/** Her skin as he drew it: where a set shows her skin (the rogue's bare thigh), the character's skin is retinted from this. */",
            f"export const HK_SKIN = '{R.his_skin()}';", '']
    return '\n'.join(out)


if __name__ == '__main__':
    R.run(sys.argv, build)
