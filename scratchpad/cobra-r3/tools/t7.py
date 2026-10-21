import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load()
C = g['C']; edge4 = g['edge4']; dilate = g['dilate']
for k in 'LR':
    c = C[k]
    full = c['coil_src'] | c['upper']
    rim = edge4(full)
    vis_rim = edge4(c['body'])
    for j, m in enumerate(c['blobs']):
        if not c['blob_front'][j]:
            continue
        mf = m & c['mist_front']
        print(k, j, 'mass', round(float(c['mist_a'][m].sum())), 'front px', int(mf.sum()), 'front on coil rim', int((mf & rim).sum()),
              'blob px touching visible rim', int((m & ~c['body'] & dilate(vis_rim, 1)).sum()), 'coil rim px under blob (solid >=0.32)', int((rim & m & (c['mist_a'] >= 0.32)).sum()))
