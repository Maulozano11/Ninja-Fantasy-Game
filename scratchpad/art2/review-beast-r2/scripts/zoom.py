import sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
O=S+'/art2/review-beast-r2/'
sheet=Image.open(S+'/art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=280,163; PAN=(34,34,44)
# usage: zoom.py name key frame x0 y0 x1 y1 Z [bg r,g,b]
name,key,fr=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
x0,y0,x1,y1,Z=map(int,sys.argv[4:9])
bg=PAN if len(sys.argv)<10 else tuple(map(int,sys.argv[9].split(',')))
his=Image.open(O+f'n-his{key}-game.png').convert('RGB').crop((x0,y0,x1,y1))
f=sheet.crop((fr*W,0,fr*W+W,H)); c=Image.new('RGBA',(W,H),bg+(255,)); c.alpha_composite(f)
o=c.convert('RGB').crop((x0,y0,x1,y1))
w,h=x1-x0,y1-y0
out=Image.new('RGB',(w*Z*2+8,h*Z),(255,255,255))
out.paste(his.resize((w*Z,h*Z),Image.NEAREST),(0,0))
out.paste(o.resize((w*Z,h*Z),Image.NEAREST),(w*Z+8,0))
out.save(O+name)
