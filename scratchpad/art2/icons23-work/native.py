import sys
import numpy as np
from PIL import Image
P=2000/480; PY=1116/268
def native(path, px, py):
    a=np.asarray(Image.open(path).convert('RGB')).astype(float)
    H,W,_=a.shape
    nw,nh=480,268
    out=np.zeros((nh,nw,3)); sd=np.zeros((nh,nw))
    for j in range(nh):
        y0=int(np.floor(py+j*PY)); y1=int(np.floor(py+(j+1)*PY))
        for i in range(nw):
            x0=int(np.floor(px+i*P)); x1=int(np.floor(px+(i+1)*P))
            c=a[max(0,y0+1):min(H,y1-1), max(0,x0+1):min(W,x1-1)]
            if c.size==0: c=a[max(0,y0):min(H,y1), max(0,x0):min(W,x1)]
            c=c.reshape(-1,3)
            out[j,i]=np.median(c,axis=0) if len(c)>=3 else c.mean(0)
            sd[j,i]=c.std(0).mean()
    return out,sd
for f,px,py in [('2',0.5,0.4),('3',0.5,0.4)]:
    n,sd=native('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-%s.jpg'%f,px,py)
    Image.fromarray(np.clip(n+0.5,0,255).astype(np.uint8)).save('native-%s.png'%f)
    print(f,'within-cell sd mean',sd.mean())
    # reconstruct and compare
