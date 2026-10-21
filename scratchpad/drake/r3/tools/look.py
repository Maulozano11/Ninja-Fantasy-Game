import sys, json
import numpy as np
from PIL import Image
sheet = np.asarray(Image.open(sys.argv[1]).convert('RGBA'))
man = json.load(open(sys.argv[2]))['sprites']['earth']
W, H = man['frameW'], man['frameH']
ax, ay = man['anchor']
n = man['anims']['fly']['frames']
fr = [sheet[:H, i*W:(i+1)*W] for i in range(n)]
print('size', W, H, 'anchor', ax, ay, 'frames', n)
for i, f in enumerate(fr):
    a = f[..., 3]
    region = f[40:110, 200:W]
    y, x = np.nonzero((region[..., 0] > 200) & (region[..., 1] > 150) & (region[..., 2] < 110) & (region[..., 3] == 255))
    cols = set(tuple(c) for c in region[y, x, :3].tolist())
    print(i, 'yellow px', len(x), 'mean', (x.mean()+200 if len(x) else -1), (y.mean()+40 if len(y) else -1), sorted(cols)[:6])
