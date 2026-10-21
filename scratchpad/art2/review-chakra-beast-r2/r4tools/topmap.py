from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
d=np.load(S+'/art2/griffin-ref/griffin-frames.npz')
t=d['top']
pal={-1:(20,20,20),0:(120,120,120),1:(60,90,220),2:(80,220,240),3:(250,80,80),4:(250,200,60)}
k=3
H,W=t.shape[1:]
c=Image.new('RGB',(4*(W*k+6),2*(H*k+6)),(255,0,255))
for i in range(8):
    a=np.zeros((H,W,3),np.uint8)
    for v,col in pal.items(): a[t[i]==v]=col
    c.paste(Image.fromarray(a).resize((W*k,H*k),Image.NEAREST),((i%4)*(W*k+6),(i//4)*(H*k+6)))
c.save(R+'r4-piece-top-map-x3.png')
