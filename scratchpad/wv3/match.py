import sys
import numpy as np
from PIL import Image
SX, SY = 0.925, 0.912
ref = Image.open('../art2/REF-water-set-owner.jpg').convert('RGB')
ch = Image.open('look/ourchar.png').convert('RGBA').resize((128, 128), Image.NEAREST)
ca = np.asarray(ch).astype(np.float32)
mask = ca[..., 3] > 0
def lumi(a): return a @ np.array([0.3, 0.59, 0.11], np.float32)
x0, y0, x1, y1 = map(int, sys.argv[1:5])
crop = ref.crop((x0, y0, x1, y1))
W, H = round(crop.width * SX), round(crop.height * SY)
g = np.asarray(crop.resize((W, H), Image.BOX)).astype(np.float32)
# use gradient magnitude of luminance for structure (robust to tint)
def grad(L):
    gx = np.zeros_like(L); gy = np.zeros_like(L)
    gx[:, 1:-1] = L[:, 2:] - L[:, :-2]; gy[1:-1] = L[2:] - L[:-2]
    return np.hypot(gx, gy)
comp = np.where(mask[..., None], ca[..., :3], np.array([32, 33, 43], np.float32))
T = grad(lumi(comp))[20:126, 20:90]; TM = mask[20:126, 20:90]
TM2 = np.zeros_like(TM); TM2[1:-1, 1:-1] = TM[1:-1,1:-1]
G = grad(lumi(g))
best = None
for dy in range(0, H - T.shape[0]):
    for dx in range(0, W - T.shape[1]):
        win = G[dy:dy + T.shape[0], dx:dx + T.shape[1]]
        a = win[TM2] - win[TM2].mean(); b = T[TM2] - T[TM2].mean()
        cc = (a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum() + 1e-9)
        if best is None or cc > best[0]: best = (cc, dx, dy)
cc, dx, dy = best
# feet (64,120) in template coords -> crop game coords -> his coords
fx, fy = dx + 64 - 20, dy + 120 - 20
print('cc', round(float(cc), 3), 'feet his', round(x0 + fx / SX, 1), round(y0 + fy / SY, 1))
