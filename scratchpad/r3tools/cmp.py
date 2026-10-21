import sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
REF='/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg'
ref=Image.open(REF).convert('RGB')
mk=Image.open(S+'/ui-battle-mockup.png').convert('RGB')
K=1600/1024
def pair(name,x,y,w,h,z):
    # x,y,w,h in 1600 coords
    rb=(x/K,y/K,(x+w)/K,(y+h)/K)
    r=ref.crop(tuple(int(round(v)) for v in rb)).resize((w*z,h*z),Image.LANCZOS if False else Image.BICUBIC)
    m=mk.crop((x,y,x+w,y+h)).resize((w*z,h*z),Image.NEAREST)
    out=Image.new('RGB',(w*z, h*z*2+6),(255,0,255))
    out.paste(r,(0,0)); out.paste(m,(0,h*z+6))
    out.save(S+'/review-ui-r3/'+name+'.png')
args=sys.argv[1:]
pair(args[0],*[int(a) for a in args[1:6]])
