import sys
from PIL import Image
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-beast-r4/'
src=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); k=int(sys.argv[6]); out=sys.argv[7]
bg=tuple(map(int,sys.argv[8].split(','))) if len(sys.argv)>8 else (31,31,41)
o=Image.open(R+src).convert('RGBA'); b=Image.new('RGBA',o.size,bg+(255,)); b.alpha_composite(o)
c=b.crop((x0,y0,x1,y1)).convert('RGB'); c.resize((c.width*k,c.height*k),Image.NEAREST).save(R+out)
