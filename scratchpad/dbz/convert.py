"""Converts the hair of an example sprite into one of our hair templates.

convert.py SPEC_JSON OUT_JSON
Each spec: {id, src, scale (native pixel size in src), crop [x0,y0,x1,y1] in native px,
            hair: {hex: shade}, iris: [x, y] native near-eye iris, name, desc, color}
Pipeline: native crop -> keep hair colors -> Scale2x (EPX) -> shades -> 0 outline.
"""
import json
import sys
from PIL import Image


def native(src, scale, phase=(0, 0)):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    px = im.load()
    w, h = (W - phase[0]) // scale, (H - phase[1]) // scale
    out = [[px[phase[0] + scale * x, phase[1] + scale * y] for x in range(w)] for y in range(h)]
    return out


def hexc(c):
    return '#%02x%02x%02x' % c


def scale2x(g):
    """EPX/Scale2x on a grid of hashable values (None = empty)."""
    H, W = len(g), len(g[0])
    out = [[None] * (2 * W) for _ in range(2 * H)]
    at = lambda x, y: g[y][x] if 0 <= x < W and 0 <= y < H else None
    for y in range(H):
        for x in range(W):
            P = g[y][x]
            A, B, C, D = at(x, y - 1), at(x + 1, y), at(x - 1, y), at(x, y + 1)
            e0 = e1 = e2 = e3 = P
            if C == A and C != D and A != B:
                e0 = A
            if A == B and A != C and B != D:
                e1 = B
            if D == C and D != B and C != A:
                e2 = C
            if B == D and B != A and D != C:
                e3 = D
            out[2 * y][2 * x], out[2 * y][2 * x + 1], out[2 * y + 1][2 * x], out[2 * y + 1][2 * x + 1] = e0, e1, e2, e3
    return out


def convert(spec):
    g = native(spec['src'], spec['scale'], tuple(spec.get('phase', (0, 0))))
    x0, y0, x1, y1 = spec['crop']
    hair = {k.lower(): v for k, v in spec['hair'].items()}
    crop = [[(hair.get(hexc(g[y][x])) if hexc(g[y][x]) in hair else None) for x in range(x0, x1)] for y in range(y0, y1)]
    big = scale2x(crop)
    H, W = len(big), len(big[0])
    # outline: pixels on the silhouette become 0 (the native dark rim stays inside as 1)
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            v = big[y][x]
            if v is None:
                r += '.'
                continue
            edge = any(not (0 <= x + dx < W and 0 <= y + dy < H) or big[y + dy][x + dx] is None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            r += '0' if edge and spec.get('outline', True) else str(v)
        rows.append(r)
    # trim
    top = next(i for i, r in enumerate(rows) if set(r) != {'.'})
    bot = len(rows) - next(i for i, r in enumerate(reversed(rows)) if set(r) != {'.'})
    rows = rows[top:bot]
    left = min(len(r) - len(r.lstrip('.')) for r in rows)
    right = max(len(r.rstrip('.')) for r in rows)
    rows = [r[left:right] for r in rows]
    ix, iy = spec['iris']
    ax = (ix - x0) * 2 - left + spec.get('dx', 0)
    ay = (iy - y0) * 2 - top + spec.get('dy', 0)
    return {'f': rows, 'fa': [ax, ay], 'id': spec['id'], 'name': spec['name'], 'desc': spec['desc'], 'color': spec['color']}


if __name__ == '__main__':
    specs = json.load(open(sys.argv[1]))
    out = {}
    for s in specs:
        c = convert(s)
        out[c['id']] = c
        print(c['id'], len(c['f'][0]), 'x', len(c['f']), 'anchor', c['fa'])
        for r in c['f']:
            print('   ', r)
    json.dump(out, open(sys.argv[2], 'w'), indent=1)
