import sys, json
import numpy as np
from PIL import Image
exec(open(sys.argv[0].replace('wallholes.py','holes.py')).read().split("A = sys.argv[1]")[0])
A = sys.argv[1]
man = json.load(open(A + '/staging/vfx_earth_v3/manifest.json'))['sprites']
for name, an, f, thr in [('wall','idle',0,40),('wall','idle',0,1),('wall','rise',11,1),('wall_diag','idle',3,40),('wall_diag','idle',3,1),('wall_diag','rise',11,1),('wall_depth','idle',2,40),('wall_depth','idle',2,1)]:
    m = man[name]; W, H = m['frameW'], m['frameH']; b = m['anims'][an]
    im = np.asarray(Image.open(A + '/staging/vfx_earth_v3/' + m['file']).convert('RGBA'))
    fr = im[b['row'] * H:(b['row'] + 1) * H, f * W:(f + 1) * W]
    a = fr[..., 3].astype(int)
    clear = a < thr
    lab, n = label(clear)
    border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    comps = []
    for l in range(1, n + 1):
        if l in border: continue
        ys, xs = np.nonzero(lab == l)
        comps.append((len(ys), int(xs.mean()), int(ys.mean())))
    print(name, an, f, 'thr', thr, 'components (size,x,y):', comps)
