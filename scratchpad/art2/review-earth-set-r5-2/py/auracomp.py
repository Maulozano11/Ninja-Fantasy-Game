import sys; sys.path.insert(0,'.')
from load import *
from grid import bgimg
from PIL import Image, ImageDraw
ch=np.array(Image.open(S+'/earth-v3-work/character.png').convert('RGBA')).astype(float)
back=frames('aura_back','idle'); front=frames('aura','idle')
ax,ay=man()['sprites']['aura']['anchor']
def over(dst,src,ox,oy):
    h,w=src.shape[:2]
    a=src[:,:,3:4]/255
    reg=dst[oy:oy+h,ox:ox+w]
    reg[:,:,:3]=src[:,:,:3]*a+reg[:,:,:3]*(1-a)
def comp(i,bg):
    H,W=back[i].shape[:2]
    base=np.zeros((H,W,4)); base[:,:,:3]=bgimg(H,W,bg); base[:,:,3]=255
    over(base,back[i].astype(float),0,0)
    # character feet at (64,120) in its 128 canvas -> anchor
    cx,cy=ax-64,ay-120
    c=ch.copy()
    # crop to fit
    y0=max(0,-cy); x0=max(0,-cx)
    sub=c[y0:,x0:]
    sub=sub[:H-max(cy,0),:W-max(cx,0)]
    over(base,sub,max(cx,0),max(cy,0))
    over(base,front[i].astype(float),0,0)
    return base[:,:,:3].clip(0,255).astype(np.uint8)
k=int(sys.argv[2]) if len(sys.argv)>2 else 3
bg=sys.argv[1]
sel=list(range(12))
H,W=back[0].shape[:2]
o=Image.new('RGB',(6*(W*k+4),2*(H*k+18)),(0,0,0)); d=ImageDraw.Draw(o)
for n,i in enumerate(sel):
    x=(n%6)*(W*k+4); y=(n//6)*(H*k+18)
    o.paste(Image.fromarray(comp(i,bg)).resize((W*k,H*k),Image.NEAREST),(x,y+16)); d.text((x+2,y+2),str(i),fill=(255,255,0))
o.save(R+f'/g-aura-comp-{bg}.png')
