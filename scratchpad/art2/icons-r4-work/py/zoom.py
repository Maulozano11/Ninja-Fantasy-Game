# zoom.py out Z x0 y0 x1 y1 img1 [img2 ...]: crops region of each (same size images) at Z with grid + coordinate labels
import sys
from PIL import Image, ImageDraw
out, Z, x0, y0, x1, y1 = sys.argv[1], *map(int, sys.argv[2:7])
ims = [Image.open(p).convert('RGB') for p in sys.argv[7:]]
tiles=[]
for im in ims:
    if im.size[0] != ims[0].size[0]: im = im.resize(ims[0].size, Image.NEAREST)
    c = im.crop((x0,y0,x1,y1)).resize(((x1-x0)*Z,(y1-y0)*Z), Image.NEAREST)
    t = Image.new('RGB',(c.width+24,c.height+16),(0,0,0)); t.paste(c,(24,16)); d=ImageDraw.Draw(t)
    for g in range(x0,x1+1):
        px=24+(g-x0)*Z; d.line([(px,16),(px,t.height)],fill=(255,50,50) if g%5==0 else (60,60,60))
        if g%5==0: d.text((px+1,2),str(g),fill=(255,255,255))
    for g in range(y0,y1+1):
        py=16+(g-y0)*Z; d.line([(24,py),(t.width,py)],fill=(255,50,50) if g%5==0 else (60,60,60))
        if g%5==0: d.text((1,py+1),str(g),fill=(255,255,255))
    tiles.append(t)
o=Image.new('RGB',(sum(t.width for t in tiles)+8*len(tiles),tiles[0].height),(30,30,30))
x=0
for t in tiles: o.paste(t,(x,0)); x+=t.width+8
o.save(out)
