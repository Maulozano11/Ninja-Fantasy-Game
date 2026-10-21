import sys; sys.path.insert(0, sys.argv[1])
from lib import *
tot=0;bad=[]
for name,s in M['sprites'].items():
    fs=frames(name)
    for a,lst in fs.items():
        for i,f in enumerate(lst):
            tot+=1
            al=f[...,3]
            sides={'top':al[0].max(),'bot':al[-1].max(),'left':al[:,0].max(),'right':al[:,-1].max()}
            for k,v in sides.items():
                if v>0:
                    exempt = name=='beast' or (name=='stream' and k in('left','right')) or (name=='stream_head' and k=='left')
                    if not exempt: bad.append((name,a,i,k,int(v),int((al[0] if k=='top' else al[-1] if k=='bot' else al[:,0] if k=='left' else al[:,-1]).astype(bool).sum())))
            # also 1-px inset ring informational
print('frames',tot,'bad',len(bad))
for b in bad: print(b)
# margin per sprite: min distance of alpha>0 to border
for name in M['sprites']:
    fs=frames(name); m=999
    for a,lst in fs.items():
        for f in lst:
            ys,xs=np.nonzero(f[...,3])
            if len(ys)==0: continue
            H,W=f.shape[:2]
            m=min(m,ys.min(),xs.min(),H-1-ys.max(),W-1-xs.max())
    print(name,'min margin',m)
