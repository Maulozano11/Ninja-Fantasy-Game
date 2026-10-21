"""holes.py <stageGroupDir> [names...]: enclosed see-through px (alpha<128 not reachable from the border) per frame."""
import sys, json, os
import numpy as np
from PIL import Image
from collections import deque
G = sys.argv[1]
names = sys.argv[2:]
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def holes(a, thr=128):
    solid = a >= thr
    H, W = a.shape
    seen = np.zeros_like(solid)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not solid[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not solid[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and not solid[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = 1; q.append((yy, xx))
    return (~solid) & (~seen)
for n in names or MAN:
    m = MAN[n]
    sh = np.asarray(Image.open(os.path.join(G, m['file'])).convert('RGBA'))
    for an, a in m['anims'].items():
        res = []
        for i in range(a['frames']):
            f = sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW'], 3]
            res.append(int(holes(f).sum()))
        print(n, an, res)
if os.environ.get('HOLES_IMG'):
    out = os.environ['HOLES_IMG']
    n, an, i = os.environ['HOLES_AT'].split(':')
    i = int(i)
    m = MAN[n]; a = m['anims'][an]
    sh = np.asarray(Image.open(os.path.join(G, m['file'])).convert('RGBA')).astype(float)
    f = sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']]
    hm = holes(f[..., 3])
    bg = np.array([84, 110, 70.])
    c = f[..., :3] * f[..., 3:] / 255 + bg * (1 - f[..., 3:] / 255)
    c[hm] = (255, 0, 255)
    Image.fromarray(c.astype(np.uint8)).resize((f.shape[1] * 3, f.shape[0] * 3), Image.NEAREST).save(out)
