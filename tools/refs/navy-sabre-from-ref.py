"""The owner's sabre on his navy officer (docs/reference/navy-officer-owner-reference.jpg): the held option
'Officer's Sabre', its gold swept guard and knuckle bow with a blue jewel, a dark grip.

tools/refs/navy_ref.py shrinks his picture to our male rig and cleans it with his palette only (the hilt read
cell by cell from his pixels: navy_ref.HILT). He drew only the hilt, in his far fist at his hip: the blade is
behind his body. The blade the game shows when the sabre is drawn is made of his own colours, as long as his
scabbard (navy_ref.sabre_pieces: a proposal for him to see; at rest it stays hidden as in his picture). Both
are pivoted on his far fist, at the sabre's angle there, and written to src/sprite/items/navySabreArt.ts. With a
second argument, a folder, it writes them beside his figure at 8x. Run from the repo root:

  python3 -I tools/refs/navy-sabre-from-ref.py src/sprite/items/navySabreArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import navy_ref as N  # noqa: E402

if __name__ == '__main__':
    P = N.sabre_pieces()
    hand = N.joint('handF')
    ang = N.angle_of(*N.SABRE_AXIS)
    consts = [
        ('NAVY_SABRE_HILT', *P['hilt'], 'The hilt: his gold quillons and knuckle bow, the blue jewel, the dark grip. Its pivot is the cell in his far fist, at the blade\'s angle.', hand, ang),
        ('NAVY_SABRE_BLADE', *P['blade'], 'The blade he did not draw, made of his colours (hidden at rest, as in his picture). Its pivot is the cell in his far fist.', hand, ang),
    ]
    bases = {'NAVY_SABRE_GOLD': N.middle(['hilt'], P, ('gold',)), 'NAVY_SABRE_GRIP': N.middle(['hilt'], P, ('dark', 'grey')), 'NAVY_SABRE_JEWEL': N.middle(['hilt'], P, ('blue',)), 'NAVY_SABRE_STEEL': N.hexc(N.BLADE_STEEL)}
    table = {'gold': 'gold', 'white': 'steel', 'blue': 'jewel', 'grey': 'grip', 'dark': 'grip', 'brown': 'gold', 'cream': 'steel'}
    N.run_part('navy-sabre-from-ref.py', "The owner's sabre on his navy officer", sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None, consts, bases, 'NAVY_SABRE', N.kinds_by(table))
