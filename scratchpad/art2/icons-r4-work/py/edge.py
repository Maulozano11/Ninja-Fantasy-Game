# edge.py id: mean |grad L| (OKLab L, forward differences) at 88 for ours (stage), r3 staging, and his box reduction
import sys
import numpy as np
from PIL import Image
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
jid=sys.argv[1]
def L(im):
    a=np.asarray(im.convert('RGB')).astype(float)/255
    a=np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4)
    l=np.cbrt(0.4122214708*a[...,0]+0.5363325363*a[...,1]+0.0514459929*a[...,2]); m=np.cbrt(0.2119034982*a[...,0]+0.6806995451*a[...,1]+0.1073969566*a[...,2]); s=np.cbrt(0.0883024619*a[...,0]+0.2817188376*a[...,1]+0.6299787005*a[...,2])
    return 0.2104542553*l+0.793617785*m-0.0040720468*s
def e(v): return (np.abs(np.diff(v,axis=0)).mean()+np.abs(np.diff(v,axis=1)).mean())
his=Image.open(f'{W}/icons-r4-work/stage/ref/{jid}.png'); w,h=his.size
hb=his.crop((1,1,w-1,h-1)).resize((88,88),Image.BOX)
print(jid,'ours %.3f  r3 %.3f  his box %.3f'%(e(L(Image.open(f'{W}/icons-r4-work/stage/{jid}@2x.png'))),e(L(Image.open(f'{W}/staging/ui_icons/{jid}@2x.png'))),e(L(hb))))
