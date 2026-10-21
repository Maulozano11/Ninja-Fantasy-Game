import sys; sys.path.insert(0,'.')
from ref import *
from PIL import Image
s,p=pieces('blast')
BG=np.array([21,21,29.])
def comp(layers, bg=BG):
    out=np.zeros(layers[0].shape+(3,))+bg
    for ix in layers:
        c=rgba(ix); a=c[...,3:4]/255; out=c[...,:3]*a+out*(1-a)
    return out
def up(c,k=3): return np.kron(c,np.ones((k,k,1)))
b=comp([p['main'],p['under']]); c=comp([p['main'],p['under'],p['seal'],p['lines'],p['sealback'],p['linesback']]); d=comp([p['main'],p['seal'],p['lines'],p['pillar'],p['loose']])
sep=np.full((s['h'],3,3),90.)
Image.fromarray(np.clip(up(np.concatenate([b,sep,c,sep,d],1),2),0,255).astype(np.uint8)).save(sys.argv[1])
ax,ay=s['anchor']
L=0.3*b[...,0]+0.59*b[...,1]+0.11*b[...,2]
yy,xx=np.mgrid[:s['h'],:s['w']]
e=((xx-ax)/84)**2+((yy-ay)/53)**2
P=p['pillar']>0
print('centre', L[(e<1)&P].mean(), 'ring band', L[(e<1)&~P].mean())
