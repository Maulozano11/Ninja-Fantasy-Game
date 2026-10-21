"""violet.py <groupdir> <frames>: longest runs of equal topmost violet row (alpha>=48) per blast frame, with location"""
import json, os, sys
import numpy as np
from PIL import Image
G = sys.argv[1]
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites']['blast']
sh = np.array(Image.open(os.path.join(G, m['file'])).convert('RGBA')).astype(int)
fw, fh = m['frameW'], m['frameH']
for i in [int(v) for v in sys.argv[2].split(',')]:
    f = sh[:fh, i*fw:(i+1)*fw]
    vio = (f[..., 3] >= 48) & (f[..., 0] > f[..., 1] + 10) & (f[..., 2] > f[..., 1] + 10)
    top = [int(np.argmax(vio[:, x])) if vio[:, x].any() else -1 for x in range(fw)]
    best, run, at = 0, 0, 0
    for x in range(fw):
        run = run + 1 if (top[x] >= 0 and x > 0 and top[x] == top[x-1]) else (1 if top[x] >= 0 else 0)
        if run > best: best, at = run, x
    print(i, 'run', best, 'ends x', at, 'row', top[at], 'alpha', f[top[at], at-best+1:at+1, 3].tolist(), 'rgb', f[top[at], at, :3].tolist())
