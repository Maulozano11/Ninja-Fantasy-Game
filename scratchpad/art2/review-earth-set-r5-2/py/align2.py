import sys; sys.path.insert(0,'.')
from cmp import *
import json
HA={'bolt':((206,221),2.35),'breath':((1323,237),2.35),'sphere':((1801,236),2.35),'slash':((150,556),2.35),'multi':((444,557),2.35),
'multi_hit':((750,556),2.35),'hit':((962,562),2.35),'blast':((1412,737),2.39),'wall':((379.5,1177),2.34),'wall_diag':((1545,1302),2.35),
'wall_depth':((140,1736),2.26),'aura':((1072,1175),2.41),'aura_back':((1072,1175),2.41),'stream':((975,262),158/64),'stream_head':((975,262),158/64)}
m=man()['sprites']
def keyframe(name):
    an,ki=KEY.get(name,('fly',0))
    f=frames(name,an)[ki].astype(float)
    if name=='aura':
        b=frames('aura_back','idle')[0].astype(float)
        a1=b[:,:,3:4]/255; a2=f[:,:,3:4]/255
        rgb=f[:,:,:3]*a2+b[:,:,:3]*a1*(1-a2); al=a2+a1*(1-a2)
        f=np.concatenate([rgb/np.maximum(al,1e-6),al*255],2)
    return f
def run(name,scales,win=8):
    f=keyframe(name); on=comp(f,PANEL_BG); mask=f[:,:,3]>128
    ys,xs=np.nonzero(mask); ourc=on[ys,xs]
    (hx,hy),s0=HA[name]; ax,ay=m[name]['anchor']
    res=None
    for s in scales:
        hs=his_small(name,s); hh,hw=hs.shape[:2]
        x0,y0=P[name][:2]
        gx=round((hx-x0)/s-ax); gy=round((hy-y0)/s-ay)
        for oy in range(gy-win,gy+win+1):
            yy=ys+oy
            for ox in range(gx-win,gx+win+1):
                xx=xs+ox
                ok=(yy>=0)&(yy<hh)&(xx>=0)&(xx<hw)
                if ok.mean()<0.5: continue
                d=np.abs(hs[yy[ok],xx[ok]]-ourc[ok]).mean()
                if res is None or d<res[0]: res=(float(d),s,ox,oy,float(ok.mean()),gx,gy)
    return res
if __name__=='__main__':
    out={}
    for n in sys.argv[1:]:
        s0=HA[n][1]
        sc=[s0] if n.startswith('stream') else sorted(set([round(s0+d,2) for d in (-0.06,-0.04,-0.02,0,0.02,0.04,0.06)]))
        r=run(n,sc); print(n,r,flush=True); out[n]=r
    try: old=json.load(open(R+'/align.json'))
    except: old={}
    old.update(out); json.dump(old,open(R+'/align.json','w'))
