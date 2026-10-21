import sys, json
import numpy as np
from PIL import Image
from collections import deque
sheet = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
man = json.load(open(sys.argv[2]))['sprites']['earth']
W, H = man['frameW'], man['frameH']
out = sys.argv[3]
idx = [int(v) for v in sys.argv[4].split(',')]
box = tuple(int(v) for v in sys.argv[5].split(','))
k = int(sys.argv[6]) if len(sys.argv) > 6 else 5
mark = len(sys.argv) > 7 and sys.argv[7] == 'holes'
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
    if mark: arr[holes(f[..., 3])] = (255, 0, 255, 255)
    tiles.append(Image.fromarray(arr).crop(box))
bw, bh = box[2] - box[0], box[3] - box[1]
o = Image.new('RGBA', (len(tiles) * (bw + 2), bh), (0, 0, 0, 255))
for j, t in enumerate(tiles): o.paste(t, (j * (bw + 2), 0))
o.resize((o.width * k, o.height * k), Image.NEAREST).save(out)
