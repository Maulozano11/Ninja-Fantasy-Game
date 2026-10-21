from fr import *
from morph import *
import sys
# ground-coloured px inside solid areas, composited on his dark panel colour: alpha < 100 inside the
# area closed (r=2) from alpha >= 200, counted where the composite stays within 30 of the panel colour
P=np.array([36,36,48])
for g in [A+'/earth-r6/before/vfx_earth_v3', sys.argv[1]]:
    fs,_=frames('blast','blast',g); out=[]
    for f in fs:
        a=f[:,:,3].astype(float)/255; c=f[:,:,:3]*a[...,None]+P*(1-a[...,None])
        S=f[:,:,3]>=200; C=close(S,2)
        near=np.abs(c-P).max(-1)<60
        out.append(int((C&~S&near).sum()))
    print(g.split('/')[-2][:6],'blast ground-coloured px in solid:',out)
