"""Her colours in a few regions (native, quantized to her palette), most used first.

  python3 -I hist.py   (run from the worktree root)
"""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
import heroine_ref as R

N = R.native('saya')
fig = R.figure('saya')
Q = R.quantize(N, 'saya')
pal = R.PALETTES['saya']
REG = {
    'belts': (78, 76, 132, 98),
    'skirt': (76, 96, 134, 120),
    'scabbard': (56, 118, 86, 152),
    'tassel': (97, 88, 106, 106),
    'farpouch': (120, 82, 133, 96),
    'nearpouch': (82, 84, 99, 101),
}
for name, (x0, y0, x1, y1) in REG.items():
    q = Q[y0:y1, x0:x1][fig[y0:y1, x0:x1]]
    u, c = np.unique(q, return_counts=True)
    o = np.argsort(-c)
    print(name, ' '.join(f'{pal[u[i]]}:{c[i]}' for i in o[:28]))
