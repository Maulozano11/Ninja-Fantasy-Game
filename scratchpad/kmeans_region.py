"""k-means (RGB) of a region of one of his windows: the main colours, dark to light, with shares."""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
x0, y0, x1, y1, k = map(int, sys.argv[2:7])
a = np.asarray(Image.open(src).convert('RGB'))[y0:y1, x0:x1].reshape(-1, 3).astype(float)
lum = a @ np.array([0.3, 0.59, 0.11])
order = np.argsort(lum, kind='stable')
c = np.array([a[order[int((i + 0.5) / k * len(order))]] for i in range(k)])
for _ in range(30):
    asg = ((a[:, None] - c[None]) ** 2).sum(-1).argmin(1)
    for j in range(k):
        if (asg == j).any():
            c[j] = a[asg == j].mean(0)
asg = ((a[:, None] - c[None]) ** 2).sum(-1).argmin(1)
for j in np.argsort(c @ np.array([0.3, 0.59, 0.11])):
    # the real pixel nearest the centre
    m = a[asg == j]
    if not len(m):
        continue
    near = m[((m - c[j]) ** 2).sum(1).argmin()]
    print('#%02x%02x%02x' % tuple(int(v) for v in near), 'share %.3f' % (asg == j).mean())
