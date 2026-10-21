import json, sys
import numpy as np
from PIL import Image
def energy(root):
    M = json.load(open(root + 'manifest.json'))['sprites']
    out = {}
    for n, s in M.items():
        sh = np.asarray(Image.open(root + s['file']).convert('RGBA')).astype(float)
        for an, a in s['anims'].items():
            e = []
            for i in range(a['frames']):
                f = sh[a['row'] * s['frameH']:(a['row'] + 1) * s['frameH'], i * s['frameW']:(i + 1) * s['frameW']]
                L = (0.3 * f[..., 0] + 0.59 * f[..., 1] + 0.11 * f[..., 2]) / 255
                e.append(float((L * f[..., 3] / 255).sum()))
            e = np.array(e); pk = e.max()
            d = np.abs(np.diff(np.concatenate([e, e[:1]]) if a['loop'] else e)) / pk
            out[(n, an)] = (e / pk, d.max(), a['loop'])
    return out
new = energy('art2/staging/vfx_lightning_v3/'); old = energy('lv3/base/vfx_lightning_v3/')
for k, (e, mx, loop) in new.items():
    o = old.get(k)
    print('%-11s %-5s %2df max step %4.1f%% (was %4.1f%%)  %s' % (k[0], k[1], len(e), mx * 100, o[1] * 100 if o else -1, ' '.join('%3d' % round(v * 100) for v in e)))
