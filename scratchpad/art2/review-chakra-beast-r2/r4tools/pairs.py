from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
hisF=np.load(R+'r4tools/hisF.npy')
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
f0=sheet[:,0:FW]
bg=np.array([32,31,39.])
a=f0[...,3:4]/255.; o=f0[...,:3]*a+bg*(1-a)
def big(a,k): return Image.fromarray(np.uint8(np.clip(a,0,255))).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
regions={'head':(85,10,127,70),'wings':(0,0,80,50),'tail':(0,35,60,93),'legs':(45,45,127,93),'body':(35,25,95,75)}
for n,(x0,y0,x1,y1) in regions.items():
    k=7 if (x1-x0)<=50 else 6
    A=big(hisF[y0:y1,x0:x1],k); B=big(o[y0:y1,x0:x1],k)
    c=Image.new('RGB',(A.width*2+10,A.height),(90,90,90)); c.paste(A,(0,0)); c.paste(B,(A.width+10,0)); c.save(R+'r4-pair-%s.png'%n)
