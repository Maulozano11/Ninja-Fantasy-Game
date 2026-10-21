import runpy, sys, numpy as np
sys.argv=['x','/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg','/tmp/x.ts']
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    g=runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/cobra-from-ref.py')
fly=g['fly']; MP=np.concatenate([g['MISTPAL'],g['OVERPAL']]).astype(int)
L=np.array([0.3,0.55,0.15])
for i,f in enumerate(fly):
    rgb=f[...,:3].astype(int); a=f[...,3]/255.
    ismist=np.zeros(a.shape,bool)
    for c in MP: ismist|=(rgb==c).all(2)
    ismist&=a>0
    lum=rgb@L/255.
    print(i,'body',round((a*lum*~ismist).mean()*1000,2),'mist',round((a*lum*ismist).mean()*1000,2),'body px',int((~ismist&(a>0)).sum()),'mist px',int(ismist.sum()))
