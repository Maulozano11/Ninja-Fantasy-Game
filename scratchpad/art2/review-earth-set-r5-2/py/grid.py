import sys; sys.path.insert(0,'.')
from load import *
from PIL import Image, ImageDraw
import numpy as np
BGS={'dark':(34,34,46),'light':(225,220,205),'grass':(86,120,60),'magenta':(255,0,255)}
def bgimg(h,w,bg):
    if bg=='grassn':
        rng=np.random.default_rng(1); b=np.zeros((h,w,3)); b[:]= (86,120,60); b+=rng.integers(-14,14,(h,w,1)); return b
    return np.zeros((h,w,3))+np.array(BGS[bg])
def compf(f,bg):
    a=f[:,:,3:4]/255.0
    return (f[:,:,:3]*a+bgimg(f.shape[0],f.shape[1],bg)*(1-a)).clip(0,255).astype(np.uint8)
def grid(frs,bg,k,cols,crop=None,labels=None,out=None):
    if crop: x0,y0,x1,y1=crop; frs=[f[y0:y1,x0:x1] for f in frs]
    h,w=frs[0].shape[:2]; rows=(len(frs)+cols-1)//cols
    pad=14
    o=Image.new('RGB',(cols*(w*k+4),rows*(h*k+pad+4)),(0,0,0)); d=ImageDraw.Draw(o)
    for i,f in enumerate(frs):
        c=Image.fromarray(compf(f.astype(float),bg)).resize((w*k,h*k),Image.NEAREST)
        x=(i%cols)*(w*k+4); y=(i//cols)*(h*k+pad+4)
        o.paste(c,(x,y+pad)); d.text((x+2,y+1),str(labels[i] if labels else i),fill=(255,255,0))
    if out: o.save(out)
    return o
if __name__=='__main__':
    name,anim,bg,k,cols=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4]),int(sys.argv[5])
    crop=tuple(map(int,sys.argv[6].split(','))) if len(sys.argv)>6 and sys.argv[6]!='-' else None
    sel=list(map(int,sys.argv[7].split(','))) if len(sys.argv)>7 and sys.argv[7]!='-' else None
    frs=frames(name,anim)
    lab=list(range(len(frs)))
    if sel: frs=[frs[i] for i in sel]; lab=sel
    tag=sys.argv[8] if len(sys.argv)>8 else ''
    grid(frs,bg,k,cols,crop,lab,out=f"{R}/g-{name}-{anim}-{bg}{tag}.png")
