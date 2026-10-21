import sys
from PIL import Image
import numpy as np
A2=sys.argv[1]; R=sys.argv[2]
ref=Image.open(A2+'/REF-chakra-set-owner.jpg').convert('RGB')
s=0.9846
panel=ref.crop((112,38,248,138))
pw,ph=panel.size
his=panel.resize((round(pw*s),round(ph*s)),Image.BOX)
hisA=np.asarray(his).astype(float)
sh=Image.open(A2+'/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')
W,H=130,94
f0=np.asarray(sh.crop((0,0,W,H))).astype(float)
bg=np.array([32,31,39.])
ours=f0[...,:3]*f0[...,3:]/255+bg*(1-f0[...,3:]/255)
best=None
for dx in range(-15,15):
  for dy in range(-15,15):
    # his pixel at (x+dx, y+dy) corresponds our (x,y)
    ys0=max(0,-dy); xs0=max(0,-dx)
    ys1=min(H,hisA.shape[0]-dy); xs1=min(W,hisA.shape[1]-dx)
    o=ours[ys0:ys1,xs0:xs1]; h=hisA[ys0+dy:ys1+dy,xs0+dx:xs1+dx]
    m=f0[ys0:ys1,xs0:xs1,3]>128
    e=np.abs(o-h).sum(2)[m].mean()
    if best is None or e<best[0]: best=(e,dx,dy)
print('best align err',best)
e,dx,dy=best
# his at our frame geometry
canvas=Image.new('RGB',(W,H),tuple(int(v) for v in bg))
canvas.paste(his,(-dx,-dy))
canvas.save(R+'/his-game-aligned.png')
np.save(R+'/align.npy',np.array([dx,dy]))
