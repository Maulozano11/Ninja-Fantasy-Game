import sys; sys.path.insert(0, sys.argv[1])
from lib import *
from PIL import ImageDraw
name,an,k,cols,bgname=sys.argv[2],sys.argv[3],int(sys.argv[4]),int(sys.argv[5]),sys.argv[6]
sel=sys.argv[7] if len(sys.argv)>7 else None
crop=[int(v) for v in sys.argv[8].split(',')] if len(sys.argv)>8 else None
fs=frames(name,an)
idx=list(range(len(fs))) if not sel or sel=='all' else [int(v) for v in sel.split(',')]
tiles=[]
for i in idx:
    f=fs[i]
    if crop: f=f[crop[1]:crop[3],crop[0]:crop[2]]
    h,w=f.shape[:2]
    if bgname=='panel': c=comp(f,(31,33,46))
    elif bgname=='grass': c=(f[...,:3]*(f[...,3:4]/255)+grass(h,w)*(1-f[...,3:4]/255)).astype(np.uint8)
    elif bgname=='alpha': c=np.stack([f[...,3]]*3,-1)
    elif bgname=='magenta': c=comp(f,(255,0,255))
    t=Image.fromarray(up(c,k)); d=ImageDraw.Draw(t); d.text((3,2),str(i),fill=(255,255,0)); tiles.append(t)
W,H=tiles[0].size; rows=(len(tiles)+cols-1)//cols
o=Image.new('RGB',(cols*(W+4),rows*(H+4)),(255,255,255))
for j,t in enumerate(tiles): o.paste(t,((j%cols)*(W+4),(j//cols)*(H+4)))
o.save(sys.argv[9] if len(sys.argv)>9 else R+'/grid-%s-%s-%s.png'%(name,an,bgname))
print(o.size)
