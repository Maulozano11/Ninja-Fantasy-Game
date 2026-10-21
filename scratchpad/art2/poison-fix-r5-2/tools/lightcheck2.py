"""lightcheck2.py <groupDir>: blast pixels whose alpha is under half the light within 3 px, with light
(or opaque art) brighter than twice their alpha on both sides along some direction (a hole, not the
light's own outer edge)."""
import json, os, sys
import numpy as np
from PIL import Image
G = sys.argv[1]
LC = (108, 233, 87)
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']['blast']
sheet = np.asarray(Image.open(os.path.join(G, man['file'])).convert('RGBA')).astype(int)
fw, fh = man['frameW'], man['frameH']
a = man['anims']['blast']
yy, xx = np.mgrid[-3:4, -3:4]
disc = [(dy, dx) for dy, dx in zip(yy.ravel(), xx.ravel()) if dy * dy + dx * dx <= 9 and (dy or dx)]
def shift(m, dy, dx, fill=0):
    o = np.full_like(m, fill); H, W = m.shape
    o[max(dy,0):H+min(dy,0), max(dx,0):W+min(dx,0)] = m[max(-dy,0):H+min(-dy,0), max(-dx,0):W+min(-dx,0)]
    return o
def comps(mask):
    H, W = mask.shape; lab = np.zeros((H, W), int); n = 0; sizes = []
    for y0 in range(H):
        for x0 in range(W):
            if mask[y0, x0] and not lab[y0, x0]:
                n += 1; st = [(y0, x0)]; lab[y0, x0] = n; c = 0
                while st:
                    y, x = st.pop(); c += 1
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        v, u = y + dy, x + dx
                        if 0 <= v < H and 0 <= u < W and mask[v, u] and not lab[v, u]: lab[v, u] = n; st.append((v, u))
                sizes.append(c)
    return lab, sizes
tot = 0
for i in range(a['frames']):
    f = sheet[a['row'] * fh:(a['row'] + 1) * fh, i * fw:(i + 1) * fw]
    al = f[..., 3]
    light = (al > 0) & (np.abs(f[..., 0] - LC[0]) <= 3) & (np.abs(f[..., 1] - LC[1]) <= 3) & (np.abs(f[..., 2] - LC[2]) <= 3)
    ref = np.where(light, al, 0)
    m = np.zeros_like(al)
    for dy, dx in disc: m = np.maximum(m, shift(ref, dy, dx))
    S = np.where(al >= 200, 255, al)
    br = np.zeros(al.shape, bool)
    for d in ((0, 1), (1, 0), (1, 1), (1, -1)):
        sp = np.zeros_like(al); sn = np.zeros_like(al)
        for k in (1, 2, 3):
            sp = np.maximum(sp, shift(S, d[0] * k, d[1] * k)); sn = np.maximum(sn, shift(S, -d[0] * k, -d[1] * k))
        br |= (sp > 2 * al) & (sn > 2 * al)
    bad = (al < 200) & (m >= 24) & (al * 2 < m) & br
    lab, sizes = comps(bad)
    tot += bad.sum()
    ys, xs = np.nonzero(bad)
    if os.environ.get('SAVE'):
        im = np.zeros((fh, fw, 3), np.uint8); im[..., 1] = np.clip(ref, 0, 255); im[al >= 200] = (80, 80, 80); im[bad] = (255, 0, 0)
        Image.fromarray(im).resize((fw * 3, fh * 3), Image.NEAREST).save(os.environ['SAVE'] + '-%02d.png' % i)
    print('frame %2d: %4d px in %d pockets (largest %d)%s' % (i, bad.sum(), len(sizes), max(sizes) if sizes else 0, '' if not len(ys) else ' bbox x%d-%d y%d-%d' % (xs.min(), xs.max(), ys.min(), ys.max())))
print('total', tot)
