import sys; sys.path.insert(0, sys.path[0])
from fr import frames
import numpy as np
for g in sys.argv[1:]:
  for nm, xmax in (('multi', 55), ('bolt', 80)):
    fs,_=frames(nm,'fly',g)
    tot=0; tc=0
    for i,f in enumerate(fs):
        L=0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2]
        cream=(L>=180)&(f[...,3]>=200)
        dark=(L<70)&(f[...,3]==255)
        up=np.zeros_like(cream); up[1:]=cream[:-1]
        dn=np.zeros_like(cream); dn[:-1]=cream[1:]
        sl=dark&(up|dn); sl[:, xmax:]=False
        c2=cream.copy(); c2[:, xmax:]=False
        tot+=sl.sum(); tc+=c2.sum()
    print(g, nm, 'cream px (trail, all frames)', int(tc), 'dark sleeve px', int(tot))
