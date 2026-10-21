import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/tools')
from harness import load
import numpy as np
from PIL import Image
tag=sys.argv[1]
ns=load(marker="def stepped(A):", src=sys.argv[2] if len(sys.argv)>2 else None)
M='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/crows-work/r3/'
F=ns['filled_vortex']() if 'filled_vortex' in ns else None
rgb,a=ns['unpremul'](ns['vortex_sheet'](0,1.0))
P=ns['PADS']
rgb=rgb[P:-P,P:-P]; a=a[P:-P,P:-P]
bg=np.array([93,107,87],np.float32)
im=rgb*a[...,None]+bg*(1-a[...,None])
L=ns['LAY']['L']['rgb']
both=np.concatenate([L,np.full((L.shape[0],6,3),255.0),im],1)
Image.fromarray(np.clip(both,0,255).astype(np.uint8)).resize((both.shape[1]*3,both.shape[0]*3),Image.NEAREST).save(M+f'z-vtx-sheet-{tag}.png')
