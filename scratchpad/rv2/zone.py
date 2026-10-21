import sys
from PIL import Image; import numpy as np, colorsys
exec(open('cmp.py').read().split('stats={}')[0])
name=sys.argv[1]; zones=[tuple(map(int,z.split(','))) for z in sys.argv[2:]]
anim,fi,(hx,hy),s=CFG[name]; m=M[name]; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']
ours=frame(name,anim,fi)
if name=='aura':
    back=frame('aura_back',anim,fi); comp=Image.new('RGBA',(W,H),(0,0,0,0)); comp.alpha_composite(back); comp.alpha_composite(ours); ours=comp
h=np.asarray(his(name,W,H,ax,ay,hx,hy,s),float); o=np.asarray(on(ours,BG),float)
def st(a):
    d=np.abs(a-np.array(BG)).sum(-1)>60; c=a[d]
    mx=c.max(1); mn=c.min(1); sat=(mx-mn)/np.maximum(mx,1)
    return d.sum(), c.mean(0).round(0), sat.mean().round(2), np.percentile(c.sum(1)/3,[50,90,99]).round(0)
for z in zones:
    x0,y0,x1,y1=z
    print(z,'his',st(h[y0:y1,x0:x1]),'\n   ours',st(o[y0:y1,x0:x1]))
