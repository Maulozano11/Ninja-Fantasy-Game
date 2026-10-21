"""checker.py groupdir sprite anim: count 2x2 checkerboard blocks (opaque a,b / b,a with a != b) per frame"""
import json, sys, numpy as np
from PIL import Image
G, n, an = sys.argv[1:4]
m = json.load(open(f'{G}/manifest.json'))['sprites'][n]; sh = np.asarray(Image.open(f'{G}/{m["file"]}').convert('RGBA')).astype(np.int64)
a = m['anims'][an]; out = []
for i in range(a['frames']):
    f = sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']]
    k = (f[..., 0] << 24) | (f[..., 1] << 16) | (f[..., 2] << 8) | f[..., 3]
    op = f[..., 3] > 200
    c = (k[:-1, :-1] == k[1:, 1:]) & (k[:-1, 1:] == k[1:, :-1]) & (k[:-1, :-1] != k[:-1, 1:]) & op[:-1, :-1] & op[:-1, 1:] & op[1:, :-1] & op[1:, 1:]
    out.append(int(c.sum()))
print(n, an, out)
