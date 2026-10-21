import sys; sys.path.insert(0, sys.argv[1])
from lib import *
ref=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg').convert('RGB')
W0,H0=ref.size
PANEL=(31,33,46)
sy=0.98
refs=np.array(ref.resize((W0,round(H0*sy)),Image.BILINEAR)).astype(float)
# rough guesses: (x,y) of frame top-left in his ORIGINAL px, from panel boxes found earlier
guess={'bolt':(4,40),'breath':(533,38),'sphere':(661,41),'slash':(5,175),'multi':(112,180),'hit':(218,169),
 'blast':(333,175),'wall':(4,371),'wall_diag':(480,369),'aura':(354,368),'stream':(393,41),'stream_head':(459,37)}
key={'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0)}
res={}
for name,(gx,gy) in guess.items():
    an,ki=key.get(name,(None,0))
    fs=frames(name)
    an=an or list(fs)[0]
    f=fs[an][ki].astype(float)
    if name=='aura':
        b=frames('aura_back')['idle'][0]
        f=over(frames('aura')['idle'][0],b).astype(float)
    a=f[...,3]/255
    ours=f[...,:3]*a[...,None]+np.array(PANEL)*(1-a[...,None])
    h,w=a.shape
    wt=(a>0.5)
    best=None
    sx=1.0
    if name in('stream','stream_head'): 
        continue
    for dy in range(-8,9):
        for dx in range(-8,9):
            X=gx+dx; Y=round((gy)*sy)+dy
            if Y<0 or X<0 or Y+h>refs.shape[0] or X+w>refs.shape[1]: continue
            his=refs[Y:Y+h,X:X+w]
            d=np.abs(his-ours).sum(2)
            score=(d*wt).sum()/max(wt.sum(),1)
            if best is None or score<best[0]: best=(score,X,Y)
    res[name]=best
    print(name, 'best mean |diff| over opaque px %.1f at x=%d y=%d (orig y %.1f)'%(best[0],best[1],best[2],best[2]/sy))
json.dump({k:[float(v[0]),int(v[1]),int(v[2])] for k,v in res.items()},open(sys.argv[1]+'/../align.json','w'))
