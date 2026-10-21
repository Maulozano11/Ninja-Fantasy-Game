import json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_poison_v3/'
man=json.load(open(ST+'manifest.json'))['sprites']
for n,m in man.items():
    if n=='beast': continue
    im=np.array(Image.open(ST+m['file']).convert('RGBA')).astype(float)
    w,h=m['frameW'],m['frameH']
    for an,a in m['anims'].items():
        F=[]
        for i in range(a['frames']):
            f=im[a['row']*h:(a['row']+1)*h,i*w:(i+1)*w]
            pre=f[:,:,:3]*f[:,:,3:4]/255
            F.append(np.dstack([pre,f[:,:,3]]))
        seq=list(range(a['frames']))+([0] if a['loop'] else [])
        D=[]
        for i,j in zip(seq[:-1],seq[1:]):
            d=np.abs(F[i]-F[j]).mean(2)
            drawn=(F[i][:,:,3]>0)|(F[j][:,:,3]>0)
            D.append(d[drawn].mean())
        print(f"{n:11s} {an:5s} drawn-mean diff per step: {' '.join(f'{x:.0f}' for x in D)}")
