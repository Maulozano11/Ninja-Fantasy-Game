"""Female hairstyle fronts rebuilt with strands, to the midnight standard. Run: python3 styles_fem.py out.json"""
import json, sys
from hairgen import Ellipse, Poly, Strand, generate, shade_hist

STYLES = {}
def style(sid):
    def deco(fn):
        STYLES[sid] = fn
        return fn
    return deco

CAP = [(5, 21), (3.4, 15), (3.8, 8.5), (6.8, 4.8), (11.5, 3.0), (17, 3.0), (21.6, 5.0), (24.2, 9.0), (24.8, 13.5), (22.5, 14.0),
       (17, 13.4), (12.5, 14.2), (10, 16), (9, 19.5), (7.5, 22)]

@style('hair_long')
def long_straight():
    P = [Poly(CAP, z=0, flow=(0.2, 1), streak=0.2),
         # smooth crown flowing down and back
         Strand((19.5, 3.6), (11, 2.2), (4.2, 8.5), 5.2, 3.6, z=1, hold=0.6, power=0.9),
         Strand((21.5, 6.5), (12, 4.2), (3.6, 13), 5.0, 3.4, z=2, hold=0.6, power=0.9),
         # blunt bangs: straight-cut strands ending in a level line over the brows
         Strand((11.5, 5.5), (11.3, 10), (11.4, 15.6), 3.6, 3.0, z=5, hold=0.7, power=1.0),
         Strand((14.4, 5.0), (14.6, 10), (14.8, 15.8), 3.6, 3.0, z=6, hold=0.7, power=1.0, lit=0.05),
         Strand((17.4, 5.2), (17.8, 10), (18.0, 15.8), 3.6, 3.0, z=5, hold=0.7, power=1.0),
         Strand((20.2, 6.0), (21.2, 10.5), (21.6, 15.4), 3.4, 2.8, z=4, hold=0.7, power=1.0),
         Strand((22.6, 7.6), (24.0, 11.5), (24.4, 15.0), 3.0, 2.4, z=3, hold=0.7, power=1.0),
         # chin-length side locks, cut straight
         Strand((8.6, 10), (8.0, 19), (8.6, 28.5), 4.2, 3.4, z=6, hold=0.75, power=1.0),
         Strand((10.6, 12), (10.4, 19), (10.8, 27.6), 2.6, 2.2, z=7, hold=0.75, power=1.0, lit=0.05),
         Strand((23.6, 9.5), (24.6, 17), (24.2, 25.5), 3.0, 2.4, z=5, hold=0.75, power=1.0),
         ]
    rows, fa = generate(P, form=(13.5, 10, 13, 13.5), gloss=(13.5, 11.5, 9.0, 8.0, 0.16, 0.45), dist=(0.30, 0.30, 0.24, 0.10, 0.06))
    return {'f': rows, 'fa': fa}

@style('hair_bob')
def bob():
    P = [Poly([(4.5, 24), (2.6, 17), (3.2, 9), (6.5, 4.6), (11.5, 2.8), (17, 2.8), (22, 5.0), (25, 9.5), (25.6, 16), (25, 23), (23, 23.5),
               (22.5, 14), (17, 13.4), (12.5, 14.2), (10, 16), (9.5, 20), (9, 24)], z=0, flow=(0.2, 1), streak=0.2),
         # rounded crown
         Strand((20, 3.6), (11, 1.8), (4.0, 9.0), 5.4, 3.6, z=1, hold=0.55, power=0.9),
         Strand((22.5, 7.0), (12, 4.0), (3.2, 14.5), 5.2, 3.2, z=2, hold=0.55, power=0.9),
         # the bob's sides turning in at the jaw
         Strand((6.0, 10.0), (2.4, 18.0), (6.6, 25.6), 5.0, 2.0, z=3, hold=0.5, power=0.8),
         Strand((9.0, 11.0), (7.6, 19.0), (10.2, 25.4), 3.6, 1.4, z=5, hold=0.45, power=0.8),
         Strand((23.5, 9.0), (26.6, 16.0), (23.6, 23.6), 3.6, 1.4, z=4, hold=0.45, power=0.8),
         # soft side-swept fringe
         Strand((12.5, 5.0), (12.0, 10.5), (12.8, 16.4), 3.8, 1.0, z=6, power=0.7),
         Strand((15.0, 4.8), (17.0, 10.0), (17.8, 16.6), 3.8, 1.0, z=7, power=0.7, lit=0.05),
         Strand((18.0, 5.0), (21.6, 9.0), (23.2, 15.8), 3.6, 1.0, z=6, power=0.7),
         ]
    rows, fa = generate(P, form=(13.5, 11, 13.5, 13.5), gloss=(13.5, 11.0, 9.5, 8.5, 0.16, 0.45), dist=(0.30, 0.30, 0.24, 0.10, 0.06))
    return {'f': rows, 'fa': fa}

@style('hair_buns')
def buns():
    P = [Poly(CAP, z=0, flow=(0.2, 1), streak=0.2),
         Strand((20, 3.8), (12, 2.4), (4.5, 8.0), 5.0, 3.4, z=1, hold=0.6, power=0.9),
         Strand((22, 7.0), (12.5, 4.6), (3.8, 13), 4.8, 3.2, z=2, hold=0.6, power=0.9),
         # two buns on top, each a coil of strands
         Ellipse(8.6, 1.6, 3.6, 3.4, z=3, streak=0.3, flow=(1, 1)),
         Strand((6.0, 0.4), (8.6, -2.6), (11.6, 0.6), 2.2, 1.8, z=4, hold=0.5),
         Strand((5.6, 3.2), (8.8, 5.2), (11.8, 2.4), 2.2, 1.8, z=4, hold=0.5),
         Ellipse(19.0, 0.6, 3.4, 3.2, z=3, streak=0.3, flow=(1, 1)),
         Strand((16.6, -0.6), (19.0, -3.4), (21.8, -0.4), 2.2, 1.8, z=4, hold=0.5),
         Strand((16.2, 2.2), (19.2, 4.0), (22.0, 1.4), 2.2, 1.8, z=4, hold=0.5),
         # soft bangs
         Strand((12.0, 6.0), (11.6, 11.0), (12.4, 16.2), 3.6, 1.0, z=6, power=0.7),
         Strand((15.0, 5.6), (16.4, 10.6), (17.2, 16.4), 3.6, 1.0, z=7, power=0.7, lit=0.05),
         Strand((18.2, 6.0), (21.6, 9.6), (23.0, 15.4), 3.4, 1.0, z=6, power=0.7),
         Strand((8.6, 10.0), (8.0, 17.0), (8.8, 23.5), 3.6, 1.2, z=5, power=0.8),
         Strand((23.4, 9.0), (24.6, 15.0), (24.2, 21.0), 2.6, 1.0, z=4, power=0.8),
         ]
    rows, fa = generate(P, form=(13.5, 9, 13.5, 14), gloss=(13.5, 10.5, 9.0, 8.0, 0.16, 0.42), dist=(0.30, 0.30, 0.24, 0.10, 0.06))
    return {'f': rows, 'fa': fa}

@style('hair_pony')
def pony():
    P = [Poly(CAP, z=0, flow=(1, -0.3), streak=0.2),
         # pulled up and back toward the tie high on the back of the head
         Strand((22.0, 8.0), (14.0, 3.0), (4.6, 4.4), 4.8, 2.4, z=2, hold=0.45, power=0.8),
         Strand((22.5, 11.0), (13.5, 6.0), (4.2, 7.4), 4.6, 2.4, z=3, hold=0.45, power=0.8),
         Strand((17.0, 12.5), (10.0, 9.0), (4.2, 10.4), 4.0, 2.2, z=4, hold=0.45, power=0.8),
         # side-swept bangs and a lock in front of the ear
         Strand((13.0, 6.0), (12.4, 11.0), (13.0, 16.2), 3.6, 1.0, z=6, power=0.7),
         Strand((16.0, 5.6), (18.4, 10.0), (19.4, 16.4), 3.4, 1.0, z=7, power=0.7, lit=0.05),
         Strand((19.0, 6.0), (22.8, 9.4), (24.4, 15.0), 3.2, 1.0, z=6, power=0.7),
         Strand((9.4, 11.0), (8.8, 18.0), (9.8, 25.0), 2.8, 1.0, z=6, power=0.8),
         # the tie
         Ellipse(4.0, 6.0, 2.0, 2.2, z=5, streak=0.0, lit=-0.2),
         ]
    rows, fa = generate(P, form=(13, 9.5, 13.5, 13), gloss=(13.5, 10.5, 9.5, 8.0, 0.16, 0.42), dist=(0.30, 0.30, 0.24, 0.10, 0.06))
    return {'f': rows, 'fa': fa}

@style('hair_silver')
def silver():
    P = [Poly(CAP, z=0, flow=(0.2, 1), streak=0.2),
         # parted in the middle: strands falling away from the part to both sides
         Strand((15.0, 3.2), (9.0, 4.0), (4.2, 11.0), 5.0, 3.0, z=1, hold=0.6, power=0.9),
         Strand((15.5, 3.2), (21.0, 4.0), (24.4, 11.5), 4.6, 2.8, z=1, hold=0.6, power=0.9),
         Strand((14.6, 4.2), (10.6, 8.0), (9.0, 16.5), 4.0, 2.0, z=5, hold=0.5, power=0.8),
         Strand((15.8, 4.2), (20.4, 8.4), (22.6, 16.0), 3.8, 1.8, z=5, hold=0.5, power=0.8, lit=0.05),
         Strand((15.2, 5.0), (15.8, 10.0), (16.6, 15.6), 2.4, 0.9, z=6, power=0.7),
         # straight curtains down both sides of the face
         Strand((8.6, 11.0), (8.0, 20.0), (8.8, 29.0), 4.0, 1.6, z=6, hold=0.6, power=0.9),
         Strand((23.8, 10.0), (24.8, 18.0), (24.4, 27.0), 3.0, 1.2, z=5, hold=0.6, power=0.9),
         ]
    rows, fa = generate(P, form=(14.5, 10, 13, 13.5), gloss=(14.5, 11.0, 9.5, 8.0, 0.16, 0.45), dist=(0.28, 0.30, 0.25, 0.11, 0.06))
    return {'f': rows, 'fa': fa}

if __name__ == '__main__':
    out = {}
    for sid, fn in STYLES.items():
        d = fn()
        d['id'] = sid
        out[sid] = d
        print(sid, len(d['f'][0]), 'x', len(d['f']), 'anchor', d['fa'], 'hist', shade_hist(d['f']))
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
