import runpy, sys, numpy as np
from PIL import Image
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
name = 'blast'
st = g['stage'][name]; pal = g['PALS'][name]
img = st['img']; raw = st['raw']
a = img[..., 3:]
comp = img[..., :3] * a + np.array([32, 32, 42.]) * (1 - a)
q0 = pal.quantize(img); q1 = pal.clean(q0)
c0 = g['over'](g['render'](q0, pal), (32, 32, 42)); c1 = g['over'](g['render'](q1, pal), (32, 32, 42))
x0, x1, y0, y1 = 20, 120, 0, 80
row = np.concatenate([t[y0:y1, x0:x1] for t in (raw, comp, c0, c1)], 1)
Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((row.shape[1] * 5, row.shape[0] * 5), Image.NEAREST).save(SP + '/wv3/look/dbg3.png')
print('PAL op', pal.op.round().astype(int).tolist())
print('fam', pal.fam.tolist())
for c in [(76, 137, 112), (39, 93, 80), (131, 187, 152), (176, 228, 190), (180, 210, 120), (22, 56, 51)]:
    c = np.array([c], float)
    i = pal.nearest(c, pal.op)[0]
    print(c[0], '->', pal.op[i].round(), 'fam', g['family'](c)[0])
for x in range(40, 60):
    y = 30
    print((x, y), img[y, x].round().astype(int).tolist(), '->', pal.rgb(q0)[y, x].astype(int).tolist(), 'fam', g['family'](img[y:y+1, x, :3])[0])
