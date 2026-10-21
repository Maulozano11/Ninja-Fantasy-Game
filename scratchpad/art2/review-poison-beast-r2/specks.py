import sys
from PIL import Image
import numpy as np
sp=np.array(Image.open(sys.argv[1]).convert('RGBA')).astype(int)
W=172
def label(mask):
  H,Wd=mask.shape; lab=np.zeros(mask.shape,int); n=0
  for y in range(H):
    for x in range(Wd):
      if mask[y,x] and not lab[y,x]:
        n+=1; st=[(y,x)]; lab[y,x]=n
        while st:
          cy,cx=st.pop()
          for dy in (-1,0,1):
            for dx in (-1,0,1):
              ny,nx=cy+dy,cx+dx
              if 0<=ny<H and 0<=nx<Wd and mask[ny,nx] and not lab[ny,nx]:
                lab[ny,nx]=n; st.append((ny,nx))
  return lab,n
for i in range(8):
  f=sp[:,i*W:(i+1)*W]
  a=f[...,3]>=75
  lab,n=label(a)
  out=[]
  for j in range(1,n+1):
    ys,xs=np.where(lab==j)
    if len(ys)<=3:
      out.append((int(xs.mean()),int(ys.mean()),len(ys),tuple(int(v) for v in f[ys[0],xs[0]])))
  print('f%d comps(a>=75)=%d tiny=%d'%(i,n,len(out)))
  for o in out: print('   ',o)
