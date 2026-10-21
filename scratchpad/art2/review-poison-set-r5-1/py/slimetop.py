import sys; sys.path.insert(0, sys.argv[1])
from lib import *
for name,x0,x1 in [('wall',45,250),('wall_diag',60,200)]:
    fs=frames(name,'rise')
    for i,f in enumerate(fs):
        r,g,b,a=[f[...,k].astype(int) for k in range(4)]
        gm=(a>=128)&(g>r+30)&(g>b+30)
        tops=[]
        for x in range(x0,x1):
            ys=np.nonzero(gm[:,x])[0]; tops.append(int(ys.min()) if len(ys) else -1)
        t=np.array(tops); v=t[t>=0]
        if len(v)<20: continue
        # longest run of equal top
        run=best=1
        for j in range(1,len(t)):
            run=run+1 if t[j]==t[j-1] and t[j]>=0 else 1; best=max(best,run)
        # straightness: residual from a linear fit
        xs=np.arange(len(t))[t>=0]; p=np.polyfit(xs,v,1); res=v-np.polyval(p,xs)
        print(name,i,'top rows min..max %d..%d  longest flat run %d  linear-fit residual std %.2f, slope %.3f'%(v.min(),v.max(),best,res.std(),p[0]))
