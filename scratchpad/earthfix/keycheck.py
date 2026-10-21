import json, sys
import numpy as np
from PIL import Image
A=sys.argv[1]; REV=A+'/earth-v3-work/rev/'
G=A+'/staging/vfx_earth_v3/'
man=json.load(open(G+'manifest.json'))['sprites']
anc=json.load(open(REV+'his-anchors.json'))
KEY={'hit':('hit',3),'multi_hit':('hit',3),'blast':('blast',4)}
ok=0
for n,m in man.items():
    if n=='beast': continue
    an=m['anims']; a,i=('idle',0) if 'idle' in an and 'rise' in an else KEY.get(n,(list(an)[0],0))
    fw,fh=m['frameW'],m['frameH']; r=an[a]['row']
    f=np.asarray(Image.open(G+m['file']).convert('RGBA'))[r*fh:(r+1)*fh,i*fw:(i+1)*fw].astype(int)
    d=np.load(REV+'k-%s.npz'%n); idx=d['idx']; pal=d['pal']
    ref=np.zeros(idx.shape+(4,),int); on=idx>0; ref[on]=pal[idx[on]-1].round().astype(int)
    hx,hy=anc[n]; ax,ay=m['anchor']
    if n=='stream':  # the tile: frame rows are the tile's 64 rows placed at the line
        hx,hy=0,32
    # place both on a common canvas
    L=max(ax,hx); T=max(ay,hy); R=max(fw-ax,idx.shape[1]-hx); B=max(fh-ay,idx.shape[0]-hy)
    c1=np.zeros((T+B,L+R,4),int); c2=c1.copy()
    c1[T-ay:T-ay+fh, L-ax:L-ax+fw]=f
    c2[T-hy:T-hy+idx.shape[0], L-hx:L-hx+idx.shape[1]]=ref
    diff=(np.abs(c1-c2).sum(-1)>0).sum()
    print('%-11s key %s[%d] differs from his decoded key frame in %d px'%(n,a,i,diff))
    ok+= diff==0
print('identical:',ok,'of',len(man)-1)
