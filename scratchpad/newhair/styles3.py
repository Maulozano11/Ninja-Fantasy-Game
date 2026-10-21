"""Saber / Lelouch / Kallen inspired candidates for approval. Run: python3 styles3.py out.json"""
import json, math, sys
from hairgen import Ellipse, Poly, Spike, Strand, generate, shade_hist

STYLES = {}


def style(sid, name, desc, color):
    def deco(fn):
        STYLES[sid] = (name, desc, color, fn)
        return fn
    return deco


@style('hair_crown', 'Crowned Braid', 'Golden hair pulled back into a braided bun with a ribbon, soft bangs, long locks framing the face and one stubborn strand standing up.', '#e3c25a')
def crown():
    P = [
        Poly([(5, 20), (3.5, 14), (4, 8), (7, 5), (12, 3.2), (17, 3.2), (21.5, 5.5), (24, 9.5), (24.5, 13), (22, 13), (17, 12.5),
              (13, 13), (10.5, 15), (9.5, 19), (8, 21)], z=0, flow=(1, -0.3), streak=0.18),
        # pulled back toward the bun
        Strand((22, 7.5), (14, 2.5), (5, 6.5), 4.5, 2.0, z=2, hold=0.4, power=0.8),
        Strand((22.5, 10.5), (14, 5.5), (4.5, 9.5), 4.5, 2.0, z=3, hold=0.4, power=0.8),
        Strand((18, 12), (11, 9), (4.5, 12.5), 4, 2.0, z=4, hold=0.4, power=0.8),
        # soft bangs over the brow, one strand between the eyes
        Strand((14, 6.5), (13, 11), (13.8, 16.2), 3.6, 0.9, z=6, power=0.8),
        Strand((16.5, 6), (19, 10), (19.2, 16.6), 3.2, 0.9, z=7, power=0.7, lit=0.06),
        Strand((18.5, 6), (22.5, 8.5), (24.4, 14.6), 3.4, 0.9, z=6, power=0.8),
        # long locks framing the face to the jaw
        Strand((9.5, 11), (8.6, 18), (9.6, 26.5), 3.2, 1.0, z=7, power=0.7),
        Strand((23, 9.5), (25.3, 15.5), (24.6, 24.0), 2.6, 0.9, z=5, power=0.7),
        # the braided bun at the back of the head: a coil of short plaits
        Ellipse(3.4, 7.6, 3.4, 3.6, z=1, streak=0.25, flow=(1, 1)),
        Strand((1.0, 4.6), (-0.8, 7.6), (1.4, 10.8), 2.2, 1.8, z=2, hold=0.5),
        Strand((3.6, 4.2), (6.4, 6.2), (5.6, 9.6), 2.0, 1.6, z=2, hold=0.5),
        Strand((2.0, 8.4), (3.6, 11.4), (6.4, 10.6), 2.0, 1.6, z=2, hold=0.5),
        # the one strand that will not lie flat
        Strand((13.5, 3.6), (13.8, -2.2), (17.6, -2.0), 1.8, 0.7, z=8, hold=0.2, power=0.7, lit=0.08, streak=0.0),
    ]
    rows, fa = generate(P, form=(12.5, 10, 13.5, 12.5), dist=(0.28, 0.30, 0.25, 0.11, 0.06))
    R = [Poly([(5.4, 3.6), (7.4, 3.8), (7.6, 11.2), (5.6, 11.4)], z=0, flow=(0, 1), streak=0.0),
         Poly([(5.8, 10.6), (3.8, 13.4), (4.4, 16.8), (6.4, 12.6)], z=1, flow=(0, 1), streak=0.0),
         Poly([(6.8, 10.6), (8.6, 13.0), (8.2, 16.2), (7.0, 12.4)], z=1, flow=(0, 1), streak=0.0)]
    band, banda = generate(R, form=(6.5, 8.5, 4, 5), dist=(0.25, 0.35, 0.3, 0.1, 0.0), inner_lines=True)
    return {'f': rows, 'fa': fa, 'band': band, 'banda': banda, 'bandColor': '#2a4aa6'}


@style('hair_regal', 'Regal Fringe', 'Straight black hair over the ears to the jaw, with sharp bangs falling between the eyes.', '#1b1b26')
def regal():
    P = [
        Poly([(5, 23), (3, 16), (3.5, 9), (6.5, 4.8), (12, 3), (17.5, 3.2), (22, 5.5), (24.3, 9.5), (24.6, 13.5), (22, 13),
              (17, 12.5), (12.5, 13.5), (10, 15.5), (9, 19), (8, 23)], z=0, flow=(0.3, 1), streak=0.2),
        # smooth crown layers
        Strand((20.5, 5), (12, 1.8), (4, 6), 5, 2.5, z=1, hold=0.45, power=0.8),
        Strand((21.5, 8.5), (12, 5), (3, 11), 5, 2.0, z=2, hold=0.45, power=0.8),
        # straight back and nape
        Strand((7, 9), (3, 16), (4.2, 25.5), 5, 1.2, z=3, power=0.8),
        # sharp bangs: pointed clumps falling to the eyes, one between them
        Strand((11.5, 6), (11, 11.5), (11.4, 17.4), 4.4, 0.6, z=6, power=0.6),
        Strand((14.5, 5.5), (15.4, 10.5), (17.0, 17.0), 4.0, 0.6, z=7, power=0.6, lit=0.05),
        Strand((17.5, 6), (19.2, 11), (19.4, 18.4), 3.2, 0.6, z=8, power=0.6, lit=0.08),
        Strand((19.5, 6), (23, 9.5), (24.6, 16.0), 3.6, 0.6, z=6, power=0.6),
        # over the ears to the jaw
        Strand((8, 10), (6, 17), (6.6, 25.8), 4.6, 1.0, z=5, power=0.75),
        Strand((10.5, 12), (9.4, 18), (10.2, 24.8), 3.0, 0.8, z=6, power=0.75),
        Strand((23, 9), (25.5, 15), (24.8, 22.6), 3.0, 0.9, z=4, power=0.75),
    ]
    rows, fa = generate(P, form=(13.5, 10.5, 13, 13), dist=(0.33, 0.31, 0.23, 0.09, 0.04))
    return {'f': rows, 'fa': fa}


def radial(cx, cy, rb, rt, ang, w, z, bend=0.0, lit=0.0):
    a = math.radians(ang)
    d = (math.cos(a), math.sin(a))
    n = (-d[1], d[0])
    bx, by = cx + d[0] * rb[0], cy + d[1] * rb[1]
    tip = (cx + d[0] * rt[0], cy + d[1] * rt[1])
    return Spike((bx + n[0] * w / 2, by + n[1] * w / 2), (bx - n[0] * w / 2, by - n[1] * w / 2), tip, z=z, bend=bend, lit=lit)


@style('hair_scarlet', 'Scarlet Flick', 'Short red hair in layered spikes that flick outward at the nape and sides, with jagged bangs.', '#c8343a')
def scarlet():
    cx, cy = 13.8, 11.0
    P = [Poly([(5, 21), (3.5, 15), (3.8, 9), (6.5, 5.2), (11, 3.4), (16, 3.2), (20.5, 4.6), (23.6, 8), (24.4, 12), (22, 13),
               (17, 12.5), (13, 13.5), (10.5, 15), (9.5, 18.5), (8, 21)], z=0, flow=(0.5, 1), streak=0.18)]
    # layered spikes sweeping back and flicking out (bend curls their tips up)
    for ang, k, w, z, bend in [(158, 1.12, 5.0, 2, -1.2), (180, 1.18, 5.2, 3, -1.0), (202, 1.14, 5.4, 2, -0.7), (224, 1.08, 5.4, 3, -0.5),
                               (246, 0.98, 5.4, 4, -0.4), (270, 0.92, 5.4, 3, -0.6), (296, 0.94, 5.0, 2, -0.4)]:
        P.append(radial(cx, cy, (7.0, 6.6), (11.2 * k, 10.0 * k), ang, w, z, bend))
    # nape flicks: down, then out
    P.append(Strand((6, 13), (2.5, 19), (-0.4, 21.4), 4.4, 0.8, z=4, power=0.8))
    P.append(Strand((7.5, 15.5), (5.5, 22), (3.0, 25.0), 3.6, 0.8, z=5, power=0.8))
    # jagged bangs over the brow, swept toward the face
    P.append(Spike((9.5, 9.5), (14, 10), (11.8, 17.5), z=6, bend=0.5, lit=0.04))
    P.append(Spike((13, 9.5), (17.5, 9.5), (16.4, 17.2), z=7, bend=-0.3, lit=0.06))
    P.append(Spike((16.5, 8.5), (21, 9.5), (20.6, 16.6), z=6, bend=-0.5))
    P.append(Spike((19.5, 7.5), (23.5, 10), (26.0, 14.6), z=5, bend=0.3))
    # side lock in front of the ear flicking out at the jaw
    P.append(Strand((9, 12), (8.4, 19), (6.4, 23.4), 3.8, 0.8, z=6, power=0.8))
    rows, fa = generate(P, form=(13.5, 10.5, 13, 12), dist=(0.30, 0.31, 0.25, 0.10, 0.04))
    return {'f': rows, 'fa': fa}


if __name__ == '__main__':
    out = {}
    for sid, (name, desc, color, fn) in STYLES.items():
        d = fn()
        d.update({'id': sid, 'name': name, 'desc': desc, 'color': color})
        out[sid] = d
        print(sid, 'front', len(d['f'][0]), 'x', len(d['f']), 'anchor', d['fa'], 'hist', shade_hist(d['f']))
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
