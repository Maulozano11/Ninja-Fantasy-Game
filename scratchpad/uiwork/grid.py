import sys
from PIL import Image, ImageDraw
im=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
# args: his x0 y0 (art origin), art w h, zoom, out, [flip]
x0,y0,w,h,Z=map(float,sys.argv[1:6]); out=sys.argv[6]
w=int(w);h=int(h);Z=int(Z)
k=1600/1024/2  # art px per his px
box=(x0,y0,x0+w/k,y0+h/k)
c=im.resize((round(1024*k*4),round(576*k*4)),Image.LANCZOS)
c=c.crop((round(x0*k*4),round(y0*k*4),round(x0*k*4)+w*4,round(y0*k*4)+h*4)).resize((w,h),Image.BOX)
if len(sys.argv)>7: c=c.transpose(Image.FLIP_LEFT_RIGHT)
big=c.resize((w*Z,h*Z),Image.NEAREST)
d=ImageDraw.Draw(big)
for x in range(w+1):
    d.line([(x*Z,0),(x*Z,h*Z)],fill=(0,0,0) if x%5 else (255,0,255),width=1)
for y in range(h+1):
    d.line([(0,y*Z),(w*Z,y*Z)],fill=(0,0,0) if y%5 else (255,0,255),width=1)
big.save(out)
