from PIL import Image
import numpy as np
import sys; sys.path.insert(0,"/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-scripts"); from lab import label
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-genjutsu-beast-r2'
im=np.asarray(Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(int)
c=im[802:1006,266:780]
r,g,b=c[...,0],c[...,1],c[...,2]
red=(r>120)&(r>g+50)&(r>b+15)
lab,n=label(red,True)
print('his red blobs',n)
for i in range(1,n+1):
    ys,xs=np.nonzero(lab==i)
    px=c[ys,xs]
    print(i,'sheet xy',xs.mean()+266,ys.mean()+802,'n',len(xs),'max',px.max(axis=0),'mean',px.mean(axis=0).astype(int))
sh=np.asarray(Image.open(S+'/staging/vfx_beasts_crows/genjutsu.png').convert('RGBA')).astype(int)
for k in (0,4):
    f=sh[0:176,k*212:(k+1)*212]
    r,g,b,a=f[...,0],f[...,1],f[...,2],f[...,3]
    red=(r>120)&(r>g+50)&(r>b+15)&(a>0)
    lab,n=label(red,True)
    print('ours fly',k,'blobs',n)
    for i in range(1,n+1):
        ys,xs=np.nonzero(lab==i); px=f[ys,xs,:3]
        print('  ',xs.mean(),ys.mean(),'n',len(xs),'max',px.max(axis=0),'mean',px.mean(axis=0).astype(int))
