from PIL import Image
import numpy as np
from collections import deque
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
FW,FH=176,105
for i in range(8):
    f=sheet[:,i*FW:(i+1)*FW]; a=f[:,:,3]
    r,g,b=f[:,:,0],f[:,:,1],f[:,:,2]
    purple=(b>g+15)&(r>g+5)
    body=(a>0)&~purple
    for name,solid in [('any',a>0),('body',body)]:
        empty=~solid
        seen=np.zeros_like(empty)
        q=deque()
        for y in range(FH):
            for x in (0,FW-1):
                if empty[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
        for x in range(FW):
            for y in (0,FH-1):
                if empty[y,x] and not seen[y,x]: seen[y,x]=1; q.append((y,x))
        while q:
            y,x=q.popleft()
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<FH and 0<=xx<FW and empty[yy,xx] and not seen[yy,xx]:
                    seen[yy,xx]=1; q.append((yy,xx))
        enclosed=empty&~seen
        ys,xs=np.where(enclosed)
        print(i,name,'enclosed empty px',len(xs), list(zip(xs.tolist(),ys.tolist()))[:12])
    # semi-transparent body pixels (non purple alpha<255)
    print('   body semi-alpha px', int(((a>0)&(a<255)&~purple).sum()))
