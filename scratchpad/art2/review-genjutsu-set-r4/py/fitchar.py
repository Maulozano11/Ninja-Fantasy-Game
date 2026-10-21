from PIL import Image; import numpy as np
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
ref=Image.open(A+'REF-genjutsu-set-owner.jpg').convert('L')
refa=np.array(ref).astype(float)
ch=Image.open(A+'vfx-genjutsu-v3-character.png').convert('RGBA')
# crop char bbox 27..82, 27..122
cb=ch.crop((27,27,83,123))
def fit(cx,cy,srange):
    best=None
    for s in srange:
        w=round(56*s); h=round(96*s)
        im=cb.resize((w,h),Image.LANCZOS)
        a=np.array(im).astype(float); L=0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2]; M=a[:,:,3]>128
        for dy in range(-10,11):
            for dx in range(-10,11):
                x0=cx+dx-w//2; y0=cy+dy-h
                sub=refa[y0:y0+h,x0:x0+w]
                u=L[M]; v=sub[M]; u=u-u.mean(); v=v-v.mean()
                c=(u*v).sum()/np.sqrt((u*u).sum()*(v*v).sum())
                if best is None or c>best[0]: best=(c,s,x0,y0,w,h)
    return best
import sys
for name,cx,cy in [('blast',805,410),('wall',410,648),('diag',975,725),('depth',195,996)]:
    b=fit(cx,cy,np.arange(1.22,1.40,0.01))
    print(name,'ncc %.3f s %.2f box x %d y %d w %d h %d  feet y %d'%(b[0],b[1],b[2],b[3],b[4],b[5],b[3]+b[5]))
