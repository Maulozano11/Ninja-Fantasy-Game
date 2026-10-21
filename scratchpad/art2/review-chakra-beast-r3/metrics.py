import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
sh=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png').convert('RGBA')).astype(float)
FW,FH=127,93
fr=[sh[:,i*FW:(i+1)*FW] for i in range(8)]
L=[]
for i,f in enumerate(fr):
    a=f[...,3]/255; y=(0.299*f[...,0]+0.587*f[...,1]+0.114*f[...,2])/255
    L.append((a*y).mean())
    # border
    b=np.concatenate([f[0,:,3],f[-1,:,3],f[:,0,3],f[:,-1,3]])
    op=(f[...,3]>0)
    print(i,'light %.4f'%L[-1],'border nonzero',int((b>0).sum()),'opaque',int((f[...,3]==255).sum()),'any',int(op.sum()),'meanluma covered %.3f'%((a*y).sum()/a.sum()))
pk=max(L)
for i in range(8):
    j=(i+1)%8
    print(i,'->',j,'dL/peak %.3f'%((L[j]-L[i])/pk),'ratio %.3f'%(L[j]/L[i]))
# silhouette step & pixel change
for i in range(8):
    j=(i+1)%8
    A=fr[i][...,3]==255; B=fr[j][...,3]==255
    x=(A^B).sum()/max(A.sum(),B.sum())
    diff=(np.abs(fr[i]-fr[j]).sum(2)>30).mean()
    print(i,'->',j,'silh xor %.3f'%x,'px changed %.3f'%diff)
# palette
cols=set(map(tuple,sh.reshape(-1,4).astype(int)))
print('colours',len(cols))
dark=[c for c in cols if c[3]>0 and 0.299*c[0]+0.587*c[1]+0.114*c[2]<18]
print('near-black',dark)
