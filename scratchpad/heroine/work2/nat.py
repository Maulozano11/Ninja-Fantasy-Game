import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image
import heroine_ref as R

W = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2'
OLD = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work'
for w in R.WHICH:
    N = R.native(w)
    np.save(os.path.join(W, w + '-native.npy'), N)
    R.save(N, os.path.join(W, w + '-native@4.png'), 4)
    xs, ys = R.grid(w)
    dx, dy = np.diff(xs), np.diff(ys)
    print(w, N.shape, 'block w', np.bincount(dx), 'h', np.bincount(dy))
    if os.path.exists(os.path.join(OLD, w + '-native.npy')):
        O = np.load(os.path.join(OLD, w + '-native.npy'))
        print('  same as old:', O.shape == N.shape and (O == N).all())
    a = np.asarray(Image.open(R.REFS[w]).convert('RGB')).astype(np.float64)
    L = R.luma(a)
    bg = R.background(N)
    sp = []
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            if bg[j, i]:
                continue
            b = L[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1]
            sp.append(np.percentile(b, 90) - np.percentile(b, 10))
    yy, xx = np.nonzero(~bg)
    print('  figure px', (~bg).sum(), 'block spread median %.1f p90 %.1f' % (np.median(sp), np.percentile(sp, 90)),
          'box x %d..%d y %d..%d' % (xx.min(), xx.max(), yy.min(), yy.max()))
