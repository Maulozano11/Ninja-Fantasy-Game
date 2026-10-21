# usage: tilecheck.py <stagingDir> <out.png>: renders each 3/9-slice piece at 120, 400 and 800 px wide
# (the mockup's tiling: corners kept, centre repeated) and reports the centre's period in screen px.
import json, sys
import numpy as np
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
man = json.load(open(d + '/manifest.json'))['pieces']
rows = []
for name, m in man.items():
    if 'slice' not in m: continue
    t, r, b, l = m['slice']
    im = np.asarray(Image.open(d + '/' + m['file']).convert('RGBA'))
    h, w = im.shape[:2]
    centre = im[:, l:w - r]
    per = None
    for p in (2, 4):
        if centre.shape[1] % p == 0 and all((centre[:, x] == centre[:, x + p]).all() for x in range(centre.shape[1] - p)):
            per = p; break
    print('%-18s slice %-14s centre %3d px  period %s' % (name, m['slice'], centre.shape[1], per))
    for W in (120, 144, 400, 800):
        if W < l + r: continue
        cw = w - l - r
        cols = [x if x < l else (w - (W - x) if x >= W - r else l + (x - l) % cw) for x in range(W)]
        rows.append(Image.fromarray(im[:, cols]))
H = sum(i.height + 6 for i in rows)
o = Image.new('RGBA', (800, H), (51, 70, 58, 255)); y = 0
for i in rows:
    o.alpha_composite(i, (0, y)); y += i.height + 6
o.convert('RGB').save(out)
