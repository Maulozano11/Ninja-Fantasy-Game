import sys
from collections import deque
from PIL import Image, ImageDraw
import numpy as np
ref=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
BG=np.array([31,33,46],np.float32)
X0,Y0,X1,Y1=209,689,550,797
c=ref[Y0:Y1,X0:X1]; H,W=c.shape[:2]
r,g,b=c[...,0],c[...,1],c[...,2]
diff=np.abs(c-BG).sum(2); lum=c.sum(2)
purple=(r-g>10)&(b-g>10)&(diff>20)
cand=((diff>40)&~purple)|(lum<BG.sum()-22)
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
m=np.zeros((H,W),bool)
for p in comps:
    p=np.array(p)
    if len(p)>1000 or (len(p)>=30 and p[:,1].max()+X0<240):
        m[p[:,0],p[:,1]]=True
# close: dilate 1 erode 1
def dil(a,n=1):
    for _ in range(n):
        g=a.copy(); g[1:]|=a[:-1]; g[:-1]|=a[1:]; g[:,1:]|=a[:,:-1]; g[:,:-1]|=a[:,1:]; a=g
    return a
m=~dil(~dil(m,1),1)
for p in components(~m):
    p=np.array(p)
    if p[:,0].min()==0 or p[:,1].min()==0 or p[:,0].max()==H-1 or p[:,1].max()==W-1: continue
    if len(p)<60: m[p[:,0],p[:,1]]=True
# distance transform (to nearest non-body pixel)
ys,xs=np.nonzero(m)
edge=m&~(np.roll(m,1,0)&np.roll(m,-1,0)&np.roll(m,1,1)&np.roll(m,-1,1))
ey,ex=np.nonzero(~m & dil(m,1))
D=np.zeros((H,W),np.float32)
for i in range(0,len(ys),2000):
    yy=ys[i:i+2000,None]; xx=xs[i:i+2000,None]
    d=np.sqrt((yy-ey[None])**2+(xx-ex[None])**2).min(1)
    D[ys[i:i+2000],xs[i:i+2000]]=d
np.save('work/D.npy',D); np.save('work/m.npy',m)
# ridge: local max in 3x3 neighbourhood along at least one axis pair
rid=np.zeros((H,W),bool)
for dy,dx in ((0,1),(1,0),(1,1),(1,-1)):
    a=np.roll(np.roll(D,dy,0),dx,1); b_=np.roll(np.roll(D,-dy,0),-dx,1)
    rid|=(D>=a)&(D>=b_)&(D>2.5)
k=6
vis=np.zeros((H,W,3),np.uint8)
vis[m]=(np.clip(D[m]*25,0,255)[:,None]*np.array([0.3,1,0.3])).astype(np.uint8)
vis[rid&m]=(255,60,60)
img=Image.fromarray(vis).resize((W*k,H*k),Image.NEAREST)
d=ImageDraw.Draw(img)
for x in range(X0-X0%5+5,X1,5):
    X=(x-X0)*k; d.line([(X,0),(X,img.height)],fill=(200,200,200) if x%10==0 else (60,60,60))
    if x%10==0: d.text((X+2,2),str(x),fill=(255,255,0))
for y in range(Y0-Y0%5+5,Y1,5):
    Y=(y-Y0)*k; d.line([(0,Y),(img.width,Y)],fill=(200,200,200) if y%10==0 else (60,60,60))
    if y%10==0: d.text((2,Y+2),str(y),fill=(255,255,0))
img.crop((0,0,172*k,img.height)).save('work/dtL.png')
img.crop((170*k,0,img.width,img.height)).save('work/dtR.png')
