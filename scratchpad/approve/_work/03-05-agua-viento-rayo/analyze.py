import json, numpy as np, sys
from PIL import Image
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/03-05-agua-viento-rayo/snap/'
for el in ['vfx_water','vfx_wind','vfx_lightning']:
    man=json.load(open(S+el+'/manifest.json'))['sprites']
    print('=====',el, list(man.keys()))
    for name,s in man.items():
        if name=='beast': continue
        im=np.array(Image.open(S+el+'/'+s['file']).convert('RGBA'))
        fw,fh=s['frameW'],s['frameH']
        print(name, 'img',im.shape[1],'x',im.shape[0],'frame',fw,fh,'anchor',s['anchor'],'m',s['meters'], {k:(v['row'],v['frames'],v['fps'],v['loop']) for k,v in s['anims'].items()})
        cols=im.shape[1]//fw; rows=im.shape[0]//fh
        if im.shape[1]%fw or im.shape[0]%fh: print('  !! size not multiple')
        for an,a in s['anims'].items():
            prev=None
            for f in range(cols):
                fr=im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw]
                al=fr[:,:,3]
                if f>=a['frames']:
                    if al.any(): print('  EXTRA content', an, f, (al>0).sum())
                    continue
                ys,xs=np.where(al>0)
                if len(xs)==0: print('  ',an,f,'EMPTY'); continue
                edges=dict(L=int((al[:,0]>0).sum()),R=int((al[:,-1]>0).sum()),T=int((al[0,:]>0).sum()),B=int((al[-1,:]>0).sum()))
                semi=int(((al>0)&(al<255)).sum())
                faint=int(((al>0)&(al<40)).sum())
                o=(al>0).astype(int); p=np.pad(o,1)
                nb=sum(np.roll(np.roll(p,dy,0),dx,1) for dy in (-1,0,1) for dx in (-1,0,1) if (dy,dx)!=(0,0))[1:-1,1:-1]
                iso=int(((o==1)&(nb==0)).sum())
                diff = '' if prev is None else ' diff=%d'%int((np.abs(fr.astype(int)-prev.astype(int)).sum(2)>0).sum())
                prev=fr
                e=' '.join(k+str(v) for k,v in edges.items() if v)
                print(f'  {an} f{f}: bbox x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} px={len(xs)} semi={semi} faint={faint} iso={iso} edges[{e}]{diff}')
        if rows*fh>0:
            used={a['row'] for a in s['anims'].values()}
            for r in range(rows):
                if r not in used and im[r*fh:(r+1)*fh,:,3].any(): print('  EXTRA row',r)
