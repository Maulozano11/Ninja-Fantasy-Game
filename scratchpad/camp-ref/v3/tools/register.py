# Register the owner's webp against our 3x sheet: find webp px per fine px (pitch) and offset.
import sys
import numpy as np
from PIL import Image
S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
W = np.asarray(Image.open(S + 'camp-ref/owner-camp-poses.webp').convert('RGB')).astype(float)
O = np.asarray(Image.open(S + 'camp-peek/campamento-avance.png').convert('RGB')).astype(float)

reg = sys.argv[1] if len(sys.argv) > 1 else 'ahora'
if reg == 'ahora':
    ox0, oy0, ox1, oy1 = 100, 330, 310, 620
    wx0, wy0, wx1, wy1 = 55, 245, 215, 445
else:
    ox0, oy0, ox1, oy1 = 100, 20, 310, 310
    wx0, wy0, wx1, wy1 = 55, 20, 215, 225

a = O[oy0:oy1, ox0:ox1]
dx = (np.abs(np.diff(a, axis=1)).sum(2) > 10).sum(0)
dy = (np.abs(np.diff(a, axis=0)).sum(2) > 10).sum(1)
print('orig x-change phase', [int(dx[k::3].sum()) for k in range(3)], 'y', [int(dy[k::3].sum()) for k in range(3)], 'abs x0', ox0, 'y0', oy0)

# Fine-pixel image of the orig region: phase from above
px = int(np.argmax([dx[k::3].sum() for k in range(3)]))
py = int(np.argmax([dy[k::3].sum() for k in range(3)]))
# change between col i and i+1 at index k means block boundary at ox0+k+1
bx = ox0 + px + 1
by = oy0 + py + 1
fx = (ox1 - bx) // 3
fy = (oy1 - by) // 3
F = O[by:by + fy * 3, bx:bx + fx * 3].reshape(fy, 3, fx, 3, 3)[:, 1, :, 1, :]
print('fine grid origin in orig', bx, by, 'size', fx, fy)
GU = bx / 1.3929 - 7.5
GV = by / 1.3929 + (0.7 if reg == 'ahora' else 0)
np.save(S + 'camp-ref/v3/work/fine_%s.npy' % reg, F)

# Now find pitch p (webp px per fine px) and offset (u, v): fine pixel (i, j) centre at webp (u + (i+0.5)p, v + (j+0.5)p)
def sample(img, xs, ys):
    # bilinear
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int)
    fx_ = xs - x0; fy_ = ys - y0
    H, Wd, _ = img.shape
    x0 = np.clip(x0, 0, Wd - 2); y0 = np.clip(y0, 0, H - 2)
    c00 = img[y0, x0]; c10 = img[y0, x0 + 1]; c01 = img[y0 + 1, x0]; c11 = img[y0 + 1, x0 + 1]
    fx_ = fx_[..., None]; fy_ = fy_[..., None]
    return c00 * (1 - fx_) * (1 - fy_) + c10 * fx_ * (1 - fy_) + c01 * (1 - fx_) * fy_ + c11 * fx_ * fy_

jj, ii = np.mgrid[0:fy, 0:fx]
mask = np.ones((fy, fx), bool)
if reg != 'ahora':
    mask[:] = False
    mask[int(fy * 0.62):, :] = True
def err(p, u, v_):
    xs = u + (ii + 0.5) * p
    ys = v_ + (jj + 0.5) * p
    if xs.max() >= W.shape[1] - 1 or ys.max() >= W.shape[0] - 1 or xs.min() < 0 or ys.min() < 0:
        return 1e9
    s = sample(W, xs[mask], ys[mask])
    return np.abs(s - F[mask]).mean()
res = []
bg = np.array([38., 42., 58.])
fg = np.abs(F - bg).sum(2) > 30
mask &= fg
for p in (2.13, 2.154, 2.17):
    for u in np.arange(GU - 6, GU + 6, 0.5):
        for v_ in np.arange(GV - 6, GV + 6, 0.5):
            res.append((err(p, u, v_), p, u, v_))
res.sort()
print('coarse', res[:3])
e, p, u, v_ = res[0]
for step in (0.5, 0.2, 0.05, 0.02):
    improved = True
    while improved:
        improved = False
        for dp, du, dv in [(step*0.02,0,0),(-step*0.02,0,0),(0,step,0),(0,-step,0),(0,0,step),(0,0,-step)]:
            e2 = err(p+dp, u+du, v_+dv)
            if e2 < e:
                e, p, u, v_ = e2, p+dp, u+du, v_+dv
                improved = True
print('best err %.2f pitch %.4f u %.2f v %.2f' % (e, p, u, v_))
