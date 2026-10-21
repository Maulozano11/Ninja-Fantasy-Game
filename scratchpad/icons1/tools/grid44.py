import sys
from PIL import Image, ImageDraw
# grid44.py his.png ours44.png out x0 y0 x1 y1 (44-coords) Z
his,ours,out=sys.argv[1:4]; x0,y0,x1,y1,Z=map(int,sys.argv[4:9])
h=Image.open(his).convert('RGB').crop((1,1,200,205)).resize((44*Z,44*Z),Image.LANCZOS).crop((x0*Z,y0*Z,x1*Z,y1*Z))
o=Image.open(ours).convert('RGB').resize((44*Z,44*Z),Image.NEAREST).crop((x0*Z,y0*Z,x1*Z,y1*Z))
W=(x1-x0)*Z; H=(y1-y0)*Z
im=Image.new('RGB',(W*2+20,H+20),(0,0,0)); im.paste(h,(0,20)); im.paste(o,(W+20,20))
d=ImageDraw.Draw(im)
for off in (0,W+20):
  for x in range(x0,x1+1):
    X=off+(x-x0)*Z; d.line([(X,20),(X,H+20)],fill=(255,0,255) if x%4==0 else (90,0,90))
    if x%2==0: d.text((X+2,4),str(x),fill=(255,255,0))
  for y in range(y0,y1+1):
    Y=20+(y-y0)*Z; d.line([(off,Y),(off+W,Y)],fill=(255,0,255) if y%4==0 else (90,0,90))
    if y%2==0: d.text((off+2,Y+2),str(y),fill=(255,255,0))
im.save(out)
