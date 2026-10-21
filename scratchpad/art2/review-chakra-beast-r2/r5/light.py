import sys
from PIL import Image
import numpy as np
S=sys.argv[1]
a=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)/255
W,H=127,93
L=[];sil=[];fr=[]
for f in range(8):
    x=a[:,f*W:(f+1)*W]; fr.append(x)
    luma=0.299*x[...,0]+0.587*x[...,1]+0.114*x[...,2]
    L.append((x[...,3]*luma).mean())
    sil.append(x[...,3]>=1)
pk=max(L)
print('light',[round(v,4) for v in L])
print('step/peak',[round(abs(L[(i+1)%8]-L[i])/pk,3) for i in range(8)])
print('ratio',[round(L[(i+1)%8]/L[i],3) for i in range(8)])
for i in range(8):
    j=(i+1)%8
    a1,a2=sil[i],sil[j]
    print('sil step %d->%d'%(i,j), round((a1^a2).sum()/max(a1.sum(),a2.sum()),3), 'opaque',a1.sum())
# per-pixel abs change of premultiplied luma
for i in range(8):
    j=(i+1)%8
    p=lambda x:(x[...,3]*(0.299*x[...,0]+0.587*x[...,1]+0.114*x[...,2]))
    d=np.abs(p(fr[j])-p(fr[i]))
    print('pix change %d->%d mean %.4f  >0.3: %d'%(i,j,d.mean(),(d>0.3).sum()))
# quadrant light: per region
for name,(x0,y0,x1,y1) in {'UL sky':(0,0,50,40),'wing zone':(0,0,90,50),'low-left':(0,50,60,93),'head':(90,0,127,60)}.items():
    v=[ (fr[f][y0:y1,x0:x1,3]*(0.299*fr[f][y0:y1,x0:x1,0]+0.587*fr[f][y0:y1,x0:x1,1]+0.114*fr[f][y0:y1,x0:x1,2])).mean() for f in range(8)]
    print(name,[round(t,3) for t in v], 'max ratio',round(max(max(v[(i+1)%8]/v[i],v[i]/v[(i+1)%8]) for i in range(8)),2))
