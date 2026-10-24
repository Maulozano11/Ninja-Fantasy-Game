"""The owner's knights' sword, from docs/reference/three-knights-owner-reference.jpg: one flame sword with its
guard and its blade as parts (the owner, 2026-10-24: "la espada ponlos como para escoger la guarda como la
katana"). His three knights hold it with three hilts: the paladin's gold cross-guard with its red grip and
gold pommel, the dark knight's dark iron guard, the dragon knight's dragon guard with its red gem. The
paladin's and the dark knight's blades are one blade he drew twice; the dragon knight's is wider and paler
toward its point, so the blade is a part too.

His picture shrunk and cleaned to our scale (tools/refs/knights_ref.py game(), which redraws the blade as
clean bands of his colours: clean_blade()). Each hilt (pommel, grip and guard) is cut from its figure; where
his fist hides the grip, the grip is carried on from what shows of it on one side to the other (his grip's
colour between his line); each blade is carried back under its own guard, so another guard meets it. Every piece pivots on the cell on our near hand joint, where his fist holds it, at
the blade's angle: held at rest, every pixel is his.

  python3 -I tools/refs/knight-sword-from-ref.py src/sprite/items/knightSwordArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import knights_ref as K  # noqa: E402

# The blade each figure gives (the dark knight's is the paladin's).
BLADES = {'flame': 'paladin', 'dragon': 'dragon'}
# The knights who hold each blade at rest.
HELD_BY = {'flame': ('paladin', 'dark'), 'dragon': ('dragon',)}


def blade_angle(fig):
    a = K.his()
    c, d, n, *_ = K.blade_fit(K.labels(fig, a), a)
    return float(np.degrees(np.arctan2(d[1], d[0]))), c, d


def hilt(fig):
    """The hilt of a figure (pommel, grip and guard), its grip carried on under his fist: between what shows of
    it on either side of his fist (the pommel's end and the guard's), his grip's commonest colour two pixels
    wide with his line on its sides, only where his fist hides it."""
    P = K.pieces(fig)
    m, c = P['hilt']
    rgb, label = K.game(fig)
    line = K.line_rgb()
    ang, *_ = blade_angle('paladin' if fig == 'dark' else fig)
    hidden = np.isin(label, ('hand_n', 'fore_n'))
    parts = sorted(K.components(m, True), key=len)[::-1]
    if len(parts) >= 2:
        A, B = parts[0], parts[1]
        p, q = min(((a, b) for a in A for b in B), key=lambda ab: ((ab[0][0] - ab[1][0]) ** 2 + (ab[0][1] - ab[1][1]) ** 2, ab))
        grip = [tuple(c[y, x]) for y, x in A + B if K.kind(c[y, x]) in ('dark', 'red', 'brown', 'steel', 'warm')]
        gc = np.array(max(sorted(set(grip)), key=grip.count))
        (y0, x0), (y1, x1) = p, q
        d = np.array([x1 - x0, y1 - y0], float)
        L = float(np.hypot(*d)) or 1.0
        H, W = m.shape
        for y in range(min(y0, y1) - 3, max(y0, y1) + 4):
            for x in range(min(x0, x1) - 3, max(x0, x1) + 4):
                if not (0 <= y < H and 0 <= x < W) or m[y, x] or not hidden[y, x]:
                    continue
                v = np.array([x - x0, y - y0], float)
                t = float(v @ d) / L
                if t < -0.5 or t > L + 0.5:
                    continue
                dist = abs(v[0] * d[1] - v[1] * d[0]) / L
                if dist <= 0.75:
                    c[y, x] = gc
                    m[y, x] = True
                elif dist <= 1.6:
                    c[y, x] = line
                    m[y, x] = True
    return m, c, ang


def blade(fig, name):
    """A blade, carried back under its own guard along its line (his first rows across repeated), only where
    the guard or the fist hides it at rest on every knight who holds it: with another guard, no gap opens between guard and blade."""
    P = K.pieces(fig)
    m, c = P['blade']
    rgb, label = K.game(fig)
    ang, *_ = blade_angle(fig)
    # hidden at rest on every knight who holds this blade (the paladin's is the dark knight's too)
    ox, oy = K.offset(fig)
    hidden = np.ones(label.shape, bool)
    for other in HELD_BY[name]:
        _, _, lab = K.our_frame(other)
        under = np.isin(lab, ('hilt', 'guard', 'hand_n'))
        for y in range(label.shape[0]):
            for x in range(label.shape[1]):
                Y, X = y + oy, x + ox
                if not (0 <= Y < 256 and 0 <= X < 256 and under[Y, X]):
                    hidden[y, x] = False
    t = np.radians(ang)
    step = np.array([np.cos(t), np.sin(t)])
    H, W = m.shape
    base_m, base_c = m.copy(), c.copy()
    for k in range(1, 7):
        for y, x in zip(*np.nonzero(base_m)):
            Y, X = int(round(y - step[1] * k)), int(round(x - step[0] * k))
            if 0 <= Y < H and 0 <= X < W and not m[Y, X] and hidden[Y, X]:
                m[Y, X] = True
                c[Y, X] = base_c[y, x]
    return m, c, ang


def build():
    consts = []
    bases = {}
    for name, fig in BLADES.items():
        P = K.pieces(fig)
        m, c, ang = blade(fig, name)
        consts.append((f'KNIGHT_BLADE_{name.upper()}', fig, m, c, f'The {name} blade ({fig}): his flame in clean bands, his line round it. It pivots on the near hand joint at its angle.', K.his_joint('handN'), ang))
        bases[f'KNIGHT_BLADE_{name.upper()}_FLAME'] = K.base(fig, ['blade'], ('flame',), 0.5, P=P)
    for fig in K.FIGURES:
        m, c, ang = hilt(fig)
        consts.append((f'KNIGHT_HILT_{K.SET_NAME[fig]}', fig, m, c, f"The {fig} knight's hilt: pommel, grip and guard; the grip carried on under his fist. It pivots on the near hand joint at the blade's angle.", K.his_joint('handN'), ang))
        cols = [K.hexc(c[y, x]) for y, x in zip(*np.nonzero(m)) if K.kind(c[y, x]) in ('gold', 'steel', 'warm', 'brown', 'dark')]
        bases[f'KNIGHT_HILT_{K.SET_NAME[fig]}_GUARD'] = K.middle(c, m, ('gold',) if fig == 'paladin' else ('steel', 'warm', 'dark') if fig == 'dark' else ('brown', 'flame', 'red'))
    return K.module(K.header('knight-sword-from-ref.py', "The owner's knights' flame sword"), consts, bases, 'KNIGHT_SWORD')


if __name__ == '__main__':
    K.run(sys.argv, build)
