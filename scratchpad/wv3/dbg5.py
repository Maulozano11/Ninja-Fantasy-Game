import runpy, sys, numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
idx, main, lv, pal = g['QUANT']['hit']
st = g['stage']['hit']
img = st['img']
for (x, y) in [(23, 8), (24, 9), (25, 10), (22, 9), (60, 48), (61, 49), (50, 69)]:
    x += 1; y += 1
    print((x, y), img[y, x].round(2).tolist(), 'fam', g['family'](img[y:y+1, x, :3])[0], 'q', pal.rgb(idx)[y, x].astype(int).tolist(), 'qfam', pal.fam_of(idx)[y, x], 'op', pal.is_op(idx)[y, x])
print('pal fams', np.bincount(pal.fam, minlength=3), pal.op[pal.fam == 1].round().astype(int).tolist())
vis = np.zeros(idx.shape + (3,), np.uint8)
op = pal.is_op(idx); fam = pal.fam_of(idx)
vis[idx > 0] = (80, 80, 80); vis[op] = (255, 255, 255); vis[op & (fam == 1)] = (255, 255, 0)
Image.fromarray(vis).resize((idx.shape[1] * 4, idx.shape[0] * 4), Image.NEAREST).save(SP + '/wv3/look/dbg5.png')
