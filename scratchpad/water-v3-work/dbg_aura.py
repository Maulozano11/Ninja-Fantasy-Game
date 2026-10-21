import runpy, sys
import numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/water-set-owner-reference.jpg', SP + '/water-v3-work/refdata-dbg.ts', SP + '/art2/vfx-water-v3-character.png']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/water-from-ref.py')
b = g['built']['aura']
col = b['g']['col']; L = g['lum'](col)
ch = g['char_in_frame'](b)
body = ch[..., 3] > 0
H, W = L.shape
vis = np.zeros((H, W, 3), np.uint8)
vis[...] = np.clip(b['g']['his'], 0, 255).astype(np.uint8)
dl = L - g['lum'](ch[..., :3]) * body
cand = b['solid'] & (L >= 110) & (col[..., 2] - col[..., 0] >= 40) & (dl >= 40)
vis[cand] = (255, 0, 255)
Image.fromarray(vis).resize((W * 5, H * 5), Image.NEAREST).save(SP + '/water-v3-work/look/aura-cand.png')
