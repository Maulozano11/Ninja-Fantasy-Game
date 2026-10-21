import json, sys, numpy as np
from PIL import Image
G = sys.argv[1]
man = json.load(open(G + '/manifest.json'))['sprites']
def frames(n, an):
    m = man[n]; a = m['anims'][an]; sh = np.asarray(Image.open(G + '/' + m['file']).convert('RGBA')).astype(float)
    return [sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']] for i in range(a['frames'])]
BG = np.array([31, 33, 46.])
def comp(f): return f[..., :3] * f[..., 3:] / 255 + BG * (1 - f[..., 3:] / 255)
def metrics(a, b):
    ca, cb = comp(a), comp(b)
    m1 = (a[..., 3] > 0) | (b[..., 3] > 0)
    m2 = (a[..., 3] > 200)
    d = np.abs(ca - cb).sum(-1)
    return d[m1].mean() / 3, d[m1].mean(), d[m2].mean() / 3, d[m2].mean()
for n, an, k in [('hit', 'hit', 3), ('slash', 'fly', 0), ('bolt', 'fly', 0), ('multi', 'fly', 0), ('sphere', 'fly', 0)]:
    F = frames(n, an)
    for j in range(4):
        print(n, j, [round(metrics(F[k], f)[j], 1) for f in F])
