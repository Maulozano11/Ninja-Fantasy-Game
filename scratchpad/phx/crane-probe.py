import json, numpy as np
from PIL import Image
ref=np.asarray(Image.open('art2/REF-wind-set-owner.jpg').convert('RGB')).astype(np.float32)
m=json.load(open('art2/staging/vfx_beasts/manifest.json'))['sprites']['wind']
sh=np.asarray(Image.open('art2/staging/vfx_beasts/wind.png').convert('RGBA')).astype(np.float32)
fw,fh=m['frameW'],m['frameH']; ax,ay=m['anchor']
print('ours', fw,fh,ax,ay)
S=96/102.0
PANEL=(337,723,703,866)
x0,y0,x1,y1=PANEL
crop=ref[y0:y1,x0:x1]
bg=np.array([32,32,42],np.float32)
diff=np.abs(crop-bg).sum(2)
r,g,b=crop[...,0],crop[...,1],crop[...,2]
crane=(g>r+25)&(diff>70)
print('crane px', crane.sum())
# split halves
mid=(515-x0)
for k,(a0,a1) in enumerate([(0,mid),(mid,crop.shape[1])]):
    mk=crane[:,a0:a1].astype(np.float32)
    H,W=mk.shape
    small=np.asarray(Image.fromarray(mk,'F').resize((round(W*S),round(H*S)),Image.BOX))
    ours=sh[:fh,(0 if k==0 else 3)*fw:(1 if k==0 else 4)*fw,3]>128
    best=(-1,None)
    sh_,sw_=small.shape
    for dy in range(-fh,sh_):
        for dx in range(-fw,sw_):
            ys0,ys1=max(0,dy),min(sh_,dy+fh); xs0,xs1=max(0,dx),min(sw_,dx+fw)
            if ys1<=ys0 or xs1<=xs0: continue
            ov=(small[ys0:ys1,xs0:xs1]*ours[ys0-dy:ys1-dy,xs0-dx:xs1-dx]).sum()
            if ov>best[0]: best=(ov,(dx,dy))
    dx,dy=best[1]
    # our anchor (ax,ay) in our frame -> small coords (dx+ax, dy+ay) -> ref coords
    rax=x0+a0+(dx+ax)/S; ray=y0+(dy+ay)/S
    print('frame',k*3,'offset',best[1],'overlap',best[0],'of',small.sum(),ours.sum(),'anchor ref',(round(rax,1),round(ray,1)))
