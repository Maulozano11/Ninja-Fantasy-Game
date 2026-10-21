import json, base64, sys
import numpy as np
from PIL import Image
import ref
def decode(r, parts=None):
    W,H=r['w'],r['h']; L=np.zeros((H,W),np.int32)
    for name,pc in r['pieces'].items():
        if parts and name not in parts: continue
        b=base64.b64decode(pc['rle']); i=0
        for k in range(0,len(b)-1,2):
            n,v=b[k],b[k+1]
            if v:
                for j in range(n):
                    yy=pc['y']+(i+j)//pc['w']; xx=pc['x']+(i+j)%pc['w']
                    if L[yy,xx]==0 or name!='under': L[yy,xx]=v
            i+=n
    return L
def rgba(r,L):
    cols=np.array([[int(p['rgba'][k:k+2],16) for k in (1,3,5,7)] for p in r['pal']],np.uint8)
    out=np.zeros(L.shape+(4,),np.uint8); m=L>0; out[m]=cols[L[m]-1]; return out
