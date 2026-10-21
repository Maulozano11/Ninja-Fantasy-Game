import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
# strip.py name anim scale cols bg(g|d) [frames list]
n=sys.argv[1]; an=sys.argv[2]; S=int(sys.argv[3]); cols=int(sys.argv[4]); bgk=sys.argv[5]
s=man[n]; N=s['anims'][an]['frames']
idx=list(range(N)) if len(sys.argv)<7 else [int(v) for v in sys.argv[6].split(',')]
bg=(76,110,58) if bgk=='g' else (32,32,42) if bgk=='d' else (255,0,255)
W,H=s['frameW'],s['frameH']
rows=(len(idx)+cols-1)//cols
out=Image.new('RGB',(cols*(W*S+4),rows*(H*S+4)),(255,255,0))
d=ImageDraw.Draw(out)
for j,i in enumerate(idx):
    fr=onbg(frame(n,an,i),bg).resize((W*S,H*S),Image.NEAREST)
    x=(j%cols)*(W*S+4); y=(j//cols)*(H*S+4)
    out.paste(fr,(x,y)); d.text((x+2,y+2),str(i),fill=(255,255,0))
fn=R+f's_{n}_{an}_{bgk}_{"-".join(map(str,idx)) if len(idx)<N else "all"}.png'
out.save(fn); print(fn, out.size)
