import sys, numpy as np
from PIL import Image
sys.path.insert(0,sys.argv[1]+'/v5scripts'); from lab import label
R=sys.argv[1]
def flood_outside(A):
    H,W=A.shape; out=np.zeros((H,W),bool); st=[]
    for x in range(W):
        for y in (0,H-1):
            if not A[y,x]: st.append((y,x)); out[y,x]=True
    for y in range(H):
        for x in (0,W-1):
            if not A[y,x] and not out[y,x]: st.append((y,x)); out[y,x]=True
    while st:
        y,x=st.pop()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and not A[yy,xx] and not out[yy,xx]:
                out[yy,xx]=True; st.append((yy,xx))
    return out
def dist_to(mask):
    # chebyshev distance via iterative dilation up to 4
    H,W=mask.shape; d=np.full((H,W),99); cur=mask.copy(); d[cur]=0
    for k in range(1,6):
        p=np.pad(cur,1); n=np.zeros_like(cur)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                n|=p[1+dy:1+dy+H,1+dx:1+dx+W]
        d[n&~cur]=k; cur=n
    return d
for kind in ['fly','summon']:
    for i in range(6):
        a=np.asarray(Image.open(f'{R}/v5-{kind}{i}.png'))
        A=a[:,:,3]>0
        out=flood_outside(A)
        holes=(~A)&(~out)
        semi=(a[:,:,3]>0)&(a[:,:,3]<255)
        d=dist_to(out)
        deep=semi&(d>2)
        # specks: opaque components <=3 px
        lab,n=label(A)
        sizes=np.bincount(lab.ravel())[1:]
        small=(sizes<=3).sum(); small10=(sizes<=10).sum()
        print(kind,i,'enclosed holes px',holes.sum(),'semi px',semi.sum(),'semi >2px inside',deep.sum(),'components',n,'<=3px',small,'<=10px',small10)
