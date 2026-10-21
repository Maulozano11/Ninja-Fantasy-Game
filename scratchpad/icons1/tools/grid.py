import sys
from PIL import Image, ImageDraw
# usage: grid.py src out x0 y0 x1 y1 zoom step
src,out=sys.argv[1],sys.argv[2]
x0,y0,x1,y1,z,st=map(int,sys.argv[3:9])
im=Image.open(src).convert('RGB').crop((x0,y0,x1,y1))
im=im.resize(((x1-x0)*z,(y1-y0)*z),Image.NEAREST)
d=ImageDraw.Draw(im)
for x in range(x0 - x0%st, x1, st):
    if x<x0: continue
    X=(x-x0)*z; d.line([(X,0),(X,im.size[1])],fill=(255,0,255) if x%(st*5)==0 else (120,0,120),width=1)
    d.text((X+2,2),str(x),fill=(255,255,0))
for y in range(y0 - y0%st, y1, st):
    if y<y0: continue
    Y=(y-y0)*z; d.line([(0,Y),(im.size[0],Y)],fill=(255,0,255) if y%(st*5)==0 else (120,0,120),width=1)
    d.text((2,Y+2),str(y),fill=(255,255,0))
im.save(out)
