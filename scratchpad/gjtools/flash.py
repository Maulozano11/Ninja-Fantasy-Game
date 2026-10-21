import json, sys, numpy as np
from PIL import Image
G='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_genjutsu_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
for n,s in man.items():
    sh=np.asarray(Image.open(G+'/'+s['file']).convert('RGBA')).astype(float)
    for an,a in s['anims'].items():
        ms=[];ch=[]
        prev=None
        for i in range(a['frames']):
            f=sh[a['row']*s['frameH']:(a['row']+1)*s['frameH'], i*s['frameW']:(i+1)*s['frameW']]
            L=(0.299*f[...,0]+0.587*f[...,1]+0.114*f[...,2])/255; A=f[...,3]/255
            ms.append((A*L).mean()*1000)
            if prev is not None: ch.append(int((np.abs(f-prev).sum(-1)>30).sum()))
            prev=f
        m=np.array(ms); pk=m.max()
        d=np.abs(np.diff(np.r_[m, m[0]] if a['loop'] else m))/pk
        print(f"{n:11s} {an:5s} max-step {d.max()*100:5.1f}% of peak | " + ' '.join(f'{v:5.1f}' for v in m) + ' | changed px ' + ' '.join(map(str,ch)))
