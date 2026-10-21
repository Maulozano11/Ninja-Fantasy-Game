from PIL import Image
import numpy as np
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
sheet=np.array(Image.open(R+'staging/vfx_beasts_cobra/poison.png').convert('RGBA')).astype(float)
FW,FH=176,105; n=sheet.shape[1]//FW
print('frames',n, sheet.shape)
L=[];OP=[];masks=[]
for i in range(n):
    f=sheet[:,i*FW:(i+1)*FW]
    a=f[:,:,3]/255; luma=(0.299*f[:,:,0]+0.587*f[:,:,1]+0.114*f[:,:,2])/255
    L.append((a*luma).mean()*1000); OP.append(int((f[:,:,3]>0).sum())); masks.append(f[:,:,3]>0)
    b=np.concatenate([f[0,:,3],f[-1,:,3],f[:,0,3],f[:,-1,3]])
    print(i,'light %.2f'%L[-1],'opaque',OP[-1],'border px',int((b>0).sum()), 'semi px', int(((f[:,:,3]>0)&(f[:,:,3]<255)).sum()))
pk=max(L)
for i in range(n):
    j=(i+1)%n
    xor=(masks[i]^masks[j]).sum()/ (masks[i]|masks[j]).sum()
    print(f'{i}->{j} light step {100*(L[j]-L[i])/pk:+.1f}% of peak; silhouette change {100*xor:.1f}%')
# colors count
cols=set(map(tuple,sheet.reshape(-1,4)[sheet.reshape(-1,4)[:,3]>0].astype(int)))
print('colors',len(cols))
