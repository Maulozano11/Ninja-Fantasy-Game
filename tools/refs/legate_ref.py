"""Shared helpers for the owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg): what the
tools/refs/legate-*-from-ref.py scripts lift from it.

His picture (2026-10-24) shows two bearded Roman legates in his big pixel-art style (2000/256 picture pixels a
cell, as his Roman general). The owner: "copia solo conjunto de pecho", then "solo copia el de la derecha el
de la izquierda es el mismo" (the left one's chest is our Roman set's): only the RIGHT figure's chest set,
one creator option: his grey-steel cuirass with the gold eagle and spirals, his bronze pauldrons with their
hanging straps and his dark red sleeves. Not his head, beard, hair, belt, skirt, bracers, greaves or sandals;
below the sleeves the arms are our own, in the character's skin.

Brought down as his Roman general is (general_ref.py, his decision for his big pictures, bronze_ref.py): the
body shrunk evenly onto our male rig (the least-squares fit of his joints on ours), the chest set standing
where the least-squares fit of the joints it dresses (FIT_ON: neck, shoulders, elbows, wrists, hips and
pelvis) puts it, cleaned with his palette only, his black line 1 px. (Stood by his neck alone, as the general
is, the set sat 2 px too far to the far side: he draws his torso mostly to the far side of the neck, we draw
ours to the near side, and on our male the cuirass's near edge then stopped short of the near arm and the
waist under it read pinched. The owner, 2026-10-29: "la cintura del masculino se ve muy pequeña".)

His plates (the cuirass, the pauldrons) are read in layers at our scale (engraved_ref.py, PLATES): his line,
his plate in his shades, his gold and his seams as marks laid by cell, so the eagle, the spirals and the gold
rims read and nothing is a blend. (The owner on the first reduction, 2026-10-29: the torso "muy mal", the
eagle cuirass to be copied pixel for pixel, not a smoothed blur of browns.)

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402
import engraved_ref as E  # noqa: E402
import general_ref as G  # noqa: E402  (bronze_ref set up for his big landscape pictures: grid size, colours, piece order)

REF = 'docs/reference/roman-legate-owner-reference.jpg'
R.PHASE[REF] = (7.6, 4.4)

# His joints on the right figure (his pixel corners), read off his picture.
JOINTS = {
    'neck': (196.0, 50.0),
    'pelvis': (198.0, 104.0),
    'shoulderN': (172.0, 58.0),
    'shoulderF': (220.0, 56.0),
    'elbowN': (166.0, 80.0),
    'elbowF': (224.0, 82.0),
    'wristN': (170.0, 104.0),
    'wristF': (228.0, 102.0),
    'hipN': (188.0, 106.0),
    'hipF': (208.0, 105.0),
    'kneeN': (180.0, 140.0),
    'kneeF': (214.0, 140.0),
    'ankleN': (174.0, 176.0),
    'ankleF': (212.0, 175.0),
}


def body_scale():
    """His pixels per fine pixel: the least-squares fit (a scale and a shift) of his joints on our male idle's."""
    ks = sorted(JOINTS)
    A = np.array([JOINTS[k] for k in ks], float)
    O = np.array([R.JOINTS[k] for k in ks], float)
    best = None
    for s in np.arange(1.5, 3.5, 0.01):
        t = (O - A / s).mean(0)
        e = float(((O - (A / s + t)) ** 2).sum())
        if best is None or e < best[0] - 1e-12:
            best = (e, round(float(s), 2))
    return best[1]


BODY_SCALE = body_scale()
# The joints his chest set hangs from and the arms it dresses: where the set stands is the least-squares fit
# (at BODY_SCALE) of these on ours at male idle frame 0, the set as he drew it round them. His legs stand
# apart from ours (a wider stance) and are not lifted, so they are left out of the fit of the place.
FIT_ON = ('neck', 'pelvis', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'hipN', 'hipF')


def body_offset():
    """The fine pixel his corner (0, 0) lands on: the shift that lays FIT_ON best on ours at BODY_SCALE."""
    A = np.array([JOINTS[k] for k in FIT_ON], float)
    O = np.array([R.JOINTS[k] for k in FIT_ON], float)
    t = (O - A / BODY_SCALE).mean(0)
    return (round(float(t[0]), 2), round(float(t[1]), 2))


MAP = R.Map(BODY_SCALE, body_offset())

CHEST = ('cuirass', 'pauldron_n', 'pauldron_f', 'sleeve_n', 'sleeve_f')
rect = G.rect
METAL = G.METAL
# His dark red sleeves (a red cloth with its dark folds).
SLEEVE = ('red', 'purple', 'leather', 'dark', 'line')
# His pieces, front to back (bronze_ref.labels): the chest set and, so it parts from them along his line, his
# head and beard ('face'), his arms ('arm_*') and the rest of him ('other').
PARTS = [
    ('arm_n', [rect(158, 72, 184, 86)], ('skin', 'line')),
    ('face', [rect(180, 0, 214, 49)], R.ALL),
    ('pauldron_n', [[(161, 43), (190, 43), (190, 68), (161, 68)]], METAL),
    ('sleeve_n', [rect(158, 62, 186, 77)], SLEEVE),
    ('pauldron_f', [rect(208, 47, 226, 67)], METAL),
    # down to his gold rim: flat under the near chest (row 91) with his dark band under it (rows 92-93), a
    # diagonal down to the far flat bottom (row 97); below the rim his skirt's strips, which are not his
    ('cuirass', [[(182, 47), (217, 47), (217, 98), (202, 98), (195, 94), (182, 94)]], R.ALL),
    ('sleeve_f', [rect(212, 62, 228, 76)], SLEEVE),
    ('arm_f', [rect(214, 70, 232, 84)], ('skin', 'line')),
    ('other', [rect(128, 0, 255, 190)], G.ANY),
]
R.FRONT += [('cuirass', 'face')]


def more_of(name, H, W):
    """What each piece is continued over besides what hides it: the chest up under the beard to the neck, the
    sleeves up under the pauldrons round the shoulder (a raised arm shows them)."""
    if name == 'cuirass':
        nx, ny = JOINTS['neck']
        return R.inside(rect(nx - 14, ny - 4, nx + 16, ny + 10), H, W)
    if name in ('sleeve_n', 'sleeve_f'):
        S = name[-1].upper()
        return R.capsule(JOINTS['shoulder' + S], JOINTS['shoulder' + S], 9, H, W)
    return None


# His dark band under the cuirass's near rim (rows 92-93, his line colour, cells 182-194): the cuirass's own
# lower line, not the strips' (bronze_ref.labels gives a line to the piece it bounds, and this band's only
# solid neighbours below are the strips).
RIM_BAND = rect(182, 92, 195, 94)


def load():
    """His picture snapped to his palette, and the right figure's pieces: (a, labels)."""
    a = R.snapped(R.native(REF))
    lab = R.labels(a, PARTS)
    K = R.kinds(a)
    lab[R.inside(RIM_BAND, *lab.shape) & (K == 'line') & (lab == 'other')] = 'cuirass'
    # his neck's skin under the beard, inside the cuirass's region: his neck, not the cuirass (which is continued
    # up under it, more_of)
    lab[(lab == 'cuirass') & (K == 'skin')] = 'face'
    return a, lab


# How his plates are read at our scale (engraved_ref, the owner's verdict on the first reduction, 2026-10-29: the
# cuirass "muy mal", its eagle and gold filigree a blur of browns): the cuirass is his grey steel (every grey of
# his: his 'steel', the dark greys bronze_ref.kind calls 'purple' and 'hair', his near-blacks), and his gold on
# it is always a mark, the eagle, the spirals and the rims in his gold; the pauldrons are his bronze, their gold
# rims and dark seams the marks.
PLATES = {
    'cuirass': E.Plate(('steel', 'purple', 'hair', 'dark'), foreign=('gold',), by_light=False,
                       motifs=[('spiral', (194.5, 84.5), 4.0), ('spiral', (209.0, 84.5), 4.0), ('spiral', (192.5, 75.0), 3.5), ('spiral', (209.5, 74.5), 3.0)]),
    'pauldron_n': E.Plate(('gold', 'leather')),
    'pauldron_f': E.Plate(('gold', 'leather')),
}


# Our shoulders on the male bodies: the bare arm and torso round each shoulder joint that his pauldron and
# his sleeve must cover (the owner, 2026-10-29: "las hombreras no están llegando a cubrir todo el hombro":
# his figure's shoulders are narrower than ours, so the arm showed past his pauldron's outer edge and above
# his far pauldron). Offsets (dx, dy) from our shoulder joint at male idle frame 0, the union over the male
# and bulky bodies of the skin shown round the shoulder without his pieces (read off the game: compose.ts
# spriteLayers, the arm's and the torso's body layers; the torso past the neck and the neck's base under the chin
# left out).
COVER = {
    'N': [(-3, -5), (-2, -5), (-1, -5), (0, -5), (-4, -4), (-3, -4), (-2, -4), (-5, -3), (-4, -3), (-3, -3), (-6, -2), (-5, -2), (-4, -2),
          (-3, -2), (-6, -1), (-5, -1), (-4, -1), (-6, 0), (-5, 0), (-6, 1), (-5, 1), (-6, 2), (-6, 3), (-7, 4), (-6, 4), (-5, 4), (-7, 5),
          (-6, 5), (-5, 5), (-7, 6), (-6, 6), (-7, 7), (-6, 7), (-4, 7), (-8, 8), (-7, 8), (-6, 8), (-5, 8), (-4, 8), (-3, 8), (-2, 8),
          (-8, 9), (-7, 9), (-6, 9), (-5, 9), (-4, 9), (-3, 9), (-2, 9), (-1, 9), (0, 9), (1, 9)],
    'F': [(-2, -5), (-1, -5), (0, -5), (1, -5), (2, -5), (3, -5), (-3, -4), (-2, -4), (-1, -4), (0, -4), (1, -4), (2, -4), (3, -4),
          (4, -4), (-3, -3), (-2, -3), (-1, -3), (0, -3), (1, -3), (2, -3), (3, -3), (4, -3), (5, -3), (2, -2), (3, -2),
          (4, -2), (5, -2), (6, -2), (2, -1), (3, -1), (4, -1), (5, -1), (6, -1), (3, 0), (4, 0), (5, 0), (6, 0), (3, 1), (4, 1), (5, 1),
          (6, 1), (3, 2), (4, 2), (5, 2), (6, 2), (4, 3), (5, 3), (6, 3), (4, 4), (5, 4), (6, 4), (4, 5), (5, 5), (6, 5), (7, 5), (4, 6),
          (5, 6), (6, 6), (7, 6), (3, 7), (4, 7), (5, 7), (6, 7), (7, 7), (4, 8), (5, 8), (6, 8), (7, 8), (4, 9), (5, 9), (6, 9), (7, 9)],
}
# The pauldron covers the shoulder down to this row from the joint (his pauldron's last plate); below it the
# sleeve, which covers the arm's width in its own rows (below the sleeve the arm is bare, as he drew it).
PAULDRON_TO = 7


def grown(m, c, isl, side, rows=None, design=None):
    """A piece grown to cover our shoulder (COVER): each covered pixel not in the piece takes his nearest
    pixel of it (his line left out, the same row first: his plates and folds run on sideways), his line
    closes the new edge, and his old line that the growth leaves inside takes his colour beside it. `rows`:
    only the piece's own rows (the sleeve); else down to PAULDRON_TO. `design`: another piece of his (the
    near pauldron, for the far one) whose pixels, mirrored about its shoulder joint, the new pixels take
    where it has one, so the far pauldron is his near one seen from behind (the owner, 2026-10-30: grown
    from its own few pixels the far one was "muy tosco y simplón")."""
    black = np.array(R.LINE)
    jx, jy = (int(np.floor(v)) for v in R.fine_joint('shoulder' + side))
    m, c, isl = m.copy(), c.copy(), isl.copy()
    own = [(y, x) for y, x in zip(*np.nonzero(m & ~isl))]
    mirror = {}
    if design is not None:
        dm, dc, dl = design
        ox, oy = (int(np.floor(v)) for v in R.fine_joint('shoulderN' if side == 'F' else 'shoulderF'))
        for y, x in zip(*np.nonzero(dm & ~dl)):
            mirror[(y - oy, -(x - ox))] = dc[y, x]
    lines = [(y, x) for y, x in zip(*np.nonzero(m & isl))]
    if lines:
        # (his black line of this piece: its commonest line colour)
        tally = {}
        for q in lines:
            t = tuple(int(v) for v in c[q])
            tally[t] = tally.get(t, 0) + 1
        black = np.array(max(sorted(tally), key=lambda t: tally[t]))
    have = set(int(y) for y in np.nonzero(m.any(1))[0])
    new = []
    for dx, dy in COVER[side]:
        y, x = jy + dy, jx + dx
        if m[y, x]:
            continue
        if rows is not None and y not in have:
            continue
        if rows is None and dy > PAULDRON_TO:
            continue
        if (dy, dx) in mirror:
            c[y, x] = mirror[(dy, dx)]
        else:
            q = min(own, key=lambda p: ((p[0] - y) * 2) ** 2 + (p[1] - x) ** 2 + (p[0] != y))
            c[y, x] = c[q]
        m[y, x] = True
        isl[y, x] = False
        new.append((y, x))
    near4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    newset = set(new)
    # his line the growth leaves inside the piece: his colour beside it (the nearest of his pixels in its row)
    for y, x in lines:
        if all(m[y + dy, x + dx] for dy, dx in near4) and any((y + dy, x + dx) in newset for dy, dx in near4):
            q = min(own, key=lambda p: ((p[0] - y) * 2) ** 2 + (p[1] - x) ** 2)
            c[y, x] = c[q]
            isl[y, x] = False
    # his line closes the new edge
    for y, x in new:
        if any(not m[y + dy, x + dx] for dy, dx in near4):
            c[y, x] = black
            isl[y, x] = True
    return m, c, isl


# The cuirass's sides at the stomach: WAIST_BY more pixels on each side from row WAIST_FROM (from his neck
# joint, fine rows) down to the rim, the plate continued with his pixels beside the edge and his line at the
# new edge (the owner, 2026-10-30: "el lateral del estómago con 2 píxeles más de ancho para que no se vea
# tan flaco con esta armadura"); the row above it one pixel, so the sides run on without a step.
WAIST_FROM = 10
WAIST_BY = 2


def widened(m, c, isl):
    """The cuirass with its sides at the stomach WAIST_BY pixels wider on each side (module comment)."""
    black = np.array(R.LINE)
    lines = [(y, x) for y, x in zip(*np.nonzero(m & isl))]
    if lines:
        tally = {}
        for q in lines:
            t = tuple(int(v) for v in c[q])
            tally[t] = tally.get(t, 0) + 1
        black = np.array(max(sorted(tally), key=lambda t: tally[t]))
    jy = int(np.floor(R.fine_joint('neck')[1]))
    m, c, isl = m.copy(), c.copy(), isl.copy()
    ys = [int(y) for y in np.nonzero(m.any(1))[0]]
    # his sides' teeth (a row indented a pixel between its neighbours) come out to its neighbours' edge, so the
    # widened sides run straight (the owner's standing rule: no notches)
    edges = {y: (int(np.nonzero(m[y])[0].min()), int(np.nonzero(m[y])[0].max())) for y in ys}
    for y in ys:
        dy = y - jy
        if dy < WAIST_FROM - 1 or (y - 1) not in edges or (y + 1) not in edges:
            continue
        x0, x1 = edges[y]
        lo = max(edges[y - 1][0], edges[y + 1][0])
        hi = min(edges[y - 1][1], edges[y + 1][1])
        for x in list(range(lo, x0)) + list(range(x1 + 1, hi + 1)):
            m[y, x] = True
            c[y, x] = c[y, x0 if x < x0 else x1]
            isl[y, x] = isl[y, x0 if x < x0 else x1]
    for y in ys:
        dy = y - jy
        if dy < WAIST_FROM - 1:
            continue
        by = WAIST_BY if dy >= WAIST_FROM else WAIST_BY - 1
        xs = np.nonzero(m[y])[0]
        x0, x1 = int(xs.min()), int(xs.max())
        for edge, step in ((x0, -1), (x1, 1)):
            # his plate just inside the edge's line: what the new pixels continue
            inner = edge
            while m[y, inner] and isl[y, inner] and 0 < inner < 255:
                inner -= step
            if not m[y, inner]:
                continue
            plate = c[y, inner].copy()
            for k in range(1, by + 1):
                x = edge + step * k
                if m[y, x]:
                    break
                m[y, x] = True
                c[y, x] = plate
                isl[y, x] = False
            # the old edge line is plate now; the new outermost pixel his line
            if isl[y, edge]:
                c[y, edge] = plate
                isl[y, edge] = False
            x = edge + step * by
            while x != edge and not m[y, x]:
                x -= step
            c[y, x] = black
            isl[y, x] = True
    return m, c, isl


def piece(a, lab, name):
    """A piece of his at our scale, continued under what hides it: (mask, colours, line); his plates read in
    layers (PLATES); his pauldrons and sleeves grown to cover our shoulder (grown); his cuirass widened at the
    stomach (widened)."""
    R.more_of = more_of
    R.HIS_JOINTS = JOINTS
    if name in PLATES:
        m, c, isl = E.piece(a, lab, name, MAP, PLATES[name])
    else:
        m, c, isl = R.piece(a, lab, name, MAP)
    if name == 'cuirass':
        return widened(m, c, isl)
    if name == 'pauldron_n':
        return grown(m, c, isl, 'N')
    if name == 'pauldron_f':
        # (the far one grows with his near pauldron's design mirrored: his pixels, seen from behind)
        near = E.piece(a, lab, 'pauldron_n', MAP, PLATES['pauldron_n'])
        return grown(m, c, isl, 'F', design=near)
    if name.startswith('sleeve_'):
        return grown(m, c, isl, name[-1].upper(), rows=True)
    return m, c, isl


# The game's order at rest, back to front (as items/legate.ts draws them).
GAME_ORDER = [
    ('farArm.cloth', 'sleeve_f'),
    ('farArm.armor', 'pauldron_f'),
    ('torso.armor', 'cuirass'),
    ('nearArm.cloth', 'sleeve_n'),
    ('nearArm.armor', 'pauldron_n'),
]


def header(script, what, args=''):
    return (f'// {what}\n// Lifted from the owner\'s Roman legate (docs/reference/{os.path.basename(REF)}) and\n'
            f'// brought down to our scale by tools/refs/{script} (tools/refs/legate_ref.py).\n'
            f'// Generated: rerun the script to change it:\n//   python3 -I tools/refs/{script}{args}\n')


def run(script, out, what, consts, prefix, bases=None):
    """A part script's work: its pieces (consts: (CONST, piece name, doc)) brought down and written to `out`."""
    a, lab = load()
    pieces = {n: piece(a, lab, n) for _, n, _ in consts}
    b = bases(pieces) if bases else None
    R.write(out, R.module(header(script, what, f' {out}'), [(c, pieces[n], d, n) for c, n, d in consts], prefix, b))
    return pieces


def middle(pieces, names, kinds_wanted, q=0.5):
    return G.middle({('R', n): pieces[n] for n in names}, [('R', n) for n in names], kinds_wanted, q)
