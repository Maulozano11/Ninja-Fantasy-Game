import runpy, sys, numpy as np
SP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
sys.argv = ['x', SP + '/art2/REF-wind-set-owner.jpg', SP + '/wv3/refdata.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/wind-from-ref.py')
idx, main, lv, pal = g['QUANT']['hit']
op = pal.is_op(idx); fam = pal.fam_of(idx); L = g['lum'](pal.rgb(idx))
seed = op & (fam == 1) & (L >= 60)
labs, n = g['components'](seed, g['N8'])
for k in range(1, n + 1):
    m = labs == k
    ys, xs = np.nonzero(m)
    D = g['dilate']; N8 = g['N8']
    reg = m | (D(m, 2, N8) & op & ((fam == 1) | (L < 60)))
    reg &= D(m, 2, N8)
    ring = D(reg, 2, N8) & ~reg
    on = (ring & op & (fam == 0) & (L >= 85)).sum() / max(1, ring.sum())
    print(k, 'size', m.sum(), 'at', xs.min(), ys.min(), 'on_stroke', round(on, 2))
