"""Checks on vfx_beasts/earth: margins, ground, holes, flash, silhouette change, head track."""
import sys, json
from collections import deque
import numpy as np
from PIL import Image
sheet = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(np.int32)
man = json.load(open(sys.argv[2]))['sprites']['earth']
FEET = int(sys.argv[3]) if len(sys.argv) > 3 else None
W, H = man['frameW'], man['frameH']
n = man['anims']['fly']['frames']
fr = [sheet[:H, i * W:(i + 1) * W] for i in range(n)]
print('size', W, H, 'anchor', man['anchor'], 'fps', man['anims']['fly']['fps'])

def comps(mask):
    lab = -np.ones(mask.shape, np.int32); out = []
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x] >= 0: continue
        q = deque([(y, x)]); lab[y, x] = len(out); pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and lab[ny, nx] < 0:
                    lab[ny, nx] = len(out); q.append((ny, nx))
        out.append(pts)
    return out

def head_template(f, box):
    x0, y0, x1, y1 = box
    return f[y0:y1, x0:x1]

def match(f, tpl, x0, y0, R=30):
    th, tw = tpl.shape[:2]
    m = tpl[..., 3] == 255
    best = (1e18, 0, 0)
    for dy in range(-R, R + 1):
        for dx in range(-8, 9):
            ys, xs = y0 + dy, x0 + dx
            if ys < 0 or xs < 0 or ys + th > H or xs + tw > W: continue
            sub = f[ys:ys + th, xs:xs + tw]
            d = np.abs(sub[..., :3] - tpl[..., :3]).sum(-1)
            d = np.where(m & (sub[..., 3] == 255), d, np.where(m != (sub[..., 3] == 255), 300, 0)).sum()
            if d < best[0]: best = (d, dx, dy)
    return best

# Eye: centroid of the brightest eye yellow in the key frames.
def eye_of(f, box):
    x0, y0, x1, y1 = box
    s = f[y0:y1, x0:x1]
    m = (s[..., 0] >= 240) & (s[..., 1] >= 215) & (s[..., 2] < 110) & (s[..., 3] == 255)
    ys, xs = np.nonzero(m)
    return xs.mean() + x0, ys.mean() + y0
src = [int(v) for v in sys.argv[4].split(',')] if len(sys.argv) > 4 else [0, 0, 0, 5, 5, 5, 5, 0]
e0 = eye_of(fr[0], (225, 70, 260, 100)); e5 = eye_of(fr[5], (225, 50, 260, 80))
print('key eyes', [round(v, 1) for v in e0], [round(v, 1) for v in e5])
tp = {0: (head_template(fr[0], (int(e0[0]) - 25, int(e0[1]) - 20, int(e0[0]) + 25, int(e0[1]) + 12)), int(e0[0]) - 25, int(e0[1]) - 20, e0),
      5: (head_template(fr[5], (int(e5[0]) - 25, int(e5[1]) - 20, int(e5[0]) + 25, int(e5[1]) + 12)), int(e5[0]) - 25, int(e5[1]) - 20, e5)}
eyes = []
lumA = []
prev = None
for i, f in enumerate(fr):
    a = f[..., 3]
    ys, xs = np.nonzero(a > 0)
    marg = (xs.min(), ys.min(), W - 1 - xs.max(), H - 1 - ys.max())
    op = a == 255
    soft = (a > 0) & (a < 255)
    lowest_op = np.nonzero(op.any(1))[0].max()
    lowest_any = ys.max()
    holes = [c for c in comps(a == 0) if not any(p[0] in (0, H - 1) or p[1] in (0, W - 1) for p in c)]
    hole_px = sum(len(c) for c in holes)
    big = [len(c) for c in holes if len(c) >= 3]
    t, ox, oy, e = tp[src[i]]
    d, dx, dy = match(f, t, ox, oy)
    eye = (e[0] + dx, e[1] + dy)
    eyes.append(eye)
    lum = (f[..., 0] * 0.3 + f[..., 1] * 0.55 + f[..., 2] * 0.15) * a / 255.0
    lumA.append(lum.mean())
    sil = a > 128
    ch = '' if prev is None else f'{(sil ^ prev).sum() / max(1, (sil | prev).sum()):.0%}'
    prev = sil
    print(f'f{i} src{src[i]} margins L{marg[0]} T{marg[1]} R{marg[2]} B{marg[3]}  lowest op {lowest_op} any {lowest_any}  '
          f'opaque {op.sum()} soft {soft.sum()}  holes {len(holes)} ({hole_px} px; >=3: {big})  eye ({eye[0]:.1f},{eye[1]:.1f}) match {d}  '
          f'lumA {lum.mean():.2f}  silchg vs prev {ch}')
sil0 = fr[0][..., 3] > 128
print('silchg 7->0', f'{(sil0 ^ prev).sum() / (sil0 | prev).sum():.0%}')
steps = [(eyes[(i + 1) % n][0] - eyes[i][0], eyes[(i + 1) % n][1] - eyes[i][1]) for i in range(n)]
print('eye steps', ' '.join(f'{i}->{(i + 1) % n}: ({sx:+.1f},{sy:+.1f})' for i, (sx, sy) in enumerate(steps)))
print('lumA steps %', ' '.join(f'{100 * (lumA[(i + 1) % n] - lumA[i]) / lumA[i]:+.1f}' for i in range(n)))
if FEET is not None:
    for i, f in enumerate(fr):
        below = (f[FEET + 1:, :, 3] > 0).sum()
        if below: print(f'f{i}: {below} px below the feet line {FEET}')
