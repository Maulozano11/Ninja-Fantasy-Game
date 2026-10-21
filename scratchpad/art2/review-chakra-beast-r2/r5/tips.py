import sys
import numpy as np
from PIL import Image
S=sys.argv[1]
d=np.load(S+'/art2/griffin-ref/griffin-frames.npz')
F=d['frames']; T=d['top']
a=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA'))
W,H=127,93
s0=a[:,0:W]
# find offset
best=None
for oy in range(0,122-H+1):
    for ox in range(0,144-W+1):
        if (F[0,oy:oy+H,ox:ox+W]==s0).all(): best=(ox,oy); break
    if best: break
print('offset',best)
ox,oy=best
for f in range(8):
    assert (F[f,oy:oy+H,ox:ox+W]==a[:,f*W:(f+1)*W]).all(), f
sh=np.array([76+ox,43.25+oy])
prev=None
for f in range(8):
    m=T[f]==2
    ys,xs=np.where(m)
    dd=np.hypot(xs-sh[0],ys-(sh[1]+d['bobs'][f]))
    i=np.argsort(dd)[-15:]
    tip=np.array([xs[i].mean()-ox,ys[i].mean()-oy])
    tm=T[f]==3
    tys,txs=np.where(tm)
    print('f%d near-wing tip (%.1f,%.1f) r=%.1f'%(f,tip[0],tip[1],dd.max()), ' move %.1f'%(np.hypot(*(tip-prev)) if prev is not None else 0), ' tail px',int(tm.sum()), 'tail leftmost x', (txs.min()-ox) if len(txs) else None)
    prev=tip
