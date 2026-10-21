import sys
from PIL import Image
import numpy as np

def _label(m):
    H,W=m.shape; lab=np.zeros((H,W),int); n=0
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                n+=1; st=[(y,x)]; lab[y,x]=n
                while st:
                    cy,cx=st.pop()
                    for dy in (-1,0,1):
                        for dx in (-1,0,1):
                            yy,xx=cy+dy,cx+dx
                            if 0<=yy<H and 0<=xx<W and m[yy,xx] and not lab[yy,xx]:
                                lab[yy,xx]=n; st.append((yy,xx))
    return lab,n
class ndi: label=staticmethod(_label)
S=sys.argv[1]; R=sys.argv[2]
W,H=276,160; k=96/228; AX,AY=149,77
ref=Image.open(f'{S}/art2/REF-earth-set-owner.jpg').convert('RGB')
r=np.asarray(ref).astype(float)
bg=np.array([34,34,44.])
d=np.abs(r-bg).sum(2)
cov=Image.fromarray(((d>40)*255).astype(np.uint8))
cx,cy=1448,1755
x0=cx-AX/k; y0=cy-AY/k
hc=np.asarray(cov.resize((W,H),Image.BOX,box=(x0,y0,x0+W/k,y0+H/k))).astype(float)/255
im=np.asarray(Image.open(f'{S}/art2/staging/vfx_beasts/earth.png').convert('RGBA'))
oa=im[:,5*W:6*W,3]>0
hs=hc>=0.5
def comps(m):
    lab,n=ndi.label(m)
    out=[]
    for i in range(1,n+1):
        ys,xs=np.where(lab==i)
        if len(xs)>60: continue
        out.append((int(xs.mean()),int(ys.mean()),len(xs)))
    return out
ho=comps(hs); oo=comps(oa)
print('his small comps',len(ho),'total px',sum(c[2] for c in ho))
print('ours small comps',len(oo),'total px',sum(c[2] for c in oo))
# match
pairs=[]
for (x,y,a) in oo:
    best=min(ho,key=lambda c:(c[0]-x)**2+(c[1]-y)**2)
    dist=((best[0]-x)**2+(best[1]-y)**2)**.5
    pairs.append((x,y,a,best[2],round(dist,1)))
pairs.sort()
for p in pairs: print(p)
