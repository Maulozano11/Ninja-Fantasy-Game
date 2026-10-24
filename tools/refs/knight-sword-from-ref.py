"""The owner's knights' sword, from docs/reference/three-knights-owner-reference.jpg: one flame sword with its
guard and its blade as parts (the owner, 2026-10-24: "la espada ponlos como para escoger la guarda como la
katana"). His three knights hold it with three hilts: the paladin's gold cross-guard with its red grip and
gold pommel, the dark knight's dark iron guard, the dragon knight's dragon guard with its red gem. The
paladin's and the dark knight's blades are one blade he drew twice; the dragon knight's is wider and paler
toward its point, so the blade is a part too.

His picture shrunk and cleaned to our scale (tools/refs/knights_ref.py game(), which redraws the blade as
clean bands of his colours: clean_blade()). Each hilt (pommel, grip and guard) is cut from its figure; where
his fist hides the grip, the grip is carried on along the blade's line from what shows of it (his grip's
colours between his line). Every piece pivots on the cell on our near hand joint, where his fist holds it, at
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


def blade_angle(fig):
    a = K.his()
    c, d, n, *_ = K.blade_fit(K.labels(fig, a), a)
    return float(np.degrees(np.arctan2(d[1], d[0]))), c, d


def hilt(fig):
    """The hilt of a figure, its grip carried on under his fist along the blade's line."""
    P = K.pieces(fig)
    m, c = P['hilt']
    rgb, label = K.game(fig)
    line = K.line_rgb()
    ang, centre, d = blade_angle('paladin' if fig == 'dark' else fig)
    ox, oy = K.offset(fig)
    # the blade's line in game(fig) pixels
    cx = centre[0] / K.BODY_SCALE + K.PAD
    cy = centre[1] / K.BODY_SCALE + K.PAD
    H, W = m.shape
    hand = label == 'hand_n'
    grip = [tuple(c[y, x]) for y, x in zip(*np.nonzero(m)) if K.kind(c[y, x]) in ('dark', 'red', 'brown', 'steel', 'warm')]
    gc = np.array(max(sorted(set(grip)), key=grip.count))
    for y, x in zip(*np.nonzero(hand & ~m)):
        p = np.array([x + 0.5 - cx, y + 0.5 - cy])
        q = abs(p[0] * -d[1] + p[1] * d[0])
        if q <= 0.75:
            c[y, x] = gc
            m[y, x] = True
        elif q <= 1.6:
            c[y, x] = line
            m[y, x] = True
    return m, c, ang


def build():
    consts = []
    bases = {}
    for name, fig in BLADES.items():
        P = K.pieces(fig)
        ang, *_ = blade_angle(fig)
        m, c = P['blade']
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
