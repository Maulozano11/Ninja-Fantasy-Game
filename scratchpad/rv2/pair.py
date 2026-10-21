import sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-set-r2'
name=sys.argv[1]; k=int(sys.argv[2]) if len(sys.argv)>2 else 3
which=[int(x) for x in sys.argv[3].split(',')] if len(sys.argv)>3 else [0,1]
vert = len(sys.argv)>4 and sys.argv[4]=='v'
im=Image.open(S+'/cmp-%s.png'%name)
# panels: 5 panels of width W*3, pad 6, offset 20
P=(im.width)//5; W=P-6; H=im.height-20
ps=[im.crop((j*P,20,j*P+W,20+H)) for j in which]
ps=[p.resize((p.width*k//3,p.height*k//3),Image.NEAREST) for p in ps]
if vert:
    out=Image.new('RGB',(ps[0].width,sum(p.height+4 for p in ps)),(255,0,255)); y=0
    for p in ps: out.paste(p,(0,y)); y+=p.height+4
else:
    out=Image.new('RGB',(sum(p.width+4 for p in ps),ps[0].height),(255,0,255)); x=0
    for p in ps: out.paste(p,(x,0)); x+=p.width+4
out.save(S+'/pair-%s-%s.png'%(name,''.join(map(str,which))))
print(out.size)
