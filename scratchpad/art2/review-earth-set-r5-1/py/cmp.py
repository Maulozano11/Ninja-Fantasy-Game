import sys; sys.path.insert(0,'.')
from load import *
from PIL import Image
import numpy as np
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
PANEL_BG=np.array([34,34,46])
# my own panel boxes (border lines measured from his sheet), interior
P={'bolt':(25,101,267,336),'stream':(650,101,1287,325),'breath':(1317,101,1634,362),'sphere':(1665,101,1922,348),
 'slash':(25,435,266,679),'multi':(298,435,575,679),'multi_hit':(578,435,806,679),'hit':(811,435,1120,679),
 'blast':(1160,435,1786,797),'wall':(25,868,899,1253),'aura':(930,868,1192,1214),'aura_back':(930,868,1192,1214),
 'wall_diag':(1222,868,1974,1490),'wall_depth':(25,1361,450,1973),'stream_head':(650,101,1287,325)}
KEY={'hit':('hit',3),'multi_hit':('hit',3),'blast':('blast',4),'wall':('rise',11),'wall_diag':('rise',11),'wall_depth':('rise',11),'aura':('idle',0),'aura_back':('idle',0)}
def comp(f,bg):
    a=f[:,:,3:4]/255.0
    return f[:,:,:3]*a+np.array(bg)[None,None,:]*(1-a)
def his_small(name,s):
    x0,y0,x1,y1=P[name]
    c=ref.crop((x0,y0,x1,y1))
    w=round((x1-x0)/s); h=round((y1-y0)/s)
    return np.array(c.resize((w,h),Image.BOX)).astype(float)
def best(name, scales):
    an,ki=KEY.get(name,('fly',0))
    f=frames(name,an)[ki].astype(float)
    if name=='aura':
        b=frames('aura_back','idle')[0].astype(float)
        # composite back then front
        a1=b[:,:,3:4]/255; a2=f[:,:,3:4]/255
        rgb=f[:,:,:3]*a2+b[:,:,:3]*a1*(1-a2); al=a2+a1*(1-a2)
        f=np.concatenate([rgb/np.maximum(al,1e-6),al*255],2)
    on=comp(f,PANEL_BG)
    mask=f[:,:,3]>128
    H,W=mask.shape
    res=None
    for s in scales:
        hs=his_small(name,s); hh,hw=hs.shape[:2]
        # place our frame at (ox,oy) in his small crop: compare on overlap
        for oy in range(-H+20,hh-20):
            for ox in range(-W+20,hw-20):
                pass
        # use coarse search via FFT-free brute but restricted: compute on mask pixels only
        ys,xs=np.nonzero(mask)
        ourc=on[ys,xs]
        bestl=None
        for oy in range(-H//2,hh-H//2):
            yy=ys+oy
            okY=(yy>=0)&(yy<hh)
            if okY.mean()<0.6: continue
            for ox in range(-W//2,hw-W//2):
                xx=xs+ox
                ok=okY&(xx>=0)&(xx<hw)
                if ok.mean()<0.6: continue
                d=np.abs(hs[yy[ok],xx[ok]]-ourc[ok]).mean()
                if bestl is None or d<bestl[0]: bestl=(d,ox,oy,ok.mean())
        if bestl and (res is None or bestl[0]<res[0]): res=(bestl[0],s,bestl[1],bestl[2],bestl[3])
    return res
if __name__=='__main__':
    import json
    out={}
    names=sys.argv[1:] or list(P)
    for n in names:
        r=best(n,[2.26,2.30,2.33,2.35,2.37,2.39,2.41] if n!='stream' and n!='stream_head' else [158/64])
        print(n,r,flush=True); out[n]=r
    json.dump(out,open(R+'/align.json','w'))
