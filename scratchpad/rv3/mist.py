from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(float)
FW=176
prev=None
for i in list(range(8))+[0]:
    f=sheet[:,i*FW:(i+1)*FW]
    r,g,b,a=[f[:,:,k] for k in range(4)]
    purple=(a>0)&(b>g+15)&(r>g+5)
    s=(a*purple).sum()/255
    # mist in regions
    def reg(x0,y0,x1,y1): 
        m=purple[y0:y1,x0:x1]; return int((a[y0:y1,x0:x1]*m).sum()/255)
    print(i,'mist px',int(purple.sum()),'mist alpha-sum',int(s),' left(0-60)',reg(0,0,60,105),' hump(55-110,0-45)',reg(55,0,110,45),' neckbase(110-176,60-105)',reg(110,60,176,105), ' top-right(110-176,0-60)', reg(110,0,176,60))
