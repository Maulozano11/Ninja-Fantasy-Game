import base64, json, sys
import numpy as np
def load(path):
    r = json.load(open(path))
    out = {}
    for pn, pc in r['pieces'].items():
        b = base64.b64decode(pc['rle'])
        flat = []
        for i in range(0, len(b), 2):
            flat += [b[i + 1]] * b[i]
        a = np.zeros((r['h'], r['w']), np.int32)
        a[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']] = np.array(flat).reshape(pc['h'], pc['w'])
        out[pn] = a
    pal = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in r['pal']], float)
    kinds = np.array(['clear'] + [p['kind'] for p in r['pal']])
    return r, out, pal, kinds
