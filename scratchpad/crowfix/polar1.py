import numpy as np
from PIL import Image
ref = np.asarray(Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg').convert('RGB')).astype(np.float32)
cx, cy = 383.0, 933.0
R = 88; NT = 720
rr = np.arange(0, R, 0.5)
th = np.arange(NT) * 2*np.pi/NT
X = cx + rr[:,None]*np.cos(th[None,:]); Y = cy + rr[:,None]*np.sin(th[None,:])
x0=np.floor(X).astype(int); y0=np.floor(Y).astype(int); fx=(X-x0)[...,None]; fy=(Y-y0)[...,None]
im = (ref[y0,x0]*(1-fx)+ref[y0,x0+1]*fx)*(1-fy)+(ref[y0+1,x0]*(1-fx)+ref[y0+1,x0+1]*fx)*fy
Image.fromarray(np.clip(im,0,255).astype(np.uint8)).resize((NT*2, len(rr)*2), Image.NEAREST).save('dbg/polar-L.png')
# also a 3x crop of the vortex area
Image.fromarray(ref[int(cy-100):int(cy+90), int(cx-110):int(cx+110)].astype(np.uint8)).resize((220*4,190*4), Image.NEAREST).save('dbg/vortex-4x.png')
