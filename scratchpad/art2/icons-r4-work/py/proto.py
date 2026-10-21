# proto.py base.txt patch.txt out.png : apply an ascii patch (first line "x0 y0", then rows; '.' keeps) to a 44 index map, render views
import sys
from PIL import Image, ImageDraw
W='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/icons-r4-work'
lines=open(sys.argv[1]).read().split('\n')
pal={}; i=0
while lines[i].strip(): k,h=lines[i].split(); pal[k]=tuple(int(h[1+2*j:3+2*j],16) for j in range(3)); i+=1
grid=[list(r) for r in lines[i+1:i+45]]
pl=open(sys.argv[2]).read().split('\n')
x0,y0=map(int,pl[0].split())
for dy,row in enumerate(pl[1:]):
    row=row.split('#')[0].rstrip()
    for dx,ch in enumerate(row):
        if ch in '. ': continue
        grid[y0+dy][x0+dx]=ch
im=Image.new('RGB',(44,44))
for y in range(44):
    for x in range(44): im.putpixel((x,y),pal[grid[y][x]])
im.save(sys.argv[3])
open(sys.argv[3].replace('.png','.txt'),'w').write('\n'.join(''.join(r) for r in grid)+'\n')
his=Image.open(f'{W}/stage/ref/kirin_thunder.png').convert('RGB'); w,h=his.size
hb=his.crop((1,1,w-1,h-1)).resize((44,44),Image.BOX)
Z=12
def grid8(img):
    b=img.resize((44*Z,44*Z),Image.NEAREST); d=ImageDraw.Draw(b)
    for g in range(0,45):
        c=(255,60,60) if g%5==0 else (50,50,60)
        d.line([(g*Z,0),(g*Z,44*Z)],fill=c); d.line([(0,g*Z),(44*Z,g*Z)],fill=c)
    return b
bar=(14,16,22)
o=Image.new('RGB',(44*Z*2+30+300,44*Z+20),bar)
o.paste(grid8(hb),(10,10)); o.paste(grid8(im),(44*Z+20,10))
X=44*Z*2+40
o.paste(im,(X,10)); o.paste(hb,(X+60,10)); o.paste(im.resize((88,88),Image.NEAREST),(X,70)); o.paste(hb.resize((88,88),Image.NEAREST),(X+100,70))
o.paste(im.resize((132,132),Image.NEAREST),(X,170)); o.paste(hb.resize((132,132),Image.NEAREST),(X+140,170))
o.save(sys.argv[3].replace('.png','-view.png'))
