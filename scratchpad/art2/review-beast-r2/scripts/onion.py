import sys
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
O=S+'/art2/review-beast-r2/'
im=np.asarray(Image.open(S+'/art2/staging/vfx_beasts/earth.png').convert('RGBA')).astype(int)
Z=int(sys.argv[1]); pairs=[tuple(map(int,p.split('-'))) for p in sys.argv[3:]]
out=sys.argv[2]
tiles=[]
for a,b in pairs:
    A=im[:,a*280:(a+1)*280]; B=im[:,b*280:(b+1)*280]
    la=A[:,:,:3].mean(2); lb=B[:,:,:3].mean(2)
    v=np.zeros((163,280,3)); v[:]=(20,20,26)
    ma=A[:,:,3]>0; mb=B[:,:,3]>0
    v[ma,0]=60+la[ma]*1.2   # red = first frame
    v[mb,1]=60+lb[mb]*1.0; v[mb,2]=60+lb[mb]*1.2  # cyan = second
    tiles.append(Image.fromarray(np.clip(v,0,255).astype(np.uint8)).resize((280*Z,163*Z),Image.NEAREST))
img=Image.new('RGB',(280*Z,(163*Z+6)*len(tiles)),(255,255,255))
for k,t in enumerate(tiles): img.paste(t,(0,k*(163*Z+6)))
img.save(O+out)
