# Quantize a region of his lifted picture (sprite coords) to k colours; print the label map and palette.
# quant.py x0 y0 x1 y1 k
import sys
import numpy as np
from PIL import Image
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/work/'
H = np.load(D + 'his_sprite.npy')
x0, y0, x1, y1, k = map(int, sys.argv[1:6])
a = H[y0:y1, x0:x1].reshape(-1, 3)
rng = np.random.default_rng(1)
# k-means in Lab-ish (just RGB weighted)
C = a[rng.choice(len(a), k, replace=False)]
for _ in range(60):
    d = ((a[:, None, :] - C[None]) ** 2).sum(2)
    L = d.argmin(1)
    for c in range(k):
        if (L == c).any():
            C[c] = a[L == c].mean(0)
order = np.argsort(C @ np.array([0.299, 0.587, 0.114]))
C = C[order]
d = ((a[:, None, :] - C[None]) ** 2).sum(2)
L = d.argmin(1).reshape(y1 - y0, x1 - x0)
chars = '0123456789abcdefghij'
print('    ' + ''.join(str((x0 + i) % 10) for i in range(x1 - x0)))
for j in range(y1 - y0):
    print('%3d ' % (y0 + j) + ''.join(chars[v] for v in L[j]))
for c in range(k):
    print(chars[c], '#%02x%02x%02x' % tuple(int(v) for v in C[c]), (L == c).sum())
img = Image.fromarray(C[L].astype(np.uint8)).resize(((x1 - x0) * 16, (y1 - y0) * 16), Image.NEAREST)
img.save(D + 'quant.png')
