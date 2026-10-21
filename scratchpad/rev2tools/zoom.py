import sys, json
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
REF='/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg'
OUT=S+'/review-ui-r2/'
ref=Image.open(REF).convert('RGB'); mock=Image.open(S+'/ui-battle-mockup.png').convert('RGB')
k=1600/1024
def z(name, box, zz, vertical=False):
    x0,y0,x1,y1=box
    a=ref.crop(box).resize((round((x1-x0)*k),round((y1-y0)*k)),Image.LANCZOS)
    b=mock.crop((round(x0*k),round(y0*k),round(x1*k),round(y1*k)))
    a=a.resize((a.width*zz,a.height*zz),Image.NEAREST); b=b.resize((b.width*zz,b.height*zz),Image.NEAREST)
    if vertical:
        im=Image.new('RGB',(max(a.width,b.width),a.height+b.height+6),(255,0,255)); im.paste(a,(0,0)); im.paste(b,(0,a.height+6))
    else:
        im=Image.new('RGB',(a.width+b.width+6,max(a.height,b.height)),(255,0,255)); im.paste(a,(0,0)); im.paste(b,(a.width+6,0))
    im.save(OUT+name+'.png'); print(name, im.size)
for a in sys.argv[1:]:
    n,bx,zz,v=a.split(':'); z(n,tuple(int(t) for t in bx.split(',')),int(zz),v=='v')
