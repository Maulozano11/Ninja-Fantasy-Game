"""Re-shade the current female templates inside their exact silhouettes. Run: python3 polish.py out.json [ids...]"""
import json, os, sys
import numpy as np
import hg2
from hg2 import Blob, Mass, Strand, generate, hist, silhouette, cel
MODE = os.environ.get('MODE', 'rank')
RING_TH = float(os.environ.get('RING_TH', '1.2'))
ABOVE = float(os.environ.get('ABOVE', '-0.16'))
SLOPE = float(os.environ.get('SLOPE', '-0.02'))
hg2.FORM = float(os.environ.get('FORM', '0.85'))
from fem2 import group, shaping

BEFORE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'before.json')))
STYLES = {}
def style(sid):
    def deco(fn):
        STYLES[sid] = fn
        return fn
    return deco

def base(sid, key='f', **kw):
    inside, bb = silhouette(BEFORE[sid][key], BEFORE[sid][key + 'a'])
    return inside, Mass(None, z=0, fn=inside, bb=bb, **kw)

@style('hair_bob')
def bob():
    hg2.CYL = 0.34
    inside, M = base('hair_bob', flow=(0.4, 1))
    P = [M,
         # crown fanning from the whorl
         *group((9.0, 1.0), (13.0, 0.0), (1.0, 6.0), (-1.0, 12.0), 3, 3.2, bend=(0, -1.0), z=1, seed=12, w1=1.4, hold=0.5, nlines=0),
         *group((13.0, 0.0), (19.0, 1.5), (22.0, 5.0), (27.0, 9.0), 3, 3.0, bend=(0.5, -1.5), z=1, seed=13, w1=1.4, hold=0.5, nlines=0),
         # the near side, full and turning in at the jaw
         *[Strand([(4.0 + 1.6 * i, 5.0 + 1.0 * i), (-1.0 + 1.6 * i, 12 + i), (0.0 + 1.5 * i, 19 + 0.6 * i), (2.0 + 1.6 * i, 23.5)],
                  3.2, 1.4, z=2 + (i % 2), hold=0.6, power=1.2, seed=20 + i, line_t0=0.25, streak=(0.25, 0.55)) for i in range(4)],
         # far side
         *[Strand([(21.0 + 1.6 * i, 4.0 + 1.4 * i), (25.5 + 0.6 * i, 10), (27.5, 16), (27.0 - 0.6 * i, 23.5)],
                  2.8, 1.2, z=2 + (i % 2), hold=0.6, power=1.2, seed=30 + i, line_t0=0.3) for i in range(2)],
         # soft fringe, thin pointed tips over the eyes
         *group((10.5, 3.0), (20.5, 4.0), (11.5, 19.5), (21.5, 19.5), 6, 2.8, bend=(0.6, 0), z=6, seed=14, tip_j=1.2, w1=0.6,
                hold=0.45, power=1.0, line_t0=0.3, nlines=0, streak=(0.2, 0.7)),
         ]
    G = (6.5, 0.0, 27.0, 3.0, RING_TH)
    if MODE == 'cel':
        rows, fa = cel(P, form=(12.5, 10.0, 15.0, 15.0), ring=(6.5, 0.0, 27.0, 3.0, 0.9), keep=inside, cuts=(0.45, 0.999),
                       extra=shaping(G, above=-0.1, slope=-0.025))
    else:
        rows, fa = generate(P, form=(12.5, 10.0, 15.0, 15.0), gloss=G, extra=shaping(G, above=ABOVE, slope=SLOPE), keep=inside)
    return {'f': rows, 'fa': fa}

def free(s):
    """A strand allowed outside the old silhouette."""
    s.free = True
    return s


@style('hair_long')
def long_straight():
    hg2.CYL = 0.34
    inside, M = base('hair_long', flow=(0.2, 1))
    P = [M,
         # crown fanning from the whorl over the top and down the back
         *group((15.0, 2.5), (21.5, 4.5), (8.0, 4.0), (5.0, 9.5), 4, 3.0, bend=(0, -1.6), z=1, seed=2, w1=1.4, hold=0.5, nlines=0),
         *group((9.0, 4.0), (11.0, 7.0), (4.5, 14.0), (5.0, 25.0), 3, 3.0, bend=(-1.4, -0.4), z=1, seed=3, w1=1.4, hold=0.5, nlines=0),
         # blunt bangs, cut level over the brows
         *group((10.0, 4.0), (22.5, 6.0), (10.0, 17.2), (23.0, 17.2), 6, 2.9, bend=(0.3, 0), z=5, seed=4, tip_j=0.3, w1=1.6,
                hold=0.82, power=1.5, line_t0=0.28, nlines=0, streak=(0.2, 0.85)),
         # side locks to the chin
         *group((4.2, 9.0), (9.6, 10.0), (4.8, 26.0), (9.6, 25.6), 3, 2.4, bend=(-0.3, 0), z=6, seed=5, tip_j=0.4, w1=1.2,
                hold=0.8, power=1.5, line_t0=0.2, nlines=0, streak=(0.15, 0.7)),
         *group((23.4, 8.0), (27.6, 10.0), (24.0, 25.6), (27.4, 24.6), 2, 2.2, bend=(0.4, 0), z=6, seed=6, tip_j=0.4, w1=1.2,
                hold=0.8, power=1.5, line_t0=0.3, nlines=0),
         ]
    G = (7.6, 4.0, 28.0, 2.4, RING_TH)
    rows, fa = generate(P, form=(15.0, 11.0, 13.5, 14.0), gloss=G, extra=shaping(G, above=ABOVE, slope=SLOPE), keep=inside)
    return {'f': rows, 'fa': fa}


@style('hair_buns')
def buns():
    hg2.CYL = 0.34
    inside0, M = base('hair_buns', flow=(0.3, 1))
    inside = lambda x, y: inside0(x, y) and not (y >= 12.5 and x >= 9.0)
    P = [M,
         Blob(7.2, -0.5, 4.2, 4.0, z=3, coil=2.2),
         Strand([(3.4, 2.4), (7.0, 5.0), (11.4, 2.4)], 1.8, 1.4, z=4, hold=0.6, gloss=False),
         *group((12.0, 3.0), (21.0, 5.0), (9.0, 5.0), (4.0, 9.0), 3, 3.0, bend=(0, -1.2), z=1, seed=42, w1=1.4, hold=0.5, nlines=0),
         *group((8.0, 5.0), (10.0, 8.0), (2.6, 14.0), (4.0, 17.5), 3, 3.0, bend=(-1.2, -0.4), z=1, seed=43, w1=1.4, hold=0.5, nlines=0),
         *group((20.0, 4.0), (24.0, 8.0), (25.0, 11.0), (26.0, 16.0), 2, 2.8, bend=(0.8, -0.6), z=1, seed=41, w1=1.4, hold=0.5, nlines=0),
         # bangs: pointed clumps with the forehead showing between the tips
         *[free(s) for s in (
             Strand([(10.2, 5.0), (9.6, 11.0), (10.4, 16.8)], 4.0, 1.0, z=6, hold=0.72, power=2.0, seed=81, line_t0=0.3, lit=0.2, tip_dark=False, floor=2, streak=(0.2, 0.8)),
             Strand([(13.2, 5.0), (13.0, 11.5), (14.0, 17.4)], 4.2, 1.0, z=7, hold=0.72, power=2.0, seed=82, line_t0=0.3, lit=0.2, tip_dark=False, floor=2, streak=(0.2, 0.8)),
             Strand([(16.4, 5.2), (16.8, 11.0), (17.6, 16.8)], 4.0, 1.0, z=6, hold=0.72, power=2.0, seed=83, line_t0=0.3, lit=0.2, tip_dark=False, floor=2, streak=(0.2, 0.8)),
             Strand([(19.4, 5.6), (20.4, 11.0), (21.2, 16.2)], 3.8, 1.0, z=7, hold=0.72, power=2.0, seed=84, line_t0=0.3, lit=0.2, tip_dark=False, floor=2, streak=(0.2, 0.8)),
             Strand([(22.0, 6.4), (23.4, 10.6), (24.0, 14.8)], 3.2, 1.0, z=6, hold=0.72, power=2.0, seed=85, line_t0=0.3, lit=0.14, tip_dark=False, floor=2),
             Strand([(23.6, 8.4), (25.6, 12.0), (25.6, 15.6)], 3.0, 1.2, z=6, hold=0.6, power=1.6, seed=86, line_t0=0.3, lit=0.1, floor=2),
         )],
         *group((4.0, 9.0), (8.0, 10.0), (5.0, 20.0), (8.4, 21.0), 2, 2.6, bend=(-0.5, 0), z=6, seed=45, tip_j=0.6, w1=0.8,
                hold=0.6, power=1.2, line_t0=0.2, nlines=0, streak=(0.15, 0.6)),
         ]
    G = (8.4, 2.0, 27.0, 2.2, RING_TH)
    rows, fa = generate(P, form=(14.0, 9.0, 14.0, 14.5), gloss=G, extra=shaping(G, above=ABOVE, slope=SLOPE), keep=inside)
    # the far bun, behind the head
    inb, MB = base('hair_buns', key='b')
    PB = [MB, Blob(20.0, 0.0, 4.4, 4.0, z=2, coil=2.2)]
    brows, ba = generate(PB, form=(20.0, 0.0, 5.0, 5.0), keep=inb, cast=0, dist=(0.34, 0.36, 0.22, 0.08))
    return {'f': rows, 'fa': fa, 'b': brows, 'ba': ba}


@style('hair_pony')
def pony():
    hg2.CYL = 0.34
    inside, M = base('hair_pony', flow=(1, -0.3))
    P = [M,
         # pulled up and back toward the tie at the back of the head
         *[Strand([(22.5 - 0.8 * i, 6.0 + 1.6 * i), (14.0 - 0.5 * i, 0.8 + 1.8 * i), (3.6, 4.0 + 0.5 * i)], 3.0, 1.6, z=2 + (i % 2),
                  hold=0.5, power=1.0, seed=50 + i, line_t0=0.0, line_t1=0.5, streak=(0.3, 0.7)) for i in range(5)],
         *[Strand([(8.0 - 0.3 * i, 19.0 - 3.0 * i), (4.0, 14.0 - 2.5 * i), (3.6, 6.0 + 0.4 * i)], 2.8, 1.6, z=2 + (i % 2),
                  hold=0.5, power=1.0, seed=56 + i, line_t0=0.0, line_t1=0.5) for i in range(3)],
         # side-swept bangs, pointed
         *group((11.0, 4.5), (20.5, 5.0), (11.5, 18.4), (21.5, 17.6), 5, 3.0, bend=(1.0, 0), z=6, seed=54, tip_j=0.9, w1=0.6,
                hold=0.45, power=1.0, line_t0=0.3, nlines=0, streak=(0.2, 0.7)),
         ]
    G = (7.6, 4.0, 27.0, 2.4, RING_TH)
    rows, fa = generate(P, form=(14.0, 10.0, 13.5, 14.0), gloss=G, extra=shaping(G, above=ABOVE, slope=SLOPE), keep=inside)
    return {'f': rows, 'fa': fa}


@style('hair_silver')
def silver():
    hg2.CYL = 0.34
    inside, M = base('hair_silver', flow=(0.2, 1))
    P = [M,
         # parted at x 17: strands falling away from the part to both sides
         *[Strand([(16.6, 0.8 + 0.3 * i), (10.0 - 1.0 * i, 1.0 + 1.6 * i), (3.0 - 0.4 * i, 10.0 + 3.6 * i)], 3.0, 1.6, z=2 + (i % 2),
                  hold=0.5, power=1.0, seed=60 + i, line_t0=0.2, streak=(0.25, 0.6)) for i in range(4)],
         *[Strand([(17.6, 0.8 + 0.3 * i), (22.0 + 0.4 * i, 2.4 + 1.4 * i), (25.0 + 0.3 * i, 10.0 + 3.0 * i)], 2.8, 1.4, z=2 + (i % 2),
                  hold=0.5, power=1.0, seed=64 + i, line_t0=0.2) for i in range(3)],
         # parted bangs falling from the part to both sides, a lock between the eyes
         free(Strand([(16.0, 2.0), (12.8, 7.5), (12.4, 17.3)], 4.4, 2.0, z=6, hold=0.6, power=1.5, seed=67, line_t0=0.25, streak=(0.2, 0.65))),
         free(Strand([(16.4, 2.8), (15.0, 9.0), (14.9, 17.1)], 3.0, 1.4, z=7, hold=0.6, power=1.5, seed=72, line_t0=0.25, streak=(0.2, 0.6))),
         free(Strand([(18.4, 2.8), (19.6, 9.0), (19.8, 16.8)], 3.4, 1.2, z=7, hold=0.6, power=1.5, seed=73, line_t0=0.25)),
         free(Strand([(20.0, 3.4), (22.0, 9.0), (22.6, 16.4)], 3.0, 1.0, z=6, hold=0.6, power=1.5, seed=74, line_t0=0.25)),
         Strand([(16.4, 2.6), (15.4, 10.0), (15.2, 21.0)], 2.2, 0.6, z=7, hold=0.4, power=1.0, seed=71, line_t0=0.25, streak=(0.2, 0.6)),
         Strand([(18.4, 2.6), (21.0, 8.0), (21.6, 16.0)], 3.0, 0.8, z=6, hold=0.4, power=1.0, seed=68, line_t0=0.25, streak=(0.2, 0.65)),
         # straight curtains framing the face
         *group((2.0, 10.0), (9.0, 12.0), (2.6, 24.0), (8.6, 22.0), 3, 2.6, bend=(-0.4, 0), z=7, seed=69, tip_j=0.6, w1=0.9,
                hold=0.6, power=1.1, line_t0=0.2, nlines=0, streak=(0.15, 0.6)),
         *group((21.0, 9.0), (25.0, 11.0), (22.0, 24.0), (25.0, 22.0), 2, 2.4, bend=(0.6, 0), z=7, seed=70, tip_j=0.6, w1=0.9,
                hold=0.6, power=1.1, line_t0=0.3, nlines=0),
         ]
    G = (6.8, 1.0, 27.0, 2.6, RING_TH)
    rows, fa = generate(P, form=(15.0, 10.0, 14.0, 14.5), gloss=G, extra=shaping(G, above=ABOVE, slope=SLOPE), keep=inside)
    return {'f': rows, 'fa': fa}


if __name__ == '__main__':
    out = json.load(open(sys.argv[1])) if os.path.exists(sys.argv[1]) else {}
    only = sys.argv[2:]
    log = []
    for sid, fn in STYLES.items():
        if only and sid not in only:
            continue
        d = fn()
        out[sid] = d
        log.append(f"{sid} {len(d['f'][0])} x {len(d['f'])} anchor {d['fa']} hist {hist(d['f'])}")
        log += ['    ' + r for r in d['f']]
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
    open(sys.argv[1] + '.txt', 'w').write('\n'.join(log) + '\n')
    print('\n'.join(l for l in log if not l.startswith('    ')))
