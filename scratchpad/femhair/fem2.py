"""Female hairstyle fronts, v2. Run: python3 fem2.py out.json [ids...]"""
import json, sys
import numpy as np
from hg2 import Blob, Mass, Strand, generate, hist


def group(ra, rb, ta, tb, n, w, bend=(0.0, 0.0), z=3, seed=1, tip_j=0.5, w_j=0.18, bend_j=0.4, zs=(0, 1, 2), **kw):
    """n thin strands side by side: roots spread along ra-rb, tips along ta-tb, bowed by `bend`.
    Lengths, widths and curvature jitter a little so the edge and the texture look like hair."""
    rng = np.random.default_rng(seed)
    out = []
    for i in range(n):
        f = (i + 0.5) / n
        r = np.array(ra) + (np.array(rb) - np.array(ra)) * f
        t = np.array(ta) + (np.array(tb) - np.array(ta)) * f
        d = t - r
        L = np.linalg.norm(d) or 1
        t = t + d / L * rng.uniform(-tip_j, tip_j)
        m = (r + t) / 2 + np.array(bend) + rng.uniform(-bend_j, bend_j, 2)
        ww = w * rng.uniform(1 - w_j, 1 + w_j)
        out.append(Strand([tuple(r), tuple(m), tuple(t)], ww, kw.pop('w1', None) or ww * 0.55, z=z + zs[int(rng.integers(len(zs)))],
                          seed=seed * 31 + i, **kw) if False else
                   Strand([tuple(r), tuple(m), tuple(t)], ww, kw.get('w1', ww * 0.5), z=z + zs[int(rng.integers(len(zs)))],
                          seed=seed * 31 + i, **{k: v for k, v in kw.items() if k != 'w1'}))
    return out

STYLES = {}

def ring_y(gloss, x):
    gcy, gx0, gx1, curve, th = gloss
    mid, half = (gx0 + gx1) / 2, (gx1 - gx0) / 2
    return gcy + curve * ((x - mid) / half) ** 2

def shaping(gloss, above=-0.16, slope=-0.035, lit_edge=0.18):
    """Anime hair value shaping: mid tone above the gloss ring, darker the further below it, lit strand edges."""
    def f(x, y, p, inf=None):
        ry = ring_y(gloss, min(max(x, gloss[1]), gloss[2]))
        d = y - ry
        v = above if d < -gloss[4] else (slope * max(0.0, d - gloss[4]))
        return v
    return f
def style(sid):
    def deco(fn):
        STYLES[sid] = fn
        return fn
    return deco

@style('hair_long')
def long_straight():
    import hg2
    hg2.CYL = 0.34
    P = [
        Mass([(4.2, 23), (2.8, 15), (3.4, 8.5), (6.5, 4.4), (11.5, 2.5), (17, 2.5), (21.8, 4.6), (24.6, 8.8), (25.2, 13.5), (24.8, 16.5),
              (12, 16.5), (10, 18), (9.6, 23)], z=0, flow=(0.25, 1)),
        # crown: strands fanning from the whorl over the top and down the back, a couple of flyaways
        *group((19, 3.0), (23.5, 7.5), (7.0, 3.0), (3.6, 9.5), 4, 3.0, bend=(0, -2.4), z=1, seed=2, w1=1.2, hold=0.55, nlines=0, bend_j=0.6),
        *group((9.5, 3.2), (11.0, 6.5), (3.0, 13.5), (4.2, 22.5), 4, 3.0, bend=(-1.8, -0.6), z=1, seed=3, w1=1.2, hold=0.55, nlines=0, bend_j=0.6),
        Strand([(12, 3.2), (9, 0.6), (5.4, 1.4)], 1.4, 0.6, z=3, hold=0.3, gloss=False, line=False),
        Strand([(5.0, 9.0), (2.2, 10.2), (1.6, 13.0)], 1.3, 0.6, z=3, hold=0.3, gloss=False, line=False),
        # blunt bangs: strands cut level over the brows, the tips just slightly pointed
        *group((10.6, 3.6), (23.0, 5.6), (10.6, 17.2), (23.6, 17.1), 6, 3.0, bend=(0.3, 0), z=5, seed=4, tip_j=0.4, w1=1.0,
               hold=0.82, power=1.2, line_t0=0.28, nlines=0, streak=(0.2, 0.85)),
        # chin-length side locks
        *group((7.2, 9.5), (10.8, 11.5), (7.6, 28.6), (11.0, 27.8), 3, 2.6, bend=(-0.4, 0), z=6, seed=5, tip_j=0.6, w1=1.0,
               hold=0.8, power=1.2, line_t0=0.2, nlines=0, streak=(0.15, 0.7)),
        *group((23.2, 8.6), (25.2, 9.4), (23.6, 26.6), (25.0, 25.8), 2, 2.4, bend=(0.6, 0), z=6, seed=6, tip_j=0.6, w1=1.0,
               hold=0.8, power=1.2, line_t0=0.3, nlines=0),
    ]
    G = (8.0, 4.0, 24.0, 2.2, 1.2)
    rows, fa = generate(P, form=(13.5, 11, 12.5, 13.5), gloss=G, extra=shaping(G, slope=-0.02))
    return {'f': rows, 'fa': fa}

@style('hair_bob')
def bob():
    import hg2
    hg2.CYL = 0.34
    P = [
        Mass([(4.0, 25.4), (2.4, 18), (2.8, 10), (6.0, 4.8), (11.5, 2.4), (17, 2.4), (22, 4.6), (25, 9), (25.8, 15), (25.4, 22), (23.8, 24.6),
              (22.6, 16), (12, 16.5), (10, 19), (9.6, 25.4)], z=0, flow=(0.2, 1)),
        # rounded crown fanning from the whorl
        *group((18.5, 3.0), (23.5, 7.5), (6.5, 3.0), (3.0, 10.5), 4, 3.0, bend=(0, -2.6), z=1, seed=12, w1=1.4, hold=0.55, nlines=0, bend_j=0.5),
        # the bob's near side: full, turning in under the jaw
        *[Strand([(5.0 + 1.6 * i, 6.5 + 1.2 * i), (1.6 + 1.4 * i, 14 + i), (2.6 + 1.6 * i, 22 + 0.6 * i), (6.2 + 1.5 * i, 26.0 - 0.3 * i)],
                 3.2, 1.2, z=2 + (i % 2), hold=0.6, power=1.2, seed=20 + i, line_t0=0.25, streak=(0.25, 0.55)) for i in range(3)],
        Strand([(11.0, 11.5), (9.4, 17), (9.0, 22), (10.6, 25.4)], 2.4, 0.9, z=5, hold=0.55, power=1.2, seed=24, lit=0.06, streak=(0.2, 0.6)),
        # far side turning in toward the chin
        *[Strand([(22.6 + 1.2 * i, 6.5 + 1.2 * i), (26.0 + 0.4 * i, 13), (26.2, 20), (23.8 - 0.4 * i, 24.4 - 0.6 * i)],
                 2.8, 1.0, z=2 + (i % 2), hold=0.6, power=1.2, seed=30 + i, line_t0=0.3) for i in range(2)],
        # soft fringe swept toward the face, pointed tips
        *group((11.0, 4.2), (20.5, 4.6), (12.2, 16.6), (23.8, 15.4), 5, 3.2, bend=(1.4, 0), z=6, seed=14, tip_j=0.7, w1=0.7,
               hold=0.5, power=1.1, line_t0=0.3, nlines=0, streak=(0.2, 0.7)),
        Strand([(12.0, 3.2), (9.5, 0.4), (6.4, 1.6)], 1.3, 0.6, z=7, hold=0.3, gloss=False, line=False),
    ]
    G = (8.0, 3.5, 25.0, 2.4, 1.2)
    rows, fa = generate(P, form=(13.5, 11.5, 13.5, 14), gloss=G, extra=shaping(G, slope=-0.02))
    return {'f': rows, 'fa': fa}


@style('hair_buns')
def buns():
    import hg2
    hg2.CYL = 0.34
    P = [
        Mass([(4.4, 22), (3.0, 15), (3.4, 8.5), (6.5, 4.4), (11.5, 2.5), (17, 2.5), (21.8, 4.6), (24.6, 8.8), (25.0, 13.5), (24.6, 16.5),
              (12, 16.5), (10, 18), (9.6, 22)], z=0, flow=(0.25, 1)),
        *group((18.5, 3.2), (23.5, 7.8), (7.0, 3.6), (3.6, 10.0), 4, 3.0, bend=(0, -2.2), z=1, seed=42, w1=1.3, hold=0.55, nlines=0),
        *group((9.5, 4.0), (11.0, 7.0), (3.4, 13.5), (4.6, 21.0), 3, 3.0, bend=(-1.6, -0.4), z=1, seed=43, w1=1.3, hold=0.55, nlines=0),
        # two round buns on top, each a coil
        Blob(7.4, 1.6, 4.0, 3.7, z=3, coil=2.2),
        Blob(19.2, 0.6, 3.6, 3.4, z=2, coil=2.2),
        Strand([(4.2, 3.4), (7.4, 6.6), (11.0, 3.6)], 1.8, 1.4, z=4, hold=0.6, gloss=False),
        Strand([(16.2, 2.4), (19.4, 5.2), (22.4, 2.6)], 1.6, 1.3, z=3, hold=0.6, gloss=False),
        # soft bangs with pointed tips
        *group((11.0, 4.6), (21.5, 5.6), (11.6, 16.8), (23.6, 15.6), 5, 3.0, bend=(0.8, 0), z=6, seed=44, tip_j=0.8, w1=0.7,
               hold=0.5, power=1.1, line_t0=0.3, nlines=0, streak=(0.2, 0.7)),
        # short side locks
        *group((7.6, 9.6), (10.6, 11.2), (8.0, 24.0), (10.8, 23.0), 2, 2.6, bend=(-0.5, 0), z=6, seed=45, tip_j=0.6, w1=0.8,
               hold=0.6, power=1.2, line_t0=0.2, nlines=0, streak=(0.15, 0.6)),
        Strand([(23.6, 9.0), (25.0, 15.0), (24.4, 21.5)], 2.4, 0.8, z=6, hold=0.6, power=1.2, seed=46, line_t0=0.3),
    ]
    G = (8.6, 3.5, 25.0, 2.0, 1.2)
    rows, fa = generate(P, form=(13.5, 10.5, 13.5, 14), gloss=G, extra=shaping(G, slope=-0.02))
    return {'f': rows, 'fa': fa}


@style('hair_pony')
def pony():
    import hg2
    hg2.CYL = 0.34
    P = [
        Mass([(4.4, 21), (3.0, 15), (3.4, 8.5), (6.5, 4.4), (11.5, 2.5), (17, 2.5), (21.8, 4.6), (24.6, 8.8), (25.0, 13.5), (24.6, 16.5),
              (12, 16.5), (10, 18), (9.6, 21)], z=0, flow=(1, -0.3)),
        # pulled up and back toward the tie high on the back of the head
        *[Strand([(23.0 - 0.6 * i, 7.0 + 1.6 * i), (15.0 - 0.5 * i, 1.8 + 1.8 * i), (4.8, 4.2 + 0.4 * i)], 3.0, 1.6, z=2 + (i % 2),
                 hold=0.5, power=1.0, seed=50 + i, line_t0=0.0, streak=(0.3, 0.7)) for i in range(5)],
        *[Strand([(10.5 - 0.2 * i, 18.0 - 2.5 * i), (6.0, 14.0 - 2.5 * i), (4.4, 6.0 + 0.3 * i)], 2.8, 1.6, z=2 + (i % 2),
                 hold=0.5, power=1.0, seed=56 + i, line_t0=0.0) for i in range(3)],
        # the tie
        Blob(4.2, 5.4, 2.0, 2.3, z=8, lit=-0.25, gloss=False),
        # side-swept bangs with pointed tips
        *group((12.0, 5.0), (19.5, 5.8), (12.4, 16.6), (24.0, 15.0), 4, 3.0, bend=(1.4, 0), z=6, seed=54, tip_j=0.7, w1=0.7,
               hold=0.45, power=1.1, line_t0=0.3, nlines=0, streak=(0.2, 0.7)),
        # a lock in front of the ear
        Strand([(10.2, 10.5), (8.6, 18), (9.8, 25.6)], 2.6, 0.7, z=7, hold=0.5, power=1.1, seed=58, lit=0.06, streak=(0.15, 0.6)),
    ]
    G = (8.6, 6.0, 25.0, 2.2, 1.2)
    rows, fa = generate(P, form=(13.5, 10.5, 13.5, 14), gloss=G, extra=shaping(G, slope=-0.02))
    return {'f': rows, 'fa': fa}


@style('hair_silver')
def silver():
    import hg2
    hg2.CYL = 0.34
    P = [
        Mass([(4.2, 24), (2.8, 15), (3.4, 8.5), (6.5, 4.4), (11.5, 2.5), (17, 2.5), (21.8, 4.6), (24.6, 8.8), (25.2, 13.5), (24.8, 16.5),
              (12, 16.5), (10, 18), (9.6, 24)], z=0, flow=(0.25, 1)),
        # parted in the middle: strands falling away from the part to both sides
        *[Strand([(15.0, 3.0 + 0.2 * i), (9.0 - 0.8 * i, 2.6 + 1.4 * i), (4.0 - 0.3 * i, 10.0 + 3.0 * i)], 3.0, 1.6, z=2 + (i % 2),
                 hold=0.5, power=1.0, seed=60 + i, line_t0=0.2, streak=(0.25, 0.6)) for i in range(4)],
        *[Strand([(15.6, 3.0 + 0.2 * i), (21.0 + 0.4 * i, 3.4 + 1.2 * i), (24.4 + 0.3 * i, 10.0 + 2.6 * i)], 2.8, 1.4, z=2 + (i % 2),
                 hold=0.5, power=1.0, seed=64 + i, line_t0=0.2) for i in range(3)],
        # parted bangs: two curtains falling from the part, a gap over the brow
        *group((14.4, 4.0), (12.2, 5.2), (11.6, 17.4), (9.6, 15.2), 2, 2.8, bend=(-1.0, -0.4), z=6, seed=67, tip_j=0.5, w1=0.7,
               hold=0.45, power=1.1, line_t0=0.25, nlines=0, streak=(0.2, 0.65)),
        *group((16.2, 4.0), (19.6, 5.2), (19.4, 17.0), (23.8, 15.6), 2, 2.8, bend=(1.2, -0.4), z=6, seed=68, tip_j=0.5, w1=0.7,
               hold=0.45, power=1.1, line_t0=0.25, nlines=0, streak=(0.2, 0.65)),
        # straight curtains framing the face
        *group((7.4, 10.0), (10.8, 11.6), (7.6, 29.4), (11.0, 28.6), 3, 2.5, bend=(-0.4, 0), z=7, seed=69, tip_j=0.9, w1=0.7,
               hold=0.6, power=1.1, line_t0=0.2, nlines=0, streak=(0.15, 0.6)),
        *group((23.2, 9.0), (25.2, 9.8), (23.6, 27.6), (25.0, 26.8), 2, 2.4, bend=(0.6, 0), z=7, seed=70, tip_j=0.9, w1=0.7,
               hold=0.6, power=1.1, line_t0=0.3, nlines=0),
    ]
    G = (8.4, 3.5, 25.0, 2.0, 1.2)
    rows, fa = generate(P, form=(14.5, 11, 13, 13.5), gloss=G, extra=shaping(G, slope=-0.02))
    return {'f': rows, 'fa': fa}


if __name__ == '__main__':
    import os
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
