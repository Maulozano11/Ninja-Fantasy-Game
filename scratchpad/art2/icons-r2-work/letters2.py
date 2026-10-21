import sys
from PIL import Image
import numpy as np
pal=sys.argv[2].split(',')
keys='0123456789ABCDEFGHIJ'[:len(pal)]
cols=np.array([[int(v[i:i+2],16) for i in (1,3,5)] for v in pal],float)
def lab(c):
  c=c/255; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
  M1=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
  lms=np.cbrt(c@M1.T)
  M2=np.array([[0.2104542553,0.793617785,-0.0040720468],[1.9779984951,-2.428592205,0.4505937099],[0.0259040371,0.7827717662,-0.808675766]])
  return lms@M2.T
pl=lab(cols)
a=np.asarray(Image.open(sys.argv[1]).convert('RGB'),float); H,W=a.shape[:2]
la=lab(a.reshape(-1,3))
d=((la[:,None,:]-pl[None])**2*np.array([1.96,1,1])).sum(-1).argmin(1).reshape(H,W)
print('    '+''.join(str((x//10)%10) for x in range(W)))
print('    '+''.join(str(x%10) for x in range(W)))
for y in range(H): print('%2d  '%y+''.join(keys[i] for i in d[y]))
for k,p in zip(keys,pal): print(k,p,end='  ')
print()
