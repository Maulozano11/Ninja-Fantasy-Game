import sys
from collections import deque
from PIL import Image
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
BG=np.array([31,32,45],np.float32)
def components(mask):
    H,W=mask.shape
    lab=-np.ones(mask.shape,np.int32); out=[]
    for y,x in zip(*np.nonzero(mask)):
        if lab[y,x]>=0: continue
        q=deque([(y,x)]); lab[y,x]=len(out); pts=[]
        while q:
            cy,cx=q.popleft(); pts.append((cy,cx))
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=cy+dy,cx+dx
                    if 0<=ny<H and 0<=nx<W and mask[ny,nx] and lab[ny,nx]<0:
                        lab[ny,nx]=len(out); q.append((ny,nx))
        out.append(pts)
    return out
def masks(x0,y0,x1,y1):
    c=ref[y0:y1,x0:x1]
    r,g,b=c[...,0],c[...,1],c[...,2]
    diff=np.abs(c-BG).sum(2); lum=c.sum(2)
    purple=(r-g>10)&(b-g>10)&(diff>20)
    cand=((diff>40)&~purple)|(lum<BG.sum()-22)
    comps=sorted(components(cand),key=len,reverse=True)
    m=np.zeros(cand.shape,bool); p=np.array(comps[0]); m[p[:,0],p[:,1]]=True
    # fill holes
    H,W=m.shape
    for p in components(~m):
        p=np.array(p)
        if p[:,0].min()==0 or p[:,1].min()==0 or p[:,0].max()==H-1 or p[:,1].max()==W-1: continue
        if len(p)<40: m[p[:,0],p[:,1]]=True
    return m
L=masks(209,689,380,797); R=masks(379,689,550,797)
print(L.sum(),R.sum())
def best_shift(a,b,R_=30):
    best,arg=-1,(0,0); H,W=a.shape
    for dy in range(-R_,R_+1):
        for dx in range(-R_,R_+1):
            ys0,ys1=max(0,dy),min(H,H+dy); xs0,xs1=max(0,dx),min(W,W+dx)
            ov=(a[ys0:ys1,xs0:xs1]&b[ys0-dy:ys1-dy,xs0-dx:xs1-dx]).sum()
            if ov>best: best,arg=ov,(dx,dy)
    return arg,best
print('full', best_shift(L,R,12))
# body only: below y=752 (his coords) i.e. row 752-689=63
Lb=L.copy(); Lb[:63]=False; Rb=R.copy(); Rb[:63]=False
print('body below cut', best_shift(Lb,Rb,15))
Lh=L.copy(); Lh[63:]=False; Rh=R.copy(); Rh[63:]=False
Lh[:, :95]=False; Rh[:, :95]=False
print('head', best_shift(Lh,Rh,12))
ys,xs=np.nonzero(L); print('L centroid', xs.mean()+209, ys.mean()+689)
ys,xs=np.nonzero(R); print('R centroid', xs.mean()+379, ys.mean()+689)
