import sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-genjutsu-set-r3')
from cmp import *
def lab(rgb):
    c=rgb/255.0
    c=np.where(c>0.04045,((c+0.055)/1.055)**2.4,c/12.92)
    M=np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz=c@M.T/np.array([0.95047,1,1.08883])
    f=np.where(xyz>0.008856,np.cbrt(xyz),7.787*xyz+16/116)
    return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],-1)
bgc=np.array([32,32,42])
names=['bolt','stream','stream_head','breath','sphere','slash','multi','hit','blast','wall','wall_diag','wall_depth']
for n in names:
    an,i=KEY.get(n,(None,0))
    fr=frame(n,an,i); his=np.array(hiscrop(n)).astype(float)
    # blur ours slightly the same way? compare ours downsampled similarly: use ours as is
    ob=np.array(onbg(fr,(32,32,42))).astype(float)
    d=np.abs(his-bgc).sum(2); art=d>45
    dE=np.sqrt(((lab(his)-lab(ob))**2).sum(-1))
    # local 5x5 mean of dE to find regions
    k=5; pad=np.pad(dE,k//2,mode='edge')
    loc=sum(pad[y:y+dE.shape[0],x:x+dE.shape[1]] for y in range(k) for x in range(k))/k/k
    yy,xx=np.unravel_index(np.argmax(np.where(art,loc,0)),loc.shape)
    print(f'{n:12s} meanDE(art) {dE[art].mean():5.1f}  p90 {np.percentile(dE[art],90):5.1f}  worst5x5 {loc[art].max():5.1f} at ({xx},{yy})')
    v=np.clip(loc*6,0,255).astype(np.uint8)
    Image.fromarray(v).resize((dE.shape[1]*3,dE.shape[0]*3),Image.NEAREST).save(R+f'de_{n}.png')
