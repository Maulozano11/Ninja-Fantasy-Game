import sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB')
mock=Image.open(S+'/ui-battle-mockup.png').convert('RGB')
R=1600/1024
def pair(name, box, k):
    x0,y0,x1,y1=box
    a=ref.crop((x0,y0,x1,y1))
    a=a.resize((round((x1-x0)*R*k), round((y1-y0)*R*k)), Image.NEAREST)
    b=mock.crop((round(x0*R),round(y0*R),round(x1*R),round(y1*R)))
    b=b.resize((b.width*k,b.height*k), Image.NEAREST)
    W=a.width+b.width+10; H=max(a.height,b.height)
    out=Image.new('RGB',(W,H),(255,0,255))
    out.paste(a,(0,0)); out.paste(b,(a.width+10,0))
    out.save(S+'/review-ui-r1/'+name+'.png')
    print(name,out.size)
a=sys.argv[1:]
pair(a[0], tuple(map(int,a[1:5])), int(a[5]))
