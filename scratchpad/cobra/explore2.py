import sys
from collections import deque
from PIL import Image
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
X0,Y0,X1,Y1=209,689,550,797
c=ref[Y0:Y1,X0:X1]
H,W=c.shape[:2]
BG=np.array([31,32,45],np.float32)
r,g,b=c[...,0],c[...,1],c[...,2]
diff=np.abs(c-BG).sum(2)
lum=c.sum(2)
purple=(r-g>10)&(b-g>10)&(diff>20)
dark=(lum<BG.sum()-22)
cand=((diff>40)&~purple)|dark
def components(mask):
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
comps=sorted(components(cand),key=len,reverse=True)
print([len(p) for p in comps[:12]])
for p in comps[:12]:
    p=np.array(p); print(len(p), 'x',p[:,1].min()+X0,p[:,1].max()+X0,'y',p[:,0].min()+Y0,p[:,0].max()+Y0)
vis=np.zeros((H,W,3),np.uint8)
cols=[(255,255,255),(255,0,0),(0,255,0),(0,128,255),(255,255,0),(0,255,255),(255,128,0),(128,255,128)]
for i,p in enumerate(comps[:40]):
    p=np.array(p); vis[p[:,0],p[:,1]]=cols[i%len(cols)] if i<8 else (90,90,90)
vis[purple]=(160,0,160)
Image.fromarray(vis).resize((W*4,H*4),Image.NEAREST).save('work/comps.png')
