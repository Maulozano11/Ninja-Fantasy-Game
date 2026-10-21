import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
sh=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(int)
FW,FH=127,93
fr=[sh[:,i*FW:(i+1)*FW] for i in range(8)]
def label(m):
    H,W=m.shape; lab=np.zeros((H,W),int); k=0; comps=[]
    for y in range(H):
        for x in range(W):
            if m[y,x] and not lab[y,x]:
                k+=1; st=[(y,x)]; lab[y,x]=k; pts=[]
                while st:
                    a,b=st.pop(); pts.append((a,b))
                    for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                        c,d=a+da,b+db
                        if 0<=c<H and 0<=d<W and m[c,d] and not lab[c,d]:
                            lab[c,d]=k; st.append((c,d))
                comps.append(pts)
    return comps
A=[f[...,3]>0 for f in fr]
for i in range(8):
    p=A[(i-1)%8]; n=A[(i+1)%8]; c=A[i]
    on=c&~p&~n; off=~c&p&n
    for nm,m in [('on-blip',on),('hole-blip',off)]:
        cs=label(m)
        big=[(len(q),(int(np.mean([t[1] for t in q])),int(np.mean([t[0] for t in q])))) for q in cs if len(q)>=3]
        print(i,nm,'total',int(m.sum()),'clusters>=3 (size,(x,y)):',big)
for i in range(8):
    op=fr[i][...,3]==255
    # holes = transparent comps not touching border
    cs=label(~op)
    H,W=op.shape
    hs=[q for q in cs if not any(a in(0,H-1) or b in (0,W-1) for a,b in q)]
    print(i,'enclosed transparent comps',len(hs),'sizes',sorted([len(q) for q in hs],reverse=True)[:10], [(int(np.mean([t[1] for t in q])),int(np.mean([t[0] for t in q]))) for q in hs if len(q)>=2][:10])
