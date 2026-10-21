import json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
G=S+'/art2/staging/vfx_poison_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
for name,m in man.items():
    im=np.array(Image.open(G+'/'+m['file']).convert('RGBA')).astype(float)/255
    fw,fh=m['frameW'],m['frameH']
    for an,a in m['anims'].items():
        L=[];C=[];D=[]
        prev=None
        for i in range(a['frames']):
            f=im[a['row']*fh:(a['row']+1)*fh, i*fw:(i+1)*fw]
            luma=0.299*f[:,:,0]+0.587*f[:,:,1]+0.114*f[:,:,2]
            L.append((f[:,:,3]*luma).mean()*1000)
            C.append((f[:,:,3]>0.04).sum())
            if prev is not None:
                # fraction of pixels changing significantly (premultiplied)
                pm=f[:,:,:3]*f[:,:,3:4]; pp=prev[:,:,:3]*prev[:,:,3:4]
                D.append((np.abs(pm-pp).max(axis=2)>0.15).mean()*100)
            prev=f
        pk=max(L)
        steps=[abs(L[i+1]-L[i])/pk*100 for i in range(len(L)-1)]
        if a['loop']: steps.append(abs(L[0]-L[-1])/pk*100)
        print('%-11s %-5s %2df L=[%s] maxstep %.1f%% (at %d) first=%.0f%% last=%.0f%%'%(name,an,a['frames'],' '.join('%.0f'%x for x in L),max(steps),int(np.argmax(steps)),L[0]/pk*100,L[-1]/pk*100))
        print('   coverage',C)
        print('   %%px changed >0.15 between neighbours', ' '.join('%.0f'%d for d in D))
