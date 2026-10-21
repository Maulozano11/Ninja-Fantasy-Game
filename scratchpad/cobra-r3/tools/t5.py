import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load()
C = g['C']; M = g['M']; SIG = g['SIG']; LUMA = g['LUMA']; project = g['project']; to_index = g['to_index']
thL, _ = g['seg_geom'](C['L']['Pm']); thR, _ = g['seg_geom'](C['R']['Pm'])
d = np.degrees(np.abs(g['wrap'](thL - thR)))
print('SIG', np.round(SIG, 3))
# light per sigma bin of each key's coil
for k in 'LR':
    c = C[k]
    ys, xs = np.nonzero(c['coil_src'])
    s_, v_, _ = project(c['Pm'], np.stack([xs, ys], 1).astype(np.float64))
    u = to_index(s_, c['Pm']) / (M - 1)
    lum = c['coil_col'][ys, xs] @ LUMA / 255
    bins = np.linspace(0, 1, 11)
    print(k, 'light per tenth of the body', [round(float(lum[(u >= bins[i]) & (u < bins[i + 1])].sum()), 0) for i in range(10)])
print('heading diff L vs R per tenth', [round(float(d[int(i * (M - 1) / 10):int((i + 1) * (M - 1) / 10)].mean()), 0) for i in range(10)])
