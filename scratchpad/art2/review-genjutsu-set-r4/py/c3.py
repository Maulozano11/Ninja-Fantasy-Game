import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
names=sys.argv[1:] or ['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','aura','wall_diag','wall_depth']
for n in names:
    an,i=KEY.get(n,(None,0))
    fr=frame(n,an,i); his=hiscrop(n)
    S=3 if fr.size[0]<200 else 2
    tiles=[his, onbg(fr,(32,32,42)), onbg(fr,(76,110,58))]
    W,H=fr.size
    if W>H*1.2:
        out=Image.new('RGB',(W*S,(H*S+6)*3),(255,0,255))
        for j,t in enumerate(tiles): out.paste(t.resize((W*S,H*S),Image.NEAREST),(0,j*(H*S+6)))
    else:
        out=Image.new('RGB',((W*S+6)*3,H*S),(255,0,255))
        for j,t in enumerate(tiles): out.paste(t.resize((W*S,H*S),Image.NEAREST),(j*(W*S+6),0))
    out.save(R+f'cmp_{n}.png'); his.save(R+f'his_{n}_1x.png'); fr.save(R+f'ours_{n}_1x.png')
    print(R+f'cmp_{n}.png',fr.size)
