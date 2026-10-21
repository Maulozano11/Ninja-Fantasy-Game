import json, sys, colorsys
import numpy as np
from PIL import Image
W=sys.argv[1]
m=json.load(open(W+'/snap/tents/manifest.json'))['sprites']
am=json.load(open(W+'/snap/tents/approved_manifest.json'))
am=am.get('sprites',am)
items=[('tent_large',m['tent_large'],W+'/snap/tents/tent_large.png'),('tent_small',m['tent_small'],W+'/snap/tents/tent_small.png'),('approved',am['tent'],W+'/snap/tents/approved_tent.png')]
for n,s,p in items:
    im=np.array(Image.open(p).convert('RGBA')).astype(int)
    fw,fh=s['frameW'],s['frameH']
    for an,a in s['anims'].items():
        for f in range(a['frames']):
            fr=im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw]
            al=fr[...,3]; op=al>0
            ys,xs=np.nonzero(op)
            e={'top':int(op[0].sum()),'bot':int(op[-1].sum()),'left':int(op[:,0].sum()),'right':int(op[:,-1].sum())}
            semi=int(((al>0)&(al<255)).sum())
            # odd colours: magenta/pink/green/cyan saturated
            odd=[]
            for y,x in zip(ys,xs):
                r,g,b,aa=fr[y,x]
                h,l,sat=colorsys.rgb_to_hls(r/255,g/255,b/255)
                hd=h*360
                if sat>0.3 and l>0.15 and (hd>70 and hd<330): odd.append((x,y,(r,g,b,aa),int(hd)))
            print(n,an,f,'bbox',(xs.min(),ys.min(),xs.max(),ys.max()),'edges',e,'semi',semi,'odd',len(odd),odd[:5])
    if n!='approved':
        # frame difference
        fr=[im[0:fh,f*fw:(f+1)*fw] for f in range(s['anims']['idle']['frames'])]
        for f in range(1,len(fr)):
            d=(np.abs(fr[f]-fr[0]).sum(-1)>0)
            ys,xs=np.nonzero(d)
            print('  diff f0-f%d'%f,int(d.sum()),(xs.min(),ys.min(),xs.max(),ys.max()) if len(xs) else None)
