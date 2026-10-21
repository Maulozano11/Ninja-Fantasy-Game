# usage: grid.py <png> <out.png> <scale> [x0 y0 x1 y1]  -> nearest upscale with a grid line every 5 px and labels every 10
import sys
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('RGB'); out=sys.argv[2]; k=int(sys.argv[3])
if len(sys.argv)>4:
    x0,y0,x1,y1=map(int,sys.argv[4:8]); im=im.crop((x0,y0,x1,y1))
else: x0=y0=0
w,h=im.size
big=im.resize((w*k,h*k),Image.NEAREST)
c=Image.new('RGB',(w*k+30,h*k+30),(16,16,20)); c.paste(big,(30,30))
d=ImageDraw.Draw(c)
for x in range(0,w+1):
    X=30+x*k
    if (x+x0)%5==0: d.line([(X,30),(X,30+h*k)],fill=(255,0,255) if (x+x0)%10==0 else (120,0,120))
    if (x+x0)%10==0: d.text((X+1,2),str(x+x0),fill=(255,255,255))
for y in range(0,h+1):
    Y=30+y*k
    if (y+y0)%5==0: d.line([(30,Y),(30+w*k,Y)],fill=(255,0,255) if (y+y0)%10==0 else (120,0,120))
    if (y+y0)%10==0: d.text((2,Y+1),str(y+y0),fill=(255,255,255))
c.save(out)
