# Arabic-style calligraphic letters (isolated forms) drawn as strokes, rasterized to pixel bitmaps.
# letters.py out.png -> prints bitmaps
import math, sys
from PIL import Image

def arc(cx, cy, rx, ry, a0, a1, n=40):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]

# each letter: list of (polyline points, width at start, width at end) and dots [(x, y)]
L = {}
# nun: a deep bowl with a dot above
L['nun'] = ([(arc(8, 7, 6, 6.5, 0, 185), 1.0, 2.6)], [(8, 1.5)])
# ba: a long boat, dot below
L['ba'] = ([([(1, 6.5)] + arc(8.5, 6, 7.5, 4.0, 160, 20)[1:], 1.0, 2.2)], [(8.5, 13)])
# ayn: a small open head, then a sweeping bowl
L['ayn'] = ([(arc(8.4, 4.4, 3.0, 2.6, -40, -250), 1.0, 2.0), ([(6.0, 6.6), (5.0, 8.6)] + arc(9.0, 12.0, 4.4, 4.6, 200, 20)[1:], 2.4, 1.0)], [])
# mim: a small loop with a tail falling down
L['mim'] = ([(arc(10.2, 5.2, 2.6, 2.6, 0, 360), 1.6, 1.6), ([(7.8, 6.4), (6.6, 10), (6.2, 16.5)], 2.4, 1.0)], [])
# ya: a hook, then a big swash, two dots under it
L['ya'] = ([([(12.6, 2.6), (11.8, 4.4), (8.6, 5.4), (5.6, 6.4)] + arc(9.6, 9.8, 5.2, 3.8, 210, 470)[1:], 1.4, 2.4)], [(7.0, 16.2), (10.6, 16.2)])
# qaf: a loop on a deep bowl, two dots above
L['qaf'] = ([(arc(11.2, 5.0, 2.2, 2.2, 0, 360), 1.6, 1.6), (arc(8.0, 8.6, 6.0, 6.0, -15, 190), 2.6, 1.0)], [(9.6, 0.6), (13.0, 0.6)])
# ha (hha): a bar with a hook, then a big bowl opening right
L['hha'] = ([([(2.2, 3.0), (11.8, 3.6), (7.0, 7.0)] + arc(9.0, 11.2, 5.4, 5.0, 220, 70)[1:], 1.4, 2.4)], [])
# waw: a small loop with a tail curving down-left
L['waw'] = ([(arc(9.6, 4.6, 2.6, 2.6, 160, 520), 1.6, 1.6), (arc(4.6, 6.0, 5.6, 9.0, -5, 115), 2.4, 1.0)], [])

def raster(strokes, dots, W=18, H=19):
    g = [[0] * W for _ in range(H)]
    for pts, w0, w1 in strokes:
        n = len(pts)
        for i in range(n - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            for s in range(8):
                t = s / 8
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                w = w0 + (w1 - w0) * (i + t) / (n - 1)
                r = w / 2
                for yy in range(int(y - r - 1), int(y + r + 2)):
                    for xx in range(int(x - r - 1), int(x + r + 2)):
                        if 0 <= xx < W and 0 <= yy < H and (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.2:
                            g[yy][xx] = 1
    for x, y in dots:
        for yy in range(int(y) - 1, int(y) + 1):
            for xx in range(int(x) - 1, int(x) + 1):
                if 0 <= xx < W and 0 <= yy < H:
                    g[yy][xx] = 1
    return [''.join('x' if v else '.' for v in r) for r in g]

out = {k: raster(*v) for k, v in L.items()}
k = 10
names = list(out)
im = Image.new('RGB', (len(names) * 20 * k, 21 * k), (20, 22, 30))
for n, name in enumerate(names):
    for y, r in enumerate(out[name]):
        for x, ch in enumerate(r):
            if ch == 'x':
                for a in range(k):
                    for b in range(k):
                        im.putpixel((n * 20 * k + (x + 1) * k + b, (y + 1) * k + a), (120, 220, 255))
im.save(sys.argv[1])
import json; json.dump(out, open(sys.argv[1].replace('.png', '.json'), 'w'))
