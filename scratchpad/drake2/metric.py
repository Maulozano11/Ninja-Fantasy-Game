import sys, re
import numpy as np
from PIL import Image
# usage: metric.py sheet.png frameW frameH   -> per-pair silhouette change (alpha>128) and dust-excluded
im = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
W, H = int(sys.argv[2]), int(sys.argv[3])
n = im.shape[1] // W
fr = [im[:H, i * W:(i + 1) * W] for i in range(n)]
def body(f):
    a = f[..., 3] == 255
    r, g, b = f[..., 0].astype(int), f[..., 1].astype(int), f[..., 2].astype(int)
    dust = (r - b > 0.42 * r) & (r > g + 12) & (r > 120) & ~((r > 200) & (g > 140) & (b < 120) & (r - b > 120))
    return a
for i in range(n):
    a = fr[i][..., 3] > 128
    b = fr[(i + 1) % n][..., 3] > 128
    x = (a ^ b).sum()
    print(f'{i}->{(i+1)%n}: xor/union {100*x/(a|b).sum():5.1f}%  xor/area {100*x/a.sum():5.1f}%  xor/(a+b) {100*x/(a.sum()+b.sum()):5.1f}%')
