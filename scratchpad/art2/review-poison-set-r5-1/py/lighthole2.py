import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
fs=frames('blast','blast')
LC=np.array([108,233,87])
def lightmask(f): return (np.abs(f[...,:3].astype(int)-LC).sum(2)==0)&(f[...,3]>0)
k4=fs[4]; notlight4=(k4[...,3]>0)&~lightmask(k4)
ts=[]
for i in [2,3,5,6,7,8,9]:
    f=fs[i]; a=f[...,3].astype(int); lm=lightmask(f); la=np.where(lm,a,0)
    vis=np.zeros(f.shape[:2]+(3,),np.uint8)
    vis[...,1]=np.clip(la*4,0,255); vis[(a>0)&~lm]=(60,60,160)
    # unlit: alpha 0 and light within 2px >= 16
    pad=np.pad(la,2); nb=np.zeros_like(la)
    for dy in range(5):
        for dx in range(5): nb=np.maximum(nb,pad[dy:dy+la.shape[0],dx:dx+la.shape[1]])
    hole=(a==0)&(nb>=16)&(np.arange(a.shape[1])[None,:]>=140)
    vis[hole]=(255,0,0)
    print(i,'transparent px next to light>=16 (x>=140):',int(hole.sum()))
    t=Image.fromarray(up(vis[50:150,130:220],4)); ImageDraw.Draw(t).text((3,2),str(i),fill=(255,255,0)); ts.append(t)
W,H=ts[0].size; o=Image.new('RGB',(len(ts)*(W+4),H),(255,255,255))
for j,t in enumerate(ts): o.paste(t,(j*(W+4),0))
o.save(R+'/blast-light-hole-early.png')
