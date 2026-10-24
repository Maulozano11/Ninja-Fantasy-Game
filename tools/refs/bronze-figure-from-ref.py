"""The owner's bronze warrior at our scale, whole, and his joints: what the game's idle frame is tested against.

His figure brought down and cleaned as tools/refs/bronze_ref.py says, each piece continued under what hides it
and drawn back to front as the game draws the pieces at rest (bronze_ref.GAME_ORDER): this is the cleaned
reduction the owner chose (2026-10-24, "Reducir y limpiar yo"), and at male idle frame 0 his preset must be
it pixel for pixel (src/sprite/hoplite.test.ts). His joints at our scale are where the game stands his
figure at rest (src/sprite/hopliteRig.ts).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-figure-from-ref.py src/sprite/hopliteFigureArt.ts [figure.png]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import bronze_ref as R  # noqa: E402


def figure_ts(name, doc, img):
    m = img[..., 3] > 0
    rows, origin, palette = R.pack(img[..., :3].astype(np.int32), m)
    t = [f'/** {doc} */', f'export const {name}_AT: [number, number] = [{origin[0]}, {origin[1]}];']
    t.append(f'export const {name}: {{ rows: string[]; colors: Record<string, string> }} = {{')
    t.append('  rows: [')
    t += [f"    '{r}'," for r in rows]
    t += ['  ],', '  colors: {']
    t += [f"    '{k}': '{v}'," for k, v in palette.items()]
    t += ['  },', '};', '']
    return t


def main(out, png=None):
    a, lab = R.load()
    pieces = {n: R.piece(a, lab, n) for _, n in R.GAME_ORDER}
    img, who = R.figure(a, lab, pieces)
    t = [R.header('bronze-figure-from-ref.py', "The owner's bronze warrior at our scale, whole, and his joints.", f' {out}')]
    t.append('/** His joints at our scale, where his figure stands them at male idle frame 0 (fine pixels). */')
    t.append('export const HOPLITE_JOINTS = {')
    for k in ('neck', 'pelvis', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'):
        x, y = R.fine_joint(k)
        t.append(f'  {k}: [{x:.4f}, {y:.4f}],')
    t += ['} as const;', '']
    t += figure_ts('HOPLITE_FIGURE', "His whole figure at male idle frame 0, as the game draws his preset: the first row's first cell at HOPLITE_FIGURE_AT.", img)
    R.write(out, '\n'.join(t))
    if png:
        Image.fromarray(img).resize((256 * 4, 256 * 4), Image.NEAREST).save(png)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
