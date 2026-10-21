from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
im=np.asarray(Image.open(S+'/art2/REF-chakra-set-owner.jpg').convert('RGB')).astype(int)
for name,(x0,x1,y0,y1) in [('wall',(285,332,400,530)),('wallv',(130,182,800,930)),('blast',(520,572,195,320)),('diag',(705,760,470,600))]:
    c=im[y0:y1,x0:x1]
    bg=np.array([21,19,25]) if name!='wallv' else np.median(c[:4].reshape(-1,3),axis=0)
    d=np.abs(c-bg).sum(2)
    prof=(d>45).sum(1)
    ys=[y0+i for i,v in enumerate(prof) if v>=2]
    print(name, bg, 'top',ys[0],'bot',ys[-1],'h',ys[-1]-ys[0]+1)
    print('  per-row counts near top', list(prof[ys[0]-y0-2:ys[0]-y0+5]), 'near bot', list(prof[ys[-1]-y0-5:ys[-1]-y0+3]))
