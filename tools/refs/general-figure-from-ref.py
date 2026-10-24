"""The owner's Roman general's chest sets whole, as the game draws them at rest: what the idle test checks.

Each figure's pieces (tools/refs/general_ref.py: his cuirass, scarf, pauldrons and sleeves, his face and his
hair from the left figure) brought down and drawn back to front as the game draws them at male idle frame 0
(general_ref.GAME_ORDER): at rest, the preset wearing them shows every one of these pixels
(src/sprite/general.test.ts).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/general-figure-from-ref.py src/sprite/generalFigureArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402
import general_ref as G  # noqa: E402


def figure_ts(name, doc, img, on):
    rows, origin, palette = R.pack(img, on)
    t = [f'/** {doc} */', f'export const {name}_AT: [number, number] = [{origin[0]}, {origin[1]}];']
    t.append(f'export const {name}: {{ rows: string[]; colors: Record<string, string> }} = {{')
    t.append('  rows: [')
    t += [f"    '{r}'," for r in rows]
    t += ['  ],', '  colors: {']
    t += [f"    '{k}': '{v}'," for k, v in palette.items()]
    t += ['  },', '};', '']
    return t


def main(out):
    a, labs = G.load()
    t = [G.header('general-figure-from-ref.py', "The owner's Roman general's chest sets whole, with his face and hair, at male idle frame 0.", f' {out}')]
    for fig, name, what in (('L', 'GENERAL_SPIRAL_FIGURE', 'spiral'), ('R', 'GENERAL_MUSCLE_FIGURE', 'muscle')):
        img = np.zeros((256, 256, 3), np.int32)
        on = np.zeros((256, 256), bool)
        for _, n in G.GAME_ORDER:
            m, c, _ = G.piece(a, labs, 'L' if n in G.HEAD_PIECES else fig, n)
            img[m] = c[m]
            on |= m
        t += figure_ts(name, f'His {what} chest set with his face and hair at male idle frame 0, as the game draws them: the first row\'s first cell at {name}_AT.', img, on)
    R.write(out, '\n'.join(t))


if __name__ == '__main__':
    main(sys.argv[1])
