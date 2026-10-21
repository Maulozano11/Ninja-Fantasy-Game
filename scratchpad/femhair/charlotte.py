"""Charlotte Roselei-inspired: long, voluminous golden waves. Run: python3 charlotte.py out.json"""
import json, sys
import hg2
from hg2 import Mass, Strand, generate, hist
from fem2 import shaping

hg2.CYL = 0.34
hg2.FORM = 0.6

def front():
    W = dict(hold=0.55, power=1.0, line_t0=0.25)
    P = [
        Mass([(2.2, 27.0), (0.8, 18.0), (1.2, 10.0), (4.0, 5.0), (9.0, 2.2), (15.5, 1.6), (21.0, 3.2), (24.8, 7.0), (26.2, 12.0),
              (26.0, 16.5), (12.0, 16.0), (10.2, 18.0), (9.4, 27.0)], z=0, flow=(0.3, 1)),
        # from the side part down the near side: big soft waves
        *[Strand([(9.2 - 0.6 * i, 2.8 + 0.8 * i), (3.0 - 0.4 * i, 6.0 + 1.0 * i), (1.0 + 0.6 * i, 16.0 + 1.0 * i), (3.0 + 1.6 * i, 27.0 - 0.4 * i)],
                 4.2, 1.6, z=1 + (i % 2), seed=130 + i, streak=(0.2, 0.5), wave=(1.2, 1.6, 0.9 * i), **W) for i in range(3)],
        # over the top toward the face side
        *[Strand([(10.0 + 0.4 * i, 2.4 + 0.9 * i), (16.5, 0.8 + 1.4 * i), (23.5, 4.0 + 1.6 * i), (25.4, 11.0 + 1.6 * i)],
                 3.8, 1.4, z=2 + (i % 2), seed=135 + i, streak=(0.25, 0.6), **W) for i in range(3)],
        # side-swept bangs from the part, the longest lock falling between the eyes
        Strand([(10.4, 3.0), (16.0, 2.6), (20.6, 8.0), (22.6, 15.6)], 4.4, 0.8, z=6, hold=0.75, power=1.0, seed=140, line_t0=0.3,
               streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(10.0, 3.6), (14.4, 4.4), (17.4, 10.0), (18.2, 17.6)], 4.2, 0.8, z=7, hold=0.75, power=1.0, seed=141, line_t0=0.3,
               streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(9.6, 4.2), (11.8, 7.0), (13.4, 12.0), (13.6, 17.4)], 3.8, 0.8, z=6, hold=0.75, power=1.0, seed=142, line_t0=0.3,
               streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(12.6, 6.0), (14.6, 10.0), (15.8, 15.0), (15.6, 20.2)], 2.8, 0.7, z=8, hold=0.7, power=1.0, seed=143, line_t0=0.3,
               streak=(0.2, 0.7), floor=2, tip_dark=False),
        Strand([(9.4, 5.0), (8.8, 9.0), (10.6, 15.6)], 3.2, 0.8, z=7, hold=0.7, power=1.0, seed=144, line_t0=0.3, floor=2, tip_dark=False),
        # wavy locks framing the face
        Strand([(8.6, 8.4), (7.4, 15.0), (8.6, 22.0), (9.6, 29.4)], 4.0, 1.2, z=8, hold=0.7, power=1.0, seed=145, line_t0=0.2, lit=0.05,
               streak=(0.15, 0.7), floor=2, wave=(1.1, 1.8, 0.0)),
        Strand([(23.8, 8.0), (25.8, 14.0), (25.2, 21.0), (25.8, 28.4)], 3.6, 1.0, z=8, hold=0.7, power=1.0, seed=146, line_t0=0.25,
               floor=2, wave=(1.0, 1.8, 1.2)),
    ]
    G = (6.0, 1.0, 26.5, 2.2, 2.0)
    return generate(P, form=(13.5, 10.0, 14.5, 15.0), gloss=G, extra=shaping(G, above=-0.14, slope=-0.025))

if __name__ == '__main__':
    rows, fa = front()
    out = {'hair_charlotte': {'f': rows, 'fa': fa}}
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
    print('hair_charlotte', len(rows[0]), 'x', len(rows), 'anchor', fa, 'hist', hist(rows))
