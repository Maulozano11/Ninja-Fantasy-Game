import sys
from PIL import Image
import numpy as np
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
R=D+'review-genjutsu-beast-r3/'
ref=Image.open(D+'REF-genjutsu-set-owner.jpg').convert('RGB')
s=96/124.0
BG=np.array([31,31,41],float)
def his(box):
    c=ref.crop(box)
    w=round(c.width*s); h=round(c.height*s)
    return c.resize((w,h),Image.BOX)
def ours(n):
    return Image.open(R+'fly%d.png'%n).convert('RGBA')
def comp(o,bg=(31,31,41)):
    b=Image.new('RGBA',o.size,bg+(255,)); b.alpha_composite(o); return b.convert('RGB')
res={}
for name,box,fn in [('L',(262,798,522,1009),0),('R',(522,798,785,1009),4)]:
    h=np.array(his(box)).astype(float)
    o=comp(ours(fn)); oa=np.array(o).astype(float)
    # mask his foreground
    hm=(np.abs(h-BG).sum(2)>18)
    best=None
    for dy in range(-40,60):
        for dx in range(-40,60):
            # place his at (dx,dy) in our frame
            H,W=h.shape[:2]
            y0=max(0,dy); x0=max(0,dx); y1=min(167,dy+H); x1=min(212,dx+W)
            if y1<=y0 or x1<=x0: continue
            hs=h[y0-dy:y1-dy, x0-dx:x1-dx]; os_=oa[y0:y1,x0:x1]
            m=hm[y0-dy:y1-dy, x0-dx:x1-dx]
            if m.sum()<1000: continue
            e=np.abs(hs-os_)[m].mean()
            if best is None or e<best[0]: best=(e,dx,dy)
    print(name,'best offset',best, 'his size',h.shape)
    res[name]=best
np.save(R+'scripts/offsets.npy',np.array([res['L'][1:],res['R'][1:]]))
