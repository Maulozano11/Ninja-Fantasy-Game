import numpy as np, sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
im=np.asarray(Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB')).astype(float)
c=im[867:1216,929:1193]
R,G,B=c[...,0],c[...,1],c[...,2]
L=0.3*R+0.59*G+0.11*B
mx=c.max(-1); mn=c.min(-1)
sat=(mx-mn)/np.maximum(mx,1)
chroma=mx-mn
out=[]
for name,m in [('sat>.55&L>70',(sat>0.55)&(L>70)),('chroma>90',(chroma>90)),('R-B>100',(R-B>100)),('sat>.5',(sat>0.5)&(L>60))]:
    img=np.where(m[...,None],c,c*0.25)
    out.append(img)
big=np.concatenate([c]+out,1)
Image.fromarray(big.astype(np.uint8)).resize((big.shape[1]*2,big.shape[0]*2),Image.NEAREST).save('aura-masks.png')
