"""Shared helpers for lifting parts out of the owner's Cazador 2 (docs/reference/cazador2-owner-reference.jpg).

His picture (2000 x 2000) is our second Hunter-nin (`enemyCharacter('hunter', 1)`, female, idle frame 0, no
headband) painted over by the owner, in his own pixels of 20 picture pixels each (a 100 x 100 grid from the
picture's corner, as his Cazador 1; tools/refs/cazador1_ref.py has the grid and the cutting tools this
module uses). His words: "version mejorada de enemigo femenino mismo pechera que la de hombre pero version
femenina": the Cazador 1's chest armour in a female version.

He painted her on a new female figure (a narrower waist, wider hips, longer legs) that our female body does
not have yet: it is being rebuilt from his bare female picture (branch body/female-v2). Until then his
pieces are laid on our female body as it is: his body (vest, arms, legs) lined up with ours at the torso
(BODY: a pixel of his at (x, y) sits at (x + BODY[0], y + BODY[1]) of our 256 x 256 frame), his head at
our face (HEAD: his brow and eye on our female face anchor, a pixel left and down of BODY). JOINTS are our
female rig's joints at idle frame 0 in his pixels (at BODY) and FACE our face anchor (at HEAD). Every piece
is pinned with its pivot on our joint, so at rest every pixel lands where he drew it (in his picture moved
by BODY or HEAD), and a later re-pin to the new female body only changes these numbers.

Her face (her forehead between the strands, her brow, eyes and cheeks above the mask) is not one of these
pieces: it is the face's place (the body's), lifted by cazador2-head-from-ref.py (the 'huntress' face shape)
and cazador2-eyes-from-ref.py (the 'huntress' eye shape), both pinned on the face anchor like her hair.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the repo
root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import cazador1_ref as C1  # noqa: E402
from cazador1_ref import (  # noqa: E402,F401
    SIZE, band, hexc, inside, luma, middle, near4, near8, pack, rgb, sheet, spans, ts_piece, write,
    from_column, from_row, background,
)

REF = 'docs/reference/cazador2-owner-reference.jpg'
BODY = (75, 122)
HEAD = (74, 123)
# Our female rig at idle frame 0, in his pixels at BODY (src/sprite/rig.ts drawRig, fine pixels less BODY).
JOINTS = {
    'head': (51.0, 18.0),
    'neck': (52.24, 27.84),
    'pelvis': (52.0, 55.47),
    'shoulderN': (41.52, 32.62),
    'shoulderF': (57.68, 32.05),
    'elbowN': (37.82, 44.03),
    'elbowF': (60.22, 43.78),
    'wristN': (35.46, 54.16),
    'wristF': (65.49, 52.74),
    'handN': (34.75, 57.23),
    'handF': (67.09, 55.46),
    'hipN': (44.88, 55.11),
    'hipF': (57.94, 51.66),
    'kneeN': (45.45, 71.10),
    'kneeF': (64.58, 66.21),
    'ankleN': (41.78, 85.65),
    'ankleF': (62.28, 81.04),
}
# Her legs' joints in his picture (the middle of each leg at the hip, at its narrowest about the knee,
# and over the foot at the ankle). Her legs are longer than our female body's and stand apart from ours,
# so her leg pieces hang from her own joints: each turns about her joint, and her joints are carried by
# our leg's angles along her own thigh and shin (src/sprite/painted.ts hisLeg), so her boots stay on her
# shins and her feet on her boots in every pose.
HIS_LEGS = {
    'N': {'hip': (44.5, 55.0), 'knee': (45.0, 71.0), 'ankle': (39.5, 91.0)},
    'F': {'hip': (58.0, 53.0), 'knee': (60.0, 72.0), 'ankle': (60.5, 88.0)},
}


def his_legs_ts(name):
    """Her legs' joints as TypeScript: fine pixels of our frame at rest (her picture at BODY)."""
    out = [f"/** Her legs' joints at rest (fine pixels of our female idle frame 0): her pieces hang from them (painted.ts hisLeg). */",
           f'export const {name} = {{']
    for s in ('N', 'F'):
        j = HIS_LEGS[s]
        parts = ', '.join(f'{k}: [{j[k][0] + BODY[0]}, {j[k][1] + BODY[1]}] as [number, number]' for k in ('hip', 'knee', 'ankle'))
        out.append(f'  {s}: {{ {parts} }},')
    out.append('};')
    return '\n'.join(out)


# Our female face anchor at idle frame 0 (faceAnchor's nx, ny), in his pixels at HEAD: on his brow line,
# at the start of his near eye.
FACE = (49, 18)
# The pieces lined up at HEAD (the rest at BODY).
HEAD_PIECES = ('hair', 'mask', 'ears')


def native():
    return C1.native(REF)


def kind(c):
    """cazador1_ref.kind for her picture, whose black line is a navy black (blue up to about 30)."""
    r, g, b = (int(v) for v in c)
    if r <= 14 and g <= 14 and b <= 32:
        return 'line'
    return C1.kind(c)


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


# ---------------------------------------------------------------------------------------------------
# The regions, in the order they claim his cells (None: every kind but his line). Row spans are
# {row: (first, last)} or a list of them, inclusive.
# ---------------------------------------------------------------------------------------------------

# Her face: not one of these pieces (the face shape and eye shape take it), so nothing else takes it.
FACE_CELLS = spans({14: (52, 53), 15: (51, 54), 16: (54, 55), 17: (50, 56), 18: [(45, 45), (49, 57)], 19: [(45, 45), (49, 59)], 20: [(45, 45), (50, 55), (57, 59)]})
EARS = spans({3: [(49, 50), (58, 60)], 4: [(48, 51), (58, 60)], 5: [(47, 51), (57, 60)], 6: [(47, 51), (57, 60)], 7: [(47, 51), (56, 60)], 8: [(47, 51), (56, 60)], 9: [(48, 50), (58, 60)]})
MASK = spans({20: [(49, 49), (56, 56)], 21: (49, 59), 22: (49, 60), 23: (49, 60), 24: (49, 59), 25: (52, 57), 26: (54, 56)})
HEAD_BOX = inside([(29, 0), (68, 0), (68, 26), (40, 26), (40, 28), (29, 28)])
FIST_N = spans({54: (34, 38), 55: (33, 39), 56: (31, 39), 57: (32, 40), 58: (32, 40), 59: [(32, 36), (40, 40)], 60: (33, 36), 61: (34, 36), 62: (35, 36)})
FIST_F = spans({52: (65, 67), 53: (64, 67), 54: (64, 68), 55: (64, 69), 56: (64, 69), 57: (64, 69), 58: (64, 69), 59: (64, 68), 60: (65, 67)})
# The kunai: its ring over the fist, its blade below it.
KUNAI = spans({53: (31, 32), 54: (30, 33), 55: (30, 32), 59: (37, 39), 60: (36, 40), 61: (36, 41), 62: (36, 42), 63: (38, 44),
               64: (38, 43), 65: (38, 44), 66: (39, 45), 67: (40, 46), 68: (41, 46)})
# Its axis, from the ring to the point (for the grip the fist hides).
KUNAI_AXIS = ((31.5, 54.5), (45.5, 67.5))
GUARD_N = spans({26: (41, 46), 27: (40, 45), 28: (39, 46), 29: (38, 46), 30: (38, 47), 31: (37, 47), 32: (37, 47), 33: (36, 47), 34: (36, 46), 35: (36, 45),
                 36: (35, 45), 37: (35, 46), 38: (36, 45), 39: (37, 45)})
VEST_RIGHT = {**{y: 61 for y in range(26, 34)}, 34: 62, **{y: 63 for y in range(35, 39)}, 39: 62, 40: 62,
              **{y: 60 for y in range(41, 45)}, 45: 61, 46: 61, 47: 62, 48: 62}
VEST = spans({y: (44 if y < 40 else 45, VEST_RIGHT[y]) for y in range(26, 49)})
UPPER_F = spans({y: (VEST_RIGHT[y], 66) for y in range(28, 45)})
FORE_F = spans({**{y: (VEST_RIGHT[y], 68) for y in range(45, 49)}, **{y: (63, 68) for y in range(49, 53)}})

REGIONS = [
    ('face', FACE_CELLS, None, None),
    ('fist_n', FIST_N, None, None),
    ('fist_f', FIST_F, None, None),
    ('kunai', KUNAI, None, None),
    ('ears', EARS, ('white', 'grey'), None),
    ('mask', MASK, ('white', 'grey', 'skin', 'red'), None),
    ('hair', HEAD_BOX, None, None),
    ('guard_n', GUARD_N, ('grey', 'dark'), None),
    ('upper_n', inside([(33, 40), (44, 40), (44, 46), (33, 46)]), ('skin', 'wood', 'red', 'dark'), None),
    ('fore_n', inside([(32, 45), (43, 45), (43, 54), (32, 54)]), None, None),
    ('upper_f', UPPER_F, None, None),
    ('fore_f', FORE_F, None, None),
    ('vest', VEST, None, None),
    # The waist band and the far leg stop at the far arm: he drew the far arm's wrap and fist over them,
    # and our far arm hangs behind the hips and legs.
    ('waist', inside([(42, 49), (63, 49), (63, 53), (42, 53)]), None, None),
    ('thigh_n', inside([(36, 53), (53, 53), (53, 74), (36, 74)]), None, None),
    ('thigh_f', inside([(53, 53), (66, 53), (66, 74), (53, 74)]) & ~FIST_F & ~FORE_F, None, None),
    ('boot_n', inside([(33, 74), (50, 74), (50, 94), (33, 94)]), None, None),
    ('foot_n', inside([(33, 94), (50, 94), (50, 99), (33, 99)]), None, None),
    ('boot_f', inside([(53, 74), (68, 74), (68, 91), (53, 91)]), None, None),
    ('foot_f', inside([(53, 91), (72, 91), (72, 96), (53, 96)]), None, None),
]
# Rows the thigh and shin pieces of a trouser leg share about the knee; rows repeated down the shin.
KNEE_OVERLAP = 2
SHIN_TILE = 4
# The first row of the bare skin he shows on the far arm, under the vest's side.
FAR_SKIN_TOP = 41
# Where his boots start on each leg (the first row of the boot) and the row of the hem, above her ankle.
BOOT_TOP = {'n': 74, 'f': 74}
SHIN_HEM = {'n': 90, 'f': 87}


def labels(a):
    """His figure cut into pieces: {name: mask}, K (kinds), bg (the white round him and in his gaps; the
    white of his ears, mask and kunai is his)."""
    K = np.array([[kind(a[y, x]) for x in range(SIZE)] for y in range(SIZE)])
    # His white highlights on the ears, mask, kunai, the guard's top and the breastplate, and the white of
    # her eye (not the gaps between his arms and body, or between the strands of his hair).
    cols_ = np.arange(SIZE)[None, :]
    rows_ = np.arange(SIZE)[:, None]
    art = EARS | MASK | KUNAI | FACE_CELLS | (GUARD_N & (cols_ >= 40) & (rows_ <= 35)) | (VEST & (cols_ >= 49))
    bg = background(a) | ((luma(a) > 225) & ~art)
    fig = ~bg
    line = (K == 'line') & fig
    owned = np.zeros((SIZE, SIZE), bool)
    masks = {}
    for n, reg, takes, _ in REGIONS:
        m = reg & fig & ~owned & ~line
        if takes is not None:
            m &= np.isin(K, takes)
        owned |= m
        masks[n] = m
    took = np.zeros((SIZE, SIZE), bool)
    for n, reg, _, lreg in REGIONS:
        if n == 'face':
            continue
        r = reg if lreg is None else lreg
        got = line & r & near8(masks[n])
        masks[n] = masks[n] | got
        took |= got
    for _ in range(2):
        for n, reg, _, lreg in REGIONS:
            if n == 'face':
                continue
            r = reg if lreg is None else lreg
            got = line & r & ~took & near8(masks[n])
            masks[n] = masks[n] | got
            took |= got
    return masks, K, bg


def pieces(a):
    """His figure cut into pieces: {name: mask}, {name: colours}, {name: continued cells}, K, bg. Her face
    is left out."""
    masks, K, bg = labels(a)
    del masks['face']
    cols = {n: a.copy() for n in masks}
    filled = {n: np.zeros((SIZE, SIZE), bool) for n in masks}
    black = np.array([0, 0, 0])
    line = (K == 'line') & ~bg
    rows = np.arange(SIZE)[:, None]

    def add(n, m):
        m = m & ~masks[n]
        filled[n] |= m
        masks[n] = masks[n] | m
        return m

    # The kunai's grip in the near fist: his ring's dark wrap carried along the kunai's axis to the blade,
    # closed by his line on both sides.
    (x0, y0), (x1, y1) = KUNAI_AXIS
    core = band((x0, y0), (37.5, 59.5), 0.8) & FIST_N
    edge = band((x0, y0), (37.5, 59.5), 1.6) & FIST_N & ~core
    wrap = a[55, 31]
    for y, x in zip(*np.nonzero(add('kunai', core))):
        cols['kunai'][y, x] = wrap
    for y, x in zip(*np.nonzero(add('kunai', edge))):
        cols['kunai'][y, x] = black

    # The vest under the near shoulder guard: its left line goes on up from below the guard to the collar;
    # inside it each column takes his colour from the first vest cell below.
    own = masks['vest'] & ~line
    edge_x = 46
    hid = add('vest', spans({y: (edge_x, VEST_RIGHT[y]) for y in range(26, 40)}) & masks['guard_n'] & ~line)
    hid |= add('vest', spans({y: (edge_x, edge_x) for y in range(30, 40)}))
    for y, x in zip(*np.nonzero(hid)):
        if x == edge_x:
            cols['vest'][y, x] = black
    from_column(a, own, hid & (np.arange(SIZE)[None, :] > edge_x), cols['vest'], up=False)

    # The far arm behind the vest, to the width of our far arm, along each row from his, closed by his line.
    J = JOINTS
    for n, (p, q), r in (('upper_f', ('shoulderF', 'elbowF'), 3.8), ('fore_f', ('elbowF', 'wristF'), 3.2)):
        sil = band(J[p], J[q], r) & spans({y: (45, 70) for y in (range(28, 45) if n == 'upper_f' else range(45, 53))})
        own = masks[n] & ~line
        hid = add(n, sil & masks['vest'] & ~masks[n])
        hid_all = hid
        if n == 'upper_f':
            # Above the bare skin he shows (from row FAR_SKIN_TOP) the arm is hidden whole: her bare
            # upper arm, each column continued up from his skin.
            high = hid & (rows < FAR_SKIN_TOP)
            skin = own & np.isin(K, ('skin', 'wood', 'red')) & (rows <= FAR_SKIN_TOP + 1)
            ys, xs = np.nonzero(skin)
            for y, x in zip(*np.nonzero(high)):
                k = int(np.argmin(np.abs(xs - x) * 4 + np.abs(ys - y)))
                cols[n][y, x] = a[ys[k], xs[k]]
            hid = hid & ~high
        from_row(a, own, hid, cols[n])
        for y in range(SIZE):
            xs = np.nonzero(sil[y] | masks[n][y])[0]
            if len(xs) and hid_all[y, xs.min()]:
                cols[n][y, xs.min()] = black

    # The near leg behind the kunai: each column continued from the leg's cloth above it.
    near_thigh = inside([(41, 53), (52, 53), (52, 74), (41, 74)])
    hid = add('thigh_n', near_thigh & masks['kunai'] & (rows >= 59))
    from_column(a, masks['thigh_n'] & ~filled['thigh_n'], hid, cols['thigh_n'], down=False)

    # Each leg parts at our knee into the thigh and the shin (sharing KNEE_OVERLAP rows); under the boot
    # the shin goes on to our ankle, his last rows above the boot repeated down our slanting shin, hemmed
    # by his line.
    for s in ('n', 'f'):
        leg = 'thigh_' + s
        S = s.upper()
        knee = int(np.floor(J['knee' + S][1]))
        shin = 'shin_' + s
        masks[shin] = masks[leg] & (rows >= knee - KNEE_OVERLAP)
        cols[shin] = cols[leg].copy()
        filled[shin] = filled[leg] & masks[shin]
        whole = masks[leg].copy()
        masks[leg] = masks[leg] & (rows < knee + KNEE_OVERLAP)
        filled[leg] &= masks[leg]
        # Her shin's slant (her knee to her ankle).
        (kx, ky), (ax, ay) = HIS_LEGS[S]['knee'], HIS_LEGS[S]['ankle']
        slope = (ax - kx) / (ay - ky)
        top, bottom = BOOT_TOP[s], SHIN_HEM[s]
        src = list(range(top - SHIN_TILE, top))
        m, c = masks[shin], cols[shin]
        boot = masks['boot_' + s]
        for y in range(top, bottom + 1):
            sy = src[(y - top) % SHIN_TILE]
            dx = int(round((y - sy) * slope))
            # Under his boot the leg is no wider than the boot (it never shows past it at rest).
            bx = np.nonzero(boot[y])[0]
            for x in np.nonzero(whole[sy])[0]:
                if len(bx) and not (bx.min() <= x + dx <= bx.max()):
                    continue
                if 0 <= x + dx < SIZE and not m[y, x + dx]:
                    m[y, x + dx] = True
                    c[y, x + dx] = c[sy, x]
                    filled[shin][y, x + dx] = True
        for x in np.nonzero(m[bottom])[0]:
            m[bottom + 1, x] = True
            c[bottom + 1, x] = black
            filled[shin][bottom + 1, x] = True

    # The hair under the ears: each hidden cell inside his hair's outline takes the nearest hair along its
    # row; the mask under the hair takes the nearest of its own colours.
    own = masks['hair'] & ~line
    sil = np.zeros((SIZE, SIZE), bool)
    for y in range(SIZE):
        xs = np.nonzero(masks['hair'][y])[0]
        if len(xs):
            sil[y, xs.min():xs.max() + 1] = True
    hid = add('hair', sil & masks['ears'] & ~line)
    from_row(a, own, hid, cols['hair'])
    return masks, cols, filled, K, bg


def offset_of(n):
    return HEAD if n in HEAD_PIECES else BODY


def module(doc, prefix, bases, kinds, out, kind_type, extra=''):
    """cazador1_ref.module with each piece's resting place at its own offset (HEAD or BODY). `out`:
    (CONST, piece name, doc, rows, origin, palette, pivot, angle)."""
    lines = [doc, "import type { PaintedPiece } from '../painted';", '']
    lines.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        lines.append(f"export const {k} = '{v}';")
    lines.append('')
    lines.append('/** What each colour of his is, as the script sorts them; his black line is never tinted. */')
    lines.append(f'export const {prefix}_KIND: Record<string, {kind_type}> = {{')
    for h in sorted(kinds):
        lines.append(f"  '{h}': '{kinds[h]}',")
    lines += ['};', '']
    lines.append("/** Where each piece lands in our female idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    lines.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, n, _d, _r, origin, _p, _pv, _a in out:
        o = offset_of(n)
        lines.append(f'  {const}: [{origin[0] + o[0]}, {origin[1] + o[1]}],')
    lines += ['};', '']
    if extra:
        lines += [extra, '']
    for const, _n, d, rows_, origin, palette, pivot, ang in out:
        lines.append(ts_piece(const, d, rows_, origin, palette, pivot, ang))
    return '\n'.join(lines)


def emit(masks, cols, specs, bases, kind_of, prefix, kind_type, doc, extra=''):
    kinds = {}
    out = []
    for const, n, d, pivot, ang in specs:
        rows_, origin, palette = pack(cols[n], masks[n])
        for h in palette.values():
            k = kind_of(n, h)
            if kinds.get(h, k) != k:
                raise SystemExit(f'{h} is {kinds[h]} in one piece and {k} in {n}')
            kinds[h] = k
        out.append((const, n, d, rows_, origin, palette, pivot, ang))
    return module(doc, prefix, bases, kinds, out, kind_type, extra)


def his_skin(a, masks, cols):
    """Her lit skin (four fifths of the skin of her bare arms and fists is darker): it stands for the
    character's skin colour."""
    return middle(a, masks, cols, ['upper_n', 'fore_n', 'fist_n'], lambda c: kind(c) in ('skin', 'wood', 'red'), 0.8)


if __name__ == '__main__':
    a = native()
    masks, cols, filled, K, bg = pieces(a)
    print('unclaimed', C1.debug_sheet(a, {n: m & ~filled[n] for n, m in masks.items()}, bg, sys.argv[1]))
