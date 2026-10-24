"""The owner's noble coat on his noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg): the top
'Noble Coat'.

His picture is brought to our scale by tools/refs/noble_ref.py (the body shrunk evenly by 2, cleaned with his
palette only). His coat is black cloth with gold piping: the torso round the chest's front (the front itself is
the armour 'Noble Breastplate', noble-front-from-ref.py), the sleeves in his dark plum cloth from under the
cape's mantles to the cuffs, and the tails below the belt (the front flaps over the thighs, the long near tail
with its gold ornament, the long far tail). This script lifts:

  body     the torso, with what the front, the mantles, the collar, the belt and the near arm hide continued
           from his cloth (each column down, then across), its sides and shoulders on his line
           (noble_ref.COAT_SHAPE): worn without the cape or the front it is still whole
  sleeves  each arm's sleeve cut at the elbow: the upper arm up under the mantle to the shoulder, the forearm
           down under the cuff to the wrist, his cloth run on along the arm
  tails    the tails, what the sword hides of them continued down each column

and writes src/sprite/items/nobleCoatArt.ts. Run from the repo root:

  python3 -I tools/refs/noble-coat-from-ref.py src/sprite/items/nobleCoatArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import noble_ref as N  # noqa: E402

J = N.HIS_JOINTS


def kind_of(rgb, const):
    k = N.kind(rgb)
    return k if k in ('line', 'gold') else 'cloth'


# The plain shirt (the owner on the coat without the cape, 2026-10-24: "reimagina sus hombros y ponle una camisa
# lisa no lo pongas esas telas triangulares raras"): his coat's torso redrawn plain, in his coat's own colours
# and line, with rounded shoulders that run into his sleeves and a seam of his gold piping along each shoulder,
# tucked into the belt; no tails. New pixels he asked for, in his palette: SHIRT_SHAPE its outline (game picture
# pixels), SHIRT_TONES his coat's colours from lit to dark (light from the upper left), SHIRT_SEAMS the gold
# seams' courses.
SHIRT_SHAPE = [(44.5, 26.5), (57.5, 26.5), (60.5, 28), (62.5, 30.5), (63.2, 33.5), (62.8, 37), (62.2, 44), (61.5, 49.5),
               (43, 49.5), (41, 44), (40.2, 38), (38.2, 35), (38.4, 31.5), (40.5, 28.5)]
SHIRT_TONES = ['#2e2c3a', '#22243d', '#141228', '#13111f']
SHIRT_SEAMS = [[(45.0, 27.5), (41.5, 29.5), (39.5, 32.0)], [(57.0, 27.5), (60.5, 29.5), (62.0, 32.5)]]


def shirt():
    """The plain shirt's pixels (mask, colours): his coat's tones in broad bands lit from the upper left (the near
    side and the chest's top lit, the far side and the waist in shade), his 1 px line round it, his gold along the
    shoulder seams."""
    H, W = N.SIZE, N.SIZE
    shape = N.poly(SHIRT_SHAPE)
    # his far arm, behind the body, shows beside it where he drew it: the shirt stops there
    _, _, part, _ = N.game()
    shape &= ~np.isin(part, ('sleeve_f', 'cuff_f', 'glove_f'))
    col = np.zeros((H, W, 3), np.int32)
    tones = [np.array([int(h[k:k + 2], 16) for k in (1, 3, 5)]) for h in SHIRT_TONES]
    ys, xs = np.nonzero(shape)
    for y, x in zip(ys, xs):
        r = np.nonzero(shape[y])[0]
        u = (x - r.min()) / max(1, r.max() - r.min())
        v = (y - ys.min()) / max(1, ys.max() - ys.min())
        t = 0.62 * u + 0.38 * v
        col[y, x] = tones[0 if t < 0.1 else 1 if t < 0.3 else 2 if t < 0.68 else 3]
    edge = N.edge4(shape)
    col[edge] = N.his_line()
    P = N.pieces()
    golds = sorted({N.hexc(P[n][1][y, x]) for n in ('coat', 'tails') for y, x in zip(*np.nonzero(P[n][0])) if N.kind(P[n][1][y, x]) == 'gold'},
                   key=lambda h: N.luma(np.array([int(h[k:k + 2], 16) for k in (1, 3, 5)])))
    gold = np.array([int(golds[len(golds) // 2][k:k + 2], 16) for k in (1, 3, 5)])
    lit = np.array([int(golds[-1][k:k + 2], 16) for k in (1, 3, 5)])
    for seam in SHIRT_SEAMS:
        for (x0, y0), (x1, y1) in zip(seam, seam[1:]):
            n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
            for k in range(n + 1):
                x = int(np.floor(x0 + (x1 - x0) * k / n))
                y = int(np.floor(y0 + (y1 - y0) * k / n))
                if shape[y, x] and not edge[y, x]:
                    col[y, x] = lit if (x, y) == (int(seam[0][0]), int(seam[0][1])) else gold
    return shape, col


def main():
    out_ts, study = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    P = N.pieces()
    consts = [('NOBLE_COAT_BODY', *P['coat'], 'The torso: it rides the torso about the neck.', J['neck'], N.angle_of(J['pelvis'], J['neck']))]
    for s in ('N', 'F'):
        m, c = P['sleeve_' + s.lower()]
        up, lo = N.split(m, J['shoulder' + s], J['elbow' + s], J['wrist' + s])
        consts.append((f'NOBLE_SLEEVE_{s}_UPPER', up, c, 'The upper sleeve: it rides the upper arm about the shoulder.', J['shoulder' + s], N.angle_of(J['shoulder' + s], J['elbow' + s])))
        consts.append((f'NOBLE_SLEEVE_{s}_LOWER', lo, c, 'The forearm\'s sleeve (under the cuff): it rides the forearm about the elbow.', J['elbow' + s], N.angle_of(J['elbow' + s], J['wrist' + s])))
    consts.append(('NOBLE_TAILS', *P['tails'], "The coat's tails below the belt: they hang from the pelvis.", J['pelvis'], N.angle_of(J['pelvis'], J['neck'])))
    consts.append(('NOBLE_SHIRT', *shirt(), 'The plain shirt (worn without the cape, or as the Plain Noble Shirt): it rides the torso about the neck.', J['neck'], N.angle_of(J['pelvis'], J['neck'])))
    bases = {
        'NOBLE_COAT': N.middle(['coat', 'tails'], P, ('dark',)),
        'NOBLE_COAT_GOLD': N.middle(['coat', 'tails'], P, ('gold',)),
    }
    N.run_part('noble-coat-from-ref.py', "The owner's noble coat on his noble swordsman", out_ts, study, consts, bases, 'NOBLE_COAT', kind_of)


if __name__ == '__main__':
    main()
