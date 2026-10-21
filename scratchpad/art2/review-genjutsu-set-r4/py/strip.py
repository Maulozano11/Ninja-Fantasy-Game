import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from common import *
from PIL import ImageDraw
# usage: strip.py name anim frames(all|a,b,c) S per_row bg(d|g) [crop x0,y0,x1,y1]
n,an,fs,S,per,bgc=sys.argv[1:7]
crop=tuple(map(int,sys.argv[7].split(','))) if len(sys.argv)>7 else None
S=int(S); per=int(per)
N=nframes(n,an)
fl=list(range(N)) if fs=='all' else list(map(int,fs.split(',')))
bg=FILL if bgc=='d' else (76,110,58)
tiles=[]
for i in fl:
    t=onbg(frame(n,an,i),bg)
    if crop: t=t.crop(crop)
    t=t.resize((t.width*S,t.height*S),Image.NEAREST)
    d=ImageDraw.Draw(t); d.rectangle((0,0,18,10),fill=(0,0,0)); d.text((2,0),str(i),fill=(255,255,0))
    tiles.append(t)
W,H=tiles[0].size; g=4
rows=(len(tiles)+per-1)//per
out=Image.new('RGB',(per*W+(per-1)*g,rows*H+(rows-1)*g),(255,0,255))
for j,t in enumerate(tiles): out.paste(t,((j%per)*(W+g),(j//per)*(H+g)))
name=f's_{n}_{an}_{bgc}_{fs.replace(",","-")}'+(f'_c{"-".join(map(str,crop))}' if crop else '')+'.png'
out.save(R+name); print(R+name, out.size)
