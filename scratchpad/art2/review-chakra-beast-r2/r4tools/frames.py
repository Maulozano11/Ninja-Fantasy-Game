from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
frames=[sheet[:, i*FW:(i+1)*FW] for i in range(8)]
def over(f,bgc):
    a=f[...,3:4]/255.
    return f[...,:3]*a+np.array(bgc,float)*(1-a)
def big(a,k): return Image.fromarray(np.uint8(np.clip(a,0,255))).resize((a.shape[1]*k,a.shape[0]*k),Image.NEAREST)
k=4
for tag,bgc in [('dark',(32,31,39)),('grass',(74,118,58))]:
    for half,idx in [('0-3',[0,1,2,3]),('4-7',[4,5,6,7])]:
        c=Image.new('RGB',(2*FW*k+10,2*FH*k+10),(120,120,120))
        for j,i in enumerate(idx):
            c.paste(big(over(frames[i],bgc),k),((j%2)*(FW*k+10),(j//2)*(FH*k+10)))
        c.save(R+'r4-frames%s-%s-x4.png'%(half,tag))
