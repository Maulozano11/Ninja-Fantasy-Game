from lib import *
import json
REF=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg').convert('RGB')
PC=(30,32,46)
def his_crop(x0,y0,w,h,sx=1.0,sy=1.02):
    # output pixel u -> input x0+(u+.5)*sx (continuous coords, pixel edges)
    return np.array(REF.transform((w,h), Image.AFFINE, (sx,0,x0,0,sy,y0), resample=Image.BILINEAR)).astype(float)
KEYS={'bolt':('fly',0),'breath':('fly',0),'sphere':('fly',0),'slash':('fly',0),'multi':('fly',0),'hit':('hit',3),
      'blast':('blast',4),'wall':('idle',0),'wall_diag':('idle',0),'stream':('fly',0),'stream_head':('fly',0)}
refmap=json.load(open(ART2+'/vfx-poison-v3-src/refmap.json'))
if __name__=='__main__':
    res={}
    for name,(an,fi) in KEYS.items():
        f=frames(name,an)[fi]; A=f[...,3]
        ours=comp(f,PC).astype(float)
        h,w=A.shape
        bx=refmap[name]['box']
        sx0=(bx[2]-bx[0])/w; sy0=(bx[3]-bx[1])/h
        m=A>200
        best=None
        for sy in ([sy0] if name in('stream','stream_head') else [0.99,1.0,1.01,1.02,1.03,1.04]):
          for sx in ([sx0] if name in('stream','stream_head') else [0.98,0.99,1.0,1.01,1.02]):
            for dy in np.arange(-3,3.01,0.5):
              for dx in np.arange(-3,3.01,0.5):
                hc=his_crop(bx[0]+dx,bx[1]+dy,w,h,sx,sy)
                d=np.abs(hc-ours).mean(-1)[m].mean()
                if best is None or d<best[0]: best=(d,sx,sy,dx,dy)
        d,sx,sy,dx,dy=best
        hc=his_crop(bx[0]+dx,bx[1]+dy,w,h,sx,sy)
        hc0=his_crop(bx[0],bx[1],w,h,sx0,sy0)
        d0=np.abs(hc0-ours).mean(-1)
        soft=(A>10)&(A<=200)
        res[name]=dict(best_diff=round(d,2),sx=sx,sy=sy,dx=dx,dy=dy,refmap_scale=(round(sx0,4),round(sy0,4)),
                       diff_at_refmap_opaque=round(d0[m].mean(),2),diff_at_refmap_soft=round(d0[soft].mean(),2) if soft.any() else None,
                       diff_at_refmap_all=round(d0[A>10].mean(),2), opaque=int(m.sum()))
        print(name,res[name],flush=True)
        Image.fromarray(hc0.clip(0,255).astype(np.uint8)).save(R+f'/his-{name}.png')
    json.dump(res,open(R+'/align.json','w'),indent=1)
