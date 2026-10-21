# usage: trace2.py <id> <out.png> x0 y0 x1 y1 [K] [ours44.png]  (44 coordinates) -> his pixels under the 44 grid, zoomed
import sys
from PIL import Image, ImageDraw
REF='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_icons_23/ref/'
id=sys.argv[1]; out=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); K=int(sys.argv[7]) if len(sys.argv)>7 else 24
src=Image.open(REF+id+'.png').convert('RGB')
W,H=src.size
big=src.resize((44*K,44*K),Image.NEAREST).crop((x0*K,y0*K,x1*K,y1*K))
ims=[big]
if len(sys.argv)>8: ims.append(Image.open(sys.argv[8]).convert('RGB').resize((44*K,44*K),Image.NEAREST).crop((x0*K,y0*K,x1*K,y1*K)))
w,h=big.size
c=Image.new('RGB',(len(ims)*(w+30)+10,h+30),(16,16,20))
for n,im in enumerate(ims):
    ox=n*(w+30)+24
    c.paste(im,(ox,24)); d=ImageDraw.Draw(c)
    for i in range(x0,x1+1):
        X=ox+(i-x0)*K; d.line([(X,24),(X,24+h)],fill=(255,0,255) if i%5==0 else (80,80,80))
        if i<x1: d.text((X+2,10),str(i),fill=(255,255,255))
    for j in range(y0,y1+1):
        Y=24+(j-y0)*K; d.line([(ox,Y),(ox+w,Y)],fill=(255,0,255) if j%5==0 else (80,80,80))
        if j<y1: d.text((ox-20,Y+2),str(j),fill=(255,255,255))
c.save(out)
