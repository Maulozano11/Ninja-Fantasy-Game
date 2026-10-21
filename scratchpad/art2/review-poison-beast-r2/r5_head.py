import sys
import numpy as np
from PIL import Image
S=sys.argv[1]
sh=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
W,H=176,105
fr=[sh[:,i*W:(i+1)*W] for i in range(8)]
# head region: x>120, y<45 ; find snout tip (rightmost opaque body pixel in rows 10-30 excluding drops), top of head (min y of opaque green in x 120-165)
for i,f in enumerate(fr):
    a=f[...,3]==255
    r,g,b=f[...,0],f[...,1],f[...,2]
    green=a&(g>r)&(g>b)
    # top of head
    ys,xs=np.nonzero(green[:, 115:170]); 
    top=ys.min()
    # rightmost x of green in rows top..top+20
    sub=green[top:top+20,:]
    yy,xx=np.nonzero(sub)
    right=xx.max()
    # red mouth centroid: r>g and r>b and a
    red=a&(r>g+30)&(r>b+20)
    ry,rx=np.nonzero(red[:, 120:]); 
    print(i,'head top y',top,'snout right x',right,'red centroid (%.1f,%.1f) n=%d'%(rx.mean()+120,ry.mean(),len(rx)))
