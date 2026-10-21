from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
sheet=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
fr=[sheet[:,i*FW:(i+1)*FW] for i in range(8)]
bg=np.array([32,31,39.])
def over(f): a=f[...,3:4]/255.; return f[...,:3]*a+bg*(1-a)
k=4
pairs=[(7,0),(0,1),(1,2),(5,6),(6,7)]
c=Image.new('RGB',(3*(FW*k+6),len(pairs)*(FH*k+6)),(255,0,255))
for r,(i,j) in enumerate(pairs):
    A=over(fr[i]);B=over(fr[j]); d=np.abs(A-B).sum(2)
    D=np.zeros_like(A); D[...,0]=np.clip(d,0,255); D[...,1]=np.clip(d,0,255)*0.3
    print(i,j,'px changed >30:',int((d>30).sum()),' >30 in body box x60-127:',int((d[:,60:]>30).sum()))
    for q,img in enumerate([A,B,D]):
        c.paste(Image.fromarray(np.uint8(np.clip(img,0,255))).resize((FW*k,FH*k),Image.NEAREST),(q*(FW*k+6),r*(FH*k+6)))
c.save(R+'r4-diffs-x4.png')
