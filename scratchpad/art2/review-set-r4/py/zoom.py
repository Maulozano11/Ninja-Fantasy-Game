import sys
from PIL import Image
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-set-r4'
n=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); z=int(sys.argv[6]); vert=len(sys.argv)>7 and sys.argv[7]=='v'
his=Image.open(f'{A}/h1-{n}.png'); k=Image.open(f'{A}/k1-{n}.png')
pad=6
o=Image.new('RGBA',his.size,(36,36,48,255)); o.alpha_composite(k,(pad,pad)); o=o.convert('RGB')
a=his.crop((x0+pad,y0+pad,x1+pad,y1+pad)); b=o.crop((x0+pad,y0+pad,x1+pad,y1+pad))
w,h=a.size
if vert:
    s=Image.new('RGB',(w,2*h+2),(255,0,255)); s.paste(a,(0,0)); s.paste(b,(0,h+2))
else:
    s=Image.new('RGB',(2*w+2,h),(255,0,255)); s.paste(a,(0,0)); s.paste(b,(w+2,0))
s=s.resize((s.width*z,s.height*z),Image.NEAREST); s.save(f'{A}/z-{n}-{x0}_{y0}.png'); print(f'{A}/z-{n}-{x0}_{y0}.png')
