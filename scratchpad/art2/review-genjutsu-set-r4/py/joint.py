import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
S=6; bg=(32,32,42)
tiles=[]
for f in range(8):
    c=Image.new('RGBA',(64+67,64),bg+(255,))
    c.alpha_composite(frame('stream','fly',f),(0,0)); c.alpha_composite(frame('stream_head','fly',f),(64,0))
    tiles.append(c.convert('RGB').crop((40,4,104,60)))
w,h=tiles[0].size
out=Image.new('RGB',(4*(w*S+4),2*(h*S+4)),(255,255,0))
d=ImageDraw.Draw(out)
for j,t in enumerate(tiles):
    x=(j%4)*(w*S+4); y=(j//4)*(h*S+4)
    out.paste(t.resize((w*S,h*S),Image.NEAREST),(x,y)); d.line([(x+24*S,y),(x+24*S,y+8)],fill=(255,255,0)); d.text((x+3,y+3),str(j),fill=(255,255,0))
out.save(R+'joint8.png'); print(R+'joint8.png',out.size)
