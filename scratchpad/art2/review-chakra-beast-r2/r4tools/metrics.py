from PIL import Image
import numpy as np, json
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-chakra-beast-r2/'
m=json.load(open(S+'/art2/staging/vfx_beasts_griffin/manifest.json'))
sp=m['sprites']['chakra']; FW,FH=sp['frameW'],sp['frameH']
im=Image.open(S+'/art2/staging/vfx_beasts_griffin/chakra.png'); print('mode',im.mode,'size',im.size)
sheet=np.asarray(im.convert('RGBA')).astype(float)
assert sheet.shape[1]==FW*sp['anims']['fly']['frames'] and sheet.shape[0]==FH
fr=[sheet[:,i*FW:(i+1)*FW] for i in range(8)]
L=[];C=[];ML=[]
for i,f in enumerate(fr):
    a=f[...,3]/255.; y=(0.2126*f[...,0]+0.7152*f[...,1]+0.0722*f[...,2])/255.
    L.append((a*y).mean()); C.append((a>0).sum()); ML.append((a*y).sum()/max(a.sum(),1))
    b=np.concatenate([f[0,:,3],f[-1,:,3],f[:,0,3],f[:,-1,3]])
    print(i,'light %.4f'%L[-1],'covered',C[-1],'meanluma %.3f'%ML[-1],'border nonzero',int((b>0).sum()), 'border2px', int((np.concatenate([f[:2].reshape(-1,4)[:,3],f[-2:].reshape(-1,4)[:,3],f[:,:2].reshape(-1,4)[:,3],f[:,-2:].reshape(-1,4)[:,3]])>0).sum()))
pk=max(L)
for i in range(8):
    j=(i+1)%8; print('%d->%d ratio %.3f  jump/peak %.3f'%(i,j,L[j]/L[i],abs(L[j]-L[i])/pk))
# alpha bbox union
al=np.stack([f[...,3] for f in fr])>0
ys,xs=np.where(al.any(0)); print('union bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max())
# per-frame pixel change (opaque silhouette XOR) and RGB diff
for i in range(8):
    j=(i+1)%8
    a=fr[i][...,3]>128; b=fr[j][...,3]>128
    print('%d->%d sil xor %.3f'%(i,j,(a^b).sum()/max(a.sum(),b.sum())), 'mean abs rgb diff over union %.1f'%np.abs(fr[i][...,:3]*(fr[i][...,3:]/255)-fr[j][...,:3]*(fr[j][...,3:]/255)).mean())
# colours
u=np.unique(sheet.reshape(-1,4)[sheet.reshape(-1,4)[:,3]>0],axis=0); print('colours',len(u))
alphas=np.unique(sheet[...,3]); print('alpha levels',alphas)
print('anchor',sp['anchor'],'fps',sp['anims']['fly'])
