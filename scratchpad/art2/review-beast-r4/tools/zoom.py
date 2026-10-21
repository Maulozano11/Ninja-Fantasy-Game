import sys, numpy as np
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-beast-r4'
# usage: zoom.py key x0 y0 x1 y1 scale name [bg]
key=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); k=int(sys.argv[6]); name=sys.argv[7]
bg=tuple(map(int,sys.argv[8].split(','))) if len(sys.argv)>8 else (34,34,44)
his=Image.open(R+'/his-f%d-game.png'%key).crop((x0,y0,x1,y1)) if key in (0,5) else None
f=Image.open(R+'/f%d.png'%key)
o=Image.new('RGBA',f.size,bg+(255,)); o.alpha_composite(f); o=o.convert('RGB').crop((x0,y0,x1,y1))
w,h=x1-x0,y1-y0
n=2 if his else 1
out=Image.new('RGB',(n*w*k+(n-1)*6,h*k),(255,0,255))
x=0
if his: out.paste(his.resize((w*k,h*k),Image.NEAREST),(0,0)); x=w*k+6
out.paste(o.resize((w*k,h*k),Image.NEAREST),(x,0))
out.save(R+'/'+name)
