import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
def prem(a):
    a=a.astype(float); return a[:,:,:3]*(a[:,:,3:4]/255)
for i in range(8):
    t=np.array(frame('stream','fly',i)); h=np.array(frame('stream_head','fly',i))
    T=prem(t); Hh=prem(h)
    # neighbour column diffs inside the tile
    inner=[np.abs(T[:,x]-T[:,x+1]).sum(1).mean() for x in range(63)]
    wrap=np.abs(T[:,63]-T[:,0]).sum(1).mean()
    joint=np.abs(T[:,63]-Hh[:,0]).sum(1).mean()
    hinner=[np.abs(Hh[:,x]-Hh[:,x+1]).sum(1).mean() for x in range(10)]
    print(f'f{i} tile inner mean {np.mean(inner):5.1f} max {np.max(inner):5.1f}@{int(np.argmax(inner))}  wrap {wrap:5.1f}  joint {joint:5.1f}  head first cols {np.mean(hinner):5.1f}')
# chain image for frame 0 and 4
S=4
rows=[]
for i in (0,2,4,6):
    t=frame('stream','fly',i); h=frame('stream_head','fly',i)
    c=Image.new('RGBA',(64*3+67,64),(32,32,42,255))
    for k in range(3): c.alpha_composite(t,(64*k,0))
    c.alpha_composite(h,(192,0))
    rows.append(c.convert('RGB').crop((96,8,259,56)))
out=Image.new('RGB',(163*S,(48*S+4)*4),(255,0,255))
for j,r in enumerate(rows): out.paste(r.resize((163*S,48*S),Image.NEAREST),(0,j*(48*S+4)))
d=ImageDraw.Draw(out)
for j in range(4):
    d.line([( (128-96)*S,j*(48*S+4)),((128-96)*S,j*(48*S+4)+8)],fill=(255,255,0))
    d.line([( (192-96)*S,j*(48*S+4)),((192-96)*S,j*(48*S+4)+8)],fill=(0,255,255))
out.save(R+'my_stream_chain_f0246.png')
