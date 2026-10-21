import sys
import numpy as np
from PIL import Image
S=sys.argv[1]
sh=np.asarray(Image.open(S+'/art2/staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(float)
W,H=176,105; n=sh.shape[1]//W
print('sheet',sh.shape,'frames',n)
fr=[sh[:,i*W:(i+1)*W] for i in range(n)]
L=[];op=[];alpha=[]
for i,f in enumerate(fr):
    a=f[...,3]/255; luma=(0.299*f[...,0]+0.587*f[...,1]+0.114*f[...,2])/255
    L.append((a*luma).mean()*1000); op.append((f[...,3]>0).sum()); alpha.append(a.sum())
    b=np.concatenate([f[0,:,3],f[-1,:,3],f[:,0,3],f[:,-1,3]])
    print(i,'light %.2f'%L[-1],'opaque',op[-1],'alpha_sum %.0f'%alpha[-1],'border_opaque',(b>0).sum(), 'semi', ((f[...,3]>0)&(f[...,3]<255)).sum())
pk=max(L)
print('steps %peak', ['%.1f'%((L[(i+1)%n]-L[i])/pk*100) for i in range(n)])
print('opaque steps %', ['%.1f'%(abs(op[(i+1)%n]-op[i])/max(op)*100) for i in range(n)])
# silhouette xor of alpha>128
for i in range(n):
    a=fr[i][...,3]>128; b=fr[(i+1)%n][...,3]>128
    print('xor %d->%d %.1f%%'%(i,(i+1)%n,(a^b).sum()/(a|b).sum()*100))
# unique colors
cols=set()
for f in fr:
    m=f[...,3]>0
    for c in f[m].astype(int): cols.add(tuple(c))
print('unique rgba',len(cols))
alphas=sorted(set(sh[...,3].astype(int).ravel().tolist()))
print('alpha levels',alphas)
