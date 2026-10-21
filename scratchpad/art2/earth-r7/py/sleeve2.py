import sys; sys.path.insert(0, sys.path[0])
from fr import frames
import numpy as np
for g in sys.argv[1:]:
  for nm in ('multi','bolt'):
    fs,(ax,ay)=frames(nm,'fly',g)
    tot=0; nstreak=0
    for f in fs:
        L=0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2]
        cream=(L>=185)&(f[...,3]>=200)
        # streak px: cream in a horizontal run of >= 4 whose rows above and below are not cream (a thin line)
        H,W=cream.shape
        st=np.zeros_like(cream)
        for y in range(1,H-1):
            x=0
            while x<W:
                if cream[y,x]:
                    x0=x
                    while x<W and cream[y,x]: x+=1
                    if x-x0>=4 and not cream[y-1,x0:x].any() and not cream[y+1,x0:x].any(): st[y,x0:x]=True
                else: x+=1
        st[:, ax-12:]=False   # leave the projectiles themselves out
        dark=(L<70)&(f[...,3]>=200)
        nb=np.zeros_like(st); nb[1:]|=st[:-1]; nb[:-1]|=st[1:]
        tot+=int((dark&nb).sum()); nstreak+=int(st.sum())
    print(g.split('/')[0], nm, 'streak px (all frames)', nstreak, 'dark opaque px directly above/below them', tot)
