"""Second batch of candidate hairstyles. Run: python3 styles2.py out.json"""
import json
import math
import sys
from hairgen import Poly, Spike, Strand, generate, shade_hist

STYLES = {}


def style(sid, name, desc, color, band=None):
    def deco(fn):
        STYLES[sid] = (name, desc, color, band, fn)
        return fn
    return deco


def radial(cx, cy, rb, rt, ang, w, z, bend=0.0, lit=0.0):
    a = math.radians(ang)
    d = (math.cos(a), math.sin(a))
    n = (-d[1], d[0])
    bx, by = cx + d[0] * rb[0], cy + d[1] * rb[1]
    tip = (cx + d[0] * rt[0], cy + d[1] * rt[1])
    return Spike((bx + n[0] * w / 2, by + n[1] * w / 2), (bx - n[0] * w / 2, by - n[1] * w / 2), tip, z=z, bend=bend, lit=lit)


# --- Curtain Part (straight lavender hair, centre part, to the jaw) ---------
@style('hair_curtain', 'Curtain Part', 'Straight hair parted in the middle, falling past the ears with long bangs on either side.', '#c2b2e6')
def curtain():
    P = [
        Poly([(4, 24), (2.5, 18), (2.5, 11), (4.5, 6), (8.5, 3), (14, 2), (19, 2.6), (23, 5.5), (25, 10), (25.5, 15),
              (25, 21), (23.6, 21), (23.6, 14), (21, 11.5), (18, 10), (14.5, 12), (11, 15), (9.5, 18), (9, 22), (8, 24.5)],
             z=0, flow=(0.2, 1), streak=0.25),
        Strand((8, 6), (4, 14), (4.5, 24.5), 5, 3.0, z=2, hold=0.5, power=0.8),
        Strand((11, 7), (7.5, 15), (7.5, 24.5), 4, 2.0, z=2, hold=0.5, power=0.8),
        Strand((16.5, 3.5), (11, 8), (10, 19.5), 6, 2.5, z=3, hold=0.4, power=0.8),
        Strand((17.5, 3.5), (22.5, 7), (24.6, 19.5), 5.5, 2.0, z=3, hold=0.4, power=0.8),
        Strand((17, 6), (14.5, 10), (13.6, 16.2), 3, 1.0, z=4, power=0.8),
        Strand((18.5, 6), (20.5, 10), (21.4, 16.0), 3, 1.0, z=4, power=0.8),
    ]
    rows, fa = generate(P, form=(13.5, 11, 13, 13), gloss=(13.5, 13, 10, 10, 0.13, 0.3),
                        dist=(0.30, 0.30, 0.25, 0.10, 0.05))
    return {'f': rows, 'fa': fa}


# --- Ascendant Flare (golden spikes swept up, one lone bang) ----------------
@style('hair_ascendant', 'Ascendant Flare', 'Golden spikes swept up and back, with one lone lock hanging over the brow.', '#f2cf3c')
def ascendant():
    cx, cy = 13.5, 11.0
    P = [Poly([(5, 20), (3.5, 15), (3.5, 9), (6, 5.5), (10, 3.5), (15, 3), (20, 4), (23.5, 7.5), (24.5, 11), (23.5, 12.5),
               (20, 11.5), (16.5, 11.5), (13, 12), (10.5, 14), (9.5, 17), (9, 20), (7.5, 21.5)], z=0, flow=(0.5, -1), streak=0.15)]
    # (angle, tip scale, width, z, bend): mostly up and back, tall
    spikes = [(162, 1.0, 5.5, 2, 0.7), (190, 1.18, 6.5, 3, 0.9), (214, 1.42, 7.5, 2, 0.9), (236, 1.66, 7.5, 4, 0.7),
              (258, 1.78, 7.5, 3, 0.4), (278, 1.72, 7.0, 5, 0.0), (298, 1.5, 6.5, 4, -0.5), (320, 1.24, 6.0, 3, -0.6),
              (344, 1.02, 4.5, 1, -0.3)]
    for ang, k, w, z, bend in spikes:
        P.append(radial(cx, cy, (7.0, 6.5), (10.8 * k, 10.0 * k), ang, w, z, bend))
    P.append(Spike((6.5, 14), (10.5, 14.5), (6.5, 20.5), z=3, bend=0.5))
    # the lone bang over the brow
    P.append(Strand((18, 9.0), (13.6, 12.6), (15.8, 17.6), 3.8, 1.0, z=7, power=0.65, lit=0.1, streak=0.0))
    rows, fa = generate(P, form=(13.5, 9, 13, 13), dist=(0.27, 0.30, 0.25, 0.12, 0.06))
    return {'f': rows, 'fa': fa}


# --- Rogue Bandana (spiky red hair pushed up by a tied bandana) -------------
@style('hair_rogue', 'Rogue Bandana', 'Spiky dark-red hair pushed up by a bandana tied at the back.', '#7a2e22', band='#a3202c')
def rogue():
    cx, cy = 13.5, 10.5
    P = [Poly([(5, 20.5), (3.5, 15), (3.5, 9), (6, 5.5), (10, 3.5), (15, 3), (20, 4), (23.5, 7.5), (24.5, 11), (24, 13.5),
               (10, 13.5), (9.5, 17), (9, 20), (7.5, 21.5)], z=0, flow=(0.4, -1), streak=0.15)]
    spikes = [(150, 1.0, 5.0, 2, 0.4), (176, 1.1, 5.5, 3, 0.6), (202, 1.22, 6.0, 2, 0.7), (226, 1.32, 6.5, 4, 0.5),
              (250, 1.36, 6.5, 3, 0.4), (272, 1.34, 6.5, 5, 0.1), (295, 1.3, 6.0, 4, -0.4), (318, 1.2, 6.0, 3, -0.6),
              (340, 1.08, 5.0, 2, -0.4)]
    for ang, k, w, z, bend in spikes:
        P.append(radial(cx, cy, (7.0, 6.5), (10.8 * k, 10.0 * k), ang, w, z, bend))
    # strands escaping under the band at the temple and the nape
    P.append(Spike((6.5, 14), (10, 14.5), (7.5, 21), z=3, bend=0.4))
    P.append(Spike((3.5, 14), (6.5, 17), (2.0, 21.5), z=2, bend=0.4))
    rows, fa = generate(P, form=(13.5, 9, 13, 13), dist=(0.32, 0.31, 0.23, 0.10, 0.04))
    # the bandana: a band round the forehead, a knot at the back and two tails
    B = [
        Poly([(3.2, 9.5), (8, 9.8), (14, 10.2), (20, 10.3), (24.6, 10.0), (24.8, 13.6), (20, 14.0), (14, 13.9), (8, 13.4), (3.4, 13.0)],
             z=0, flow=(1, 0.05), streak=0.25),
        Strand((4.0, 11.5), (2.0, 13.5), (1.0, 18.5), 2.6, 1.6, z=1, power=0.8, streak=0.1),
        Strand((4.6, 12.2), (3.8, 15.5), (3.4, 20.5), 2.4, 1.4, z=2, power=0.8, streak=0.1),
        Poly([(2.2, 10.0), (5.2, 10.0), (5.4, 13.4), (2.4, 13.6)], z=3, flow=(0, 1), streak=0.1),
    ]
    band, ba = generate(B, form=(13.5, 9, 14, 12), dist=(0.22, 0.30, 0.30, 0.13, 0.05), inner_lines=True)
    return {'f': rows, 'fa': fa, 'band': band, 'banda': ba}


if __name__ == '__main__':
    out = {}
    for sid, (name, desc, color, band, fn) in STYLES.items():
        d = fn()
        d.update({'id': sid, 'name': name, 'desc': desc, 'color': color})
        if band:
            d['bandColor'] = band
        out[sid] = d
        print(sid, 'front', len(d['f'][0]), 'x', len(d['f']), 'anchor', d['fa'], 'hist', shade_hist(d['f']))
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
