import sys, numpy as np
from PIL import Image
S=sys.argv[1]
REF=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
ch=Image.open(S+'/vfx-genjutsu-v3-character.png').convert('RGBA')
def lum(c): return 0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
c=np.asarray(ch).astype(float); a=c[...,3]>200; Lc=lum(c[...,:3])
fx,fy=519.5,635.5
for s in (1.29,1.30,1.31):
    k=1/s; out=[]
    for dy in np.arange(-2,2.01,0.5):
        for dx in np.arange(-2,2.01,0.5):
            x0=fx+dx-64/k; y0=fy+dy-120/k
            Lh=lum(np.asarray(REF.resize((128,128),Image.BOX,box=(x0,y0,x0+128/k,y0+128/k))).astype(float))
            A=Lc[a]-Lc[a].mean(); B=Lh[a]-Lh[a].mean()
            out.append(((A*B).sum()/np.sqrt((A*A).sum()*(B*B).sum()),fx+dx,fy+dy))
    out.sort(reverse=True); print(s,[(round(v,3),x,y) for v,x,y in out[:4]])
