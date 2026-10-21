import sys, math
from PIL import Image, ImageDraw
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r4-work'
cx,cy,sy,a0,turn,r0,r1=map(float,sys.argv[1:8])
his=Image.open(f'{W}/stage/ref/great_fire_annihilation.png').convert('RGB'); w,h=his.size
Z=14
t=his.crop((1,1,w-1,h-1)).resize((88*Z,88*Z),Image.BICUBIC)
x0,y0,x1,y1=12,54,46,84
c=t.crop((x0*Z,y0*Z,x1*Z,y1*Z)); d=ImageDraw.Draw(c)
for i in range(0,601):
    tt=i/600; a=math.radians(a0-turn*tt); r=r0+(r1-r0)*tt
    px=(cx+r*math.cos(a)-x0+0.5)*Z; py=(cy+r*sy*math.sin(a)-y0+0.5)*Z
    d.ellipse([px-2,py-2,px+2,py+2],fill=(0,255,0) if tt<0.05 else (0,120,255))
for g in range(x0,x1+1,2): d.line([((g-x0)*Z,0),((g-x0)*Z,6)],fill=(255,255,255)); d.text(((g-x0)*Z+1,8),str(g),fill=(255,255,255))
for g in range(y0,y1+1,2): d.line([(0,(g-y0)*Z),(6,(g-y0)*Z)],fill=(255,255,255)); d.text((8,(g-y0)*Z+1),str(g),fill=(255,255,255))
c.save(sys.argv[8])
