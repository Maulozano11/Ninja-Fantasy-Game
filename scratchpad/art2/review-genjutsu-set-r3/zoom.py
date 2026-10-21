import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
# usage: zoom.py name scale x0 y0 x1 y1 [anim idx]
n=sys.argv[1]; S=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7])
an,i=KEY.get(n,(None,0))
if len(sys.argv)>7: an=sys.argv[7]; i=int(sys.argv[8])
fr=frame(n,an,i); his=hiscrop(n)
a=his.crop((x0,y0,x1,y1)); b=onbg(fr,(32,32,42)).crop((x0,y0,x1,y1))
W,H=a.size
vert = W>H*1.3
if vert:
    out=Image.new('RGB',(W*S,H*S*2+6),(255,0,255)); out.paste(a.resize((W*S,H*S),Image.NEAREST),(0,0)); out.paste(b.resize((W*S,H*S),Image.NEAREST),(0,H*S+6))
else:
    out=Image.new('RGB',(W*S*2+6,H*S),(255,0,255)); out.paste(a.resize((W*S,H*S),Image.NEAREST),(0,0)); out.paste(b.resize((W*S,H*S),Image.NEAREST),(W*S+6,0))
tag=sys.argv[9] if len(sys.argv)>9 else ''
out.save(R+f'z_{n}_{x0}_{y0}{tag}.png'); print(R+f'z_{n}_{x0}_{y0}{tag}.png')
