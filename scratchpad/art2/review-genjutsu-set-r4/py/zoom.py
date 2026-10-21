import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
# zoom.py name scale x0 y0 x1 y1 [anim idx] [tag] [bg g|d]
n=sys.argv[1]; S=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7])
an,i=KEY.get(n,(None,0))
if len(sys.argv)>7 and sys.argv[7]!='-': an=sys.argv[7]; i=int(sys.argv[8])
tag=sys.argv[9] if len(sys.argv)>9 else ''
bgk=sys.argv[10] if len(sys.argv)>10 else 'd'
fr=frame(n,an,i); his=hiscrop(n)
bg=(32,32,42) if bgk=='d' else (76,110,58)
a=his.crop((x0,y0,x1,y1)); b=onbg(fr,bg).crop((x0,y0,x1,y1))
W,H=a.size
vert = W>H*1.3
if vert:
    out=Image.new('RGB',(W*S,H*S*2+6),(255,0,255)); out.paste(a.resize((W*S,H*S),Image.NEAREST),(0,0)); out.paste(b.resize((W*S,H*S),Image.NEAREST),(0,H*S+6))
else:
    out=Image.new('RGB',(W*S*2+6,H*S),(255,0,255)); out.paste(a.resize((W*S,H*S),Image.NEAREST),(0,0)); out.paste(b.resize((W*S,H*S),Image.NEAREST),(W*S+6,0))
fn=R+f'z_{n}_{x0}_{y0}{tag}.png'
out.save(fn); print(fn)
