import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from collections import deque
def enclosed(a):
    H,W=a.shape; clear=a==0; seen=np.zeros_like(clear)
    dq=deque()
    for x in range(W):
        for y in (0,H-1):
            if clear[y,x] and not seen[y,x]: seen[y,x]=1; dq.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if clear[y,x] and not seen[y,x]: seen[y,x]=1; dq.append((y,x))
    while dq:
        y,x=dq.popleft()
        for ny,nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
            if 0<=ny<H and 0<=nx<W and clear[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1; dq.append((ny,nx))
    return clear&~seen
for name,s in M['sprites'].items():
    if name=='beast': continue
    for an in s['anims']:
        res=[]
        for i,f in enumerate(frames(name,an)):
            a=f[...,3].astype(int)
            n4=np.stack([np.roll(a,1,0),np.roll(a,-1,0),np.roll(a,1,1),np.roll(a,-1,1)])
            pin=(a<255)&(n4.min(0)==255)          # see-through pixel fully inside solid
            semi_in=(a<200)&(n4.min(0)==255)
            enc=enclosed(a)
            res.append(f'{pin.sum()}/{enc.sum()}')
        print(f'{name:12s} {an:6s} pin/enclosed:', ' '.join(res))
