import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load()
TS, TARC = g['_TS'], g['_TARC']
for alpha in (1.0, 0.5, 0.0):
    sig = [0, .2, .4, .6, .8, 1.0, 2/3, 1/3]
    pts, angs = [], []
    for sg in sig:
        s_arc = float(np.interp(sg * TARC[-1], TARC, TS))
        s = alpha * sg + (1 - alpha) * s_arc
        src = 'L' if sg < 0.5 else 'R'
        th, jt = g['tip_raw'](s)
        pts.append(g['tip_point'](s, src)); angs.append(np.degrees(th))
    st = [np.hypot(*(pts[(i+1) % 8] - pts[i])) for i in range(8)]
    da = [angs[(i+1) % 8] - angs[i] for i in range(8)]
    print('even-angle weight', alpha, 'tip steps', np.round(st, 1).tolist(), 'angle steps', np.round(da, 1).tolist())
