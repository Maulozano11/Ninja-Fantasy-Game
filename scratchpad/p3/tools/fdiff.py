"""fdiff.py groupdir sprite anim: mean |RGBA| difference (premultiplied) between consecutive frames, and % pixels changed"""
import json, sys, numpy as np
from PIL import Image
G, n, an = sys.argv[1:4]
m = json.load(open(f'{G}/manifest.json'))['sprites'][n]; sh = np.asarray(Image.open(f'{G}/{m["file"]}').convert('RGBA')).astype(float)
a = m['anims'][an]
fr = [sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']] for i in range(a['frames'])]
pm = [np.concatenate([f[..., :3] * f[..., 3:] / 255, f[..., 3:]], -1) for f in fr]
op = [f[..., 3] > 0 for f in fr]
out = []
idx = list(range(1, len(fr))) + ([0] if a.get('loop', True) else [])
for i in idx:
    d = np.abs(pm[i] - pm[i - 1]).sum(-1)
    area = (op[i] | op[i - 1]).sum()
    out.append(f'{i-1 if i else len(fr)-1}->{i}: {d[op[i] | op[i - 1]].mean() / 1:.1f} ({(d > 0).sum() / max(area, 1) * 100:.0f}%)')
print(n, an, ' '.join(out))
