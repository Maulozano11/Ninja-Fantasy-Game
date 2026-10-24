"""The owner's sabre on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the held option
'Officer's Sabre', its gold swept guard and knuckle bow with a blue jewel, a dark grip.

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only (the hilt read
cell by cell from his pixels: navy_ref.HILT). He drew only the hilt, in his far fist at his hip, pointing down to
the left (its blade behind his body). The game holds it in our near fist as it holds every sword (the owner,
2026-10-24: "no dibujes la espada ni la mano en la espada ponlo en nuestra pose"), so his hilt is turned over
left to right to point forward, and the blade is made of his own colours, as long as his scabbard
(navy_ref.sabre_pieces: a proposal for him to see). Pivoted on the fist, at the sabre's angle, written to
src/sprite/items/navySabreArt.ts. Run from the repo root:

  python3 -I tools/refs/navy-sabre-from-ref.py src/sprite/items/navySabreArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import navy_ref as N  # noqa: E402

def mirrored(mask, col, pivot):
    """The piece turned over left to right about its pivot's column (his hilt drawn pointing down to the left,
    held in our near fist pointing forward): on a wider canvas, its pivot the mirrored cell."""
    H, W = mask.shape
    cx = int(pivot[0])
    shift = 40
    m2 = np.zeros((H, W + 2 * shift), bool)
    c2 = np.zeros((H, W + 2 * shift, 3), np.int32)
    for y, x in zip(*np.nonzero(mask)):
        m2[y, 2 * cx - x + shift] = True
        c2[y, 2 * cx - x + shift] = col[y, x]
    return m2, c2, (cx + shift + 0.5, pivot[1])


if __name__ == '__main__':
    P = N.sabre_pieces()
    hand = N.joint('handF')
    ang = N.angle_of(*N.SABRE_AXIS)
    hm, hc = P['hilt']
    bm, bc = P['blade']
    whole = hm | bm
    wc = np.where(hm[..., None], hc, bc)
    m2, c2, piv = mirrored(whole, wc, hand)
    hm2, hc2, _ = mirrored(hm, hc, hand)
    consts = [
        ('NAVY_SABRE', m2, c2, "The sabre as the near fist holds it: his hilt (his gold quillons and knuckle bow, the blue jewel, the dark grip) turned over to point forward, and the blade he did not draw, made of his colours (a proposal). Its pivot is the cell in the fist, at the blade's angle.", piv, 180 - ang),
        ('NAVY_SABRE_HILT', hm2, hc2, 'His hilt alone, turned over as the sabre is (for the creator\'s part picture).', piv, 180 - ang),
    ]
    bases = {'NAVY_SABRE_GOLD': N.middle(['hilt'], P, ('gold',)), 'NAVY_SABRE_GRIP': N.middle(['hilt'], P, ('dark', 'grey')), 'NAVY_SABRE_JEWEL': N.middle(['hilt'], P, ('blue',)), 'NAVY_SABRE_STEEL': N.hexc(N.BLADE_STEEL)}
    table = {'gold': 'gold', 'white': 'steel', 'blue': 'jewel', 'grey': 'grip', 'dark': 'grip', 'brown': 'gold', 'cream': 'steel'}
    N.run_part('navy-sabre-from-ref.py', "The owner's sabre on his navy officer", sys.argv[1], None, consts, bases, 'NAVY_SABRE', N.kinds_by(table))
