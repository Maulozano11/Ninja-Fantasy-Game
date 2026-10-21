import json,base64,re,sys
import numpy as np
from PIL import Image
def load(path='/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata.ts'):
    t=open(path).read()
    i=t.index('export const EV3_REF')
    j=t.index('=',i)+1
    body=t[j:].strip().rstrip(';')
    return json.loads(body)
def pal(r):
    out=[]
    for p in r['pal']:
        h=p['rgba'];out.append((int(h[1:3],16),int(h[3:5],16),int(h[5:7],16),int(h[7:9],16),p['kind']))
    return out
def piece(r,name):
    w,h=r['w'],r['h']; L=np.zeros((h,w),np.int32)
    pc=r['pieces'].get(name)
    if not pc: return L
    b=base64.b64decode(pc['rle']); i=0
    for k in range(0,len(b)-1,2):
        n,v=b[k],b[k+1]
        if v:
            for j in range(n):
                L[pc['y']+(i+j)//pc['w'], pc['x']+(i+j)%pc['w']]=v
        i+=n
    return L
def render(r,L):
    P=pal(r); h,w=L.shape; a=np.zeros((h,w,4),np.uint8)
    for v in np.unique(L):
        if v==0: continue
        c=P[v-1]; a[L==v]=c[:4]
    return Image.fromarray(a,'RGBA')
