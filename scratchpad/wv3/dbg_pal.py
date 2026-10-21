import runpy, sys, numpy as np
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
st = g['stage']['bolt']; pal = g['PALS']['bolt']
img = st['img']; raw = st['raw']
op = img[..., 3] >= 1
print('opaque palette', pal.op.round().astype(int).tolist())
print('fam', pal.fam.tolist())
# saturation compare
def sat(c): return (c.max(-1) - c.min(-1))
print('raw sat mean (opaque px)', sat(raw[op]).mean(), 'img sat', sat(img[op][:, :3]).mean())
q = pal.quantize(img)
print('quant sat', sat(pal.rgb(q)[op]).mean())
for y, x in [(20, 40), (30, 30), (40, 50), (15, 50)]:
    print((x, y), raw[y, x].round(), img[y, x].round(), pal.rgb(q)[y, x])
