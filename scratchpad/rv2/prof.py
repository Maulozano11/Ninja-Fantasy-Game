import sys
from PIL import Image; import numpy as np
exec(open('cmp.py').read().split('stats={}')[0])
name=sys.argv[1]; y0,y1=int(sys.argv[2]),int(sys.argv[3]); xs=int(sys.argv[4]) if len(sys.argv)>4 else 40
anim,fi,(hx,hy),s=CFG[name]; m=M[name]; W,H=m['frameW'],m['frameH']; ax,ay=m['anchor']
o=np.asarray(frame(name,anim,fi),float); h=np.asarray(his(name,W,H,ax,ay,hx,hy,s),float)
hd=np.abs(h-np.array(BG)).sum(-1)
ob=np.asarray(on(frame(name,anim,fi),BG),float)
for x in range(0,xs):
    print(x, 'ourA %5.0f'%o[y0:y1,x,3].mean(), 'hisDiff %5.0f'%hd[y0:y1,x].mean(), 'ourL %5.0f hisL %5.0f'%(ob[y0:y1,x].mean(), h[y0:y1,x].mean()))
