import json, numpy as np
from PIL import Image
M='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/approve/_work/06-09-tierra-genjutsu-chakra-veneno/'
S=M+'snap/'
for el in ['earth','genjutsu','chakra','poison']:
    man=json.load(open(S+'vfx_%s/manifest.json'%el))['sprites']
    print('=====',el)
    for name,s in man.items():
        if name=='beast': continue
        im=np.asarray(Image.open(S+'vfx_%s/'%el+s['file']).convert('RGBA'))
        fw,fh=s['frameW'],s['frameH']
        H,W=im.shape[:2]
        av=np.unique(im[...,3])
        for an,a in s['anims'].items():
            frs=[im[a['row']*fh:(a['row']+1)*fh, f*fw:(f+1)*fw] for f in range(a['frames'])]
            # extra frames beyond?
            extra = im[a['row']*fh:(a['row']+1)*fh, a['frames']*fw:]
            ex = int((extra[...,3]>0).sum()) if extra.size else 0
            info=[]
            union=np.zeros((fh,fw),bool)
            for i,fr in enumerate(frs):
                al=fr[...,3]>0; union|=al
                e=dict(T=int(al[0].sum()),B=int(al[-1].sum()),L=int(al[:,0].sum()),R=int(al[:,-1].sum()))
                # isolated pixels
                p=np.pad(al,1); nb=sum(np.roll(np.roll(p,dy,0),dx,1) for dy in (-1,0,1) for dx in (-1,0,1) if (dy,dx)!=(0,0))[1:-1,1:-1]
                iso=int((al&(nb==0)).sum())
                semi=int(((fr[...,3]>0)&(fr[...,3]<255)).sum())
                info.append((i,e,iso,semi,int(al.sum())))
            ys,xs=np.nonzero(union)
            bb=(xs.min(),ys.min(),xs.max(),ys.max())
            # diffs
            def d(x,y):
                return int(((x[...,3]>0)!=(y[...,3]>0)).sum())
            diffs=[d(frs[i],frs[(i+1)%len(frs)]) for i in range(len(frs))]
            print(f"{name:12s} {an:6s} alpha={list(av)[:6]}{'...' if len(av)>6 else ''} extra={ex} union_bbox={bb} size_m=({(bb[2]-bb[0]+1)/57:.2f}x{(bb[3]-bb[1]+1)/57:.2f})")
            for i,e,iso,semi,n in info:
                flag = ' EDGE' if any(v>0 for v in e.values()) else ''
                print(f"     f{i} px={n} edges={e} iso={iso} semi={semi}{flag}")
            print('     mask diffs consecutive (last->first at end):',diffs)
