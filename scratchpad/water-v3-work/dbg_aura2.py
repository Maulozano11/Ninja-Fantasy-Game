import runpy, sys
import numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/water-set-owner-reference.jpg', SP + '/water-v3-work/refdata-dbg.ts', SP + '/art2/vfx-water-v3-character.png']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/water-from-ref.py')
b = g['built']['aura']
col = b['g']['col']; L = g['lum'](col)
Lf = g['lum'](b['g']['flat'])
th = Lf - g['gauss'](Lf, 2.0)
ch = g['char_in_frame'](b)
zone = g['dilate'](ch[..., 3] > 0)
H, W = L.shape
rows = np.arange(H)[:, None]
out = []
for thr, Lmin in [(8, 120), (12, 125), (16, 130)]:
    cand = b['solid'] & zone & (rows >= b['ay'] - 34) & (th >= thr) & (Lf >= Lmin) & (col[..., 2] - col[..., 0] >= 40)
    vis = np.clip(b['g']['his'], 0, 255).astype(np.uint8).copy()
    vis[cand] = (255, 0, 255)
    out.append(vis)
im = np.concatenate(out, 1)
Image.fromarray(im).resize((im.shape[1] * 4, im.shape[0] * 4), Image.NEAREST).save(SP + '/water-v3-work/look/aura-cand2.png')
