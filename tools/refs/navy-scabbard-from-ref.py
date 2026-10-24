"""The owner's scabbard on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the accessory
'Sabre Scabbard', navy with gold fittings and a red stone at its throat. He drew it in his near fist; the game
hangs it at the hip (the owner, 2026-10-24: "no dibujes la espada ni la mano en la espada ponlo en nuestra pose").

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only, and continues
the scabbard through his fist along its line (navy_ref.pieces). This script writes it, pivoted on its throat at
the scabbard's angle, to src/sprite/items/navyScabbardArt.ts. With a second argument, a folder, it
writes it beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-scabbard-from-ref.py src/sprite/items/navyScabbardArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    (x0, y0), (x1, y1), _ = N.SCABBARD
    ang = N.angle_of((x1, y1), (x0, y0))
    N.simple_module('navy-scabbard-from-ref.py', 'high', sys.argv[1], 'NAVY_SCABBARD', "The owner's scabbard on his navy officer", [
        ('', 'scabbard', "The scabbard, its throat, gold fittings and chape. Its pivot is the cell at its throat, at the scabbard's angle (from the throat to the chape).", ((x1 - N.BODY_AT[0]) / N.BODY_SCALE, (y1 - N.BODY_AT[1]) / N.BODY_SCALE), ang),
    ], [('CLOTH', ('dark', 'grey')), ('GOLD', ('gold',)), ('STONE', ('red', 'wine'))], {'gold': 'gold', 'white': 'gold', 'red': 'stone', 'wine': 'stone', 'brown': 'gold'}, sys.argv[2] if len(sys.argv) > 2 else None)
