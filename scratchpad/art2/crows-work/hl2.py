import sys, runpy, io, contextlib
sys.argv = ['m', sys.argv[1]]
with contextlib.redirect_stdout(io.StringIO()):
    g = runpy.run_path('measure.py', run_name='x')
import numpy as np
from collections import Counter
f = g['frames']['fly'][0]
h = g['his_box']('L')
c = f[..., :3].astype(np.float32)
Lh, Lo = g['luma'](h), g['luma'](c)
ez = g['dil4'](g['eye_pixels'](f), 2)
on = (f[..., 3] > 0) & ~ez
a = on & (Lo > 100)
b = on & (Lh > 100)
print('ours>100', a.sum(), 'his>100', b.sum(), 'both', (a & b).sum())
print('ours>100 colours', Counter(tuple(int(v) for v in c[y, x]) for y, x in zip(*np.nonzero(a))).most_common(12))
print('his luma where ours>100 & his<=100:', np.round(np.sort(Lh[a & ~b]), 0)[:40])
print('our luma where his>100 & ours<=100:', np.round(np.sort(Lo[b & ~a]), 0)[:40])
