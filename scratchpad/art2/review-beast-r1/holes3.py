import sys
sys.path.insert(0,sys.argv[2])
import lab as L
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
sc=96/228
BG=np.array([34,34,44])
def hiscrop(ox,oy):
    w=275/sc; h=180/sc
    return np.asarray(ref.crop((ox,oy,ox+w,oy+h)).resize((275,180),Image.BOX)).astype(float)
for k,(ox,oy) in {0:(438,1560),5:(1104,1540)}.items():
    f=np.asarray(Image.open(R+'/ours-f%d.png'%k).convert('RGBA'))
    a=f[:,:,3]
    h=hiscrop(ox,oy)
    warm=h[:,:,0]-h[:,:,2]
    d=np.abs(h-BG).sum(2)
    hisdrawn=(warm>-2)&(d>8)
    hisdrawn=L.opening(hisdrawn)
    xmin=int((502-ox)*sc)+3; ymax=int((1975-oy)*sc)-3
    if k==5: ymax=118  # exclude dust area handled separately
    miss=(a==0)&hisdrawn
    miss[:, :xmin]=False; miss[ymax:,:]=False
    _,comps=L.label(miss)
    big=[c for c in comps if len(c)>=5]
    print(k,'ours transparent where his is warm-dark drawn:',miss.sum(),'blobs>=5:',len(big))
    for c in sorted(big,key=lambda c:-len(c))[:10]:
        ys=[p[0] for p in c]; xs=[p[1] for p in c]
        col=np.mean([h[p] for p in c],axis=0).round(0)
        print('   size',len(c),'x',min(xs),max(xs),'y',min(ys),max(ys),'his col',col)
    al=a[:,:,None]/255.
    vis=(f[:,:,:3]*al+np.array([255,0,255])*(1-al)).astype(np.uint8)
    vis[miss]=(0,255,255)
    Image.fromarray(vis).resize((275*3,180*3),Image.NEAREST).save(R+'/miss3-k%d.png'%k)
