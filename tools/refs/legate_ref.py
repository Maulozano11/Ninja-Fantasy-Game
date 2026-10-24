"""Shared helpers for the owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg): what the
tools/refs/legate-*-from-ref.py scripts lift from it.

His picture (2026-10-24) shows two bearded Roman legates in his big pixel-art style (2000/256 picture pixels a
cell, as his Roman general). The owner: "copia solo conjunto de pecho", then "solo copia el de la derecha el
de la izquierda es el mismo" (the left one's chest is our Roman set's): only the RIGHT figure's chest set,
one creator option: his grey-steel cuirass with the gold eagle and spirals, his bronze pauldrons with their
hanging straps and his dark red sleeves. Not his head, beard, hair, belt, skirt, bracers, greaves or sandals;
below the sleeves the arms are our own, in the character's skin.

Brought down as his Roman general is (general_ref.py, his decision for his big pictures, bronze_ref.py): the
body shrunk evenly onto our male rig (the least-squares fit of his joints on ours), the chest set with his
neck on ours, cleaned with his palette only, his black line 1 px.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from the
repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bronze_ref as R  # noqa: E402
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
# His neck on ours at male idle frame 0; the chest set as he drew it round it.
MAP = R.Map(BODY_SCALE, (R.JOINTS['neck'][0] - JOINTS['neck'][0] / BODY_SCALE, R.JOINTS['neck'][1] - JOINTS['neck'][1] / BODY_SCALE))

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
    ('cuirass', [[(182, 47), (217, 47), (217, 98), (182, 98)]], R.ALL),
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


def load():
    """His picture snapped to his palette, and the right figure's pieces: (a, labels)."""
    a = R.snapped(R.native(REF))
    return a, R.labels(a, PARTS)


def piece(a, lab, name):
    """A piece of his at our scale, continued under what hides it: (mask, colours, line)."""
    R.more_of = more_of
    R.HIS_JOINTS = JOINTS
    return R.piece(a, lab, name, MAP)


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
