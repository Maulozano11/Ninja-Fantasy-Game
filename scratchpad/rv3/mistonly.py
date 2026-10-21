from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
FW,FH=176,105; s=3
fr=[0,1,2,3,4,5,6,7]
out=Image.new('RGB',(4*(FW*s+6),2*(FH*s+6)),(255,255,255))
for k,i in enumerate(fr):
    f=sheet[:,i*FW:(i+1)*FW].copy()
    r,g,b,a=[f[:,:,c] for c in range(4)]
    purple=(a>0)&(b>g+15)&(r>g+5)
    img=np.zeros((FH,FW,3),int)+[20,20,28]
    body=(a>0)&~purple
    img[body]=[60,70,60]
    al=(a/255.0)[...,None]
    img=np.where(purple[...,None], (img*(1-al)+f[:,:,:3]*al*1.6).clip(0,255), img).astype(np.uint8)
    im=Image.fromarray(img).resize((FW*s,FH*s),Image.NEAREST)
    out.paste(im,((k%4)*(FW*s+6),(k//4)*(FH*s+6)))
out.save(R+'review-poison-beast-r2/v3-mist-only-x3.png')
