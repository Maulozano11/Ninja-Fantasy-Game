"""The owner's picture of Lyra sitting (docs/reference/lyra-sit-owner-reference.jpg), lifted as painted
pieces pinned to our rig: src/sprite/items/lyraSitArt.ts. lyra_read_ref.py also takes her sword's tip from
it (tip()).

His picture (2000 x 2000, 2026-10-22) is one frame of his Lyra sitting on a rock: the far arm reaching out
forward with the hand open, the near arm hanging at her side, her sword at her hip with its long blade
running down to the left over the rock, the near boot straight down and the far leg stretched forward. He
decided that this picture and his read picture are the new standard sit and read for every character
("copialo exacto me encanta estas poses nuevas de sentado y leyendo es el nuevo standard"), with the rock
an object of its own that changes with the scene ("puedes usar la piedra tambien como objeto pero ese
objeto cambiara dependiendo del escenario"), and of her hands: "mira como estan sus manos se ven excelentes
copialo igual".

His grid: 100 x 100 of his pixels, 20 picture pixels each, phase 0 (the column and row edges repeat every
20.00 picture pixels from 0, without drift), on a white page. He drew her at OUR scale, on the figure of his
read frames: her head, torso and hips lie on his "Atenta" to the pixel, his pixel (x, y) being "Atenta"'s
(x - 15, y - 4), and her boots one row higher there. So every pixel is taken one for one, and his pixel
(x, y) is our fine pixel (x + OFFSET[0], y + OFFSET[1]): his soles (row 95) on our ground row 215, the
whole figure one row lower than her read pose has it.

Every pixel belongs to one owner, the option of hers that draws it, as in lyra_read_ref.py: her hair, her
face, the blouse (with the skin of her shoulders, arms and hands), the corset (with the bracer and the
pauldron), the skirt, the tabard (with its lining over the rock and its front tail between her boots), the
belt, the boots (with the bare thighs above them), the sword, and the rock and the earth (the seat prop,
seats.ts: not hers). ZONES says which, in his columns; his black line goes with every owner it touches.
Each owner is then cut by body part (PARTS) and pinned to the rig joint of the part (owner_frames.py): her
preset's rig in the sit pose (rig.ts SIT, posed toward his joints), so laid on it the pieces are exactly
his frame (check()). His one frame is every frame of the sit loop (rig.ts SIT_KEYS).

The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/lyra_sit_ref.py [src/sprite/items/lyraSitArt.ts] [studyDir]
"""

import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lyra_read_ref as R  # noqa: E402
import owner_frames as F  # noqa: E402
import owner_paintover as P  # noqa: E402

REF = os.path.join(P.REPO, 'docs', 'reference', 'lyra-sit-owner-reference.jpg')
OUT = 'src/sprite/items/lyraSitArt.ts'
PITCH = 20.0
CELLS = 100
OFFSET = (59, 120)
# His white page, and how far from it a pixel is still page.
PAGE = (255, 255, 255)
PAGE_TOL = 14
# Colours of his within this distance (per channel) are one colour of his; his black line, every channel
# below LINE (as lyra_read_ref.py has them).
TOL = R.TOL
LINE = R.LINE

# Her preset's rig in the sit pose (its one key, rig.ts SIT_KEYS), fine pixels: tools/refs/lyra-pose-joints.mts.
JOINTS = {'head': (118.000000, 146.000000), 'neck': (113.334313, 153.272960), 'pelvis': (108.000000, 179.500000), 'shoulderN': (104.122333, 155.307518), 'shoulderF': (119.199839, 160.661844), 'elbowN': (98.576675, 167.727086), 'elbowF': (128.925837, 170.169997), 'wristN': (109.328088, 171.863148), 'wristF': (141.810155, 165.528643), 'handN': (111.680053, 172.767948), 'handF': (144.181015, 164.674581), 'hipN': (101.639177, 177.241143), 'hipF': (114.360823, 181.758857), 'kneeN': (115.604621, 193.958391), 'kneeF': (131.437571, 193.991382), 'ankleN': (115.604621, 209.000000), 'ankleF': (131.437571, 208.500000)}


def native():
    """His pixels: the median of the middle half of every cell, as a (CELLS, CELLS, 3) int array."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    n = np.zeros((CELLS, CELLS, 3), int)
    for j in range(CELLS):
        for i in range(CELLS):
            y0, y1 = int(j * PITCH + PITCH * 0.25), int(j * PITCH + PITCH * 0.75) + 1
            x0, x1 = int(i * PITCH + PITCH * 0.25), int(i * PITCH + PITCH * 0.75) + 1
            n[j, i] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), 0)
    return n


# Which owner a pixel is (his columns and rows): the last zone it falls in whose rule takes its colour (the
# colour rules are lyra_read_ref.py's). Her head, torso, belt, skirt and boots are cut as his read frames
# are (lyra_read_ref.ZONES, 15 columns and 4 rows on); her arms, sword, tabard and the rock where he drew
# them here.
def blade(m):
    """Her blade's blues (the rock under it is grey and brown)."""
    return m[..., 2] > m[..., 0] + 15


def cloth(m):
    """Her tabard's cream and tan (warm and light: not the hilt's gold or its bluish steel)."""
    d = m[..., 0] - m[..., 2]
    return (m[..., 0] > 150) & (m[..., 2] > 90) & (d > 25) & (d < 100)


# His line round the tabard's lower half and the lining over the rock, where they meet the rock: the
# tabard's left and right edges (row: its column of his line), and the hem of the lining (column: its row
# of his line). Left of the tabard and below the hem is the rock; the tabard's trim between is hers.
TABARD_LEFT = {62: 33, 63: 31, 64: 29, 65: 27, 66: 25, 67: 23, 68: 22, 69: 21, 70: 20, 71: 20, 72: 20, 73: 20, 74: 21, 75: 21,
               76: 22, 77: 23, 78: 23, 79: 24, 80: 24, 81: 25, 82: 25, 83: 26, 84: 27, 85: 29}
TABARD_RIGHT = {80: 33, 81: 33, 82: 32, 83: 32, 84: 32, 85: 32}
HEM = {**{x: 79 for x in range(33, 36)}, **{x: 80 for x in range(36, 43)}, **{x: 81 for x in range(43, 50)},
       **{x: 80 for x in range(50, 54)}, **{x: 79 for x in range(54, 61)}}


def cells(test):
    """The cells (x, y) for which test(x, y) holds, as a mask."""
    return np.array([[bool(test(x, y)) for x in range(CELLS)] for y in range(CELLS)])


LEFT_OF_TABARD = cells(lambda x, y: y in TABARD_LEFT and y > 62 and x < TABARD_LEFT[y])
IN_TABARD = cells(lambda x, y: y in TABARD_LEFT and TABARD_LEFT[y] < x < TABARD_RIGHT.get(y, 34))
BELOW_HEM = cells(lambda x, y: x in HEM and HEM[x] < y < 92)
TORSO = [(36, 26), (67, 26), (67, 52), (36, 52)]
FAR_ARM = [(60, 30), (95, 30), (95, 54), (60, 54)]
ZONES = [
    ('hair', [(25, 4), (67, 4), (67, 26), (58, 26), (58, 32), (41, 32), (41, 36), (38, 36), (38, 54), (25, 54)], None),
    ('face', [(49, 12), (62, 12), (62, 16), (49, 16)], R.skin),
    ('face', [(51, 16), (60, 16), (60, 26), (58, 29), (55, 30), (51, 30)], None),
    ('top', TORSO, None),
    ('armor', TORSO, R.leather),
    # her hair over the near shoulder, in front of the blouse
    ('hair', [(45, 26), (51, 26), (51, 36), (47, 36), (45, 33)], R.hair),
    # the far arm reaching out: the sleeve and the cuff (the blouse), the bracer and the pauldron (the
    # corset), the open hand (the blouse's skin)
    ('top', FAR_ARM, None),
    ('armor', FAR_ARM, R.leather),
    ('top', [(77, 38), (95, 38), (95, 54), (77, 54)], None),
    ('waist', [(42, 49), (68, 49), (68, 54), (42, 54)], None),
    ('bottom', [(45, 54), (71, 54), (71, 59), (67, 66), (51, 66), (45, 60)], None),
    ('feet', [(53, 57), (99, 57), (99, 99), (59, 99), (59, 66), (53, 66)], None),
    ('skirt', [(41, 49), (53, 49), (45, 66), (61, 66), (61, 81), (36, 81), (36, 88), (23, 88), (21, 68), (29, 62)], None),
    # the hilt at her hip (the tabard's cream and tan beside it are the tabard's)
    ('held', [(16, 62), (31, 50), (34, 47), (42, 47), (42, 55), (25, 66), (16, 68)], lambda m: ~cloth(m)),
    ('seat', [(0, 60), (22, 60), (23, 80), (36, 80), (36, 81), (61, 81), (61, 88), (59, 90), (59, 99), (0, 99)], lambda m: R.rock(m) & ~blade(m)),
    ('seat', [(0, 84), (99, 84), (99, 99), (0, 99)], R.earth),
    # the rock's top left of the tabard, under the blade, and its face under the hem; the tabard's trim
    ('seat', LEFT_OF_TABARD, lambda m: R.rock(m) & ~blade(m)),
    ('seat', BELOW_HEM, R.rock),
    ('skirt', IN_TABARD, None),
    # the long blade down to its tip over the rock, and the guard's upper quillon over her hair: his blues
    # and bluish steels
    ('held', [(0, 62), (26, 46), (42, 46), (42, 56), (4, 78), (0, 78)], lambda m: blade(m)),
]
# The ground round her boots (right of the rock and its earth), under their soles and between them, is the
# seat's, never her boots' (lyra_read_ref.GROUND): ground() takes it from the earth under her soles.
GROUND = [(63, 84), (CELLS, 84), (CELLS, CELLS), (63, CELLS)]
GROUND_ROW = 96

_CACHE = {}


def frame():
    """His frame: (merged colours (CELLS, CELLS, 3), figure mask, line mask), the figure being his pixels
    that are not his page."""
    if 'f' in _CACHE:
        return _CACHE['f']
    out = native()
    fg = np.abs(out - np.array(PAGE)).max(2) > PAGE_TOL
    m = P.merge(out, fg, TOL)
    line = fg & (m.max(2) < LINE)
    _CACHE['f'] = (m, fg, line)
    return _CACHE['f']


def ground(fg, line):
    """The earth he drew round her boots: every pixel of his in GROUND joined (side by side, not across
    his line) to the earth under her soles (rows from GROUND_ROW)."""
    region = P.inside(GROUND, CELLS, CELLS) & fg & ~line
    out = region.copy()
    out[:GROUND_ROW] = False
    while True:
        grow = out.copy()
        grow[1:] |= out[:-1]
        grow[:-1] |= out[1:]
        grow[:, 1:] |= out[:, :-1]
        grow[:, :-1] |= out[:, 1:]
        grow &= region
        if (grow == out).all():
            return out
        out = grow


def owners():
    """The owner per pixel: ZONES over the pixels that are not his line (a pixel no zone takes goes with
    the nearest owner), the earth round her boots the seat's, and each owner's mask with his line round it
    (owner_paintover.own_lines)."""
    m, fg, line = frame()
    own = np.full((CELLS, CELLS), '', object)
    for owner, poly, rule in ZONES:
        z = (poly if isinstance(poly, np.ndarray) else P.inside(poly, CELLS, CELLS)) & fg & ~line
        if rule is not None:
            z &= rule(m)
        own[z] = owner
    own[ground(fg, line)] = 'seat'
    return P.own_lines(own, fg, line)


def to_frame(x, y):
    """His column and row to our fine pixel."""
    return x + OFFSET[0], y + OFFSET[1]


# Body parts (his columns and rows). The near arm shows only its upper arm (the bare shoulder, the scarf
# band and the puffed sleeve hanging at her side; its forearm and hand are hidden behind her). The far arm
# reaching out: the puffed sleeve (upper arm), the bracer and the sleeve's end over it (forearm), the cuff
# and the open hand (hand). The legs: the near boot and thigh left of NEAR_LEG_X on each row, the far ones
# right of it, each cut into thigh (the bare thigh and the gold cuff), shin (the shaft, with the knee
# guard) and foot (below the ankle strap) at its rows.
UPPER_ARM_N = [(35, 26), (46, 26), (46, 34), (45, 35), (45, 50), (35, 50)]
UPPER_ARM_F = [(59, 31), (72, 31), (72, 48), (59, 48)]
FOREARM_F = [(64, 36), (77, 36), (77, 50), (64, 50)]
HAND_F = [(77, 38), (95, 38), (95, 54), (77, 54)]
NEAR_LEG_X = {y: (63 if y < 62 else 71 if y < 72 else 70) for y in range(CELLS)}
LEG_ROWS = {'N': (66, 89), 'F': (66, 89)}


def parts(owner, m):
    H, W = m.shape
    if owner in ('top', 'armor'):
        un = P.inside(UPPER_ARM_N, H, W)
        uf = P.inside(UPPER_ARM_F, H, W)
        ff = P.inside(FOREARM_F, H, W)
        hf = P.inside(HAND_F, H, W)
        if owner == 'top':
            out = [('F', 'handF', m & hf), ('F', 'upperArmF', m & uf & ~hf), ('F', 'forearmF', m & ff & ~uf & ~hf), ('N', 'upperArmN', m & un)]
        else:
            out = [('F', 'forearmF', m & ff & ~uf), ('N', 'upperArmN', m & un)]
        rest = m & ~np.logical_or.reduce([o[2] for o in out])
        return out + [('T', 'torso', rest)]
    if owner == 'feet':
        out = []
        xs = np.arange(W)[None, :]
        near = xs < np.array([NEAR_LEG_X[y] for y in range(H)])[:, None]
        ys = np.arange(H)[:, None]
        for s, side in (('N', near), ('F', ~near)):
            a, b = LEG_ROWS[s]
            out += [(s, f'thigh{s}', m & side & (ys < a)), (s, f'shin{s}', m & side & (ys >= a) & (ys < b)), (s, f'foot{s}', m & side & (ys >= b))]
        return out
    return [('T', F.PART_OF_OWNER[owner], m)]


def hers():
    """Her pixels (every owner but the seat): ({(x, y): hex} in our fine pixels, the owners' masks)."""
    m, fg, line = frame()
    own, masks = owners()
    masks.pop('seat', None)
    want = {}
    for o, mk in masks.items():
        for y, x in zip(*np.nonzero(mk)):
            want[to_frame(x, y)] = P.hexs(m[y, x])
    return want, masks


def pieces():
    """Her pieces pinned to her joints in the sit pose; laid at their joints they are exactly his frame."""
    m, fg, line = frame()
    want, masks = hers()
    pcs = F.pieces(masks, m, to_frame, JOINTS, parts, LINE)
    F.check(pcs, want)
    return pcs, want


# Her sword's blade, which the read frames' blades are (lyra_read_ref.sword_blade; the owner, 2026-10-22, of her
# read pose: "mira la referencia la punta es un poco mas larga y afilada", then "la espada nuestra se ve mas
# corta que en la referencia arregla esto alargandola y poniendola pixel a pixel con mi referencia"). Here
# her blade runs whole from the guard down to a long sharp point: three cells between his line, narrowing to
# two and then one over its last columns, closed in his line. BLADE_X: his blade's columns, left of the
# guard (the guard and grip are right of it).
BLADE_X = 29


def blue(m):
    """A blade's blues (its steel's light and its edge)."""
    return blade(m)


def blade_axis(m, line, held, x1):
    """A blade's axis, the line through the middles of its blue cells left of column x1: (a point on it,
    the unit direction toward the point, the screen angle of that direction in degrees, + clockwise)."""
    b = blue(m) & held & ~line
    b[:, x1:] = False
    ys, xs = np.nonzero(b)
    slope, at0 = np.polyfit(xs + 0.5, ys + 0.5, 1)
    d = np.array([-1.0, -slope]) / np.hypot(1.0, slope)
    return np.array([0.0, at0]), d, float(np.degrees(np.arctan2(d[1], d[0])))


def along(o, d, x, y):
    """How far a cell's middle is along the axis (o, d)."""
    return (x + 0.5 - o[0]) * d[0] + (y + 0.5 - o[1]) * d[1]


def blade_cells(m, line, held, x1):
    """A blade, as a mask: its blues left of column x1 and his line round them (8-way)."""
    b = blue(m) & held & ~line
    b[:, x1:] = False
    return b | (P.near8(b) & line & held)


def sit_blade():
    """His whole blade, from the guard to the point: (cells [(x, y, hex)], the axis (o, d, angle), u of
    its first cross-section at the guard)."""
    m, fg, line = frame()
    own, masks = owners()
    held = masks['held']
    o, d, ang = blade_axis(m, line, held, BLADE_X)
    b = blue(m) & held & ~line
    b[:, BLADE_X:] = False
    base = min(along(o, d, x, y) for y, x in zip(*np.nonzero(b)))
    cells = [(int(x), int(y), P.hexs(m[y, x])) for y, x in zip(*np.nonzero(blade_cells(m, line, held, BLADE_X)))]
    return sorted(cells), (o, d, ang), base


DOC = """// Lyra sitting: the owner's picture, his pixels one for one (tools/refs/lyra_sit_ref.py from
// docs/reference/lyra-sit-owner-reference.jpg). Generated: rerun the script to change it.
"""


def module(pcs):
    out = [DOC, "import type { OwnerPiece } from '../ownerFrames';", '']
    out.append("/** His one frame of her sitting (every frame of the sit loop, rig.ts SIT_KEYS), cut by owner and part, pinned to her joints. */")
    out.append('export const LYRA_SIT: OwnerPiece[] = [')
    out.append(',\n'.join(F.ts_piece(p, '  ') for p in pcs) + ',')
    out.append('];')
    out.append('')
    return '\n'.join(out)


def study(want, d):
    """His whole frame at our scale (the rock and earth too) and her pixels as lifted, side by side."""
    os.makedirs(d, exist_ok=True)
    m, fg, line = frame()
    img = np.full((256, 256, 3), 255, np.uint8)
    for (x, y), h in want.items():
        img[y, x] = F.rgb(h)
    whole = np.full((256, 256, 3), 255, np.uint8)
    for y, x in zip(*np.nonzero(fg)):
        fx, fy = to_frame(x, y)
        whole[fy, fx] = m[y, x]
    crop = (slice(115, 222), slice(55, 160))
    P.save(np.concatenate([whole[crop], np.full((107, 4, 3), 255, np.uint8), img[crop]], 1), os.path.join(d, 'sit-his.png'), 6)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    pcs, want = pieces()
    with open(out, 'w') as f:
        f.write(module(pcs))
    if len(sys.argv) > 2:
        study(want, sys.argv[2])
    print(out, f'{len(pcs)} pieces, {len(want)} pixels')


if __name__ == '__main__':
    main()
