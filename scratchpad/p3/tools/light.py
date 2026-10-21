"""light.py <groupdir> <sprite> <anim>: light per frame (mean alpha x brightness, per mille), max alpha, steps"""
import json, os, sys
import numpy as np
from PIL import Image
G, n, an = sys.argv[1:4]
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][n]
sh = np.array(Image.open(os.path.join(G, m['file'])).convert('RGBA')).astype(float)
a = m['anims'][an]; fw, fh = m['frameW'], m['frameH']; nf = sh.shape[1] // fw
L = []; MA = []
for i in range(nf):
    f = sh[a['row']*fh:(a['row']+1)*fh, i*fw:(i+1)*fw]
    if f[..., 3].sum() == 0 and i > 0: break
    L.append(((f[..., 3]/255) * (0.3*f[..., 0]+0.59*f[..., 1]+0.11*f[..., 2])/255).mean()*1000); MA.append(int(f[..., 3].max()))
pk = max(L)
print(n, an, ' '.join(f'{v:.0f}' for v in L), '| % of peak:', ' '.join(f'{100*v/pk:.0f}' for v in L), '| max alpha', MA, '| max step %.1f%%' % (max(abs(L[i]-L[i-1]) for i in range(1, len(L)))/pk*100))
