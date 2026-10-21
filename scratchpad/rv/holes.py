import sys, json
import numpy as np
from PIL import Image

from collections import deque
def label(mask):
    H,W=mask.shape; lab=np.zeros((H,W),int); n=0
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n
                while q:
                    cy,cx=q.popleft()
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        yy,xx=cy+dy,cx+dx
                        if 0<=yy<H and 0<=xx<W and mask[yy,xx] and not lab[yy,xx]:
                            lab[yy,xx]=n; q.append((yy,xx))
    return lab,n
def nbsum(op):
    p=np.pad(op,1); H,W=op.shape
    return sum(p[1+dy:1+dy+H,1+dx:1+dx+W] for dy in (-1,0,1) for dx in (-1,0,1) if dy or dx)
A = sys.argv[1]
man = json.load(open(A + '/staging/vfx_earth_v3/manifest.json'))['sprites']
names = sys.argv[2:] or [k for k in man if k != 'beast']
for name in names:
    m = man[name]; W, H = m['frameW'], m['frameH']
    a = np.asarray(Image.open(A + '/staging/vfx_earth_v3/' + m['file']).convert('RGBA'))[..., 3].astype(int)
    for an, b in m['anims'].items():
        out = []
        for f in range(b['frames']):
            fr = a[b['row'] * H:(b['row'] + 1) * H, f * W:(f + 1) * W]
            clear = fr < 40
            lab, n = label(clear)
            border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
            enclosed = np.isin(lab, [l for l in range(1, n + 1) if l not in border])
            op = (fr >= 200).astype(int)
            nb = nbsum(op)
            pin = clear & (nb >= 7)
            out.append('%d/%d' % (enclosed.sum(), pin.sum()))
        print('%-11s %-5s enclosed/pinholes per frame: %s' % (name, an, ' '.join(out)))
