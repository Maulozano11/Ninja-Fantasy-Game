import numpy as np
from PIL import Image
from collections import deque
im = np.asarray(Image.open('../art2/REF-chakra-set-owner.jpg').convert('RGB')).astype(np.float32)
X0, Y0, X1, Y1 = 116, 39, 243, 136
c = im[Y0:Y1, X0:X1]
ring = np.concatenate([c[:3, 20:-20].reshape(-1, 3), c[-3:, 60:-30].reshape(-1, 3), c[5:-5, -3:].reshape(-1, 3)])
bg = np.median(ring, 0)
print('bg', bg)
diff = np.abs(c - bg).sum(2)
for t in (30, 45, 60, 90):
    print(t, (diff > t).sum())
r, g, b = c[..., 0], c[..., 1], c[..., 2]
vis = np.zeros(c.shape, np.uint8)
vis[diff > 30] = (80, 80, 80)
vis[diff > 60] = (160, 160, 160)
vis[diff > 120] = (255, 255, 255)
Image.fromarray(vis).resize((c.shape[1] * 6, c.shape[0] * 6), Image.NEAREST).save('diff.png')
# hue-ish map
sat = c.max(2) - c.min(2)
lum = c @ np.array([0.3, 0.55, 0.15])
v2 = np.zeros(c.shape, np.uint8)
gold = (r > b + 15) & (r > 90)
blue = (b > r + 25)
v2[blue] = (0, 0, 255)
v2[gold] = (255, 200, 0)
v2[(sat < 25) & (lum > 90)] = (255, 255, 255)
v2[diff < 30] = 0
Image.fromarray(v2).resize((c.shape[1] * 6, c.shape[0] * 6), Image.NEAREST).save('classes.png')
