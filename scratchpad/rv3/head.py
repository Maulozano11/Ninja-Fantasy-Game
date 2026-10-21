from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
FW=176
for i in range(8):
    f=sheet[:,i*FW:(i+1)*FW]; r,g,b,a=[f[:,:,k] for k in range(4)]
    purple=(b>g+15)&(r>g+5)
    body=(a>200)&~purple
    # eye: reddish pixel in head region x>140,y<30 with r>g+20
    eye=(r>g+25)&(r>120)&(a>200); eye[30:,:]=False; eye[:,:140]=False
    ys,xs=np.where(eye)
    hb=body.copy(); hb[:, :120]=False
    yy,xx=np.where(hb[:40])
    print(i,'eye centroid',(round(xs.mean(),1),round(ys.mean(),1)) if len(xs) else None,'n',len(xs),' head top y',yy.min(),' snout max x',xx.max())
