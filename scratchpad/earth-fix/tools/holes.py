"""holes.py <groupdir> [sprite]: per frame, pinholes and enclosed clear px, split by what surrounds them (opaque rock vs dust)."""
import json, sys, os
import numpy as np
from PIL import Image
from collections import deque
g = sys.argv[1]
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
M = json.load(open(os.path.join(g, 'manifest.json')))['sprites']
def enclosed(a):
    H, W = a.shape
    clear = a == 0
    seen = np.zeros_like(clear)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if clear[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if clear[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            v, u = y + dy, x + dx
            if 0 <= v < H and 0 <= u < W and clear[v, u] and not seen[v, u]:
                seen[v, u] = 1; q.append((v, u))
    return clear & ~seen
for n, m in M.items():
    if n == 'beast' or (only and n not in only): continue
    sh = np.asarray(Image.open(os.path.join(g, m['file'])).convert('RGBA'))
    fw, fh = m['frameW'], m['frameH']
    for an, d in m['anims'].items():
        res = []
        for i in range(d['frames']):
            f = sh[d['row'] * fh:(d['row'] + 1) * fh, i * fw:(i + 1) * fw]
            a = f[..., 3]
            enc = enclosed(a)
            p = np.pad(a, 1)
            nb_op = sum((np.roll(np.roll(p, dy, 0), dx, 1)[1:-1, 1:-1] == 255).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            nb_any = sum((np.roll(np.roll(p, dy, 0), dx, 1)[1:-1, 1:-1] > 0).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            pin = (a == 0) & (nb_any == 4)
            pin_rock = (a == 0) & (nb_op >= 3)
            res.append('%d/%d/%d' % (pin.sum(), pin_rock.sum(), enc.sum()))
        print('%-11s %-5s pin/pinInRock/enclosed %s' % (n, an, ' '.join(res)))
