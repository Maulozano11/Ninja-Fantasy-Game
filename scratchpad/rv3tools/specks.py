from PIL import Image
import numpy as np, json
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_poison_v3/'
man=json.load(open(ST+'manifest.json'))['sprites']
def isolated(al):
    on=al>0
    p=np.pad(on,1)
    nb=sum(np.roll(np.roll(p,dy,0),dx,1) for dy in (-1,0,1) for dx in (-1,0,1) if (dy,dx)!=(0,0))[1:-1,1:-1]
    return on&(nb==0)
for n,m in man.items():
    if n=='beast': continue
    w,h=m['frameW'],m['frameH']
    im=np.array(Image.open(ST+m['file']).convert('RGBA')).astype(int)
    for an,a in m['anims'].items():
        res=[];res2=[]
        for i in range(a['frames']):
            al=im[a['row']*h:(a['row']+1)*h,i*w:(i+1)*w,3]
            iso=isolated(al)
            res.append(int((iso&(al<64)).sum())); res2.append(int((iso&(al>=64)).sum()))
        print(f'{n:11s} {an:5s} isolated faint',res,' isolated solid',res2)
