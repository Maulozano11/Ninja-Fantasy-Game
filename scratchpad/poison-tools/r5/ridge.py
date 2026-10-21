import sys, numpy as np
from PIL import Image
A = np.load(sys.argv[1]); M = np.asarray(Image.open(sys.argv[2]).convert('L')) > 127
G = 33 + A / 255 * 200
H, W = A.shape
peaks = []
for y in range(H):
    for x in range(3, W - 3):
        if not M[y, x]: continue
        if G[y, x] > G[y, x - 3] + 1.0 and G[y, x] > G[y, x + 3] + 1.0:
            peaks.append((y, x, round(G[y, x] - max(G[y, x - 3], G[y, x + 3]), 1)))
print('row peaks in the fill (> both 3 px neighbours by 1 G):', len(peaks), peaks[:12])
for y in (110, 118, 125, 132, 140):
    print('row', y, ' '.join('%3d' % G[y, x] for x in range(180, 262, 4)))
