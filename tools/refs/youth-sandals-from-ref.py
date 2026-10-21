"""The owner's sandals from his Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg) as
the Straw Sandals (feet_sandals, same id): black straps round the ankle and over the bare toes, on a dark
sole.

On each leg the ankle straps turn with our shin about the ankle and the foot stays flat on the ground as
our feet do; both hang youth_ref.LEG_SHIFT lower than he drew them, so his soles stand on our ground. His
sole (the lit row along the bottom of each foot, inside his line) is a piece of its own, so the item's
Sole colour recolours it although he painted it in his straps' darks.

Colour slots: 'main' his straps, 'skin' his skin between them (follows the character's), 'line' his black
line; the sole pieces follow the Sole colour from STRAW_SANDAL_SOLE.

  python3 -I tools/refs/youth-sandals-from-ref.py src/sprite/items/strawSandalsArt.ts [study dir]

The same picture always gives the same bytes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import youth_ref as Y  # noqa: E402

DOC = ("// The owner's sandals on his Joven salvaje, his pixels (tools/refs/youth-sandals-from-ref.py from\n"
       f'// {Y.REF}). Generated: rerun the script to change it.\n')
# The row of his sole on each foot (inside his line under it).
SOLE = {'N': 96, 'F': 90}


def main():
    out_ts, study_dir = Y.argv_out()
    a, K, M, P, black = Y.youth()
    slot = Y.slot_by_kind({'skin': 'skin', 'brown': 'skin', 'red': 'skin'}, 'main')
    pieces, soles = [], []
    for s, side in (('N', 'near'), ('F', 'far')):
        sh = Y.LEG_SHIFT[s]
        foot = P['foot_' + s.lower()][0]
        sole = foot & Y.region(Y.box(0, SOLE[s], 100, SOLE[s] + 1)) & (K != 'line')
        soles += [Y.hexc(a[y, x]) for y, x in zip(*np.nonzero(sole))]
        pieces += [
            (f'STRAW_SANDAL_STRAP_{s}', *P['strap_' + s.lower()], f'The {side} ankle straps; they turn with the shin about the ankle.', 'ankle' + s, Y.angle('knee' + s, 'ankle' + s), slot, (0, -sh)),
            (f'STRAW_SANDAL_FOOT_{s}', foot & ~sole, a, f'The {side} foot: straps over the bare toes, his line round them; flat on the ground.', 'ankle' + s, 0.0, slot, (0, -sh)),
            (f'STRAW_SANDAL_SOLE_{s}', sole, a, f'The {side} sole, drawn with the foot in the Sole colour.', 'ankle' + s, 0.0, slot, (0, -sh)),
        ]
    # His sole's colour of middle lightness: the Sole colour recolours from it.
    base = sorted(soles, key=lambda h: (Y.luma(np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])), h))[len(soles) // 2]
    extra = f"/** His sole's colour (the Sole colour recolours the sole pieces from it). */\nexport const STRAW_SANDAL_SOLE = '{base}';\n"
    Y.run(out_ts, DOC, pieces, 'STRAW_SANDAL', {'main': 'STRAW_SANDAL_STRAPS'}, None, extra)
    if study_dir:
        layers = [P[n] for n in ('strap_f', 'foot_f', 'strap_n', 'foot_n')]
        Y.study(a, layers, os.path.join(study_dir, 'straw-sandals@8.png'), (34, 80, 76, 99))


if __name__ == '__main__':
    main()
