"""The owner's samurai at our scale, every pixel of his figure where it lands in our male idle frame 0:
his picture (docs/reference/samurai-owner-reference.jpg) shrunk and cleaned by tools/refs/samurai_ref.py
game(), for src/sprite/samurai.test.ts (the preset in his set at rest is this picture, pixel for pixel).

  python3 -I tools/refs/samurai-test-pixels-from-ref.py src/sprite/samuraiRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import samurai_ref as S  # noqa: E402


def build():
    rgb, label = S.game()
    m = label != ''
    rows, origin, palette = S.pack(rgb, m)
    out = [S.header('samurai-test-pixels-from-ref.py', "The owner's samurai, his whole figure"), '',
           '/** His figure in our male idle frame 0: rows of palette characters from the fine pixel AT. */',
           f'export const SAMURAI_REF_AT: [number, number] = [{origin[0] + S.OFFSET[0]}, {origin[1] + S.OFFSET[1]}];',
           'export const SAMURAI_REF_ROWS: string[] = [']
    out += [f"  '{r}'," for r in rows]
    out += ['];', 'export const SAMURAI_REF_COLORS: Record<string, string> = {']
    out += [f"  '{k}': '{v}'," for k, v in palette.items()]
    out += ['};', '']
    return '\n'.join(out)


if __name__ == '__main__':
    S.run(sys.argv, build)
