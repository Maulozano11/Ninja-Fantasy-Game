"""lightcheck.py <groupDir> [frames]: per blast frame, pixels whose alpha is under half the green light within 3 px."""
import json, os, sys
import numpy as np
from PIL import Image
G = sys.argv[1]
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
for i in range(a['frames']):
    f = sheet[a['row'] * fh:(a['row'] + 1) * fh, i * fw:(i + 1) * fw]
    al = f[..., 3]
    green = (al > 0) & (np.abs(f[..., 0] - 108) <= 3) & (np.abs(f[..., 1] - 233) <= 3) & (np.abs(f[..., 2] - 87) <= 3)
    ref = np.where(green, al, 0)
    m = np.zeros_like(al)
    for dy, dx in disc: m = np.maximum(m, shift(ref, dy, dx))
    opq = al >= 200
    nearO = opq.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): nearO |= shift(opq, dy, dx)
    bad = (al < 200) & (m >= 24) & (al * 2 < m)
    badF = bad & ~nearO
    ys, xs = np.nonzero(badF)
    if os.environ.get('SAVE'):
        im = np.zeros((fh, fw, 3), np.uint8); im[..., 1] = np.clip(ref, 0, 255); im[opq] = (80, 80, 80); im[bad] = (255, 0, 0); im[badF] = (255, 255, 0)
        Image.fromarray(im).resize((fw * 3, fh * 3), Image.NEAREST).save(os.environ['SAVE'] + '-%02d.png' % i)
    print('frame %2d: %4d px under half the light within 3 px (%4d of them not next to opaque art)%s' % (i, bad.sum(), badF.sum(), '' if not len(ys) else ' bbox x%d-%d y%d-%d' % (xs.min(), xs.max(), ys.min(), ys.max())))
