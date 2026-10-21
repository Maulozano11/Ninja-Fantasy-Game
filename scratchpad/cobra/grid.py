import sys
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('RGB')
x0,y0,x1,y1=map(int,sys.argv[2:6]); k=int(sys.argv[6]); out=sys.argv[7]
c=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST)
d=ImageDraw.Draw(c)
for x in range(x0 - x0%10 + 10, x1, 10):
    X=(x-x0)*k; d.line([(X,0),(X,c.height)],fill=(255,255,255) if x%50==0 else (110,110,110),width=1)
    d.text((X+2,2),str(x),fill=(255,255,0))
for y in range(y0 - y0%10 + 10, y1, 10):
    Y=(y-y0)*k; d.line([(0,Y),(c.width,Y)],fill=(255,255,255) if y%50==0 else (110,110,110),width=1)
    d.text((2,Y+2),str(y),fill=(255,255,0))
c.save(out)
