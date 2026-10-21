# holes.py <groupDir> [names]: enclosed see-through holes per frame (the review's measure: a clear
# region (alpha < 40) of up to 12 px not reaching the border, whose 8-ring is >= 75% solid (alpha >= 200)).
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image
G = sys.argv[1]
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
names = sys.argv[2].split(',') if len(sys.argv) > 2 else [n for n in MAN if n != 'beast']
def holes(a, thr=200, maxsize=12):
    solid = a >= thr; clear = a < 40
    H, W = a.shape; lab = np.zeros((H, W), np.int32); n = 0
    for y0, x0 in zip(*np.nonzero(clear)):
        if lab[y0, x0]: continue
        n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n
        while q:
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and clear[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; q.append((yy, xx))
    border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]).tolist())
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    out = []
    for i in range(1, n + 1):
        if i in border or sizes[i] > maxsize: continue
        ys, xs = np.nonzero(lab == i)
        ring = []
        for y, x in zip(ys, xs):
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and lab[yy, xx] != i: ring.append(solid[yy, xx])
        if ring and np.mean(ring) >= 0.75: out.append((int(xs[0]), int(ys[0]), int(sizes[i])))
    return out
for n in names:
    s = MAN[n]; sh = np.asarray(Image.open(os.path.join(G, s['file'])).convert('RGBA'))[..., 3]
    for an, a in s['anims'].items():
        res = [holes(sh[a['row'] * s['frameH']:(a['row'] + 1) * s['frameH'], i * s['frameW']:(i + 1) * s['frameW']]) for i in range(a['frames'])]
        print('%-11s %-5s holes/frame: %s' % (n, an, ' '.join('%d' % len(r) for r in res)))
        if os.environ.get('V') and an == os.environ.get('V'): print('   ', res)
