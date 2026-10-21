import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
ch=Image.open(A+'vfx-genjutsu-v3-character.png').convert('RGBA')
S=4
frames=[int(v) for v in sys.argv[1].split(',')]; bgk=sys.argv[2]
bg=(32,32,42) if bgk=='d' else (76,110,58)
his=hiscrop('aura')
tiles=[his]
for f in frames:
    c=Image.new('RGBA',(91,134),bg+(255,))
    c.alpha_composite(frame('aura_back','idle',f))
    c.alpha_composite(ch,(47-64,116-120))
    c.alpha_composite(frame('aura','idle',f))
    tiles.append(c.convert('RGB'))
out=Image.new('RGB',(len(tiles)*(91*S+4),134*S),(255,255,0))
for j,t in enumerate(tiles): out.paste(t.resize((91*S,134*S),Image.NEAREST),(j*(91*S+4),0))
fn=R+f'aura_{"-".join(map(str,frames))}_{bgk}.png'; out.save(fn); print(fn,out.size)
