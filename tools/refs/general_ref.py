"""Shared helpers for the owner's Roman general (docs/reference/roman-general-owner-reference.jpg): what the
tools/refs/general-*-from-ref.py scripts lift from it.

His picture (2026-10-24) shows the same Roman general twice, in his big pixel-art style (2000/256 picture
pixels a cell, as his bronze warrior): on the left in a bronze cuirass with gold spirals all over and a lion
face, gold-rimmed pauldrons, short navy sleeves, a magenta scarf and a belt with its buckle; on the right in
a gold muscle cuirass (sculpted abs and pecs, a lion face at the chest, spirals at the shoulders), studded
pauldrons with leather strips, the same sleeves and scarf, and a belt. The owner: "pasa solo conjunto de
pecho y cara y pelo": only the chest sets (one armor option each), the face and the hair (both figures share
them: they are lifted from the left one). Not his cape, skirt, bracers, greaves or sandals.

His decision for his big pictures (bronze_ref.py, 2026-10-24 "Reducir y limpiar yo") holds: the body shrunk
evenly onto our male rig (BODY_SCALE, the least-squares fit of his joints on ours), the head at the scale that
makes it our Roman head's size (HEAD_SCALE), then cleaned with his palette only, his line 1 px, his gold
lines continuous (bronze_ref.clean). This module sets bronze_ref's method up for this picture: its grid, its
colours (his magenta), its pieces (each figure cut on its own, with the bronze warrior's piece names), and
where each piece lands: unlike the bronze warrior these pieces go on our own figure: each chest set is brought
down with his neck on ours, its pieces where he drew them round it (each then turns about our joint), and his
head stands on the face anchor with his lash on the anchor's row, as the template's eyes do.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402

REF = 'docs/reference/roman-general-owner-reference.jpg'
# His grid: the bronze warrior's pitch; where his first cell starts (picture pixels, the least spread inside
# the cells), and the cells his landscape picture holds whole.
R.PHASE[REF] = (7.6, 4.3)
R.CELLS = (255, 190)

_kind = R.kind


def kind(c):
    """bronze_ref.kind, with his magenta (the scarf and the cape: more blue than green in a red) as the
    cloth it is, not skin."""
    r, g, b = (int(v) for v in c)
    if min(r, g, b) <= 225 and b > g + 20 and r > g + 40:
        return 'purple'
    return _kind(c)


R.kind = kind

# His joints on the left figure (his pixel corners), read off his picture; the right figure stands the same
# way, RIGHT_SHIFT cells over and down.
JOINTS_L = {
    'neck': (71.0, 39.0),
    'pelvis': (69.0, 98.0),
    'shoulderN': (40.0, 50.0),
    'shoulderF': (91.0, 50.0),
    'elbowN': (36.0, 72.0),
    'elbowF': (93.0, 74.0),
    'wristN': (39.0, 95.0),
    'wristF': (99.0, 94.0),
    'hipN': (58.0, 100.0),
    'hipF': (80.0, 99.0),
    'kneeN': (50.0, 132.0),
    'kneeF': (84.0, 130.0),
    'ankleN': (45.0, 175.0),
    'ankleF': (83.0, 172.0),
}
RIGHT_SHIFT = (132.0, 4.0)
JOINTS = {'L': JOINTS_L, 'R': {k: (x + RIGHT_SHIFT[0], y + RIGHT_SHIFT[1]) for k, (x, y) in JOINTS_L.items()}}


def body_scale():
    """His pixels per fine pixel: the least-squares fit (a scale and a shift) of his joints on our male idle's."""
    ks = sorted(JOINTS_L)
    A = np.array([JOINTS_L[k] for k in ks], float)
    O = np.array([R.JOINTS[k] for k in ks], float)
    best = None
    for s in np.arange(1.5, 3.5, 0.01):
        t = (O - A / s).mean(0)
        e = float(((O - (A / s + t)) ** 2).sum())
        if best is None or e < best[0] - 1e-12:
            best = (e, round(float(s), 2))
    return best[1]


BODY_SCALE = body_scale()

# The head: his pixels per fine pixel (our Roman head's size: his eyes about 6 px apart, chin to lash 8
# rows), stood with his eyes' row (HIS_EYES: his near eye's first column, the top of his eyes' one row of
# cells) on the row under the face anchor and one column in, as the template's eyes start (body.ts
# faceAnchor ex), his lash on the anchor's row above them.
HEAD_SCALE = 1.8
HIS_EYES = (65.0, 22.0)
# His head stands on his neck as he drew it, his chin over the scarf: the game raises it HEAD_UP rows over
# ours (src/sprite/generalHead.ts, as his Roman head is raised), so the face anchor his head pieces are stamped
# from is that much higher than our male idle's.
HEAD_UP = 3
R.ANCHOR = (R.ANCHOR[0], R.ANCHOR[1] - HEAD_UP)
HEAD = R.Map(HEAD_SCALE, (R.ANCHOR[0] + 1 - HIS_EYES[0] / HEAD_SCALE, R.ANCHOR[1] + 1 - HIS_EYES[1] / HEAD_SCALE))

# His eyes are dark brown under a heavy straight brow: at our scale each is his lash line, a small white and a
# dark iris (bronze_ref.reduce's eye step with his own colours), only on his eyes' row (his cells), so his
# brow and the shading of the same browns stay what they are.
R.EYE_KINDS = ('iris', 'white')
R.EYE_SHARE = {'iris': 0.25, 'white': 0.25}
R.EYE_TESTS = {
    'white': lambda c: float(R.luma(np.array(c, float))) > 150 and int(max(c)) - int(min(c)) < 60,
    'iris': lambda c: float(R.luma(np.array(c, float))) < 120 and R.kind(c) != 'line',
}
EYES_AT = [(65, 22, 71, 23), (76, 22, 81, 23)]
R.EYE_AREA = np.zeros((R.CELLS[1], R.CELLS[0]), bool)
for _x0, _y0, _x1, _y1 in EYES_AT:
    R.EYE_AREA[_y0:_y1, _x0:_x1] = True

CHEST = ('cuirass', 'scarf', 'pauldron_n', 'pauldron_f', 'sleeve_n', 'sleeve_f')
HEAD_PIECES = ('face', 'hair')


def body_map(fig, name):
    """Where a figure's chest set lands: his cells shrunk by BODY_SCALE, his neck on ours at male idle frame 0,
    the whole set as he drew it round it (each piece then turns about our joint: bronze_ref.PIVOT)."""
    joint = 'neck'
    hx, hy = JOINTS[fig][joint]
    ox, oy = R.JOINTS[joint]
    return R.Map(BODY_SCALE, (ox - hx / BODY_SCALE, oy - hy / BODY_SCALE))


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def shifted(poly, d):
    return [(x + d[0], y + d[1]) for x, y in poly]


METAL = R.METAL + ('skin', 'red', 'steel')
NAVY = ('navy', 'hair', 'steel', 'dark', 'line')
CLOTH = ('purple', 'red', 'dark', 'line')
ANY = R.ALL + ('white',)
# Each figure's pieces, front to back (bronze_ref.labels): what this picture gives (CHEST, and on the left
# the face and hair) and, so they part from them along his line, his arms ('arm_*', in front of the chest
# where they cross it) and the rest of him ('other': his cape, skirt, bracers, legs and sandals).
PARTS = {
    'L': [
        ('arm_n', [rect(24, 62, 52, 80)], ('skin', 'line')),
        # his face inside his hairline, ear and jaw, and his neck under the chin
        ('face', [[(64, 13), (83, 13), (84, 24), (82, 31), (78, 35), (72, 37), (66, 37), (61, 33), (58, 28), (57, 22), (61, 21), (63, 17)], rect(60, 33, 76, 42)], ('skin', 'steel', 'red', 'dark', 'line', 'leather', 'white')),
        # the round clasp pinning the scarf goes with it, in front of the cuirass
        ('scarf', [rect(59, 40, 69, 50)], METAL),
        ('scarf', [[(42, 32), (98, 32), (98, 52), (62, 50), (44, 46)]], CLOTH),
        ('pauldron_n', [[(27, 37), (58, 37), (58, 59), (27, 59)]], METAL),
        ('sleeve_n', [rect(26, 49, 57, 69)], NAVY),
        ('hair', [[(46, 0), (90, 0), (90, 27), (85, 27), (84, 13), (64, 12), (57, 21), (57, 35), (46, 35)]], R.ALL),
        ('pauldron_f', [rect(85, 36, 99, 56)], METAL),
        ('cuirass', [[(51, 37), (95, 37), (95, 94), (51, 94)]], METAL),
        ('sleeve_f', [rect(85, 50, 99, 71)], NAVY),
        ('arm_f', [rect(86, 64, 104, 82)], ('skin', 'line')),
        ('other', [rect(0, 0, 128, 190)], ANY),
    ],
    'R': [
        ('arm_n', [shifted(rect(24, 62, 52, 82), RIGHT_SHIFT)], ('skin', 'line')),
        # (his face here is the left one's twin: not lifted, only kept out of the scarf)
        ('face', [shifted([(64, 13), (83, 13), (84, 24), (82, 31), (78, 35), (72, 37), (66, 37), (61, 33), (58, 28), (57, 22), (61, 21), (63, 17)], RIGHT_SHIFT), shifted(rect(60, 33, 76, 42), RIGHT_SHIFT)], ('skin', 'steel', 'red', 'dark', 'line', 'leather', 'white')),
        ('scarf', [rect(189, 43, 199, 53)], METAL),
        ('scarf', [shifted([(42, 32), (98, 32), (98, 52), (62, 50), (44, 46)], RIGHT_SHIFT)], CLOTH),
        ('pauldron_n', [[(158, 40), (187, 40), (187, 70), (158, 70)]], METAL),
        ('sleeve_n', [rect(157, 56, 186, 73)], NAVY),
        ('pauldron_f', [rect(216, 40, 232, 60)], METAL),
        ('cuirass', [[(181, 40), (227, 40), (227, 95), (181, 95)]], METAL),
        ('sleeve_f', [rect(215, 54, 232, 75)], NAVY),
        ('arm_f', [shifted(rect(86, 64, 104, 82), RIGHT_SHIFT)], ('skin', 'line')),
        ('other', [rect(128, 0, 255, 190)], ANY),
    ],
}

# What hides what among them (bronze_ref.FRONT: (behind, in front)), besides the bronze warrior's.
# His lines here do not close every piece off from the next (the cuirass's gold runs into the strips, the
# scarf into the cape): a patch with a second piece's cells in it at all is parted cell by cell, along the
# pieces' outlines.
R.SPLIT = 0.05

R.FRONT += [('sleeve_n', 'pauldron_n'), ('sleeve_f', 'pauldron_f'), ('pauldron_f', 'cuirass'), ('sleeve_f', 'cuirass'),
            ('cuirass', 'sleeve_n'), ('face', 'scarf'), ('hair', 'scarf'), ('cuirass', 'other'), ('scarf', 'other')]
# No motif of the bronze warrior's is his here.
R.MOTIFS = []

_more_of = R.more_of


def more_of_for(fig):
    """What each piece is continued over besides what hides it (bronze_ref.more_of), on this figure: the
    chest up under the scarf to the neck, the face's skull under the hair and its neck under the scarf."""
    J = JOINTS[fig]

    def more(name, H, W):
        if name == 'cuirass':
            nx, ny = J['neck']
            return R.inside(rect(nx - 18, ny - 2, nx + 20, ny + 12), H, W)
        if name == 'face':
            return R.ellipse_mask((68, 19), 15, 16, H, W) | R.inside(rect(60, 30, 78, 46), H, W)
        if name in ('sleeve_n', 'sleeve_f'):
            # up under the pauldron round the shoulder (a raised arm shows it)
            S = name[-1].upper()
            return R.capsule(J['shoulder' + S], J['shoulder' + S], 9, H, W)
        return _more_of(name, H, W) if name.startswith('arm_') else None
    return more


def load():
    """His picture snapped to his palette, and each figure's pieces: (a, {'L': labels, 'R': labels})."""
    a = R.snapped(R.native(REF))
    K = R.kinds(a)
    bg = R.background(a)
    labs = {}
    for f in ('L', 'R'):
        lab = R.labels(a, PARTS[f])
        # his eyes' whites (white, so in no patch of his): the face's, inside its outline
        for name, regions, _ in PARTS[f]:
            if name == 'face':
                for pts in regions:
                    lab[R.inside(pts, *lab.shape) & (K == 'white') & ~bg & (lab == '')] = 'face'
        labs[f] = lab
    return a, labs


def piece(a, labs, fig, name):
    """A piece of a figure at our scale, continued under what hides it: (mask, colours, line)."""
    R.more_of = more_of_for(fig)
    R.HIS_JOINTS = JOINTS[fig]
    M = HEAD if name in HEAD_PIECES else body_map(fig, name)
    return R.piece(a, labs[fig], name, M)


# Where each piece is stamped from: our joint (the scripts bring his joint onto it) or the face anchor.
def fine_joint(name):
    if name == 'anchor':
        return (R.ANCHOR[0] + 0.5, R.ANCHOR[1] + 0.5)
    return R.JOINTS[name]


R.fine_joint = fine_joint

# The game's order at rest, back to front (src/sprite/ctx.ts DEPTHS, as items/general.ts draws them).
GAME_ORDER = [
    ('farArm.cloth', 'sleeve_f'),
    ('farArm.armor', 'pauldron_f'),
    ('torso.armor', 'cuirass'),
    ('head.body', 'face'),
    ('hairFront', 'hair'),
    ('capeFront', 'scarf'),
    ('nearArm.cloth', 'sleeve_n'),
    ('nearArm.armor', 'pauldron_n'),
]


def header(script, what, args=''):
    return (f'// {what}\n// Lifted from the owner\'s Roman general (docs/reference/{os.path.basename(REF)}) and\n'
            f'// brought down to our scale by tools/refs/{script} (tools/refs/general_ref.py).\n'
            f'// Generated: rerun the script to change it:\n//   python3 -I tools/refs/{script}{args}\n')


def run(script, out, what, consts, prefix, bases=None):
    """A part script's work: its pieces (consts: (CONST, figure, piece name, doc)) brought down and written
    to `out` as a TypeScript module."""
    a, labs = load()
    pieces = {(f, n): piece(a, labs, f, n) for _, f, n, _ in consts}
    b = bases(pieces) if bases else None
    text = R.module(header(script, what, f' {out}'), [(c, pieces[(f, n)], d, n) for c, f, n, d in consts], prefix, b)
    R.write(out, text)
    return pieces


def middle(pieces, keys, kinds_wanted, q=0.5):
    """His colour of middle lightness among these pieces' pixels of these materials: a colour slot's base."""
    found = []
    for key in keys:
        m, c, isl = pieces[key]
        for y, x in zip(*np.nonzero(m & ~isl)):
            if R.material(c[y, x], key[1]) in kinds_wanted:
                found.append((float(R.luma(c[y, x])), R.hexc(c[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]

