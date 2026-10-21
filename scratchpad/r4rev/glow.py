from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
n='kirin_thunder'
his=Image.open('his_'+n+'.png')
for S in (44,88):
    hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
    o=np.asarray(Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')).astype(float)
    k=S/44
    for name,a in (('his',hb),('our',o)):
        L=oklab(a)[...,0]
        reg=L[int(18*k):int(34*k),int(18*k):int(40*k)]
        print(S,name,'mouth region: L>0.9 %d  L>0.85 %d  mean %.3f'%((reg>0.9).sum(),(reg>0.85).sum(),reg.mean()))
        ys,xs=np.where(reg>0.9); 
        if len(xs): print('    bright centroid', round(xs.mean()/k+18,1), round(ys.mean()/k+18,1))
