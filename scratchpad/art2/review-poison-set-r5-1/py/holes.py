import sys; sys.path.insert(0, sys.argv[1])
from lib import *
names=sys.argv[2].split(',')
for name in names:
    fs=frames(name)
    for an,lst in fs.items():
        out=[]
        for i,f in enumerate(lst):
            al=f[...,3].astype(int)
            res=[]
            for thr in (128,):
                enc=enclosed(al,thr)
                L,n=label(enc,4)
                sizes=sorted([int((L==k).sum()) for k in range(1,n+1)],reverse=True)
                res.append((n,sum(sizes),sizes[:4]))
            # relative threshold: 98% of strongest alpha  
            mx=al.max(); enc2=enclosed(al, 0.98*mx) if mx>0 else np.zeros_like(al,bool)
            # pockets with alpha<64 surrounded (true holes)
            enc3=enclosed(al,32)
            L3,n3=label(enc3,4)
            out.append('f%d: <128: %d pockets %d px %s | <98%%max: %d px | <32: %d pockets %d px'%(i,res[0][0],res[0][1],res[0][2],int(enc2.sum()),n3,int(enc3.sum())))
        print(name,an); print('  '+'\n  '.join(out))
