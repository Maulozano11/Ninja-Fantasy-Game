import json, numpy as np
from PIL import Image
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/creatures/'
man=json.load(open(D+'manifest.json'))
def frames(name, anim):
    s=man['sprites'][name]; a=s['anims'][anim]
    im=np.array(Image.open(D+s['file']).convert('RGBA'))
    W,H=s['frameW'],s['frameH']
    return [im[a['row']*H:(a['row']+1)*H, f*W:(f+1)*W] for f in range(a['frames'])]
for name,s in man['sprites'].items():
    im=Image.open(D+s['file'])
    W,H=s['frameW'],s['frameH']
    maxf=max(a['frames'] for a in s['anims'].values()); rows=max(a['row'] for a in s['anims'].values())+1
    print(f"== {name} sheet {im.size} expect>= {(maxf*W, rows*H)} anchor {s['anchor']}")
    arr=np.array(im.convert('RGBA'))
    # anything outside declared frames?
    used=np.zeros(arr.shape[:2],bool)
    for an,a in s['anims'].items():
        used[a['row']*H:(a['row']+1)*H, :a['frames']*W]=True
    stray=(arr[:,:,3]>0)&~used
    if stray.any(): print('  pixels outside declared frames:', stray.sum())
    for an,a in s['anims'].items():
        fr=frames(name,an)
        info=[]
        for i,f in enumerate(fr):
            al=f[:,:,3]
            if not (al>0).any(): info.append(f'{i}:EMPTY'); continue
            ys,xs=np.nonzero(al>0)
            edge=[]
            if ys.min()==0: edge.append('T')
            if ys.max()==H-1: edge.append('B')
            if xs.min()==0: edge.append('L')
            if xs.max()==W-1: edge.append('R')
            # orphans: alpha>0 pixel with no 8-neighbour alpha>0
            m=(al>0).astype(int); p=np.pad(m,1)
            nb=sum(np.roll(np.roll(p,dy,0),dx,1) for dy in (-1,0,1) for dx in (-1,0,1) if (dy,dx)!=(0,0))[1:-1,1:-1]
            orph=int(((m==1)&(nb==0)).sum())
            low=int(((al>0)&(al<255)).sum())
            mag=int(((f[:,:,0]>200)&(f[:,:,1]<80)&(f[:,:,2]>200)&(al>0)).sum())
            info.append(f"{i}:bb({xs.min()},{ys.min()},{xs.max()},{ys.max()}){''.join(edge) and ' EDGE'+''.join(edge)} orph{orph} semi{low}{' MAG'+str(mag) if mag else ''}")
        print(f'  {an}:', ' | '.join(info))
