import sys
from PIL import Image
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-beast-r4/'
# usage: z.py out k x0 y0 x1 y1 frame1 [frame2 ...]   (frames like fly0, summon2, hisL, hisR)
out=sys.argv[1]; k=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); fr=sys.argv[7:]
bg=(31,31,41)
ims=[]
for f in fr:
    if f=='hisL': im=Image.open(R+'his-L-game.png').convert('RGB')
    elif f=='hisR': im=Image.open(R+'his-R-game.png').convert('RGB')
    else:
        o=Image.open(R+f+'.png').convert('RGBA'); b=Image.new('RGBA',o.size,bg+(255,)); b.alpha_composite(o); im=b.convert('RGB')
    ims.append(im.crop((x0,y0,x1,y1)))
w=x1-x0; h=y1-y0
s=Image.new('RGB',(len(ims)*(w+2)-2,h),(255,0,0))
for i,c in enumerate(ims): s.paste(c,(i*(w+2),0))
s.resize((s.width*k,s.height*k),Image.NEAREST).save(R+out)
