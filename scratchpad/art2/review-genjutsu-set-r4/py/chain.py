import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
S=int(sys.argv[1]); frames=[int(v) for v in sys.argv[2].split(',')]; bgk=sys.argv[3] if len(sys.argv)>3 else 'd'
bg=(32,32,42) if bgk=='d' else (76,110,58)
k=rm['stream']['k']
# his panel: braid from x ~ 336 to 588 (three periods 84) + head 588..
hx0=588-3*84; hx1=588+67/k
his=ref.resize((int(round((hx1-hx0)*k)),64),Image.BOX,box=(hx0,55-0,hx1,55+64/k))
rows=[his]
for f in frames:
    c=Image.new('RGBA',(64*3+67,64),bg+(255,))
    t=frame('stream','fly',f); h=frame('stream_head','fly',f)
    for j in range(3): c.alpha_composite(t,(64*j,0))
    # head anchor 32,32 placed where? head starts at the tile end (stream anchor 0 per tile)
    c.alpha_composite(h,(192,0))
    rows.append(c.convert('RGB'))
W=max(r.size[0] for r in rows)
out=Image.new('RGB',(W*S,len(rows)*(64*S+4)),(255,255,0))
for j,r in enumerate(rows): out.paste(r.resize((r.size[0]*S,64*S),Image.NEAREST),(0,j*(64*S+4)))
fn=R+f'chain_{"-".join(map(str,frames))}_{bgk}.png'; out.save(fn); print(fn,out.size)
