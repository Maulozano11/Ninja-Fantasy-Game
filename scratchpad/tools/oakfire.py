import json
from PIL import Image, ImageDraw, ImageFont
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
BG=(93,107,87,255)
def frame(root, anim, i):
    sp=json.load(open(f'{root}/manifest.json'))['sprites']['oak']
    im=Image.open(f'{root}/oak.png').convert('RGBA'); w,h=sp['frameW'],sp['frameH']; r=sp['anims'][anim]['row']
    return im.crop((i*w,r*h,i*w+w,r*h+h)), sp['anchor']
font=ImageFont.load_default(size=26); small=ImageFont.load_default(size=20)
old=frame('/home/user/Ninja-Fantasy-Game/src/assets/world/trees','burning',3)
v1=frame(f'{S}/oak-v1','burning',3)
new=frame(f'{S}/art3/staging/trees','burning',3)
burnt=frame(f'{S}/art3/staging/trees','burnt',0)
char=Image.open(f'{S}/art3/char0.png').convert('RGBA')
# section 1: lineup on a common ground line at 2x
items=[('OLD (in game now)',old),('PREVIOUS STAGING',v1),('NEW burning',new),('NEW burnt',burnt)]
above=max(a[1] for _,(im,a) in items); below=max(im.height-a[1] for _,(im,a) in items)
pad=24; W1=pad+128+pad+sum(im.width+pad for _,(im,_a) in items)
s1=Image.new('RGBA',(W1,above+below+pad*2+40),BG); d=ImageDraw.Draw(s1)
gy=40+pad+above
d.rectangle((0,gy,W1,s1.height),fill=(74,90,60,255))
x=pad; s1.alpha_composite(char,(x,gy-120)); x+=128+pad
for label,(im,(ax,ay)) in items:
    s1.alpha_composite(im,(x,gy-ay)); d.text((x+4,8),label,fill=(245,240,225,255),font=small); x+=im.width+pad
s1=s1.resize((s1.width*2,s1.height*2),Image.NEAREST)
# section 2: 4x crops of the flames, old vs new
def crop4(im,box):
    c=im.crop(box); o=Image.new('RGBA',c.size,BG); o.alpha_composite(c); return o.resize((c.width*4,c.height*4),Image.NEAREST)
c_old=crop4(old[0],(150,60,300,170)); c_new=crop4(new[0],(205,145,355,255))
# section 3: anim strip, crown crops of the 8 burning frames at 2x
fr=[frame(f'{S}/art3/staging/trees','burning',i)[0].crop((30,20,370,330)) for i in range(8)]
s3=Image.new('RGBA',(340*4+30,310*2+10),BG)
for i,f in enumerate(fr): s3.alpha_composite(f,((i%4)*350,(i//4)*320))
s3=s3.resize((s3.width*2,s3.height*2),Image.NEAREST)
W=max(s1.width, c_old.width+c_new.width+60, s3.width); H=s1.height+60+max(c_old.height,c_new.height)+60+s3.height+60
out=Image.new('RGBA',(W,H),(40,44,40,255)); d=ImageDraw.Draw(out)
y=0; out.alpha_composite(s1,(0,y)); y+=s1.height+10
d.text((10,y+10),'4x flames: OLD (left) and NEW (right)',fill=(245,240,225,255),font=font); y+=50
out.alpha_composite(c_old,(10,y)); out.alpha_composite(c_new,(c_old.width+50,y)); y+=max(c_old.height,c_new.height)+10
d.text((10,y+10),'NEW burning loop, 8 frames @ 11 fps (crown, 2x)',fill=(245,240,225,255),font=font); y+=50
out.alpha_composite(s3,(0,y))
out.save(f'{S}/art3/trees-oak-fire.png'); print(out.size)
