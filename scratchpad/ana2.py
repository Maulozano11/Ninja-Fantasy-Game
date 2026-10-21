import json, sys
from PIL import Image
import numpy as np
from collections import Counter
root='src/assets/world'
kinds=json.load(open(sys.argv[1]))
SIG={'fireball','fireball_great','annihilation','annihilation_enh','kirin','kirin_enh'}
def lum(c): return 0.2126*c[...,0]+0.7152*c[...,1]+0.0722*c[...,2]
def hx(c): return '#%06x'%c
def h2k(h): return int(h[1:7],16)
def analyse(label, files, ol):
    arrs=[]
    for f in files:
        a=np.array(Image.open(f).convert('RGBA')).reshape(-1,4); arrs.append(a[a[:,3]>0])
    v=np.concatenate(arrs); N=len(v)
    rgb=v[:,:3].astype(np.int64); key=(rgb[:,0]<<16)|(rgb[:,1]<<8)|rgb[:,2]
    isol=np.isin(key,np.array(sorted(ol)))
    f=rgb/255.0; mx=f.max(1); mn=f.min(1); l=(mx+mn)/2; d=mx-mn
    s=np.where(d==0,0,d/(1-np.abs(2*l-1)+1e-9))
    r,g,b=f[:,0],f[:,1],f[:,2]
    h=np.where(d==0,0,np.where(mx==r,((g-b)/(d+1e-9))%6,np.where(mx==g,(b-r)/(d+1e-9)+2,(r-g)/(d+1e-9)+4)))*60
    neutral=s<0.15
    print(f"  [{label}] px {N}, opaque {np.mean(v[:,3]==255)*100:.0f}%, RGB {len(np.unique(key))}, RGBA {len(np.unique((key<<8)|v[:,3]))}; outline px {isol.mean()*100:.1f}%; neutral {neutral.mean()*100:.1f}%")
    hb=Counter(((h[~neutral]//30)*30).astype(int).tolist()); tot=sum(hb.values()) or 1
    print('     hue:', ' '.join(f"{k}:{n/tot*100:.0f}%" for k,n in sorted(hb.items()) if n/tot>0.02))
    sel=(~isol)&(~neutral)
    if sel.sum()==0: return
    L=lum(rgb[sel].astype(float)); K=key[sel]
    qs=np.percentile(L,[0,3,10,20,35,50,65,80,92,98,100])
    stops=[]
    for i in range(len(qs)-1):
        mm=(L>=qs[i])&(L<=qs[i+1])
        c,n=Counter(K[mm].tolist()).most_common(1)[0]; stops.append(hx(c))
    print('     ramp:', ' '.join(stops))
    if neutral.any(): print('     neutral top:', ' '.join(f"{hx(c)}:{n}" for c,n in Counter(key[neutral].tolist()).most_common(5)))
    if isol.any(): print('     outline top:', ' '.join(f"{hx(c)}:{n}" for c,n in Counter(key[isol].tolist()).most_common(5)))
for el in ['fire','water','wind','lightning','earth']:
    m=json.load(open(f'{root}/vfx_{el}/manifest.json'))
    ol={h2k(c) for k,cs in kinds[el].items() if 'outline' in k for c in cs}
    core=[f'{root}/vfx_{el}/'+s['file'] for n,s in m['sprites'].items() if n not in SIG]
    sig=[f'{root}/vfx_{el}/'+s['file'] for n,s in m['sprites'].items() if n in SIG]
    print('==',el)
    analyse('core', core, ol)
    for sfile in sig: analyse(sfile.split('/')[-1], [sfile], ol)
    analyse('beast', [f'{root}/vfx_beasts/{el}.png'], ol)
