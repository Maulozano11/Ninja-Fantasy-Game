from PIL import Image
import numpy as np, sys
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
L=im.mean(-1)
H,W=L.shape
def runs(mask, minlen):
    out=[]
    for i,row in enumerate(mask):
        x=0
        while x<len(row):
            if row[x]:
                s=x
                while x<len(row) and row[x]: x+=1
                if x-s>=minlen: out.append((i,s,x-1))
            else: x+=1
    return out
hl=np.zeros_like(L,bool); hl[2:-2]=(L[2:-2]-L[:-4]>6)&(L[2:-2]-L[4:]>6)&(L[2:-2]<80)
vl=np.zeros_like(L,bool); vl[:,2:-2]=(L[:,2:-2]-L[:,:-4]>6)&(L[:,2:-2]-L[:,4:]>6)&(L[:,2:-2]<80)
for r in runs(hl,40): print('H y=%d x=%d..%d'%r)
for r in runs(vl.T,40): print('V x=%d y=%d..%d'%r)
