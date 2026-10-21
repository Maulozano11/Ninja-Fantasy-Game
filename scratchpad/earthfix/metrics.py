import json, sys, os
import numpy as np
from PIL import Image
G=sys.argv[1]
only=sys.argv[2].split(',') if len(sys.argv)>2 else None
man=json.load(open(os.path.join(G,'manifest.json')))['sprites']
def enclosed(a):
    clear=a==0
    H,W=a.shape
    seen=np.zeros_like(clear)
    st=[(y,x) for y in range(H) for x in (0,W-1) if clear[y,x]]+[(y,x) for x in range(W) for y in (0,H-1) if clear[y,x]]
    for y,x in st: seen[y,x]=True
    while st:
        y,x=st.pop()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            u,v=y+dy,x+dx
            if 0<=u<H and 0<=v<W and clear[u,v] and not seen[u,v]:
                seen[u,v]=True; st.append((u,v))
    return int((clear&~seen).sum())
for n,m in man.items():
    if n=='beast' or (only and n not in only): continue
    sh=np.asarray(Image.open(os.path.join(G,m['file'])).convert('RGBA')).astype(float)
    for an,d in m['anims'].items():
        ph=[];enc=[];en=[]
        for i in range(d['frames']):
            f=sh[d['row']*m['frameH']:(d['row']+1)*m['frameH'], i*m['frameW']:(i+1)*m['frameW']]
            a=f[...,3]
            on=a>0
            p=np.pad(on,1)
            pin=(~on)&p[:-2,1:-1]&p[2:,1:-1]&p[1:-1,:-2]&p[1:-1,2:]
            ph.append(int(pin.sum())); enc.append(enclosed(a))
            L=(0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2])/255
            en.append((a/255*L).sum())
        en=np.array(en); 
        jumps=np.abs(np.diff(en))/np.maximum(en[:-1],1e-6)
        print('%-11s %-5s n=%2d pin %s enc %s energy %s maxjump %.2f'%(n,an,d['frames'],ph,enc,[int(e) for e in en],jumps.max() if len(jumps) else 0))
