import sys
from PIL import Image
import numpy as np
L={'K':'#181639','N':'#192351','D':'#1b3067','d':'#1d3d7f','e':'#1e4c90','b':'#225da1','f':'#2b6da9','B':'#2b7dc0','m':'#388fc7','g':'#3ea0cf','c':'#48b2da','h':'#53c6e3','s':'#62d9ed','C':'#79e8f2','P':'#a0f4f8','W':'#d8fcff'}
keys=list(L); cols=np.array([[int(v[i:i+2],16) for i in (1,3,5)] for v in L.values()],float)
def lab(c):
  c=c/255; c=np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
  M1=np.array([[0.4122214708,0.5363325363,0.0514459929],[0.2119034982,0.6806995451,0.1073969566],[0.0883024619,0.2817188376,0.6299787005]])
  lms=np.cbrt(c@M1.T)
  M2=np.array([[0.2104542553,0.793617785,-0.0040720468],[1.9779984951,-2.428592205,0.4505937099],[0.0259040371,0.7827717662,-0.808675766]])
  return lms@M2.T
pl=lab(cols)
fn=sys.argv[1]; x0,x1,y0,y1=map(int,sys.argv[2:6])
a=np.asarray(Image.open(fn).convert('RGB'),float); H,W=a.shape[:2]
la=lab(a.reshape(-1,3))
d=((la[:,None,:]-pl[None])**2*np.array([1.96,1,1])).sum(-1).argmin(1).reshape(H,W)
print('     '+''.join(str((x//10)%10) for x in range(x0,x1)))
print('     '+''.join(str(x%10) for x in range(x0,x1)))
for y in range(y0,y1): print('%3d  '%y+''.join(keys[i] for i in d[y,x0:x1]))
