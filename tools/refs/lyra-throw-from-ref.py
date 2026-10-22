"""Lyra's throw, frames 3 and 4: the owner's repaint (docs/reference/lyra-throw-owner-reference.jpg;
lyra_throw_ref.py says how his picture is read and brought down to our scale), as painted pieces pinned
to our rig: src/sprite/items/lyraThrowArt.ts.

His "Cuadro 1" is the release (our 'throw' frame 3): the sword thrust straight out at the target, in her
fist. His "Cuadro 2" is the follow-through (frame 4): the near arm swung up and back over the head, the
head carried forward, no pink patch behind it. Each is cut by owner (lyra_throw_ref.ZONES) and body part
(ARM, LEG_ROWS below), every pixel one of his in his colour. Our throw's rig stays as it is (its release
is the owner's earlier warp-throw reference, the pose every other character throws in), so his pose is
not our joints': every piece of his frame is pinned to her pelvis in that frame (JOINTS, printed by
`npx tsx tools/refs/lyra-pose-joints.mts`), and the frame moves as one with her body. Laid there they are
exactly his frame at our scale (check()).

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/lyra-throw-from-ref.py [src/sprite/items/lyraThrowArt.ts] [studyDir]
"""

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lyra_throw_ref as R  # noqa: E402
import owner_frames as F  # noqa: E402
import owner_paintover as P  # noqa: E402

OUT = 'src/sprite/items/lyraThrowArt.ts'
# Her preset's rig in 'throw' frames 3 and 4, fine pixels: tools/refs/lyra-pose-joints.mts.
JOINTS = {
    0: {'head': (160.000000, 168.000000), 'neck': (142.959721, 158.036198), 'pelvis': (131.250000, 182.102667), 'shoulderN': (133.531456, 157.707843), 'shoulderF': (146.796057, 166.654929), 'elbowN': (125.168493, 146.981200), 'elbowF': (133.317988, 168.482949), 'wristN': (114.856436, 141.846867), 'wristF': (129.812050, 181.721387), 'handN': (112.600584, 140.723687), 'handF': (129.166918, 184.157409), 'hipN': (125.653996, 178.328115), 'hipF': (136.846004, 185.877219), 'kneeN': (113.969758, 196.712309), 'kneeF': (151.993435, 200.430753), 'ankleN': (105.069119, 208.837844), 'ankleF': (139.935771, 208.500000)},
    1: {'head': (162.000000, 166.000000), 'neck': (144.792495, 156.580563), 'pelvis': (132.250000, 180.223708), 'shoulderN': (135.381433, 155.923366), 'shoulderF': (148.325705, 165.327930), 'elbowN': (125.394981, 146.689148), 'elbowF': (134.745506, 166.088318), 'wristN': (115.649164, 140.547572), 'wristF': (130.247646, 179.023429), 'handN': (113.517183, 139.204049), 'handF': (129.419989, 181.403635), 'hipN': (126.789135, 176.256157), 'hipF': (137.710865, 184.191258), 'kneeN': (116.202336, 195.293481), 'kneeF': (153.623532, 197.903917), 'ankleN': (104.694357, 204.979369), 'ankleF': (141.262322, 205.500000)},
}
# Every piece is pinned to her pelvis (his pose is not our throw's joints).
PIN = 'pelvis'

# Body parts (the brought-down frame's columns and rows): the near arm's upper arm (the puffed sleeve and
# the bare shoulder), forearm (the bracer and cuff) and hand (the fist); the legs left and right of
# NEAR_X, cut into thigh, shin and foot at LEG_ROWS.
ARM = {
    0: {'upperArmN': [(35, 21), (49, 21), (49, 34), (35, 34)], 'forearmN': [(43, 32), (52, 32), (52, 42), (43, 42)], 'handN': [(49, 33), (58, 33), (58, 43), (49, 43)]},
    1: {'upperArmN': [(26, 9), (36, 9), (44, 16), (44, 30), (34, 30), (26, 16)], 'forearmN': [(19, 3), (31, 3), (31, 15), (19, 15)], 'handN': [(12, 2), (21, 2), (21, 12), (12, 12)]},
}
NEAR_X = {0: 30, 1: 28}
LEG_ROWS = {0: {'N': (66, 77), 'F': (64, 77)}, 1: {'N': (68, 77), 'F': (68, 77)}}


def parts_of(k):
    def parts(owner, m):
        H, W = m.shape
        if owner in ('top', 'armor'):
            out = []
            taken = np.zeros_like(m)
            for part in ('handN', 'forearmN', 'upperArmN'):
                z = m & P.inside(ARM[k][part], H, W) & ~taken
                if owner == 'armor' and part == 'handN':
                    z &= False
                out.append(('N', part, z))
                taken |= z
            return out + [('T', 'torso', m & ~taken)]
        if owner == 'feet':
            xs = np.arange(W)[None, :]
            ys = np.arange(H)[:, None]
            out = []
            for s, side in (('N', xs < NEAR_X[k]), ('F', xs >= NEAR_X[k])):
                a, b = LEG_ROWS[k][s]
                out += [(s, f'thigh{s}', m & side & (ys < a)), (s, f'shin{s}', m & side & (ys >= a) & (ys < b)), (s, f'foot{s}', m & side & (ys >= b))]
            return out
        return [('T', F.PART_OF_OWNER[owner], m)]

    return parts


def frame_pieces(k):
    m, fg, line = R.frame(k)
    own, masks = R.owners(k)
    place = R.to_frame(k)
    want = {}
    for o, mk in masks.items():
        for y, x in zip(*np.nonzero(mk)):
            want[place(x, y)] = P.hexs(m[y, x])
    pcs = F.pieces(masks, m, place, JOINTS[k], parts_of(k), R.LINE, PIN)
    F.check(pcs, want)
    return pcs, want


DOC = """// Lyra's throw, frames 3 and 4: the owner's repaint, his pixels brought down to our scale (tools/refs/
// lyra-throw-from-ref.py from docs/reference/lyra-throw-owner-reference.jpg). Generated: rerun the script to change it.
"""


def module(frames):
    out = [DOC, "import type { OwnerPiece } from '../ownerFrames';", '']
    out.append("/** His 'Cuadro 1' (the release, 'throw' frame 3) and 'Cuadro 2' (the follow-through, frame 4), each cut by owner and part, pinned to her joints. */")
    out.append('export const LYRA_THROW: OwnerPiece[][] = [')
    for k, pcs in enumerate(frames):
        out.append(f'  // {R.NAMES[k]}')
        out.append('  [')
        out.append(',\n'.join(F.ts_piece(p) for p in pcs) + ',')
        out.append('  ],')
    out.append('];')
    out.append('')
    return '\n'.join(out)


def study(wants, d):
    os.makedirs(d, exist_ok=True)
    for k, want in enumerate(wants):
        img = np.full((256, 256, 3), 255, np.uint8)
        for (x, y), h in want.items():
            img[y, x] = F.rgb(h)
        P.save(img[120:225, 85:190], os.path.join(d, f'throw-{R.FRAMES[k]}-his.png'), 6)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    frames, wants = [], []
    for k in range(2):
        pcs, want = frame_pieces(k)
        frames.append(pcs)
        wants.append(want)
    with open(out, 'w') as f:
        f.write(module(frames))
    if len(sys.argv) > 2:
        study(wants, sys.argv[2])
    print(out, ', '.join(f'{R.NAMES[k]}: {len(frames[k])} pieces, {len(wants[k])} pixels' for k in range(2)))


if __name__ == '__main__':
    main()
