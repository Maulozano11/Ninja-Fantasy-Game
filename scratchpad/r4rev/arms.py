from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
n='fireball_goukakyu'
his=Image.open('his_'+n+'.png')
for S in (44,88):
    hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
    o=np.asarray(Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')).astype(float)
    for name,a in (('his',hb),('our',o)):
        L=oklab(a)[...,0]
        yy,xx=np.mgrid[0:S,0:S]; r=np.hypot(xx-(S-1)/2,yy-(S-1)/2)/(S/44)
        out=[]
        for r0 in range(4,22,3):
            m=(r>=r0)&(r<r0+3); out.append('%d:%.3f'%(r0,L[m].std()))
        # also local contrast: mean abs diff to neighbours
        g=np.abs(np.diff(L,axis=0)).mean()+np.abs(np.diff(L,axis=1)).mean()
        print(S,name,' '.join(out),' edge %.3f'%g)
