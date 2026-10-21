import json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(ST+'manifest.json'))['sprites']
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
def frame(name,anim,i):
    m=man[name]; im=Image.open(ST+m['file']).convert('RGBA')
    r=m['anims'][anim]['row']; w,h=m['frameW'],m['frameH']
    return im.crop((i*w,r*h,(i+1)*w,(r+1)*h))
key={'bolt':('fly',0),'stream':('fly',0),'stream_head':('fly',0),'breath':('fly',0),'sphere':('fly',0),'slash':('fly',0),'multi':('fly',0),'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0)}
for n,(an,i) in key.items():
    b=rm[n]['box']; w,h=rm[n]['w'],rm[n]['h']
    H=np.array(ref.resize((w,h),Image.LANCZOS,box=tuple(b))).astype(float)
    f=frame(n,an,i); F=np.array(f).astype(float)
    bg=H[1:4,1:4].reshape(-1,3).mean(0)
    a=F[:,:,3:4]/255
    C=F[:,:,:3]*a+bg*(1-a)
    m=F[:,:,3]>200
    d=np.abs(C-H).mean(2)
    print(f'{n:12s} mean|diff| all {d.mean():5.1f}  opaque {d[m].mean():5.1f}  his mean on opaque {H[m].mean(0).round(0)} ours {C[m].mean(0).round(0)}')
