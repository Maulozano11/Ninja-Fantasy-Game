# hisgrid.py id N x0 y0 x1 y1 Z out : his crop (trimmed) at N-grid, region, zoom Z per N-pixel
import sys
from PIL import Image, ImageDraw
jid,N,x0,y0,x1,y1,Z,out=sys.argv[1],*map(int,sys.argv[2:8]),sys.argv[8]
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r4-work'
his=Image.open(f'{W}/stage/ref/{jid}.png').convert('RGB'); w,h=his.size
t=his.crop((1,1,w-1,h-1))
big=t.resize((N*Z,N*Z),Image.BICUBIC)
c=big.crop((x0*Z,y0*Z,x1*Z,y1*Z))
c2=Image.new('RGB',(c.width+22,c.height+14),(0,0,0)); c2.paste(c,(22,14))
d=ImageDraw.Draw(c2)
for g in range(x0,x1+1):
    px=22+(g-x0)*Z; d.line([(px,14),(px,c2.height)],fill=(255,60,60) if g%5==0 else (60,60,60))
    if g%2==0: d.text((px+1,1),str(g),fill=(255,255,0))
for g in range(y0,y1+1):
    py=14+(g-y0)*Z; d.line([(22,py),(c2.width,py)],fill=(255,60,60) if g%5==0 else (60,60,60))
    if g%2==0: d.text((1,py+1),str(g),fill=(255,255,0))
c2.save(out)
