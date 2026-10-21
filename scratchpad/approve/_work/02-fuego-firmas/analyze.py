import json, numpy as np
from PIL import Image
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_fire/'
man=json.load(open(D+'manifest.json'))
for name in ['fireball','fireball_great','annihilation','annihilation_enh']:
    s=man['sprites'][name]; im=np.array(Image.open(D+s['file']).convert('RGBA'))
    fw,fh=s['frameW'],s['frameH']
    print(name, im.shape, 'frame',fw,fh,'anchor',s['anchor'])
    rows=im.shape[0]//fh; cols=im.shape[1]//fw
    for an,a in s['anims'].items():
        # also check frames beyond declared count are empty
        for f in range(cols):
            fr=im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw]
            al=fr[:,:,3]
            if f>=a['frames']:
                if al.any(): print('  EXTRA content', an, f, (al>0).sum())
                continue
            ys,xs=np.where(al>0)
            if len(xs)==0: print('  ',an,f,'EMPTY'); continue
            edges=dict(L=(al[:,0]>0).sum(),R=(al[:,-1]>0).sum(),T=(al[0,:]>0).sum(),B=(al[-1,:]>0).sum())
            semi=((al>0)&(al<255)).sum()
            # isolated pixels: opaque pixel with no 8-neighbours
            o=(al>0).astype(int); p=np.pad(o,1)
            nb=sum(np.roll(np.roll(p,dy,0),dx,1) for dy in (-1,0,1) for dx in (-1,0,1) if (dy,dx)!=(0,0))[1:-1,1:-1]
            iso=((o==1)&(nb==0)).sum()
            print(f'  {an} f{f}: bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} px={len(xs)} semi={semi} iso={iso} edges={edges}')
