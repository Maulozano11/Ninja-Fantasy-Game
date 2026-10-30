"""The owner's bronze warrior's diadem (docs/reference/bronze-warrior-repaint-owner-reference.jpg) on Solen's
head, as an accessory (acc_solen_diadem).

The owner's decision (2026-10-29, D-T17): the bronze warrior IS Solen. His head in the game is Solen's (the
'founder' face, our standard eyes in his red, his skin), and his bronze diadem across the brow is a creator
option for any hair. His mane with the braid was an option too (hair_solen_mane) until the owner dropped it
(2026-10-30, after seven rounds on its fringe over the brows: "este pelo cancélalo ya, elimínalo, estamos
perdiendo mucho tiempo y recursos arreglándolo"); its code went with it. The diadem's pixels are his repaint's
(tools/refs/bronze-repaint-from-ref.py: one of his pixels one fine pixel of ours), lifted LIFT + DIADEM_UP rows
onto Solen's head (his head was smaller than ours, its top three rows lower; the band lies over the brow on
Solen's forehead where he set it on the hair, its drop clear of the brows). It pivots on our face anchor (the
near eye's lash start), as his Solen's hair does, so it sits the same on every body and in every pose. The
same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/solen-mane-from-ref.py src/sprite/items/solenManeArt.ts
"""

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402

REPAINT = importlib.import_module('bronze-repaint-from-ref')

# How many rows his diadem is lifted on Solen's head: the two rows his mane was lifted (his head's top three
# rows sat lower than ours), plus four more so its band lies over Solen's brow and its drop hangs clear of
# the brows (the owner's circles of 2026-10-30 on the drop's pixels at the brow's inner end).
LIFT = 2
DIADEM_UP = 4

ANCHOR = R.ANCHOR


def lifted(piece, rows=LIFT):
    m, c, isl = piece
    out_m = np.zeros_like(m)
    out_c = np.zeros_like(c)
    out_l = np.zeros_like(isl)
    out_m[:-rows] = m[rows:]
    out_c[:-rows] = c[rows:]
    out_l[:-rows] = isl[rows:]
    return out_m, out_c, out_l


def kind_ts(name, palette, piece):
    found = {h: R.material([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], piece) for h in palette.values()}
    names = sorted(set(found.values()))
    out = [f"/** What each colour of {name} is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */",
           f"export const {name}_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{"]
    out += [f"  '{h}': '{found[h]}'," for h in sorted(found)]
    out += ['};', '']
    return out


def main(out):
    col, on = REPAINT.his()
    pieces, who = REPAINT.ours()
    rep, own = REPAINT.build(col, on, pieces, who)
    diadem = lifted(rep['diadem'], LIFT + DIADEM_UP)
    nx, ny = ANCHOR
    gold = R.middle_colour({'diadem': diadem}, ['diadem'], ('warm',))
    t = [
        "// The owner's bronze warrior's diadem on Solen's head, his pixels (tools/refs/solen-mane-from-ref.py from",
        '// docs/reference/bronze-warrior-repaint-owner-reference.jpg). Generated: rerun the script to change it:',
        f'//   python3 -I tools/refs/solen-mane-from-ref.py {out}',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
    ]
    dm, dc, _ = diadem
    drows, dorigin, dpal = R.pack(dc, dm)
    t += [R.ts_piece('SOLEN_DIADEM', "His bronze diadem across the brow, lifted onto Solen's head: stamped on the face anchor, over any hair.", drows, dorigin, dpal, (nx + 0.5, ny + 0.5), -90.0)]
    t += kind_ts('SOLEN_DIADEM', dpal, 'diadem')
    t += ["/** His middle bronze of the diadem: the colour slot's default. */", f"export const SOLEN_DIADEM_BRONZE = '{gold}';", '']
    R.write(out, '\n'.join(t))
    print('diadem', int(dm.sum()), 'gold', gold)


if __name__ == '__main__':
    main(sys.argv[1])
