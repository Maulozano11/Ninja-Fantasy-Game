import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r4/py')
from common import *
names=['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','aura','wall_diag','wall_depth']
for n in names:
    an,i=KEY.get(n,(None,0))
    fr=frame(n,an,i); a=np.array(fr).astype(float)
    M=a[:,:,3]>200
    ours=np.array(onbg(fr,FILL)).astype(float)
    best=None
    for ddy in np.arange(-2,2.01,0.5):
        for ddx in np.arange(-2,2.01,0.5):
            h=np.array(hiscrop(n,ddx,ddy)).astype(float)
            e=np.abs(h-ours)[M].mean()
            if best is None or e<best[0]: best=(e,ddx,ddy)
    e0=np.abs(np.array(hiscrop(n)).astype(float)-ours)[M].mean()
    print('%-11s err@0 %.2f best %.2f at dx %+.1f dy %+.1f  opaque px %d'%(n,e0,best[0],best[1],best[2],M.sum()))
