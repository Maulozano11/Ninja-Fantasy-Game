import numpy as np
from PIL import Image
from collections import deque
im=np.asarray(Image.open('art2/REF-raiju-owner.jpg').convert('RGB')).astype(np.float32)
def comps(mask):
    H,W=mask.shape; lab=-np.ones((H,W),np.int32); out=[]
    ys,xs=np.nonzero(mask)
    for y,x in zip(ys.tolist(),xs.tolist()):
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
def bbox_main(x0,y0,x1,y1, kind):
    c=im[y0:y1,x0:x1]
    ring=np.concatenate([c[4:8,40:-40].reshape(-1,3), c[-8:-4,40:-40].reshape(-1,3)])
    bg=np.median(ring,0); diff=np.abs(c-bg).sum(2)
    r,g,b=c[...,0],c[...,1],c[...,2]
    if kind=='char': m=diff>70
    elif kind=='warm': m=((r-b>45)&(diff>45))|((r>g+18)&(r>b+18)&(diff>40))
    else: m=((r-b>60)&(diff>60))
    m[:8]=False; m[-8:]=False; m[:,:8]=False; m[:,-8:]=False
    cs=sorted(comps(m),key=len,reverse=True)
    pts=cs[0]; ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
    return (x0+min(xs),y0+min(ys),x0+max(xs),y0+max(ys)), len(pts), bg
print('char', bbox_main(40,1040,520,1460,'char'))
print('phoenix', bbox_main(520,1040,1000,1460,'warm'))
print('raiju scale', bbox_main(1100,1040,1900,1460,'yellow'))
for i,(x0,x1) in enumerate([(22,500),(514,993),(1007,1486),(1500,1978)]):
    for j,(y0,y1) in enumerate([(410,679),(692,963)]):
        print('loop', j*4+i, bbox_main(x0,y0,x1,y1,'yellow'))
