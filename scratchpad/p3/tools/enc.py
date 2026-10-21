"""enc.py <groupdir>: enclosed see-through px of aura_back+aura per frame, with positions"""
import json, os, sys
import numpy as np
from PIL import Image
G = sys.argv[1]
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def frames(n):
    m = man[n]; sh = Image.open(os.path.join(G, m['file'])).convert('RGBA'); a = m['anims']['idle']
    return [np.array(sh.crop((i*m['frameW'], a['row']*m['frameH'], (i+1)*m['frameW'], (a['row']+1)*m['frameH']))) for i in range(a['frames'] if isinstance(a['frames'], int) else len(a['frames']))]
B, F = frames('aura_back'), frames('aura')
for i, (b, f) in enumerate(zip(B, F)):
    ab, af = b[..., 3] / 255, f[..., 3] / 255
    a = 1 - (1 - ab) * (1 - af)
    op = a < 128 / 255
    h, w = op.shape; seen = np.zeros_like(op); st = [(y, x) for y in range(h) for x in (0, w-1) if op[y, x]] + [(y, x) for x in range(w) for y in (0, h-1) if op[y, x]]
    for p in st: seen[p] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            u, v = y+dy, x+dx
            if 0 <= u < h and 0 <= v < w and op[u, v] and not seen[u, v]: seen[u, v] = True; st.append((u, v))
    ys, xs = np.nonzero(op & ~seen)
    print(i, len(ys), list(zip(xs.tolist(), ys.tolist()))[:40])
