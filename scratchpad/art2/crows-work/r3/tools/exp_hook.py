import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools')
from harness import load
import numpy as np
from PIL import Image
ns=load(marker="frames = {'fly': fly()")
M='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/'
eye=ns['eye']; BY=ns['BY']; at=ns['at']; wings=ns['wings']
# f5 L2 placement
n='R2'; dest=eye('L2'); pos=eye(n)+(dest-eye(n))*0.5
p=at('L2',pos,wings=wings('L2',5))
m=p[1]; ys,xs=np.nonzero(m); print('L2 piece bbox',xs.min(),xs.max(),ys.min(),ys.max())
ex,ey=np.round(pos).astype(int)
# which feathers overlap a box under the beak
box=np.zeros_like(m); box[ey:ey+14, ex+2:ex+12]=True
for key,dx,dy,deg in (('R',-9,1,0),('L',4,-1,-16)):
    for it in ns['feathers'](key,deg,dx,dy):
        if (it[1]&box).any(): print('feather',it[5],'touches the beak box', int((it[1]&box).sum()))
sm=ns['smoke'](tail=ns['SMOKE5'],dx=-8,dy=1)[1]
print('smoke under beak',int(((sm[...,3]>0)&box).sum()))
print('L2 piece px in box', int((m&box).sum()))
crop=p[2][ey-20:ey+16, ex-30:ex+16]
Image.fromarray(crop).resize((crop.shape[1]*8,crop.shape[0]*8),Image.NEAREST).save(M+'z-L2-f5piece.png')
