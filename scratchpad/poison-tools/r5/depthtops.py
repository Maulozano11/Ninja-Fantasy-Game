import sys
from PIL import Image; import numpy as np
for an in ('rise',):
    sh=np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float)
    W=112; n=sh.shape[1]//W; tops=[]; L=[]
    for i in range(n):
        f=sh[:, i*W:(i+1)*W]; ys=np.nonzero(f[...,3].max(1)>0)[0]; tops.append(int(ys.min()))
        L.append(((f[...,3]/255)*((0.3*f[...,0]+0.59*f[...,1]+0.11*f[...,2])/255)).mean()*1000)
    print(an, 'tops', tops, 'steps', [tops[i-1]-tops[i] for i in range(1,n)])
    print(an, 'light', [round(v) for v in L], 'max step %', round(max(abs(L[i]-L[i-1]) for i in range(1,n))/max(L)*100,1))
