import numpy as np
from PIL import Image
from collections import deque
im = np.asarray(Image.open('../art2/REF-chakra-set-owner.jpg').convert('RGB')).astype(np.float32)
X0, Y0, X1, Y1 = 117, 40, 242, 136
c = im[Y0:Y1, X0:X1]
H, W = c.shape[:2]
bg = np.array([32., 31., 38.])
diff = np.abs(c - bg).sum(2)
def comps(mask):
    lab = -np.ones(mask.shape, int); out = []
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x] >= 0: continue
        q = deque([(y, x)]); lab[y, x] = len(out); pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = len(out); q.append((ny, nx))
        out.append(pts)
    return out
for T in (40, 60, 80):
    cs = sorted(comps(diff > T), key=len, reverse=True)
    print(T, [len(p) for p in cs[:12]], len(cs))
# ring statistics around the main component at T=60
cs = sorted(comps(diff > 60), key=len, reverse=True)
main = np.zeros((H, W), bool)
for p in cs[:1]:
    p = np.array(p); main[p[:, 0], p[:, 1]] = True
inner = main & ~(np.roll(main,1,0)&np.roll(main,-1,0)&np.roll(main,1,1)&np.roll(main,-1,1))
lum = c @ np.array([0.3, 0.55, 0.15])
print('inner ring px', inner.sum(), 'lum pct', np.percentile(lum[inner], [10, 25, 50, 75, 90]).round())
outer = ~main & (np.roll(main,1,0)|np.roll(main,-1,0)|np.roll(main,1,1)|np.roll(main,-1,1))
print('outer ring', outer.sum(), 'diff pct', np.percentile(diff[outer], [10, 25, 50, 75, 90]).round(), 'mean col', c[outer].mean(0).round())
o2 = ~main & ~outer & (np.roll(outer,1,0)|np.roll(outer,-1,0)|np.roll(outer,1,1)|np.roll(outer,-1,1))
print('outer ring2', o2.sum(), 'diff pct', np.percentile(diff[o2], [10, 25, 50, 75, 90]).round(), 'mean col', c[o2].mean(0).round())
# darkest blues on the ring
ring = c[inner]
d = ring[(ring @ np.array([0.3,0.55,0.15])) < 70]
print('dark ring px', len(d), 'median', np.median(d, 0))
from PIL import ImageDraw
k = 8
vis = (c * 0.5).astype(np.uint8)
vis[main] = (c[main] * 0.3 + np.array([0, 0, 160]) * 0.7).astype(np.uint8)
big = Image.fromarray(vis).resize((W * k, H * k), Image.NEAREST)
d = ImageDraw.Draw(big)
for i, p in enumerate(cs[1:]):
    p = np.array(p)
    for y, x in p:
        d.rectangle([x * k, y * k, x * k + k - 1, y * k + k - 1], outline=(255, 80, 80))
    d.text((p[:, 1].max() * k + k + 1, p[:, 0].min() * k), str(i + 1), fill=(255, 255, 0))
    print(i + 1, len(p), 'x', X0 + p[:, 1].min(), X0 + p[:, 1].max(), 'y', Y0 + p[:, 0].min(), Y0 + p[:, 0].max(), 'mean', c[p[:, 0], p[:, 1]].mean(0).round())
big.save('comps.png')
