import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from common import *
from PIL import ImageFilter
names=sys.argv[1:] or ['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','wall_diag','wall_depth']
for n in names:
    an,i=KEY.get(n,(None,0))
    fr=frame(n,an,i); his=hiscrop(n)
    o=np.array(onbg(fr,FILL)).astype(float); h=np.array(his).astype(float)
    d=np.sqrt(((o-h)**2).sum(2))
    # box blur 5x5
    from numpy.lib.stride_tricks import sliding_window_view
    p=np.pad(d,3,mode='edge'); bw=sliding_window_view(p,(7,7)).mean((2,3))
    H,W=d.shape
    # top 4 windows non-overlapping
    bb=bw.copy(); tops=[]
    for _ in range(5):
        y,x=np.unravel_index(np.argmax(bb),bb.shape); tops.append((x,y,round(bb[y,x],1)))
        bb[max(0,y-8):y+9,max(0,x-8):x+9]=0
    print('%-11s mean %.1f  p95 %.1f  hotspots %s'%(n,d.mean(),np.percentile(d,95),tops))
    hm=Image.fromarray(np.clip(d*2,0,255).astype(np.uint8)).convert('RGB')
    S=3 if W<150 else 2
    row([his,onbg(fr,FILL),hm],S).save(R+f'diff_{n}.png')
