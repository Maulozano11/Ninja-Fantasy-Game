import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons23-tools')
import numpy as np
from PIL import Image, ImageDraw
from ok import oklab
a=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons_23/ref/venom_surge.png').convert('RGB')).astype(float)
lab=oklab(a); L=lab[...,0]; C=np.hypot(lab[...,1],lab[...,2]); H=(np.degrees(np.arctan2(lab[...,2],lab[...,1]))+360)%360
h,w=L.shape
cands=[]
for r in [1.5,2,2.5,3,3.5,4,4.5,5,5.5]:
    R=int(np.ceil(r+1))
    offs=[(dx,dy,np.hypot(dx,dy)) for dy in range(-R,R+1) for dx in range(-R,R+1)]
    disc=[(dx,dy) for dx,dy,d in offs if d<r-0.4]
    ring=[(dx,dy) for dx,dy,d in offs if r-0.4<=d<r+0.6]
    for y in range(R,h-R):
        for x in range(R,w-R):
            dl=np.array([L[y+dy,x+dx] for dx,dy in disc]); rl=np.array([L[y+dy,x+dx] for dx,dy in ring])
            rh=np.array([H[y+dy,x+dx] for dx,dy in ring]); rc=np.array([C[y+dy,x+dx] for dx,dy in ring])
            if dl.mean()<0.78: continue
            darkring=((rl<0.68)&(rh>130)&(rh<155)&(rc>0.1)).mean()
            sc=(dl.mean()-rl.mean())*darkring
            if darkring>0.45 and dl.min()>0.6: cands.append((sc,x,y,r,darkring))
cands.sort(reverse=True)
keep=[]
for sc,x,y,r,dr in cands:
    if any(np.hypot(x-k[1],y-k[2])<r+k[3]-1 for k in keep): continue
    keep.append((sc,x,y,r,dr))
print(len(keep))
for k in keep: print('%.3f (%d,%d) r%.1f ring%.2f'%k)
im=Image.fromarray(a.astype(np.uint8)).resize((w*8,h*8),Image.NEAREST)
d=ImageDraw.Draw(im)
for sc,x,y,r,dr in keep:
    d.ellipse([(x+0.5-r)*8,(y+0.5-r)*8,(x+0.5+r)*8,(y+0.5+r)*8],outline=(255,0,255))
im.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons23-work/vs-bubbles.png')
