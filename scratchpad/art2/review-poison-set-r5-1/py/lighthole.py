import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
fs=frames('blast','blast')
LC=np.array([108,233,87])
def lightmask(f):
    return (np.abs(f[...,:3].astype(int)-LC).sum(2)==0)&(f[...,3]>0)
k4=fs[4]; pool4=(k4[...,3]>=200)&~lightmask(k4)
tiles=[]
for i,f in enumerate(fs):
    lm=lightmask(f); a=f[...,3].astype(int)
    la=np.where(lm,a,0)
    # neighbourhood max light within 3px
    pad=np.pad(la,3); nb=np.zeros_like(la)
    for dy in range(7):
        for dx in range(7): nb=np.maximum(nb,pad[dy:dy+la.shape[0],dx:dx+la.shape[1]])
    hole=(a==0)&pool4&(nb>=8)
    # mean light strength around hole edge
    edge=nb[hole]
    # also: x range right of pillar only (x>150)
    print(i,'unlit px under old pool next to light:',int(hole.sum()),' of which x>=150:',int(hole[:,150:].sum()),' light beside it (max in 3px) median',int(np.median(edge)) if hole.any() else '-')
    if i in (10,11,12,13,14):
        # contrast boosted visual: light alpha*4 grey, opaque pool blue, hole red
        vis=np.zeros(f.shape[:2]+(3,),np.uint8)
        vis[...,1]=np.clip(la*4,0,255)
        vis[(a>0)&~lm]=(60,60,160)
        vis[hole]=(255,0,0)
        t=Image.fromarray(up(vis[40:173,120:266],3)); ImageDraw.Draw(t).text((3,2),str(i),fill=(255,255,0)); tiles.append(t)
W,H=tiles[0].size
o=Image.new('RGB',(len(tiles)*(W+4),H),(255,255,255))
for j,t in enumerate(tiles): o.paste(t,(j*(W+4),0))
o.save(R+'/blast-light-hole.png')
