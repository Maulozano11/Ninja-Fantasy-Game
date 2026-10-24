"""The owner's hair and headband on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg):
the hair option 'Noble Spikes' and the accessory 'Noble Headband'.

His head is shrunk to our Roman head's size and cleaned with his palette only (tools/refs/noble_ref.py). There
his hair is spiky black-blue locks lit in grey-blue over the crown, strands over the brow and the ear, and his
brown cloth band across the brow with its knot behind the head and two long tails hanging down beside the near
cheek. This script lifts:

  front     every pixel of his hair over the head, his line included
  back      the same with what his face hides filled in: his locks run on down behind the forehead between
            his strands (each hidden cell takes his nearest hair above it); drawn behind the head, it shows
            only where a head is narrower than his
  band      his headband: the band across the brow, the knot and the tails, his pixels (the game's plain
            cloth headband is drawn with shapes in one colour and cannot show his, so it is an accessory)

each a PaintedPiece pivoted on the face anchor, and writes src/sprite/items/nobleHairArt.ts. With a second
argument, a folder, it writes them beside his head at our scale at 8x. Run from the repo root:

  python3 -I tools/refs/noble-hair-from-ref.py src/sprite/items/nobleHairArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import noble_ref as N  # noqa: E402


def lift():
    g, m, part, GK = N.game()
    pcs = N.pieces()
    hair, col = pcs['hair']
    band, bcol = pcs['headband']
    # behind his face: his locks run on down to the lash row between his outermost hair cells on each row
    hidden = np.zeros(hair.shape, bool)
    for y in range(N.ANCHOR[1] + 1):
        r = np.nonzero(hair[y] | band[y])[0]
        if len(r):
            hidden[y, r.min():r.max() + 1] = True
    hidden &= ~hair & m
    src = hair & (GK != 'line')
    back = N.continue_along(col, src, hidden, (0, 1), 1)
    return {'front': (hair, col), 'back': (hair | hidden, back), 'band': (band, bcol)}


def kind_of(rgb, const):
    k = N.kind(rgb)
    if k == 'line':
        return 'line'
    return 'cloth' if const == 'NOBLE_HEADBAND' else 'hair'


def main():
    out_ts = sys.argv[1]
    study = sys.argv[2] if len(sys.argv) > 2 else None
    P = lift()
    bases = {
        'NOBLE_HAIR_BASE': N.middle(['front'], P, ('dark', 'white', 'blue')),
        'NOBLE_HEADBAND_BASE': N.middle(['band'], P, ('brown',)),
    }
    consts = [
        ('NOBLE_HAIR_BACK', *P['back'], 'His hair with what his face hides filled in, drawn behind the head. Its pivot is the cell on the face anchor.', N.ANCHOR, 0),
        ('NOBLE_HAIR_FRONT', *P['front'], 'His hair over the head, his line included. Its pivot is the cell on the face anchor.', N.ANCHOR, 0),
        ('NOBLE_HEADBAND', *P['band'], 'His brown headband: the band across the brow, the knot and the two tails. Its pivot is the cell on the face anchor.', N.ANCHOR, 0),
    ]
    N.write(out_ts, N.module(N.header('noble-hair-from-ref.py', "The owner's hair and headband on his noble swordsman"), consts, bases, 'NOBLE_HAIR', kind_of))
    if study:
        os.makedirs(study, exist_ok=True)
        N.study(os.path.join(study, 'hair@8.png'), ['back', 'front', 'band'], {'back': P['back'], 'front': P['front'], 'band': P['band']})
    print(bases)


if __name__ == '__main__':
    main()
