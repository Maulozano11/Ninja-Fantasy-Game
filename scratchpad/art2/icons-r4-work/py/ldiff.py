# ldiff.py id [sigma]: blurred lightness of ours minus his box at 44, printed as a grid (+ lighter, - darker), per 2x2 block
import sys
import numpy as np
from PIL import Image, ImageFilter
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r4-work'
jid=sys.argv[1]; s=float(sys.argv[2]) if len(sys.argv)>2 else 1.5
his=Image.open(f'{W}/stage/ref/{jid}.png').convert('RGB'); w,h=his.size
hb=his.crop((1,1,w-1,h-1)).resize((44,44),Image.BOX)
o=Image.open(f'{W}/stage/{jid}.png').convert('RGB')
def L(im):
    a=np.asarray(im).astype(float)/255
    a=np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4)
    l=np.cbrt(0.4122214708*a[...,0]+0.5363325363*a[...,1]+0.0514459929*a[...,2]); m=np.cbrt(0.2119034982*a[...,0]+0.6806995451*a[...,1]+0.1073969566*a[...,2]); sS=np.cbrt(0.0883024619*a[...,0]+0.2817188376*a[...,1]+0.6299787005*a[...,2])
    return 0.2104542553*l+0.793617785*m-0.0040720468*sS
def blur(v):
    im=Image.fromarray((v*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s)); return np.asarray(im)/255
d=blur(L(o))-blur(L(hb))
print('mean ours %.3f his %.3f'%(L(o).mean(),L(hb).mean()))
print('   '+''.join('%-2d'%(x) if x%4==0 else '  ' for x in range(0,44,2)))
for y in range(0,44,2):
    print('%2d '%y+''.join(('+' if v>0.1 else '·' if v>-0.1 else '-')+('+' if v>0.2 else '-' if v<-0.2 else ' ') for v in d[y,::2]))
