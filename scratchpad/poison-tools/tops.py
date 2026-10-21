import json, os, sys
import numpy as np
from PIL import Image
G = sys.argv[1]; name = sys.argv[2]; thr = int(sys.argv[3]) if len(sys.argv) > 3 else 1
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = np.asarray(Image.open(os.path.join(G, man['file'])).convert('RGBA'))
for anim, a in man['anims'].items():
    tops, bots, cnt = [], [], []
    for i in range(a['frames']):
        f = sheet[a['row'] * man['frameH']:(a['row'] + 1) * man['frameH'], i * man['frameW']:(i + 1) * man['frameW']]
        ys = np.nonzero((f[..., 3] >= thr).any(1))[0]
        tops.append(int(ys.min()) if len(ys) else -1); bots.append(int(ys.max()) if len(ys) else -1)
        cnt.append(int((f[..., 3] >= thr).sum()))
    print(anim, 'tops', tops); print(anim, 'bots', bots); print(anim, 'px', cnt)
