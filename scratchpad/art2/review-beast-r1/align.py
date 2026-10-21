import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
sc=96/228
BG=np.array([34,34,44])
def hiscrop(ox,oy):
    w=275/sc; h=180/sc
    c=ref.crop((ox,oy,ox+w,oy+h))  # float box allowed
    return np.asarray(c.resize((275,180),Image.BOX)).astype(float)
for k,(ox,oy) in {0:(442,1550),5:(1108,1530)}.items():
    f=np.asarray(Image.open(R+'/ours-f%d.png'%k).convert('RGBA')).astype(float)
    al=f[:,:,3:]/255
    o=f[:,:,:3]*al+BG*(1-al)
    best=None
    for dy in np.arange(-24,24.1,2):
        for dx in np.arange(-24,24.1,2):
            h=hiscrop(ox+dx,oy+dy)
            d=np.abs(h-o).sum(2)[al[:,:,0]>0.5].mean()
            if best is None or d<best[0]: best=(d,dx,dy)
    print(k,'best shift his px',best)
    # fine
    d0,bx,by=best
    for dy in np.arange(by-1,by+1.01,0.25):
        for dx in np.arange(bx-1,bx+1.01,0.25):
            h=hiscrop(ox+dx,oy+dy)
            d=np.abs(h-o).sum(2)[al[:,:,0]>0.5].mean()
            if d<best[0]: best=(d,dx,dy)
    print(k,'fine',best, 'in game px', best[1]*sc, best[2]*sc)
