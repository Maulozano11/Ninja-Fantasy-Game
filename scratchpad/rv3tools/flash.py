import json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_poison_v3/'
man=json.load(open(ST+'manifest.json'))['sprites']
for n,m in man.items():
    im=np.array(Image.open(ST+m['file']).convert('RGBA')).astype(float)
    w,h=m['frameW'],m['frameH']
    for an,a in m['anims'].items():
        L=[];L2=[]
        for i in range(a['frames']):
            f=im[a['row']*h:(a['row']+1)*h,i*w:(i+1)*w]
            al=f[:,:,3]/255; lum=(0.299*f[:,:,0]+0.587*f[:,:,1]+0.114*f[:,:,2])/255
            L.append((al*lum).mean()*1000); L2.append((al*f[:,:,:3].max(2)/255).mean()*1000)
        L=np.array(L); pk=L.max()
        st=np.abs(np.diff(np.r_[L,L[0]] if a['loop'] else L))/pk*100
        pops=[i for i in range(1,len(L)-1) if L[i]-max(L[i-1],L[i+1])>0.1*pk]
        print(f"{n:11s} {an:5s} {a['frames']:2d}f@{a['fps']} steps% max {st.max():5.1f} at {int(st.argmax())}  pops {pops}  L={' '.join(f'{x:.0f}' for x in L)}")
