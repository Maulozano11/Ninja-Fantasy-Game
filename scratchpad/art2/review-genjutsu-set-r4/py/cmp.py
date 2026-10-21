import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from common import *
names=sys.argv[1:] or ['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','aura','wall_diag','wall_depth']
for n in names:
    an,i=KEY.get(n,(None,0))
    fr=frame(n,an,i); his=hiscrop(n)
    tiles=[his, onbg(fr,FILL), onbg(fr,(76,110,58))]
    S=3 if fr.width<150 else 2
    row(tiles,S).save(R+f'cmp_{n}.png'); print(n)
