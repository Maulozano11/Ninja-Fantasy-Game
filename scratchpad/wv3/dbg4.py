import runpy, sys, numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
name = 'blast'
idx, main, lv, pal = g['QUANT'][name]
op = pal.is_op(idx); fam = pal.fam_of(idx)
labs, n = g['components'](op, g['N8'])
sizes = np.bincount(labs.ravel())
print('components', n, 'small (<=48):', (sizes[1:] <= 48).sum())
for k in range(1, n + 1):
    if sizes[k] <= 48:
        m = labs == k
        print(k, sizes[k], 'leafy', (fam[m] == 1).sum(), 'cols', pal.rgb(idx)[m][:4].astype(int).tolist())
vis = np.zeros(idx.shape + (3,), np.uint8)
vis[idx > 0] = (80, 80, 80)
vis[op] = (255, 255, 255)
vis[op & (fam == 1)] = (255, 255, 0)
Image.fromarray(vis).resize((idx.shape[1] * 3, idx.shape[0] * 3), Image.NEAREST).save(SP + '/wv3/look/dbg4.png')
