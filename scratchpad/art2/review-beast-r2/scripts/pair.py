import sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
O=S+'/art2/review-beast-r2/'
sheet=Image.open(S+'/art2/staging/vfx_beasts/earth.png').convert('RGBA')
W,H=280,163
# pair.py out Z x0 y0 x1 y1 bg frames...
out=sys.argv[1]; Z=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); bg=tuple(map(int,sys.argv[7].split(',')))
frs=[int(v) for v in sys.argv[8:]]
w,h=x1-x0,y1-y0
img=Image.new('RGB',((w*Z+6)*len(frs),h*Z),(255,255,255))
for k,i in enumerate(frs):
    f=sheet.crop((i*W,0,i*W+W,H)); c=Image.new('RGBA',(W,H),bg+(255,)); c.alpha_composite(f)
    img.paste(c.convert('RGB').crop((x0,y0,x1,y1)).resize((w*Z,h*Z),Image.NEAREST),(k*(w*Z+6),0))
img.save(O+out)
