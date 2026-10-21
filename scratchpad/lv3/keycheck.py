import json, sys
import numpy as np
from PIL import Image
new = 'art2/staging/vfx_lightning_v3/'; old = 'lv3/base/vfx_lightning_v3/'
N = json.load(open(new + 'manifest.json'))['sprites']; O = json.load(open(old + 'manifest.json'))['sprites']
def frame(root, M, name, anim, i):
    s = M[name]; a = s['anims'][anim]
    sh = np.asarray(Image.open(root + s['file']).convert('RGBA'))
    return sh[a['row'] * s['frameH']:(a['row'] + 1) * s['frameH'], i * s['frameW']:(i + 1) * s['frameW']]
checks = [(n, 'fly', 0, 'fly', 0) for n in ['bolt', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi']]
checks += [('hit', 'hit', 3, 'hit', 2), ('blast', 'blast', 4, 'blast', 2), ('aura', 'idle', 0, 'idle', 0)]
checks += [(n, 'idle', 0, 'idle', 0) for n in ['wall', 'wall_diag', 'wall_depth']]
checks += [(n, 'rise', 11, 'idle', 0) for n in ['wall', 'wall_diag', 'wall_depth']]
for n, na, ni, oa, oi in checks:
    a = frame(new, N, n, na, ni); b = frame(old, O, n, oa, oi)
    dx = N[n]['anchor'][0] - O[n]['anchor'][0]; dy = N[n]['anchor'][1] - O[n]['anchor'][1]
    big = np.zeros((max(a.shape[0], b.shape[0] + dy), max(a.shape[1], b.shape[1] + dx), 4), np.uint8)
    bb = big.copy(); bb[dy:dy + b.shape[0], dx:dx + b.shape[1]] = b
    aa = big.copy(); aa[:a.shape[0], :a.shape[1]] = a
    diff = int((np.abs(aa.astype(int) - bb.astype(int)).sum(-1) > 0).sum())
    print('%-11s new %s[%d] vs approved %s[%d]: %s' % (n, na, ni, oa, oi, 'identical' if diff == 0 else '%d px differ' % diff))
