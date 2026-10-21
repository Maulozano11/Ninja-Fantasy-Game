import json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'
im=np.array(Image.open(ST+'blast.png').convert('RGBA')).astype(int)
W=264
for i in range(16):
    f=im[:,i*W:(i+1)*W]
    a=f[:,:,3]
    band=a[:,85:145]
    rows=np.where((band>200).sum(1)>20)[0]
    top=rows.min() if len(rows) else -1
    # width of pillar at row 60, 90
    def width(y):
        r=f[y,60:170]; m=(r[:,3]>200)&(r[:,1]>r[:,0])
        idx=np.where(m)[0]; return (idx.min()+60,idx.max()+60) if len(idx) else None
    # pool extent at row 140
    r=a[140]; idx=np.where(r>200)[0]
    print(i,'pillar top',top,'w@40',width(40),'w@80',width(80),'pool@140',(idx.min(),idx.max()) if len(idx) else None, 'opaque px',(a>200).sum())
