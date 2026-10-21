from PIL import Image
import numpy as np, json
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_poison_v3/'
man=json.load(open(ST+'manifest.json'))['sprites']
for n,m in man.items():
    if n in ('beast',): continue
    w,h=m['frameW'],m['frameH']
    im=np.array(Image.open(ST+m['file']).convert('RGBA')).astype(int)
    for an,a in m['anims'].items():
        res=[]
        for i in range(a['frames']):
            al=im[a['row']*h:(a['row']+1)*h,i*w:(i+1)*w,3]
            lo=al<60; hi=al>150
            v=lo[1:-1,1:-1]&hi[:-2,1:-1]&hi[2:,1:-1]
            hz=lo[1:-1,1:-1]&hi[1:-1,:-2]&hi[1:-1,2:]
            # horizontal slit runs: count v pixels that are in runs >=4
            cnt=0
            for y in range(v.shape[0]):
                run=0
                for x in range(v.shape[1]):
                    run=run+1 if v[y,x] else 0
                    if run==4: cnt+=1
            res.append((int(v.sum()+hz.sum()),cnt))
        print(f'{n:11s} {an:5s} 1px gaps(total,hruns>=4):',res)
