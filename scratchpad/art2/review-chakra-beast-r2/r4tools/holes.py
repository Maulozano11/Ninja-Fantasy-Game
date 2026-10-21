from PIL import Image
import numpy as np
from collections import deque
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(int)
FW,FH=127,93
fr=[sheet[:,i*FW:(i+1)*FW] for i in range(8)]
def outside(mask):
    H,W=mask.shape; seen=np.zeros_like(mask); q=deque()
    for y in range(H):
        for x in (0,W-1):
            if not mask[y,x] and not seen[y,x]: seen[y,x]=1;q.append((y,x))
    for x in range(W):
        for y in (0,H-1):
            if not mask[y,x] and not seen[y,x]: seen[y,x]=1;q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and not mask[yy,xx] and not seen[yy,xx]: seen[yy,xx]=1;q.append((yy,xx))
    return seen
for i,f in enumerate(fr):
    op=f[...,3]==255
    out=outside(op)
    holes=(~op)&(~out)
    # semi-transparent pixels enclosed
    semi=(f[...,3]>0)&(f[...,3]<255)
    lum=0.2126*f[...,0]+0.7152*f[...,1]+0.0722*f[...,2]
    dark=(f[...,3]>0)&(lum<25)
    rb=(f[...,3]>0)&(f[...,0]>f[...,2]+10)&(lum<120)&(f[...,1]<f[...,0]+5)
    ys,xs=np.where(rb)
    print(i,'enclosed non-opaque',int(holes.sum()),'of which fully transparent',int((holes&(f[...,3]==0)).sum()),'semi in griffin enclosed',int((holes&semi).sum()),'dark px',int(dark.sum()),'reddish/brown px',int(rb.sum()), 'rb bbox', (xs.min(),xs.max(),ys.min(),ys.max()) if len(xs) else None)
print('---')
from collections import Counter
for i in (0,3):
    f=fr[i]; op=f[...,3]==255; out=outside(op); holes=(~op)&(~out)
    ys,xs=np.where(holes); print(i,'holes at',list(zip(xs.tolist(),ys.tolist())))
    lum=0.2126*f[...,0]+0.7152*f[...,1]+0.0722*f[...,2]
    rb=(f[...,3]>0)&(f[...,0]>f[...,2]+10)&(lum<120)&(f[...,1]<f[...,0]+5)
    print(Counter([tuple(c) for c in f[rb][:,:3].tolist()]).most_common(12))
    dark=(f[...,3]>0)&(lum<25); print('dark cols',Counter([tuple(c) for c in f[dark].tolist()]).most_common(5), list(zip(*np.where(dark)))[:30])
