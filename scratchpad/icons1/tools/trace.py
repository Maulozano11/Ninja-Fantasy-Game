import sys, json
from PIL import Image, ImageDraw
# trace.py his.png shapes.json out.png Z
his,shp,out=sys.argv[1:4]; Z=int(sys.argv[4]) if len(sys.argv)>4 else 4
im=Image.open(his).convert('RGB'); im=im.resize((im.size[0]*Z,im.size[1]*Z),Image.NEAREST)
d=ImageDraw.Draw(im)
S=json.load(open(shp))
cols={'head':(255,0,255),'mouth':(255,255,0),'teeth':(255,80,80),'eye':(0,255,0),'bolt':(255,160,0),'horn':(0,255,255),'line':(255,255,255)}
for name,item in S.items():
    kind=name.split('_')[0]; c=cols.get(kind,(255,255,255))
    pts=[(x*Z+Z/2,y*Z+Z/2) for x,y in item]
    if len(pts)==1: d.ellipse([pts[0][0]-4,pts[0][1]-4,pts[0][0]+4,pts[0][1]+4],outline=c)
    else: d.line(pts,fill=c,width=2)
    d.text(pts[0],name,fill=c)
for x in range(0,im.size[0],10*Z):
    d.text((x+2,2),str(x//Z),fill=(255,255,0))
for y in range(0,im.size[1],10*Z):
    d.text((2,y+2),str(y//Z),fill=(255,255,0))
im.save(out)
