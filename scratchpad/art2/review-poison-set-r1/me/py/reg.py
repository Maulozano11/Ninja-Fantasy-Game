import sys; sys.path.insert(0,'py')
from common import *
rm=json.load(open(S+'/art2/vfx-poison-v3-src/refmap.json'))
keys={'bolt':('fly',0),'stream':('fly',0),'stream_head':('fly',0),'breath':('fly',0),'sphere':('fly',0),'slash':('fly',0),'multi':('fly',0),'hit':('hit',3),'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0),'aura':('idle',0)}
res={}
for n,(an,i) in keys.items():
    fr=frames(n,an)[i]
    if n=='aura':
        b=frames('aura_back','idle')[0].copy(); b.alpha_composite(fr); fr=b
    w,h=fr.size
    box=rm[n]['box']
    sx=1.0; sy=1/0.98
    if n in('stream','stream_head'): sx=65.9/64
    ours=np.asarray(on(BG,fr)).astype(float)
    al=np.asarray(fr)[...,3]>128
    best=None
    for dy in np.arange(-4,4.01,0.5):
        for dx in np.arange(-4,4.01,0.5):
            hc=np.asarray(his(box[0]+dx,box[1]+dy,w,h,sx,sy)).astype(float)
            d=np.abs(hc-ours).mean(-1)
            m=d[al].mean()
            if best is None or m<best[0]: best=(m,dx,dy)
    m,dx,dy=best
    hc=his(box[0]+dx,box[1]+dy,w,h,sx,sy)
    h0=his(box[0],box[1],w,h,sx,sy)
    d0=np.abs(np.asarray(h0).astype(float)-ours).mean(-1)[al].mean()
    res[n]=(round(m,1),dx,dy,round(d0,1))
    print(n,'best diff %.1f at dx %.1f dy %.1f ; at refmap box %.1f'%(m,dx,dy,d0))
    hc.save('his_'+n+'.png'); on(BG,fr).save('our_'+n+'.png')
