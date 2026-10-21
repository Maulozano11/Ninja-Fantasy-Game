import sys
from PIL import Image, ImageDraw
O='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-beast-r2/'
def z(name,box,s,out,bgc=(96,112,84)):
    f=Image.open(O+f'rv3-{name}.png').convert('RGBA')
    bg=Image.new('RGBA',f.size,bgc+(255,)); bg.alpha_composite(f)
    c=bg.convert('RGB').crop(box); c=c.resize((c.width*s,c.height*s),Image.NEAREST)
    return c
if __name__=='__main__':
    out=sys.argv[1]; s=int(sys.argv[2]); box=tuple(int(v) for v in sys.argv[3].split(','))
    names=sys.argv[4:]
    ims=[z(n,box,s,out) for n in names]
    can=Image.new('RGB',(sum(i.width+8 for i in ims),ims[0].height+14),(0,0,0)); d=ImageDraw.Draw(can); x=0
    for n,i in zip(names,ims):
        can.paste(i,(x,14)); d.text((x+2,1),n,fill=(255,255,0)); x+=i.width+8
    can.save(O+out)
