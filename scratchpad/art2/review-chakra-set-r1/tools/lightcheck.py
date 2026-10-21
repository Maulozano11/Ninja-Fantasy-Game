import sys; sys.path.insert(0,'.')
from common import *
for name,sp in MAN['sprites'].items():
    for an,a in sp['anims'].items():
        fr=frames(name,an)
        L=[light(f) for f in fr]
        pk=max(L)
        steps=[abs(L[i+1]-L[i]) for i in range(len(L)-1)]
        if a['loop']: steps.append(abs(L[0]-L[-1]))
        mx=max(steps)/pk*100 if pk else 0
        # pixel change: mean abs rgba diff between neighbors (premultiplied)
        P=[np.asarray(f).astype(float) for f in fr]
        def pm(x): return np.concatenate([x[...,:3]*x[...,3:4]/255, x[...,3:4]],2)
        D=[np.abs(pm(P[i+1])-pm(P[i])).mean() for i in range(len(P)-1)]
        if a['loop']: D.append(np.abs(pm(P[0])-pm(P[-1])).mean())
        # border
        bad=[]
        for i,f in enumerate(fr):
            al=np.asarray(f)[...,3]
            e=[al[0,:].max(),al[-1,:].max(),al[:,0].max(),al[:,-1].max()]
            if max(e)>0: bad.append((i,[int(x) for x in e]))
        print('%-12s %-6s n=%2d fps=%2d light: %s  maxstep %.1f%%'%(name,an,a['frames'],a['fps'],' '.join('%d'%round(x) for x in L),mx))
        print('   pixdiff: %s'%' '.join('%.1f'%d for d in D))
        if bad: print('   BORDER(top,bot,left,right):',bad[:4], '... total',len(bad))
