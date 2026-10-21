"""Lists the bright 1-2 px spots of the wolf's 88 that his box reduction does not have (and marks them on a zoom).

usage: python3 -I spur.py <stage> <icons dir> <tag> <out.png> [overrides]
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

OUTPNG = sys.argv[4]
sys.argv = sys.argv[:4] + sys.argv[5:]
src = open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12/tools/measure12.py').read().split('res = {}')[0]
exec(src)
jid = 'lightning_hound_raidon'
sq0 = over.get(jid, crops['icons'][jid]['squareInWindow'][0])
win = window(jid)
sq = win[:, sq0:sq0 + 115]
his = box(sq, 88)
hL = oklab(his)[..., 0]
ours = np.asarray(Image.open(os.path.join(A, jid + '@2x.png')).convert('RGB'))
L = oklab(ours.astype(float))[..., 0]
key = (ours[..., 0].astype(int) << 16) | (ours[..., 1].astype(int) << 8) | ours[..., 2].astype(int)
lab, sz = comps(key)
h, w = key.shape
z = Image.fromarray(ours).resize((88 * 6, 88 * 6), Image.NEAREST)
d = ImageDraw.Draw(z)
for n in np.nonzero(sz <= 2)[0]:
    ys, xs = np.nonzero(lab == n)
    ring, hr = [], []
    for y, x in zip(ys, xs):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and lab[yy, xx] != n:
                    ring.append(L[yy, xx])
                    hr.append(hL[yy, xx])
    dd = L[ys[0], xs[0]] - np.mean(ring)
    hd = np.mean([hL[y, x] for y, x in zip(ys, xs)]) - np.mean(hr)
    if dd >= 0.1 and hd < 0.03:
        print('x=%s y=%s ours %s L %.2f d %.2f | his L %.2f d %.2f' % (list(xs), list(ys), '#%02x%02x%02x' % tuple(ours[ys[0], xs[0]]), L[ys[0], xs[0]], dd, hL[ys[0], xs[0]], hd))
        d.rectangle([xs.min() * 6 - 2, ys.min() * 6 - 2, xs.max() * 6 + 7, ys.max() * 6 + 7], outline=(255, 0, 255))
z.save(OUTPNG)
