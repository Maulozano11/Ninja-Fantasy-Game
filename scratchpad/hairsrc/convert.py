import sys, json, colorsys
from PIL import Image
import numpy as np
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/hairsrc/'
a = np.asarray(Image.open(D + 'art.png')).astype(int)
H, W, _ = a.shape
def near(c, ref, tol): return np.abs(np.array(c) - np.array(ref)).max() <= tol
cls = np.zeros((H, W), dtype='<U1'); light = np.zeros((H, W))
for y in range(H):
    for x in range(W):
        c = a[y, x]; r, g, b = c
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        light[y, x] = l
        if max(c) <= 10: cls[y, x] = 'o'
        elif near(c, (14, 14, 22), 9) or near(c, (36, 40, 52), 11): cls[y, x] = '.'
        elif b > r + 6: cls[y, x] = 'j'            # jacket / blue
        elif l >= 0.6: cls[y, x] = 's'             # light skin
        else:
            # warm and mid/dark: hair unless inside the face area
            face = (y >= 31 and 57 <= x <= 84 and not (y <= 41 and (x >= 80 or x <= 59))) or y >= 44
            cls[y, x] = 'f' if face else 'h'
# hair outline: black pixels touching hair
hair = cls == 'h'
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if cls[y, x] == 'o' and hair[y - 1:y + 2, x - 1:x + 2].any(): cls[y, x] = 'O'
K = float(sys.argv[1]) if len(sys.argv) > 1 else 0.52
x0, y0, x1, y1 = 36, 4, 100, 46
tw, th = int((x1 - x0) * K) + 1, int((y1 - y0) * K) + 1
vals = []
grid = [['.'] * tw for _ in range(th)]
for ty in range(th):
    for tx in range(tw):
        sx0, sx1 = x0 + tx / K, x0 + (tx + 1) / K
        sy0, sy1 = y0 + ty / K, y0 + (ty + 1) / K
        cells = [(yy, xx) for yy in range(int(sy0), int(np.ceil(sy1))) for xx in range(int(sx0), int(np.ceil(sx1))) if 0 <= yy < H and 0 <= xx < W]
        hs = [light[c] for c in cells if cls[c] == 'h']; os_ = [c for c in cells if cls[c] == 'O']
        if len(hs) >= max(1, len(cells) * 0.4): grid[ty][tx] = ('h', float(np.mean(hs))); vals.append(float(np.mean(hs)))
        elif len(os_) + len(hs) >= len(cells) * 0.5: grid[ty][tx] = 'o'
# quantize hair to the midnight distribution 34/31/22/9/4 by lightness rank
vals.sort(); n = len(vals)
cuts = [vals[int(n * q)] for q in (0.34, 0.65, 0.87, 0.96)]
def shade(l): return 1 + sum(l > c for c in cuts)
rows = []
for ty in range(th):
    row = ''
    for tx in range(tw):
        g = grid[ty][tx]
        row += '0' if g == 'o' else (str(shade(g[1])) if isinstance(g, tuple) else '.')
    rows.append(row)
# trim empty columns/rows
while rows and set(rows[0]) == {'.'}: rows.pop(0); y0 += 1 / K
lc = min(len(r) - len(r.lstrip('.')) for r in rows if set(r) != {'.'})
rows = [r[lc:].rstrip('.') for r in rows]; w = max(len(r) for r in rows); rows = [r.ljust(w, '.') for r in rows]
# anchor: near iris at art (66, 43)
ax = round((66 - x0) * K) - lc; ay = round((43 - y0) * K)
json.dump({'rows': rows, 'anchor': [ax, ay]}, open(D + 'tpl.json', 'w'))
print('\n'.join(rows)); print('anchor', ax, ay, 'size', w, len(rows))
