import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from cmp import *
exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py/border.py').read().split('tot=0')[0].split('from cmp import *')[1])
# usage: holeviz.py S name:anim:i ...
S=int(sys.argv[1]); tiles=[]
for spec in sys.argv[2:]:
    n,an,i=spec.split(':'); i=int(i)
    f=frame(n,an,i); a=np.array(f); al=a[:,:,3]
    lab,nl=label(al==0)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))
    rgb=np.array(onbg(f,(76,110,58)))
    for j in range(1,nl+1):
        if j not in edge: rgb[lab==j]=(255,0,0)
    im=Image.fromarray(rgb).resize((f.size[0]*S,f.size[1]*S),Image.NEAREST)
    ImageDraw.Draw(im).text((3,3),spec,fill=(255,255,0)); tiles.append(im)
W=sum(t.size[0]+4 for t in tiles); H=max(t.size[1] for t in tiles)
out=Image.new('RGB',(W,H),(255,255,0)); x=0
for t in tiles: out.paste(t,(x,0)); x+=t.size[0]+4
fn=R+'holes_'+'_'.join(s.replace(':','') for s in sys.argv[2:])[:80]+'.png'; out.save(fn); print(fn,out.size)
