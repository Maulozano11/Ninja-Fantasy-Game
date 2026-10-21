# native.py <refmap.json> <prevdir> <name> gx0 gy0 gx1 gy1 Z  : his native pixels (same area) | ours, same physical size
import sys, json
from PIL import Image
rm=json.load(open(sys.argv[1])); pd=sys.argv[2]; name=sys.argv[3]
gx0,gy0,gx1,gy1,Z=map(int,sys.argv[4:9])
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
ref=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
r=rm[name]; k=r['k']; ox,oy=r['origin']
hx0,hy0,hx1,hy1=ox+gx0/k,oy+gy0/k,ox+gx1/k,oy+gy1/k
his=ref.crop((round(hx0),round(hy0),round(hx1),round(hy1)))
his=his.resize((round((gx1-gx0)*Z),round((gy1-gy0)*Z)),Image.NEAREST)
im=Image.open(f'{pd}/{name}.png')
z=4 if max(im.height//4, (im.width-20)//12) < 140 and im.height%4==0 and (im.width-20)%12==0 and max(im.height//4,(im.width-20)//12)*2!=0 else 2
W=(im.width-20)//(3*z)
if max(W, im.height//z) >= 140 and z==4: z=2; W=(im.width-20)//(3*z)
ours=im.crop((W*z+10+gx0*z,gy0*z,W*z+10+gx1*z,gy1*z)).resize((gx1-gx0,gy1-gy0),Image.NEAREST).resize(((gx1-gx0)*Z,(gy1-gy0)*Z),Image.NEAREST)
out=Image.new('RGB',(his.width+ours.width+8,max(his.height,ours.height)),(255,0,255))
out.paste(his,(0,0)); out.paste(ours,(his.width+8,0)); out.save(f'{pd}/n_{name}.png')
