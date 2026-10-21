import sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
x0,y0,x1,y1,k,step=map(int,sys.argv[1:7]); out=sys.argv[7]
im=Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB').crop((x0,y0,x1,y1))
im=im.resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST)
d=ImageDraw.Draw(im)
for x in range((x0//step+1)*step,x1,step):
    d.line([((x-x0)*k,0),((x-x0)*k,im.height)],fill=(0,255,255) if x%(step*5)==0 else (0,110,110))
    if x%(step*5)==0: d.text(((x-x0)*k+2,2),str(x),fill=(255,255,0))
for y in range((y0//step+1)*step,y1,step):
    d.line([(0,(y-y0)*k),(im.width,(y-y0)*k)],fill=(0,255,255) if y%(step*5)==0 else (0,110,110))
    if y%(step*5)==0: d.text((2,(y-y0)*k+2),str(y),fill=(255,255,0))
im.save(out)
