from PIL import Image, ImageDraw
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(int)
FW=176
x0,y0,x1,y1=0,20,70,100; s=6
cols=[(255,255,255),(255,80,80),(255,170,0),(255,255,0),(0,255,0),(0,200,255),(80,80,255),(255,0,255)]
def body(i):
    f=sheet[:,i*FW:(i+1)*FW]; r,g,b,a=[f[:,:,k] for k in range(4)]
    purple=(b>g+15)&(r>g+5)
    return (a>200)&~purple
out=Image.new('RGB',((x1-x0)*s,(y1-y0)*s),(20,20,28)); d=ImageDraw.Draw(out)
info=[]
for seq,name in [((0,1,2,3,4,5),'out'),((5,6,7,0),'back')]:
    img=Image.new('RGB',((x1-x0)*s,(y1-y0)*s),(20,20,28)); d=ImageDraw.Draw(img)
    for i in seq:
        m=body(i)[y0:y1,x0:x1]
        e=m&~(np.roll(m,1,0)&np.roll(m,-1,0)&np.roll(m,1,1)&np.roll(m,-1,1))
        ys,xs=np.where(e)
        for y,x in zip(ys,xs): d.rectangle([x*s+1,y*s+1,x*s+s-2,y*s+s-2],fill=cols[i])
    img.save(R+f'review-poison-beast-r2/v3-tail-onion-{name}-x6.png')
for i in range(8):
    m=body(i)
    ys,xs=np.where(m[:, :60])
    k=np.argmin(xs); print(i,'leftmost body px',xs[k],ys[k],' topmost in x<30:', (lambda yy,xx: (xx[np.argmin(yy)],yy.min()) )(*np.where(m[:,:30])) )
