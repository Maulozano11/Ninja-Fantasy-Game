"""Lyra reading, the owner's three frames (docs/reference/lyra-read-owner-reference.jpg; lyra_read_ref.py
says how his picture is read), as painted pieces pinned to our rig: src/sprite/items/lyraReadArt.ts.

Each frame of his ("Atenta", "Leyendo", "Pasando pagina": the read pose's three keys, rig.ts READ_KEYS)
is cut by owner (lyra_read_ref.ZONES) and by body part (PARTS below), every pixel his, in his colour, one
for one. The rock and the earth under it are not hers (seat-rock-from-ref.py lifts them as the seat
prop). Her pieces are pinned to the joints of her preset's rig in that key (JOINTS, printed by
`npx tsx tools/refs/lyra-pose-joints.mts`), so laid on them they are exactly his frame (check()), and
the book (campfx.ts) rides her near wrist.

Where he hid something of the book under her hands, the book is continued under them from his own
pixels (the book is drawn for every reader, whose hands are elsewhere): each hidden cell takes the
nearest pixel of his book in its row, inside the book's outline. Her hands lie over it, as he drew them.

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/lyra-read-from-ref.py [src/sprite/items/lyraReadArt.ts] [studyDir]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lyra_read_ref as R  # noqa: E402
import owner_frames as F  # noqa: E402
import owner_paintover as P  # noqa: E402

OUT = 'src/sprite/items/lyraReadArt.ts'
# Her preset's rig in the three keys (rig frames 0, 2 and 8), fine pixels: tools/refs/lyra-pose-joints.mts.
JOINTS = {
    0: {'head': (118.000000, 146.000000), 'neck': (113.334313, 153.272960), 'pelvis': (108.000000, 179.500000), 'shoulderN': (104.122333, 155.307518), 'shoulderF': (119.199839, 160.661844), 'elbowN': (105.388899, 168.849889), 'elbowF': (121.406099, 174.083186), 'wristN': (115.686065, 163.685755), 'wristF': (127.278668, 161.711413), 'handN': (117.938659, 162.556056), 'handF': (128.359287, 159.434867), 'hipN': (101.639177, 177.241143), 'hipF': (114.360823, 181.758857), 'kneeN': (115.604621, 193.958391), 'kneeF': (131.371523, 194.083063), 'ankleN': (115.604621, 209.000000), 'ankleF': (133.000000, 208.500000)},
    1: {'head': (118.000000, 146.000000), 'neck': (113.334313, 153.272960), 'pelvis': (108.000000, 179.500000), 'shoulderN': (104.122333, 155.307518), 'shoulderF': (119.199839, 160.661844), 'elbowN': (105.053557, 168.877073), 'elbowF': (117.818540, 174.192994), 'wristN': (115.750238, 164.601453), 'wristF': (125.380485, 162.775254), 'handN': (118.090230, 163.666124), 'handF': (126.771969, 160.674260), 'hipN': (101.639177, 177.241143), 'hipF': (114.360823, 181.758857), 'kneeN': (115.604621, 193.958391), 'kneeF': (131.371523, 194.083063), 'ankleN': (115.604621, 209.000000), 'ankleF': (133.000000, 208.500000)},
    2: {'head': (118.000000, 146.000000), 'neck': (113.334313, 153.272960), 'pelvis': (108.000000, 179.500000), 'shoulderN': (104.122333, 155.307518), 'shoulderF': (119.199839, 160.661844), 'elbowN': (104.237604, 168.908500), 'elbowF': (131.369207, 166.736914), 'wristN': (115.373399, 165.959946), 'wristF': (128.252569, 153.401458), 'handN': (117.809450, 165.314924), 'handF': (127.679072, 150.947583), 'hipN': (101.639177, 177.241143), 'hipF': (114.360823, 181.758857), 'kneeN': (115.604621, 193.958391), 'kneeF': (131.371523, 194.083063), 'ankleN': (115.604621, 209.000000), 'ankleF': (133.000000, 208.500000)},
}

# Body parts (panel 1's columns). The near arm: the bare shoulder, the scarf band and the puffed sleeve
# (upper arm), the bracer on the forearm, the hand at the book's foot; the far arm shows only its hand,
# at the book's far end (lifting the page in the third frame). The legs: the near boot and thigh left of
# NEAR_LEG_X on each row, the far ones right of it, each cut into thigh (the bare thigh and the gold
# cuff), shin (the shaft) and foot (below the ankle strap) at its rows.
UPPER_ARM_N = [(20, 22), (31, 22), (31, 30), (30, 31), (30, 46), (20, 46)]
FOREARM_N = [(27, 40), (40, 40), (40, 47), (27, 47)]
HAND_N = [(38, 37), (52, 37), (52, 49), (38, 49)]
HAND_F = [(50, 22), (66, 22), (66, 46), (50, 46)]
NEAR_LEG_X = {y: (53 if y >= 62 else 50) for y in range(R.ROWS)}
LEG_ROWS = {'N': (62, 87), 'F': (61, 85)}


def parts(owner, m):
    H, W = m.shape
    if owner in ('top', 'armor'):
        up = P.inside(UPPER_ARM_N, H, W)
        fore = P.inside(FOREARM_N, H, W)
        hn = P.inside(HAND_N, H, W)
        hf = P.inside(HAND_F, H, W)
        if owner == 'top':
            out = [('N', 'handN', m & hn), ('F', 'handF', m & hf & ~hn), ('N', 'upperArmN', m & up & ~hn & ~hf)]
        else:
            out = [('N', 'forearmN', m & fore & ~up), ('N', 'upperArmN', m & up)]
        rest = m & ~np.logical_or.reduce([o[2] for o in out])
        return out + [('T', 'torso', rest)]
    if owner == 'feet':
        out = []
        xs = np.arange(W)[None, :]
        near = xs < np.array([NEAR_LEG_X[y] for y in range(H)])[:, None]
        for s, side in (('N', near), ('F', ~near)):
            a, b = LEG_ROWS[s]
            ys = np.arange(H)[:, None]
            out += [(s, f'thigh{s}', m & side & (ys < a)), (s, f'shin{s}', m & side & (ys >= a) & (ys < b)), (s, f'foot{s}', m & side & (ys >= b))]
        return out
    return [('T', F.PART_OF_OWNER[owner], m)]


def book_under_hands(masks, col, k):
    """The book continued under her hands: the cells of his hands inside the book's outline take the
    nearest book pixel in their row (his line excepted where he drew it between)."""
    book = masks['book'].copy()
    hands = masks.get('top', np.zeros_like(book)) & (P.inside(HAND_N, *book.shape) | P.inside(HAND_F, *book.shape))
    out = col.copy()
    _, fg, line = R.frame(k)
    for y in range(book.shape[0]):
        xs = np.nonzero(book[y] & ~line[y])[0]
        if not len(xs):
            continue
        for x in np.nonzero(hands[y] & ~book[y])[0]:
            if xs.min() < x < xs.max():
                j = xs[np.argmin(np.abs(xs - x))]
                out[y, x] = col[y, j]
                book[y, x] = True
    return book, out


# Where his sit sword lies on each frame's (his sit column and row less the frame's), and how many of its
# pixels another piece of hers hides.
SHIFTS = {}
HIDDEN = {}


def frame_pieces(k):
    m, fg, line = R.frame(k)
    own, masks = R.owners(k)
    masks.pop('seat', None)
    want = {}
    for o, mk in masks.items():
        if o == 'held':
            continue
        for y, x in zip(*np.nonzero(mk)):
            want[R.to_frame(x, y)] = P.hexs(m[y, x])
    # her sword with his sit picture's blade (lyra_read_ref.sword_blade; past his picture's edge in
    # "Atenta" too), in our fine pixels (his line between it and another piece of hers goes with both):
    # where it meets another piece of hers in another colour, that piece is in front
    sword = np.zeros((256, 256), bool)
    scol = np.zeros((256, 256, 3), int)
    cells, SHIFTS[k] = R.sword_blade(k, masks.pop('held'))
    for (x, y), hx in cells.items():
        fx, fy = R.to_frame(x, y)
        if want.get((fx, fy), hx) != hx:
            HIDDEN[k] = HIDDEN.get(k, 0) + 1
            continue
        sword[fy, fx] = True
        scol[fy, fx] = F.rgb(hx)
        want[(fx, fy)] = hx
    pcs = F.pieces(masks, m, R.to_frame, JOINTS[k], parts, R.LINE) + F.pieces({'held': sword}, scol, lambda x, y: (x, y), JOINTS[k], parts, R.LINE)
    pcs.sort(key=lambda p: p['owner'])
    F.check(pcs, want)
    # the book for every reader: continued under her hands, laid under them
    book, bcol = book_under_hands(masks, m, k)
    whole = F.pieces({'book': book}, bcol, R.to_frame, JOINTS[k], parts, R.LINE)
    pcs = [p for p in pcs if p['owner'] != 'book'] + whole
    return pcs, want


DOC = """// Lyra reading: the owner's three frames, his pixels one for one (tools/refs/lyra-read-from-ref.py from
// docs/reference/lyra-read-owner-reference.jpg). Generated: rerun the script to change it.
"""


def module(frames):
    out = [DOC, "import type { OwnerPiece } from '../ownerFrames';", '']
    out.append("/** His frames 'Atenta', 'Leyendo' and 'Pasando pagina' (rig.ts READ_KEYS), each cut by owner and part, pinned to her joints. */")
    out.append('export const LYRA_READ: OwnerPiece[][] = [')
    for k, pcs in enumerate(frames):
        out.append(f'  // {R.NAMES[k]}')
        out.append('  [')
        out.append(',\n'.join(F.ts_piece(p) for p in pcs) + ',')
        out.append('  ],')
    out.append('];')
    out.append('')
    return '\n'.join(out)


def study(frames, wants, d):
    os.makedirs(d, exist_ok=True)
    for k, (pcs, want) in enumerate(zip(frames, wants)):
        img = np.full((256, 256, 3), 255, np.uint8)
        for (x, y), h in want.items():
            img[y, x] = F.rgb(h)
        P.save(img[110:225, 60:170], os.path.join(d, f'read-{k}-his.png'), 6)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    frames, wants = [], []
    for k in range(3):
        pcs, want = frame_pieces(k)
        frames.append(pcs)
        wants.append(want)
    with open(out, 'w') as f:
        f.write(module(frames))
    if len(sys.argv) > 2:
        study(frames, wants, sys.argv[2])
    print(out, ', '.join(f'{R.NAMES[k]}: {len(frames[k])} pieces, {len(wants[k])} pixels, his sit sword at {SHIFTS[k]}, {HIDDEN.get(k, 0)} hidden' for k in range(3)))


if __name__ == '__main__':
    main()
