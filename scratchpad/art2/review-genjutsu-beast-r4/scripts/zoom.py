import sys
from PIL import Image
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-beast-r4/'
side=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); k=int(sys.argv[6]); out=sys.argv[7]
h=Image.open(R+'his-%s-game.png'%side)
fn=0 if side=='L' else 4
o=Image.open(R+'fly%d.png'%fn).convert('RGBA')
b=Image.new('RGBA',o.size,(31,31,41,255)); b.alpha_composite(o)
a=h.crop((x0,y0,x1,y1)); c=b.crop((x0,y0,x1,y1)).convert('RGB')
w=x1-x0; hh=y1-y0
s=Image.new('RGB',(w*2+2,hh),(255,0,0)); s.paste(a,(0,0)); s.paste(c,(w+2,0))
s.resize((s.width*k,s.height*k),Image.NEAREST).save(R+out)
