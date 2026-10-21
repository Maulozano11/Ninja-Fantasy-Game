import sys, numpy as np
from PIL import Image
sys.argv=[0]
PITCH=19.318; PHASE=(0.6,0.7)
def native(a):
    H,W,_=a.shape; nx=int((W-PHASE[0])/PITCH); ny=int((H-PHASE[1])/PITCH)
    xs=[int(np.floor(PHASE[0]+k*PITCH)) for k in range(nx+1)]; ys=[int(np.floor(PHASE[1]+k*PITCH)) for k in range(ny+1)]
    out=np.zeros((ny,nx,3))
    for j in range(ny):
        for i in range(nx):
            c=a[ys[j]+3:ys[j+1]-3, xs[i]+3:xs[i+1]-3].reshape(-1,3); out[j,i]=np.median(c,axis=0)
    return np.clip(np.round(out),0,255).astype(np.int32)
a=native(np.asarray(Image.open('docs/reference/crystal-sword-owner-reference.jpg').convert('RGB')).astype(np.int32))
np.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/plate/native.npy', a)
