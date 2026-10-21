"""Candidate hairstyles for approval. Run: python3 styles.py out.json"""
import json
import sys
from hairgen import Poly, Spike, Strand, generate, shade_hist

STYLES = {}


def style(sid, name, desc, color):
    def deco(fn):
        STYLES[sid] = (name, desc, color, fn)
        return fn
    return deco


# --- Rebel Bristle (short wild spikes, ash blond) --------------------------
import math as _m


def radial(cx, cy, rb, rt, ang, w, z, bend=0.0, lit=0.0):
    a = _m.radians(ang)
    d = (_m.cos(a), _m.sin(a))
    n = (-d[1], d[0])
    bx, by = cx + d[0] * rb[0], cy + d[1] * rb[1]
    tip = (cx + d[0] * rt[0], cy + d[1] * rt[1])
    return Spike((bx + n[0] * w / 2, by + n[1] * w / 2), (bx - n[0] * w / 2, by - n[1] * w / 2), tip, z=z, bend=bend, lit=lit)


@style('hair_bristle', 'Rebel Bristle', 'Short, wild ash-blond spikes that point every way, with jagged bangs.', '#cfc8b2')
def bristle():
    cx, cy = 13.8, 11.0
    P = [Poly([(5, 20.5), (3.5, 15), (3.5, 9), (6, 5.5), (10, 3.5), (15, 3), (20, 4), (23.5, 7.5), (24.5, 11), (23.5, 14),
               (21, 13.5), (17, 13), (13, 13.5), (11, 14.5), (9.5, 16.5), (9, 19), (7.5, 21)], z=0, flow=(0.4, 1), streak=0.15)]
    # (angle, tip radius scale, base width, z, bend)
    spikes = [(150, 1.0, 5.0, 2, 0.5), (172, 1.08, 5.5, 3, 0.4), (198, 1.14, 6.0, 2, 0.6), (222, 1.26, 6.0, 4, 0.5),
              (246, 1.32, 6.0, 3, 0.4), (270, 1.3, 6.0, 5, 0.0), (294, 1.32, 6.0, 4, -0.5), (318, 1.22, 6.0, 3, -0.6),
              (342, 1.12, 5.5, 2, -0.4), (4, 1.05, 4.5, 1, 0.3)]
    for ang, k, w, z, bend in spikes:
        P.append(radial(cx, cy, (7.0, 6.5), (11.6 * k, 10.6 * k), ang, w, z, bend))
    # side spike down in front of the ear, and jagged bangs pointing down over the brow
    P.append(Spike((7, 14.5), (11, 15), (8.5, 21.5), z=3, bend=0.4))
    P.append(Spike((9.5, 10.5), (14.5, 11), (11.2, 17.3), z=6, bend=0.6, lit=0.05))
    P.append(Spike((13.5, 10.5), (18.5, 10.5), (16.3, 17.0), z=7, bend=-0.4, lit=0.05))
    P.append(Spike((17.5, 9.5), (22.5, 10.5), (21.8, 16.3), z=6, bend=-0.6))
    P.append(Spike((20.5, 8.5), (24.5, 11.5), (27.0, 15.3), z=5, bend=0.3))
    rows, fa = generate(P, form=(13.5, 10.5, 13, 12), dist=(0.33, 0.31, 0.24, 0.09, 0.03))
    return {'f': rows, 'fa': fa}


# --- Windward Fringe (sleek black layers, a long lock between the eyes) -----
@style('hair_windward', 'Windward Fringe', 'Sleek black layers to the jaw, side-swept bangs and one long lock between the eyes.', '#232f36')
def windward():
    P = [
        Poly([(5, 20), (3, 14), (4, 8), (7.5, 4.5), (12.5, 3), (18, 3.5), (22, 6), (24, 10), (24, 13), (21, 13), (16, 12.5),
              (12, 13), (9.5, 15), (8.5, 19), (7, 21.5)], z=0, flow=(1, 0.3), streak=0.2),
        # crown layers sweeping back to pointed tips
        Strand((20, 5), (12, 1.5), (3, 4.5), 5, 1.0, z=1, hold=0.35, power=0.8),
        Strand((21, 8), (12, 4.5), (1.5, 9.5), 5, 1.0, z=2, hold=0.35, power=0.8),
        Strand((19, 10), (10, 8), (1.0, 15), 4.5, 1.0, z=3, hold=0.35, power=0.8),
        Strand((14, 11), (7, 12), (2.0, 20.5), 4, 1.0, z=4, hold=0.3, power=0.8),
        # side-swept bangs toward the front
        Strand((13, 5), (20, 6.5), (25.5, 14.5), 4.5, 1.0, z=5, power=0.8),
        Strand((11, 7), (17, 9), (21.5, 15.5), 4, 1.0, z=6, power=0.8),
        Strand((11.5, 8), (10.5, 12), (10.5, 17.5), 3.5, 1.0, z=6, power=0.8),
        # side locks to the jaw, over the ear
        Strand((8, 10), (6, 16), (6.5, 24.5), 4.5, 1.2, z=5, power=0.8),
        Strand((10, 12), (9, 17.5), (9.8, 23.5), 3, 1.0, z=6, power=0.8),
        Strand((23, 9), (25.5, 14), (24.8, 21), 3, 1.0, z=4, power=0.8),
        # the long thin lock between the eyes
        Strand((16.5, 9), (18.8, 13.5), (18.3, 21.5), 2.2, 1.0, z=8, power=0.6, lit=0.12, streak=0.0),
    ]
    rows, fa = generate(P, form=(13.5, 10, 13, 13), dist=(0.32, 0.31, 0.24, 0.09, 0.04))
    return {'f': rows, 'fa': fa}


# --- Polished Bowl (glossy black bowl cut, thick brows) ---------------------
@style('hair_bowl', 'Polished Bowl', 'A glossy, perfectly round bowl cut with a blunt fringe over bold brows.', '#171a24')
def bowl():
    P = [
        Poly([(4, 23), (2.8, 17), (3, 11), (5, 6.5), (9, 3.3), (14, 2.3), (19, 3), (23, 5.8), (25, 10), (25.3, 14),
              (25.4, 21), (23.6, 21), (23.6, 14), (9.3, 14), (8.6, 15), (8.6, 22.6)], z=0, flow=(0, 1), streak=0.12),
    ]
    rows, fa = generate(P, form=(14, 12, 12.5, 11.5), gloss=(16, 15, 10, 10, 0.17, 0.5),
                        dist=(0.30, 0.30, 0.22, 0.11, 0.07), inner_lines=False)
    # bold brows two rows thick (hair-coloured), one row above the face's own brow
    ax, ay = fa
    grid = [list(r) for r in rows]

    def put(c, r, ch):
        x, y = c - 14 + ax, r - 19 + ay
        while y >= len(grid):
            grid.append(['.'] * len(grid[0]))
        if 0 <= y and 0 <= x < len(grid[0]):
            grid[y][x] = ch
    for c in range(11, 17):
        put(c, 15, '0')
    for c in range(12, 16):
        put(c, 16, '1')
    for c in range(20, 24):
        put(c, 15, '0')
    for c in range(21, 24):
        put(c, 16, '1')
    return {'f': [''.join(r) for r in grid], 'fa': fa}


# --- Exile's Sweep (auburn, swept back, a loose wave on the brow) -----------
@style('hair_exile', "Exile's Sweep", 'Auburn hair swept back in soft waves, with a loose strand falling over the brow.', '#9a5a32')
def exile():
    P = [
        Poly([(5, 22), (3.5, 17), (3, 11), (5, 6.5), (9, 4), (14, 3), (19, 3.5), (22.5, 6), (24, 9.5), (23.5, 12.5),
              (21, 12), (17, 11.5), (13, 12), (10.5, 14), (9.5, 17), (9, 20), (7, 22)], z=0, flow=(1, -0.4), streak=0.2),
        # waves swept from the brow to the back, each with an S bend and a curled end
        Strand((23.5, 7.5), (15, 0.5), (4.5, 6.5), 5, 1.5, z=2, hold=0.45, power=0.8),
        Strand((24, 10.5), (15, 4.5), (3, 11.5), 5, 1.5, z=3, hold=0.45, power=0.8),
        Strand((21.5, 12.5), (13, 8.5), (3.5, 16.5), 4.5, 1.5, z=4, hold=0.45, power=0.8),
        Strand((14, 13), (8, 12.5), (4.5, 21), 4, 1.2, z=5, hold=0.4, power=0.8),
        Strand((10.5, 15), (8.5, 18), (6.5, 22.5), 3, 1.0, z=6, power=0.8),
        Strand((4, 17), (2, 21), (5, 24), 3, 1.0, z=4, power=0.8),
        # parting volume at the front and loose strands on the brow
        Strand((21, 6), (26.5, 8), (25, 13.5), 3.5, 1.0, z=1, power=0.8),
        Strand((19.5, 9), (22.5, 12.5), (20, 16), 2.2, 0.8, z=7, power=0.7, lit=0.08),
        Strand((17, 10), (16, 13), (17.2, 15.6), 1.8, 0.8, z=7, power=0.7),
    ]
    rows, fa = generate(P, form=(13.5, 10.5, 13, 12.5), dist=(0.33, 0.31, 0.23, 0.09, 0.04))
    return {'f': rows, 'fa': fa}


# --- Chosen Waves (brown, wavy, parted, to the shoulders) -------------------
@style('hair_chosen', 'Chosen Waves', 'Shoulder-length brown waves, parted at the crown and framing the face.', '#6b4528')
def chosen():
    F = [
        Poly([(4, 21), (2.5, 14), (3.5, 8), (7, 4.5), (12, 3), (17, 3), (21.5, 5), (24, 9), (24.5, 14), (22.5, 12.5),
              (18, 11.5), (16, 9), (13, 11.5), (10.5, 14), (9.5, 17), (8, 21)], z=0, flow=(0.3, 1)),
        Strand((10, 9), (6.5, 17), (6, 28), 6, 3.0, z=3, hold=0.4),
        Strand((12, 10), (10, 18), (9.5, 26), 3.5, 1.5, z=4),
        Strand((16, 4), (11, 8), (9.5, 15), 4.5, 1.5, z=5),
        Strand((17, 4), (22, 7), (24.5, 15), 4, 1.5, z=5),
        Strand((15.5, 6), (13, 11), (14.5, 15.5), 2, 0.8, z=6),
        Strand((23.5, 10), (26, 17), (24.8, 25), 3.5, 1.5, z=2),
    ]
    front, fa = generate(F, form=(13.5, 13, 13, 15), H=34)
    B = [
        Poly([(2.5, 12), (1, 20), (0.5, 28), (2, 33), (9, 33.5), (13, 30), (13, 20), (10, 12)], z=0, flow=(0.2, 1)),
        Strand((3, 20), (0.5, 27), (2.5, 33.5), 4, 1.5, z=1),
        Strand((7, 22), (5, 29), (7.5, 34), 4, 1.5, z=1),
    ]
    back, ba = generate(B, form=(7, 20, 9, 14), H=36)
    return {'f': front, 'fa': fa, 'b': back, 'ba': ba}


if __name__ == '__main__':
    out = {}
    for sid, (name, desc, color, fn) in STYLES.items():
        d = fn()
        d.update({'id': sid, 'name': name, 'desc': desc, 'color': color})
        out[sid] = d
        print(sid, 'front', len(d['f'][0]), 'x', len(d['f']), 'anchor', d['fa'], 'hist', shade_hist(d['f']))
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
