"""The owner's Roman legate's chest set whole, as the game draws it at rest: what the idle test checks.

His cuirass, pauldrons and sleeves (tools/refs/legate_ref.py) brought down and drawn back to front as the game
draws them at male idle frame 0 (legate_ref.GAME_ORDER): at rest, the preset wearing them shows every one of
these pixels but where our own near arm hangs in front (src/sprite/legate.test.ts).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/legate-figure-from-ref.py src/sprite/legateFigureArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402
import legate_ref as L  # noqa: E402


def main(out):
    a, lab = L.load()
    img = np.zeros((256, 256, 3), np.int32)
    on = np.zeros((256, 256), bool)
    for _, n in L.GAME_ORDER:
        m, c, _ = L.piece(a, lab, n)
        img[m] = c[m]
        on |= m
    rows, origin, palette = R.pack(img, on)
    t = [L.header('legate-figure-from-ref.py', "The owner's Roman legate's chest set whole at male idle frame 0.", f' {out}')]
    t += ["/** His chest set at male idle frame 0 as the game draws it: the first row's first cell at LEGATE_FIGURE_AT. */", f'export const LEGATE_FIGURE_AT: [number, number] = [{origin[0]}, {origin[1]}];']
    t.append('export const LEGATE_FIGURE: { rows: string[]; colors: Record<string, string> } = {')
    t.append('  rows: [')
    t += [f"    '{r}'," for r in rows]
    t += ['  ],', '  colors: {']
    t += [f"    '{k}': '{v}'," for k, v in palette.items()]
    t += ['  },', '};', '']
    R.write(out, '\n'.join(t))


if __name__ == '__main__':
    main(sys.argv[1])
