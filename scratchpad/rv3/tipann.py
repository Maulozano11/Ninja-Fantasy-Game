from PIL import Image, ImageDraw
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')
tips=[(30.3,46.5),(22.5,47.6),(11.7,49.7),(6.2,54.9),(2.5,61.1),(3.7,69.3),(4.7,56.7),(13.8,48.4)]
box=(0,36,56,96); s=5; bg=(32,34,46)
order=[0,1,2,3,4,5,6,7,0]
W=(box[2]-box[0])*s; H=(box[3]-box[1])*s
out=Image.new('RGB',((W+6)*len(order),H+40),(255,255,255)); d=ImageDraw.Draw(out)
for k,i in enumerate(order):
    f=Image.new('RGBA',(176,105),bg+(255,)); f.alpha_composite(sheet.crop((i*176,0,i*176+176,105)))
    c=f.convert('RGB').crop(box).resize((W,H),Image.NEAREST); cd=ImageDraw.Draw(c)
    for kk,i2 in enumerate(order[:k+1][-2:]):
        x,y=tips[i2]; X=(x-box[0])*s; Y=(y-box[1])*s
        col=(255,60,60) if i2==i else (255,200,0)
        cd.ellipse([X-5,Y-5,X+5,Y+5],outline=col,width=2)
    out.paste(c,(k*(W+6),0))
    if k>0:
        p=tips[order[k-1]]; q=tips[i]; st=np.hypot(q[0]-p[0],q[1]-p[1])
        d.text((k*(W+6)+4,H+4),f'f{i}  step {st:.1f}px',fill=(200,0,0) if st>12 else (0,0,0))
    else: d.text((4,H+4),'f0 (his LEFT)',fill=(0,0,0))
out.save(R+'review-poison-beast-r2/v3-tailtip-steps-x5.png'); print(out.size)
