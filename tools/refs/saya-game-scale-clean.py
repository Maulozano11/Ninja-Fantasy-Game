"""Saya at our game scale without her bugged weapons -> a cleaned copy of his picture (PNG).

The owner sent Saya drawn at our sprite scale (docs/reference/saya-game-scale-owner-reference.jpg,
2026-10-21) and said "aqui hay otra solo que tiene el arma bugeada quita lo que esta bugeado": her
two crossed swords and the scabbard are drawn wrongly. This script samples his picture to its
100x100 grid (one of his pixels = one fine pixel of ours, as tools/refs/female-body-from-ref.py)
and takes the weapons out:

- outside her body (the left sword, its pommel and grip, the scabbard beside her near shin, the big
  blade's tip right of her far leg, the gold sparkles) the weapon pixels become empty;
- between her legs (the big blade crossing the gap under her skirt) they become empty too;
- inside her body (the big sword's guard over her near hand and hip, its blade across her near
  thigh and her far leg) every weapon pixel takes the colour of her own pixels round it, nearest
  first, so her armour, skirt and legs are continued with his colours only, and where a filled
  pixel now meets the empty outside it becomes his line.

Her sword comes back later from her big picture (owner-ref-3), held like our weapons; that is the
Saya part jobs' work, not this script's.

Run from the repo root:
    python3 -I tools/refs/saya-game-scale-clean.py OUT.png [ZOOM.png]
writes the cleaned grid (100x100, transparent outside her) and, if asked, an 8x copy.
"""
import colorsys
import os
import sys

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(REPO, 'docs', 'reference', 'saya-game-scale-owner-reference.jpg')


def native():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    p = a.shape[0] / 100
    n = np.zeros((100, 100, 3), int)
    for j in range(100):
        for i in range(100):
            y0, y1 = int(j * p + p * 0.25), int(j * p + p * 0.75) + 1
            x0, x1 = int(i * p + p * 0.25), int(i * p + p * 0.75) + 1
            n[j, i] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), 0)
    return n


N = native()
FIG = N.min(2) <= 235
LINE = N.max(2) < 60


def hls(c):
    return colorsys.rgb_to_hls(*(c / 255))


def steel_or_gold(c):
    """The weapons' own colours: the blades' greys and whites, the gold and bronze of guards and
    pommels."""
    h, l, s = hls(c)
    grey = s < 0.2 and l > 0.3
    gold = 0.06 < h < 0.19 and s > 0.3 and l > 0.25
    return grey or gold


def hers(c):
    """Her own colours inside the weapon bands: the navy and red of her armour, its line, her skin."""
    h, l, s = hls(c)
    navy = 0.55 < h < 0.75 and s > 0.15 and l < 0.42
    red = (h < 0.03 or h > 0.93) and s > 0.35 and l < 0.6
    skin = (h < 0.1 or h > 0.97) and s > 0.35 and l > 0.55
    return navy or red or skin


def band(x0, y0, x1, y1, w):
    """Pixels whose centre lies within w of the segment (x0, y0)-(x1, y1)."""
    yy, xx = np.mgrid[0:100, 0:100]
    d = np.array([x1 - x0, y1 - y0], float)
    L = np.hypot(*d)
    u = d / L
    px, py = xx + 0.5 - x0, yy + 0.5 - y0
    t = px * u[0] + py * u[1]
    n = np.abs(-px * u[1] + py * u[0])
    return (t > -0.5) & (t < L + 0.5) & (n <= w)


yy, xx = np.mgrid[0:100, 0:100]
WEAPON_COL = np.array([[steel_or_gold(N[y, x]) for x in range(100)] for y in range(100)])

# Outside her: everything there is weapon (left sword and its guard, the big sword's pommel and
# grip, the scabbard), up to her near forearm and near leg.
OUT = np.zeros((100, 100), bool)
OUT |= (yy >= 48) & (yy <= 60) & (xx <= 29)
OUT |= (yy >= 61) & (yy <= 62) & (xx <= 33)
OUT |= (yy >= 63) & (yy <= 69) & (xx <= 35)
OUT |= (yy >= 70) & (yy <= 82) & (xx <= 35)
OUT |= (yy >= 83) & (xx <= 30)
# the big blade's tip right of her far leg and above her far foot
OUT |= (yy >= 74) & (yy <= 87) & (xx >= 67)
OUT |= (yy >= 88) & (yy <= 92) & (xx >= 72)
OUT |= (yy >= 86) & (yy <= 89) & (xx >= 66) & WEAPON_COL
# the gap between her legs under the skirt, where the big blade crossed it
GAP = (yy >= 67) & (yy <= 82) & (xx >= 49) & (xx <= 54)

# Inside her: the big sword's guard over her near hand and hip, and its blade across her near thigh
# and her far leg: every pixel there that is not one of her colours (the weapon's greys, gold and
# its line); her own line pixels come back where her neighbours carry them on.
HERS = np.array([[hers(N[y, x]) for x in range(100)] for y in range(100)])
BLADE = band(42.0, 65.0, 80.5, 91.5, 4.5)
GUARD = band(43.0, 56.5, 34.5, 69.0, 2.4)
# In the bands every pixel that is not one of her colours goes: the steel and gold, the blade's dark
# greys and its line (her own line comes back where her neighbours carry it on).
INSIDE = (BLADE | GUARD) & ~(HERS & ~WEAPON_COL)
INSIDE &= FIG & ~OUT & ~GAP

empty = FIG & (OUT | (GAP & (WEAPON_COL | LINE)))
# lone gold sparkles anywhere
spark = FIG & WEAPON_COL & ~np.pad(FIG, 1)[:-2, 1:-1] & ~np.pad(FIG, 1)[2:, 1:-1] & ~np.pad(FIG, 1)[1:-1, :-2] & ~np.pad(FIG, 1)[1:-1, 2:]
empty |= spark

fig = FIG & ~empty
out = N.copy()
out[~fig] = 255
todo = INSIDE & fig
known = fig & ~todo
# Continue her pixels into the holes, nearest first: each pass fills the pixels that touch her
# kept pixels with the colour her armour, cloth or skin round it has most (her line is not carried
# into the holes: it comes back only at her edge, below), weighted toward the nearest.
FILL = HERS & ~WEAPON_COL & (N.max(2) > 50)
while todo.any():
    nxt = []
    for y, x in zip(*np.nonzero(todo)):
        if not any(0 <= y + dy < 100 and 0 <= x + dx < 100 and known[y + dy, x + dx] for dy, dx in ((-1, 0), (0, -1), (0, 1), (1, 0))):
            continue
        seen = {}
        for r in (1, 2, 3):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    j, i = y + dy, x + dx
                    if max(abs(dy), abs(dx)) == r and 0 <= j < 100 and 0 <= i < 100 and known[j, i] and FILL[j, i]:
                        k = tuple(out[j, i])
                        seen[k] = seen.get(k, 0) + 1.0 / r
            if seen:
                break
        if seen:
            nxt.append((y, x, max(seen.items(), key=lambda kv: kv[1])[0]))
    if not nxt:
        break
    for y, x, c in nxt:
        out[y, x] = c
        known[y, x] = True
        FILL[y, x] = True
        todo[y, x] = False
# where her figure now meets the empty outside, his line closes it
pad = np.pad(fig, 1)
edge = fig & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
newly = edge & ~LINE & (np.pad(empty | ~FIG, 1)[:-2, 1:-1] | np.pad(empty | ~FIG, 1)[2:, 1:-1] | np.pad(empty | ~FIG, 1)[1:-1, :-2] | np.pad(empty | ~FIG, 1)[1:-1, 2:])
newly &= np.pad(empty, 2)[:-4, 2:-2] | np.pad(empty, 2)[4:, 2:-2] | np.pad(empty, 2)[2:-2, :-4] | np.pad(empty, 2)[2:-2, 4:] | np.pad(empty, 1)[:-2, 1:-1] | np.pad(empty, 1)[2:, 1:-1] | np.pad(empty, 1)[1:-1, :-2] | np.pad(empty, 1)[1:-1, 2:]
line = np.median(N[LINE & FIG], 0).astype(int)
out[newly] = line
# a pixel of hers left alone with at most one neighbour of hers was the weapon's line: it goes
for _ in range(2):
    pad = np.pad(fig, 1)
    nb = sum(pad[1 + dy:101 + dy, 1 + dx:101 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
    lone = fig & (nb <= 1)
    fig &= ~lone
    out[lone] = 255

rgba = np.dstack([out.astype(np.uint8), np.where(fig, 255, 0).astype(np.uint8)])
Image.fromarray(rgba).save(sys.argv[1])
if len(sys.argv) > 2:
    Image.fromarray(rgba).resize((800, 800), Image.NEAREST).save(sys.argv[2])
print('emptied', int(empty.sum()), 'continued', int(INSIDE.sum()), 'lined', int(newly.sum()))
