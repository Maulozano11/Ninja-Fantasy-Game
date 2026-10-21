# usage: px.py <id> x0 y0 x1 y1  -> his native pixels as hex with OKLab L/C/H for distinct ones
import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons23-tools')
import numpy as np
from PIL import Image
from ok import oklab
a=np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons_23/ref/%s.png'%sys.argv[1]).convert('RGB')).astype(float)
x0,y0,x1,y1=map(int,sys.argv[2:6])
lab=oklab(a)
print('    '+' '.join('%6d'%x for x in range(x0,x1)))
for y in range(y0,y1):
    print('%3d '%y+' '.join('%02x%02x%02x'%tuple(a[y,x].astype(int)) for x in range(x0,x1)))
if len(sys.argv)>6:
    for y in range(y0,y1):
        print('%3d '%y+' '.join('%.2f/%.2f/%3d'%(lab[y,x,0],np.hypot(lab[y,x,1],lab[y,x,2]),(np.degrees(np.arctan2(lab[y,x,2],lab[y,x,1]))+360)%360) for x in range(x0,x1)))
