import sys
from PIL import Image, ImageEnhance, ImageDraw
im=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
x0,y0,aw,ah,Z=map(float,sys.argv[1:6]); out=sys.argv[6]; flip=len(sys.argv)>7
aw,ah,Z=int(aw),int(ah),int(Z)
w,h=aw/0.78125,ah/0.78125
c=im.resize((1024*4,576*4),Image.BICUBIC).crop((int(x0*4),int(y0*4),int((x0+w)*4),int((y0+h)*4)))
if flip: c=c.transpose(Image.FLIP_LEFT_RIGHT)
c=c.resize((aw*Z,ah*Z),Image.BICUBIC)
c=ImageEnhance.Contrast(c).enhance(1.4)
d=ImageDraw.Draw(c)
for x in range(0,aw+1,2): d.line([(x*Z,0),(x*Z,ah*Z)],fill=(255,0,255) if x%10==0 else (90,0,90))
for y in range(0,ah+1,2): d.line([(0,y*Z),(aw*Z,y*Z)],fill=(255,0,255) if y%10==0 else (90,0,90))
c.save(out)
