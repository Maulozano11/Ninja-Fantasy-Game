import numpy as np, json
from PIL import Image
G='../art2/staging/vfx_genjutsu/'
man=json.load(open(G+'manifest.json'))['sprites']
for n,s in man.items():
    im=np.asarray(Image.open(G+s['file']).convert('RGBA'))
    f=im[:s['frameH'],:s['frameW']]
    a=f[...,3]>0
    ys,xs=np.nonzero(a)
    print(n, s['frameW'],s['frameH'],'anchor',s['anchor'],'bbox',xs.min(),ys.min(),xs.max(),ys.max(), 'sheet', im.shape[1], im.shape[0])
f=np.asarray(Image.open(G+'breath.png').convert('RGBA'))[:104,:112].astype(int)
L=f[...,:3].mean(-1)*(f[...,3]>0)
ys,xs=np.nonzero(L>200); print('breath bright', list(zip(xs[:40],ys[:40])))
