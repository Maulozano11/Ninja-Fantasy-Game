"""Frames on green, enclosed transparent holes in magenta; optional frame list and scale."""
import sys, json
from collections import deque
import numpy as np
from PIL import Image
sheet = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
man = json.load(open(sys.argv[2]))['sprites']['earth']
out = sys.argv[3]
idx = [int(v) for v in sys.argv[4].split(',')] if len(sys.argv) > 4 else list(range(8))
k = int(sys.argv[5]) if len(sys.argv) > 5 else 3
W, H = man['frameW'], man['frameH']
def holes(a):
    m = a == 0
    lab = np.zeros(m.shape, bool)
    q = deque([(y, x) for y in range(H) for x in (0, W - 1) if m[y, x]] + [(y, x) for x in range(W) for y in (0, H - 1) if m[y, x]])
    for p in q: lab[p] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]:
                lab[ny, nx] = True; q.append((ny, nx))
    return m & ~lab
tiles = []
for i in idx:
    f = sheet[:H, i * W:(i + 1) * W]
    bg = Image.new('RGBA', (W, H), (93, 107, 87, 255))
    bg.alpha_composite(Image.fromarray(f))
    arr = np.array(bg)
    arr[holes(f[..., 3])] = (255, 0, 255, 255)
    tiles.append(Image.fromarray(arr))
cols = min(4, len(tiles))
rows = (len(tiles) + cols - 1) // cols
sh = Image.new('RGBA', (cols * (W + 2), rows * (H + 2)), (0, 0, 0, 255))
for j, t in enumerate(tiles):
    sh.paste(t, ((j % cols) * (W + 2), (j // cols) * (H + 2)))
sh.resize((sh.width * k, sh.height * k), Image.NEAREST).save(out)
