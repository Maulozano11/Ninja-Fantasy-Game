"""His ninja-leap effects sheet (card 15: 4 rows x 6, take-off, trail, vanish, landing) cut into
cells and keyed soft: alpha from how magenta a pixel is (min(r,b) above g), colours unmixed, and his
guide's darker magenta lines (the grid, the floor line) taken out."""
import sys
import numpy as np
from PIL import Image
SRC, OUT = sys.argv[1], sys.argv[2]
a = np.array(Image.open(SRC).convert('RGB')).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
al = np.clip(1 - (np.minimum(r, b) - g) / 235.0, 0, 1)
guide = (g < 60) & (np.abs(r - b) < 50)  # pure or dark magenta: the ground and the guide's lines
al[guide] = 0
al[al < 0.1] = 0
rgb = ((a - (1 - al[..., None]) * np.array([255.0, 0, 255.0])) / np.maximum(al[..., None], 1e-3)).clip(0, 255)
RGBA = np.dstack([rgb, al * 255]).astype(np.uint8)
XS = [2, 272, 543, 814, 1085, 1355, 1623]
YS = [2, 241, 485, 727, 966]
for ri in range(4):
    for ci in range(6):
        c = RGBA[YS[ri] + 2:YS[ri + 1] - 1, XS[ci] + 2:XS[ci + 1] - 1]
        Image.fromarray(c, 'RGBA').save(f'{OUT}/fx_{ri}_{ci}.png')
print('ok')
