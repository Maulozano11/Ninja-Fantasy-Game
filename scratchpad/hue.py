import json, sys
from PIL import Image
import numpy as np
root='src/assets/world'
kinds=json.load(open(sys.argv[1]))
SIG={'fireball','fireball_great','annihilation','annihilation_enh','kirin','kirin_enh'}
def stats(files, ol):
    vs=[]
    for f in files:
        a=np.array(Image.open(f).convert('RGBA')).reshape(-1,4); vs.append(a[a[:,3]>0])
    v=np.concatenate(vs); rgb=v[:,:3].astype(np.int64); key=(rgb[:,0]<<16)|(rgb[:,1]<<8)|rgb[:,2]
    isol=np.isin(key,np.array(sorted(ol))) if ol else np.zeros(len(key),bool)
    f=rgb/255; mx=f.max(1); mn=f.min(1); l=(mx+mn)/2; d=mx-mn
    s=np.where(d==0,0,d/(1-np.abs(2*l-1)+1e-9)); r,g,b=f.T
    h=np.where(d==0,0,np.where(mx==r,((g-b)/(d+1e-9))%6,np.where(mx==g,(b-r)/(d+1e-9)+2,(r-g)/(d+1e-9)+4)))*60
    m=(~isol)&(s>=0.15)
    w=v[m,3]/255
    ang=np.deg2rad(h[m]); mh=np.rad2deg(np.arctan2((np.sin(ang)*w).sum(),(np.cos(ang)*w).sum()))%360
    L=l[m]
    return f"hue~{mh:.0f} sat med {np.median(s[m]):.2f} light p5/50/95 {np.percentile(L,5):.2f}/{np.median(L):.2f}/{np.percentile(L,95):.2f}; outline light {np.median(l[isol]) if isol.any() else float('nan'):.2f}; alpha<255 {np.mean(v[:,3]<255)*100:.0f}%"
for el in ['fire','water','wind','lightning','earth']:
    m=json.load(open(f'{root}/vfx_{el}/manifest.json'))
    ol={int(c[1:7],16) for k,cs in kinds[el].items() if 'outline' in k for c in cs}
    core=[f'{root}/vfx_{el}/'+s['file'] for n,s in m['sprites'].items() if n not in SIG]
    print(el,'core :',stats(core,ol))
    for n,s in m['sprites'].items():
        if n in SIG: print(el,n,':',stats([f'{root}/vfx_{el}/'+s['file']],ol))
    print(el,'beast:',stats([f'{root}/vfx_beasts/{el}.png'],set()))
