import json, sys, base64
import numpy as np
from PIL import Image
s=open('/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata.ts').read()
i=s.index('export const EV3_REF')
d=json.loads(s[s.index('=',i)+1:].strip().rstrip(';'))
name=sys.argv[1]; names=sys.argv[2].split(','); k=int(sys.argv[3])
r=d[name]; W,H=r['w'],r['h']
pal=np.array([[int(p['rgba'][j:j+2],16) for j in (1,3,5,7)] for p in r['pal']],float)
def dec(pc):
    out=np.zeros((H,W),int); b=base64.b64decode(pc['rle']); i=0
    for j in range(0,len(b)-1,2):
        n,v=b[j],b[j+1]
        for q in range(n):
            if v: out[pc['y']+(i+q)//pc['w'], pc['x']+(i+q)%pc['w']]=v
        i+=n
    return out
panels=[]
for grp in names:
    idx=np.zeros((H,W),int)
    for nm in grp.split('+'):
        if nm in r['pieces']:
            m=dec(r['pieces'][nm]); idx=np.where(m>0,m,idx)
    rgba=np.zeros((H,W,4)); on=idx>0; rgba[on]=pal[idx[on]-1]
    bg=np.array([34,34,45.])
    A=rgba[...,3:]/255; c=rgba[...,:3]*A+bg*(1-A)
    panels.append(c); panels.append(np.zeros((H,4,3)))
im=np.concatenate(panels,1)
Image.fromarray(im.astype(np.uint8)).resize((im.shape[1]*k,H*k),Image.NEAREST).save('p-%s.png'%name)
