"""His navy officers at our scale, every pixel, for the tests (src/sprite/navy.test.ts): for each of his five
pictures, the officer at rest as the game puts him together (tools/refs/navy_ref.py dressed: that picture's own
chest on his first picture's head, gloves, belt, boots, sabre and scabbard), which our male idle frame 0 in that
outfit must show pixel for pixel, and which piece each pixel is (so a test can leave a piece out). Where a
picture's own chest shows, these are that picture's cleaned reduction (navy_ref.game) exactly. It writes
src/sprite/navyRefPixels.ts:

  python3 -I tools/refs/navy-test-pixels-from-ref.py src/sprite/navyRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import navy_ref as N  # noqa: E402

LETTERS = {
    'face': 'f', 'hair': 'h', 'hair_back': 'h', 'coat': 'o', 'sleeve_n': 'n', 'sleeve_f': 'v', 'tails': 't', 'tails_back': 'k', 'vest': 'e',
    'belt': 'w', 'sash': 's', 'epaulet_n': 'p', 'epaulet_f': 'p', 'trousers_n': 'r', 'trousers_f': 'r', 'seat': 'r',
    'boot_n_shin': 'b', 'boot_n_foot': 'b', 'boot_f_shin': 'b', 'boot_f_foot': 'b', 'glove_n': 'g', 'glove_f': 'g',
    'hilt': 'a', 'scabbard': 'c',
}


def main():
    out_ts = sys.argv[1]
    out = [
        "// His navy officers at our scale, every pixel, for the tests (tools/refs/navy-test-pixels-from-ref.py from",
        "// docs/reference/navy-officer-*-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).",
        '// Generated: rerun the script to change it.',
        '',
        'export interface NavyRef {',
        "  /** Where the first row's first pixel lands in our male idle frame 0. */",
        '  at: [number, number];',
        '  /** His figure, one character per colour of his (colors); "." is the background round him. */',
        '  rows: string[];',
        '  colors: Record<string, string>;',
        '  /** Which piece each pixel is: ' + '; '.join(f'{v} {k}' for k, v in LETTERS.items()) + '. */',
        '  parts: string[];',
        '}',
        '',
        '/** Each picture of his (navy_ref.PICS) at rest as the game puts it together. */',
        'export const NAVY_REF: Record<string, NavyRef> = {',
    ]
    for pic in N.PICS:
        g, m, which = N.dressed(pic)
        rows, (x0, y0), palette = N.pack(g, m)
        parts = [''.join(LETTERS[which[y, x]] if m[y, x] else '.' for x in range(x0, x0 + len(rows[0]))) for y in range(y0, y0 + len(rows))]
        # where the picture's own chest shows, it is that picture's cleaned reduction exactly
        own = np.isin(which, N.OWN[pic])
        gg, gm, _, _ = N.game(pic)
        bad = own & m & ((~gm) | (np.abs(gg - g).max(axis=2) > 0))
        print(pic, len(rows), 'rows', len(palette), 'colours', int(bad.sum()), 'own pixels continued where his picture shows another part')
        out += [f'  {pic}: {{', f'    at: [{x0 + N.OFFSET[0]}, {y0 + N.OFFSET[1]}],', '    rows: [']
        out += [f"      '{r}'," for r in rows]
        out += ['    ],', '    colors: {']
        out += [f"      {k if k.isidentifier() else repr(k)}: '{v}'," for k, v in palette.items()]
        out += ['    },', '    parts: [']
        out += [f"      '{r}'," for r in parts]
        out += ['    ],', '  },']
    out += ['};', '']
    N.write(out_ts, '\n'.join(out))


if __name__ == '__main__':
    main()
