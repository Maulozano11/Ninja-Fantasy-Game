# usage: beforeafter.py group out.png names...   (old = src/assets/world, new = staging)
import sys, json
from PIL import Image, ImageDraw, ImageFont
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art3'
group, out = sys.argv[1], sys.argv[2]
names = sys.argv[3:]
def load(root):
    man=json.load(open(f'{root}/{group}/manifest.json'))['sprites']
    res=[]
    for n in names:
        sp=man[n]; im=Image.open(f'{root}/{group}/{sp["file"]}').convert('RGBA')
        res.append((im.crop((0,0,sp['frameW'],sp['frameH'])), sp['anchor']))
    return res
char=Image.open(f'{S}/char0.png').convert('RGBA')
rows=[('BEFORE', load('/home/user/Ninja-Fantasy-Game/src/assets/world')), ('AFTER', load(f'{S}/staging'))]
pad=18
def rowsize(items):
    above=max([120]+[a[1] for _,a in items]); below=max([8]+[im.height-a[1] for im,a in items])
    w=pad+128+pad+sum(im.width+pad for im,_ in items)
    return w,above,below
W=max(rowsize(it)[0] for _,it in rows)+20
H=sum(rowsize(it)[1]+rowsize(it)[2]+pad*2+14 for _,it in rows)
img=Image.new('RGBA',(W,H),(93,107,87,255)); d=ImageDraw.Draw(img)
y=0
for label,items in rows:
    _,above,below=rowsize(items)
    gy=y+14+pad+above
    d.rectangle((0,gy,W,gy+below+pad),fill=(74,90,60,255))
    d.text((6,y+4),label,fill=(240,236,220,255))
    x=pad; img.alpha_composite(char,(x,gy-120)); x+=128+pad
    for im,(ax,ay) in items:
        img.alpha_composite(im,(x,gy-ay)); x+=im.width+pad
    y=gy+below+pad
img=img.resize((W*2,H*2),Image.NEAREST); img.save(out); print(out, img.size)
