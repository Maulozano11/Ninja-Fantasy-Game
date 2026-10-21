from PIL import Image; import numpy as np
exec(open('cmp.py').read().split('stats={}')[0])
s=158/64
# his row resampled: his x 650..1287, y 101..324 -> game
x0,x1,y0,y1=650,1287,101,324
W=int(round((x1-x0)/s)); H=int(round((y1-y0)/s))
row=np.asarray(REF.resize((W,H),Image.BOX,box=(x0,y0,x0+W*s,y0+H*s)),float)
def fit(fr,ay,name):
    f=np.asarray(fr,float); a=f[...,3]/255; c=f[...,:3]
    comp=c*a[...,None]+np.array(BG)*(1-a[...,None])
    m=a>0.5
    best=None
    for oy in range(-10,H):
        for ox in range(-fr.width,W):
            ys=np.arange(f.shape[0])+oy; xs=np.arange(f.shape[1])+ox
            vy=(ys>=0)&(ys<H); vx=(xs>=0)&(xs<W)
            mm=m[np.ix_(vy,vx)]
            if mm.sum()<0.6*m.sum(): continue
            d=np.abs(row[np.ix_(ys[vy],xs[vx])]-comp[np.ix_(vy,vx)]).sum(-1)[mm].mean()
            if best is None or d<best[0]: best=(d,ox,oy)
    print(name,'best offset in his row (game px from his x650):',best[1:],'diff %.1f'%best[0])
    return best
t=frame('stream','fly',0); h=frame('stream_head','fly',0)
bt=fit(t,63,'tile'); bh=fit(h,63,'head')
print('tile anchor(0) at row x',bt[1],'-> his x %.1f'%(650+bt[1]*s), ' tile ends at row x',bt[1]+64)
print('head anchor(32) at row x',bh[1]+32,'-> his x %.1f'%(650+(bh[1]+32)*s),' head left edge at row x',bh[1])
