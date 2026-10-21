"""Crowned Braid (Saber-inspired): golden hair pulled back into a braided bun with a ribbon,
side-swept bangs with a lock between the eyes, long locks framing the face and one stubborn strand standing up.
Run: python3 saber.py out.json"""
import json, os, sys
import hg2
from hg2 import Blob, Mass, Strand, generate, hist
from fem2 import group, shaping

hg2.CYL = 0.34
hg2.FORM = 0.6

def crown():
    P = [
        Mass([(4.6, 19.0), (3.4, 13.0), (4.2, 8.0), (7.0, 4.4), (11.5, 2.6), (17.0, 2.5), (21.6, 4.4), (24.4, 8.4), (25.2, 12.6),
              (24.8, 16.0), (12.0, 15.8), (10.0, 17.6), (9.0, 19.6)], z=0, flow=(1, -0.2)),
        # hair pulled back over the crown toward the bun
        *[Strand([(23.0 - 0.7 * i, 6.0 + 1.7 * i), (14.0 - 0.6 * i, 1.2 + 1.9 * i), (5.0, 7.0 + 0.9 * i)], 3.2, 2.0, z=2 + (i % 2),
                 hold=0.5, power=1.0, seed=90 + i, line_t0=0.0, line_t1=0.55, streak=(0.3, 0.7)) for i in range(5)],
        *[Strand([(9.0 - 0.4 * i, 18.0 - 2.4 * i), (5.0, 15.0 - 2.0 * i), (4.6, 10.0 + 0.4 * i)], 2.8, 1.8, z=2 + (i % 2),
                 hold=0.5, power=1.0, seed=96 + i, line_t0=0.0, line_t1=0.55) for i in range(3)],
        # the braided bun at the back of the head
        Blob(2.4, 8.6, 4.3, 4.5, z=5, coil=2.0, braid=2.0, lit=-0.12),
        # side-swept bangs, pointed, one lock hanging between the eyes
        Strand([(11.0, 4.6), (9.8, 10.5), (10.6, 17.2)], 3.8, 0.8, z=7, hold=0.8, power=1.0, seed=101, line_t0=0.3, streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(13.2, 4.0), (12.8, 10.5), (13.6, 17.8)], 4.0, 0.8, z=8, hold=0.8, power=1.0, seed=102, line_t0=0.3, streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(15.6, 4.0), (16.0, 11.0), (16.4, 20.4)], 3.4, 0.7, z=9, hold=0.8, power=1.0, seed=103, line_t0=0.3, streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(17.8, 4.4), (19.0, 10.5), (19.8, 17.4)], 4.0, 0.8, z=8, hold=0.8, power=1.0, seed=104, line_t0=0.3, streak=(0.2, 0.8), floor=2, tip_dark=False),
        Strand([(20.6, 5.2), (22.2, 10.0), (23.2, 16.2)], 3.6, 0.8, z=7, hold=0.8, power=1.0, seed=105, line_t0=0.3, floor=2, tip_dark=False),
        # long locks framing the face, to the chin
        Strand([(8.4, 9.0), (7.2, 17.0), (9.4, 26.6)], 4.0, 1.0, z=8, hold=0.78, power=1.0, seed=106, line_t0=0.25, lit=0.05, streak=(0.2, 0.7), floor=2),
        Strand([(23.4, 8.4), (25.6, 15.0), (25.0, 24.8)], 3.8, 1.0, z=8, hold=0.78, power=1.0, seed=107, line_t0=0.3, floor=2),
        # the stubborn strand standing up from the crown
        Strand([(12.8, 3.8), (12.2, -1.8), (15.4, -4.6), (18.4, -2.2)], 2.2, 0.9, z=9, hold=0.3, power=1.0, seed=108, gloss=False, line=False, shadow=False),
    ]
    G = (6.6, 3.0, 26.0, 2.4, 2.0)
    return generate(P, form=(14.0, 9.5, 13.5, 13.5), gloss=G, extra=shaping(G, above=-0.14, slope=-0.03))

def ribbon():
    """The ribbon tied round the base of the bun, two short tails hanging under it."""
    P = [
        Strand([(5.4, 4.4), (7.6, 8.6), (5.8, 13.0)], 3.2, 3.0, z=2, hold=0.9, power=1.0, seed=120, gloss=False, nlines=0),
        Strand([(5.4, 12.4), (4.6, 15.0), (3.2, 17.6)], 2.6, 1.4, z=1, hold=0.5, power=1.0, seed=121, gloss=False, nlines=0),
        Strand([(6.4, 12.4), (7.6, 15.2), (7.4, 18.0)], 2.6, 1.4, z=1, hold=0.5, power=1.0, seed=122, gloss=False, nlines=0),
    ]
    return generate(P, form=(5.5, 9.0, 3.0, 6.0), dist=(0.25, 0.35, 0.28, 0.12), cast=0)

if __name__ == '__main__':
    rows, fa = crown()
    rrows, rfa = ribbon()
    out = {'hair_crown': {'f': rows, 'fa': fa}, 'hair_crown_ribbon': {'f': rrows, 'fa': rfa}}
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
    for k, v in out.items():
        print(k, len(v['f'][0]), 'x', len(v['f']), 'anchor', v['fa'], 'hist', hist(v['f']))
