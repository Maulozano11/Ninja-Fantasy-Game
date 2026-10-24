"""The owner's Solen with his far arm reaching out (docs/reference/solen-owner-reference.jpg).

He drew Solen's far arm hanging behind the body, in shadow and thin: its upper arm a 2 px strip of skin
between two lines, its bracer two thin steel strips, its fist 4 px across. Stretched out at a target (casting
at the runes, pointing the throw, the cross of the combo) that arm reads as a line, not an arm. His
repaint of Ren casting (2026-10-21, "mira los brazos del cuadro 0 ponlos asi"; for Solen: "tambien en los de
solen copia los brazos de mi dibujo") shows the far arm stretched out to the runes as thick as the near one:
the bare upper arm, the forearm and the fist full thickness.

So the far arm reaching out is his near arm, mirrored: this script lifts, every pixel in his exact colour,
the same pieces solen-tunic-from-ref.py and solen-bracers-from-ref.py lift for the near arm

  the sleeve   his navy short sleeve on the near shoulder
  the arm      his bare near upper arm in his skin and shading, below the sleeve
  the bracer   his near steel bracer, elbow to wrist
  the fist     his near fist

and mirrors each left to right (each row reversed; the joint it rides mirrored with it, and the limb's angle
a with it, 180 - a), so his lit side, which faces the light on the hanging near arm, faces it again on the
far arm held out level. Nothing is redrawn: the pixels and colours are his near arm's. The game stamps them
on our far joints while the far arm reaches out (src/sprite/items/founderOut.ts founderFarReach).

It writes the pieces as TypeScript (src/sprite/items/founderReachArt.ts). The same picture always gives the
same bytes:

  python3 -I tools/refs/solen-reach-from-ref.py src/sprite/items/founderReachArt.ts
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import solen_ref as R  # noqa: E402

DOC = (
    "// The owner's near arm mirrored for Solen's far arm reaching out, his pixels (tools/refs/\n"
    '// solen-reach-from-ref.py from docs/reference/solen-owner-reference.jpg). Generated: rerun the script to\n'
    '// change it.\n'
)


def mirrored(const, doc, rows, origin, palette, joint, ang):
    """A PaintedPiece mirrored left to right: its rows reversed, its pivot (the cell over `joint`, his pixels)
    mirrored with them and its angle a turned to 180 - a."""
    w = max(len(r) for r in rows)
    px = int(np.floor(joint[0])) - origin[0]
    py = int(np.floor(joint[1])) - origin[1]
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [f'/** {doc} */', f'export const {const}: PaintedPiece = {{',
           f'  pivot: [{w - 1 - px}, {py}],',
           f'  angle: {180 - ang:.2f},', '  rows: [']
    out += [f"    '{r.ljust(w, '.')[::-1]}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    a = R.native(R.REF)
    masks, cols, _filled = R.pieces(a)
    J = R.JOINTS
    consts = [
        ('FOUNDER_REACH_SLEEVE_F', 'sleeve_n', 'His navy near sleeve mirrored: over the far upper arm reaching out, about the far shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('FOUNDER_REACH_ARM_F', 'arm_n', 'His bare near upper arm mirrored: the far upper arm reaching out, about the far shoulder.', J['shoulderN'], R.angle('shoulderN', 'elbowN')),
        ('FOUNDER_REACH_BRACER_F', 'bracer_n', 'His near steel bracer mirrored: the far forearm reaching out, about the far elbow.', J['elbowN'], R.angle('elbowN', 'wristN')),
        ('FOUNDER_REACH_HAND_F', 'hand_n', 'His near fist mirrored: the far fist reaching out, on the far wrist.', J['wristN'], R.angle('wristN', 'handN')),
    ]
    kinds_ = {}
    body = []
    for const, n, doc, joint, ang in consts:
        rows, origin, palette = R.pack(cols[n], masks[n])
        for h in palette.values():
            kinds_[h] = R.kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        body.append(mirrored(const, doc, rows, origin, palette, joint, ang))
    names = ' | '.join(f"'{k}'" for k in R.KINDS)
    text = [DOC, "import type { PaintedPiece } from '../painted';", '']
    text.append('/** What each of his colours is, as the script sorts them (tools/refs/solen_ref.py kind). */')
    text.append(f'export const FOUNDER_REACH_KIND: Record<string, {names}> = {{')
    text += [f"  '{h}': '{kinds_[h]}'," for h in sorted(kinds_)]
    text += ['};', '']
    text += body
    if out_ts:
        R.write(out_ts, '\n'.join(text))
    print(len(consts), 'pieces')


if __name__ == '__main__':
    main()
