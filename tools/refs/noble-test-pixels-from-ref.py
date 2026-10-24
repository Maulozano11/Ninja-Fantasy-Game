"""His noble swordsman at our scale, every pixel, for the tests (src/sprite/noble.test.ts): the cleaned reduction
of docs/reference/noble-swordsman-owner-reference.jpg (tools/refs/noble_ref.py game()), which our male idle frame
0 in his outfit must show pixel for pixel, and which part of him each pixel is (so the test can leave out the
cape's pixels when the cape is taken off). It writes src/sprite/nobleRefPixels.ts:

  python3 -I tools/refs/noble-test-pixels-from-ref.py src/sprite/nobleRefPixels.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import noble_ref as N  # noqa: E402

PART_LETTERS = {
    'cape': 'c', 'mantle_n': 'm', 'mantle_f': 'm', 'collar_n': 'l', 'collar_f': 'l', 'stud_n': 'l', 'stud_f': 'l',
    'face': 'f', 'hair': 'h', 'headband': 'b', 'coat': 'o', 'sleeve_n': 'v', 'sleeve_f': 'v', 'tails': 't', 'front': 'r',
    'belt': 'w', 'trousers_n': 'p', 'trousers_f': 'p', 'boot_n': 'k', 'boot_f': 'k', 'cuff_n': 'u', 'cuff_f': 'u',
    'glove_n': 'g', 'glove_f': 'g', 'blade': 's', 'hilt': 's',
}


def main():
    out_ts = sys.argv[1]
    g, m, part, _ = N.game()
    rows, origin, palette = N.pack(g, m)
    x0, y0 = origin
    letters = []
    for y in range(y0, y0 + len(rows)):
        letters.append(''.join(PART_LETTERS[part[y, x]] if m[y, x] else '.' for x in range(x0, x0 + len(rows[0]))))
    key = sorted(set(PART_LETTERS.values()))
    legend = {v: sorted(k for k, w in PART_LETTERS.items() if w == v) for v in key}
    out = [
        "// His noble swordsman at our scale, every pixel, for the tests (tools/refs/noble-test-pixels-from-ref.py from",
        "// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).",
        '// Generated: rerun the script to change it.',
        '',
        "/** Where the first row's first pixel lands in our male idle frame 0. */",
        f'export const NOBLE_REF_AT: [number, number] = [{x0 + N.OFFSET[0]}, {y0 + N.OFFSET[1]}];',
        '',
        '/** His figure, one character per colour of his (NOBLE_REF_COLORS); "." is the background round him. */',
        'export const NOBLE_REF_ROWS: string[] = [',
    ]
    out += [f"  '{r}'," for r in rows]
    out += ['];', '', 'export const NOBLE_REF_COLORS: Record<string, string> = {']
    out += [f"  {k if k.isidentifier() else repr(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '', '/** Which part of him each pixel is: ' + '; '.join(f'{k} {", ".join(v)}' for k, v in legend.items()) + '. */',
            'export const NOBLE_REF_PARTS: string[] = [']
    out += [f"  '{r}'," for r in letters]
    out += ['];', '']
    N.write(out_ts, '\n'.join(out))
    print(len(rows), 'rows', len(palette), 'colours')


if __name__ == '__main__':
    main()
