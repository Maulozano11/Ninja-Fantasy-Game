"""The owner's skin pixels from his Roman paint-over (docs/reference/roman-owner-reference.jpg), for the tests.

The tests of his male skin and his Roman face (src/sprite/maleSkin.test.ts) check the game's frames against
his picture itself, not against the pieces the other scripts lift out of it: a lifting script that took the
wrong pixels, or a frame that leaves our own skin where he painted his, then fails. This script reads his
pixels (tools/refs/roman_ref.py: one of his pixels is one fine pixel of our sprites) and writes every pixel
of his skin colours in each region, where he painted it (his pixel coordinates; our idle frame 0 has his
pixel (x, y) at (x + OFFSET[0], y + OFFSET[1]) before any limb is registered):

  upperArmN, upperArmF, handN, handF   his arms' bare skin and his fists
  legN, legF                           his legs from under the skirt to the ankle (between the laces too)
  face                                 his face below the hair, ear to chin (not his eyes)

The same picture always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/roman-test-pixels-from-ref.py docs/reference/roman-owner-reference.jpg src/sprite/romanRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402

# The regions (polygons in his pixel corners), drawn here on their own (not taken from the lifting scripts).
REGIONS = {
    'upperArmN': [(31, 34.5), (45, 34.5), (45, 45), (31, 45)],
    'upperArmF': [(61, 37.5), (66, 37.5), (66, 46), (61, 46)],
    'handN': [(31, 53.5), (42, 53.5), (42, 61), (31, 61)],
    'handF': [(62, 52.5), (70, 52.5), (70, 59), (62, 59)],
    'legN': [(34, 66.5), (50, 66.5), (50, 92), (34, 92)],
    'legF': [(54, 67.5), (66, 67.5), (66, 92), (54, 92)],
    'face': [(43, 15), (62, 15), (62, 26), (43, 26)],
}


def main():
    a = R.native(sys.argv[1])
    K = np.array([[R.kind(a[y, x]) for x in range(a.shape[1])] for y in range(a.shape[0])])
    out = [
        "// The owner's skin pixels in his Roman paint-over, for the tests (tools/refs/roman-test-pixels-from-ref.py",
        '// from docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "/** His pixel (x, y) is at (x + ROMAN_OFFSET[0], y + ROMAN_OFFSET[1]) of our male idle frame 0, before a limb is registered. */",
        f'export const ROMAN_OFFSET: [number, number] = [{R.OFFSET[0]}, {R.OFFSET[1]}];',
        '',
        '/** Every pixel of his skin colours in each region, where he painted it: [x, y, colour]. */',
        'export const ROMAN_SKIN_PIXELS: Record<string, [number, number, string][]> = {',
    ]
    for name, poly in REGIONS.items():
        m = R.inside(poly, *a.shape[:2]) & (K == 'skin')
        cells = [f"[{x}, {y}, '{R.hexc(a[y, x])}']" for y, x in zip(*np.nonzero(m))]
        out.append(f'  {name}: [')
        for i in range(0, len(cells), 6):
            out.append('    ' + ', '.join(cells[i:i + 6]) + ',')
        out.append('  ],')
        print(name, len(cells))
    out += ['};', '']
    R.write(sys.argv[2], '\n'.join(out))


if __name__ == '__main__':
    main()
