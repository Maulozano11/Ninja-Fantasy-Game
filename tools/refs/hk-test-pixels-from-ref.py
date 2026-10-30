"""The owner's heroine knights at our scale, every pixel of each set where it lands in our female idle frame 0:
his picture (docs/reference/heroine-knights-owner-reference.jpg) shrunk and cleaned by
tools/refs/heroine_knights_ref.py game(), for src/sprite/heroineKnights.test.ts (each set at rest, worn with
Lyra's or Aurelia's head, is this picture pixel for pixel where it shows). The sets bring no head of their own
(the owner, D-T8 and D-T16): where his head and long hair lie, the picture says only that his is there ('##'),
and the test does not check those pixels (the sample head, or a part continued under where his was).

  python3 -I tools/refs/hk-test-pixels-from-ref.py src/sprite/heroineKnightsRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_knights_ref as R  # noqa: E402


def build():
    out = [R.header('hk-test-pixels-from-ref.py', "The owner's heroine knights, each whole figure"), '',
           '/**',
           ' * Each set in our female idle frame 0, from the fine pixel `at`: each row two base-36 digits per pixel, the',
           " * index of its colour in `colors` ('..' where she is not, '##' where his head or his long hair (behind or in front) is: not the set's).",
           ' */',
           'export const HK_REF: Record<string, { at: [number, number]; rows: string[]; colors: string[] }> = {']
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    for f in R.SETS:
        rgb, lab = R.game(f)
        m = lab != ''
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        head = np.isin(lab, ('head', 'hairBack', 'hairFront'))
        pal = sorted({R.hexc(rgb[y, x]) for y, x in zip(ys, xs) if not head[y, x]})
        idx = {h: i for i, h in enumerate(pal)}
        rows = []
        for y in range(y0, y1 + 1):
            r = ''
            for x in range(x0, x1 + 1):
                if head[y, x]:
                    r += '##'
                elif m[y, x]:
                    i = idx[R.hexc(rgb[y, x])]
                    r += digits[i // 36] + digits[i % 36]
                else:
                    r += '..'
            rows.append(r)
        out.append(f'  {f}: {{')
        out.append(f'    at: [{x0}, {y0}],')
        out.append('    rows: [')
        out += [f"      '{r}'," for r in rows]
        out.append('    ],')
        out.append('    colors: [')
        out += [f"      '{h}'," for h in pal]
        out += ['    ],', '  },']
    out += ['};', '']
    return '\n'.join(out)


if __name__ == '__main__':
    R.run(sys.argv, build)
