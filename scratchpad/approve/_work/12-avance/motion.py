import json, sys
import numpy as np
from PIL import Image
W=sys.argv[1]
m=json.load(open(W+'/snap/new/manifest.json'))['sprites']
def frames(p,fw,fh,nf,row=0):
    im=np.array(Image.open(p).convert('RGBA')).astype(int)
    return [im[row*fh:(row+1)*fh,f*fw:(f+1)*fw] for f in range(nf)]
def report(n,fr):
    heads=[];diffs=[]
    for f in fr:
        op=f[...,3]>128
        ys,xs=np.nonzero(op)
        xr=xs.max(); yy=int(np.median(ys[xs>=xr-6]))
        heads.append((int(xr),yy))
    for i in range(len(fr)):
        a=fr[i];b=fr[(i+1)%len(fr)]
        diffs.append(int(((np.abs(a-b).sum(-1))>40).sum()))
    widths=[]
    for f in fr:
        ys,xs=np.nonzero(f[...,3]>128); widths.append((int(xs.max()-xs.min()+1),int(ys.max()-ys.min()+1)))
    print(f"{n:10s} head(x,y)={heads}\n           step-diffs(px changed, last=loop seam)={diffs}\n           body WxH={widths[0]}")
p=json.load(open(W+'/snap/old/fire.manifest.json')); p=p.get('sprites',p)['beast']
report('PHOENIX',frames(W+'/snap/old/fire.png',p['frameW'],p['frameH'],6))
for n,s in m.items():
    report(n,frames(W+'/snap/new/'+s['file'],s['frameW'],s['frameH'],s['anims']['fly']['frames']))
