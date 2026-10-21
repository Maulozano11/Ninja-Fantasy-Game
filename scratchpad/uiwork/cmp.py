import sys
from PIL import Image
his=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/ui-battle-owner-reference.jpg').convert('RGB').resize((1600,900),Image.LANCZOS)
ours=Image.open(sys.argv[1]).convert('RGB')
R={
 'crestL':(530,700,700,790),'crestR':(910,700,1080,790),'lowerL':(500,840,640,900),'lowerR':(970,840,1110,900),
 'target':(600,0,1030,80),'topc':(480,0,1080,170),'mini':(1390,0,1600,215),'barL':(330,750,560,900),'barR':(1100,750,1280,900),
 'party':(0,770,280,900),'menu':(0,0,120,70),'med':(720,660,900,790),'round':(540,50,650,150),'init':(620,70,980,170),
 'skill':(550,760,760,880),'items':(920,770,1270,880),
}
names=sys.argv[3].split(',') if len(sys.argv)>3 else list(R)
Z=int(sys.argv[4]) if len(sys.argv)>4 else 3
rows=[]
for n in names:
    b=R[n]
    a=his.crop(b).resize(((b[2]-b[0])*Z,(b[3]-b[1])*Z),Image.NEAREST)
    o=ours.crop(b).resize(((b[2]-b[0])*Z,(b[3]-b[1])*Z),Image.NEAREST)
    rows.append((a,o))
W=max(a.width+o.width+10 for a,o in rows); H=sum(max(a.height,o.height)+10 for a,o in rows)
out=Image.new('RGB',(W,H),(255,0,255)); y=0
for a,o in rows:
    out.paste(a,(0,y)); out.paste(o,(a.width+10,y)); y+=max(a.height,o.height)+10
out.save(sys.argv[2])
