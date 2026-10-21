import json, sys, colorsys
from PIL import Image
import numpy as np
from collections import Counter
root='src/assets/world'
kinds=json.load(open(sys.argv[1]))
def lum(c): return 0.2126*c[...,0]+0.7152*c[...,1]+0.0722*c[...,2]
def hx(c): return '#%02x%02x%02x'%tuple(int(v) for v in c)
def h2rgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
for el in ['fire','water','wind','lightning','earth']:
    m=json.load(open(f'{root}/vfx_{el}/manifest.json'))
    files=[f'{root}/vfx_{el}/'+s['file'] for s in m['sprites'].values()]+[f'{root}/vfx_beasts/{el}.png']
    arrs=[]
    for f in files:
        a=np.array(Image.open(f).convert('RGBA')).reshape(-1,4); arrs.append(a[a[:,3]>0])
    v=np.concatenate(arrs); N=len(v)
    rgb=v[:,:3].astype(np.int64); key=(rgb[:,0]<<16)|(rgb[:,1]<<8)|rgb[:,2]
    ol=set()
    for k,cs in kinds[el].items():
        if 'outline' in k: ol|={h2rgb(c) for c in cs}
    olk=np.array([(r<<16)|(g<<8)|b for r,g,b in ol])
    isol=np.isin(key,olk)
    f=rgb/255.0; mx=f.max(1); mn=f.min(1); l=(mx+mn)/2; d=mx-mn
    s=np.where(d==0,0,d/(1-np.abs(2*l-1)+1e-9))
    # hue
    r,g,b=f[:,0],f[:,1],f[:,2]
    h=np.where(d==0,0,np.where(mx==r,((g-b)/(d+1e-9))%6,np.where(mx==g,(b-r)/(d+1e-9)+2,(r-g)/(d+1e-9)+4)))*60
    neutral=s<0.15
    print(f"== {el}: {len(files)} sheets, visible px {N}, opaque {np.mean(v[:,3]==255)*100:.1f}%, distinct RGB {len(np.unique(key))}, distinct RGBA {len(np.unique((key<<8)|v[:,3]))}")
    print(f"   exact outline-colour px {isol.sum()} ({isol.mean()*100:.1f}%), outline colours present {len(set(np.unique(key[isol]).tolist()))}/{len(ol)}")
    print(f"   neutral (sat<0.15) px {neutral.mean()*100:.1f}%  top:", ' '.join(f"{hx(((c>>16)&255,(c>>8)&255,c&255))}:{n}" for c,n in Counter(key[neutral].tolist()).most_common(6)))
    hb=Counter(((h[~neutral]//30)*30).astype(int).tolist()); tot=sum(hb.values())
    print('   hue bins (non-neutral):', ' '.join(f"{k}-{k+30}:{n/tot*100:.0f}%" for k,n in sorted(hb.items()) if n/tot>0.01))
    # ramp: lum deciles among non-outline non-neutral pixels; the most common colour per bin
    sel=(~isol)&(~neutral)
    L=lum(rgb[sel].astype(float)); K=key[sel]
    qs=np.percentile(L,[0,5,15,30,45,60,75,90,97,100])
    stops=[]
    for i in range(len(qs)-1):
        mm=(L>=qs[i])&(L<=qs[i+1])
        c,n=Counter(K[mm].tolist()).most_common(1)[0]
        stops.append(hx(((c>>16)&255,(c>>8)&255,c&255)))
    print('   ramp dark->bright (most common colour per lum band 0-5-15-30-45-60-75-90-97-100%):', ' '.join(stops))
    olc=Counter(key[isol].tolist()).most_common(5)
    print('   commonest outline colours:', ' '.join(f"{hx(((c>>16)&255,(c>>8)&255,c&255))}:{n}" for c,n in olc))
    # darkest pixels
    Lall=lum(rgb.astype(float))
    dk=Lall<40
    print(f"   very dark px (lum<40) {dk.mean()*100:.1f}%  top:", ' '.join(f"{hx(((c>>16)&255,(c>>8)&255,c&255))}:{n}" for c,n in Counter(key[dk].tolist()).most_common(6)))
