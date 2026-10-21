import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load()
C = g['C']
for k in 'LR':
    c = C[k]
    for j, m in enumerate(c['blobs']):
        ys, xs = np.nonzero(m)
        print(k, j, 'mass', round(float(c['mist_a'][m].sum()), 1), 'px', int(m.sum()), 'centre', (round(xs.mean()), round(ys.mean())), 'front', c['blob_front'][j])
