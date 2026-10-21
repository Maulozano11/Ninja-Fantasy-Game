from PIL import Image
import numpy as np, sys
im=np.asarray(Image.open('../art2/REF-poison-set-owner.jpg').convert('RGB')).astype(float)
L=0.3*im[...,0]+0.59*im[...,1]+0.11*im[...,2]
ch=Image.open('character.png').convert('RGBA')
def match(region, sxs, sys_):
    x0,y0,x1,y1=region
    best=None
    for sx in sxs:
        for sy in sys_:
            w=round(128*sx); h=round(128*sy)
            c=np.asarray(ch.resize((w,h),Image.BOX)).astype(float)
            a=c[...,3]/255
            m=a>0.9
            cl=(0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2])
            ys,xs=np.nonzero(m)
            by0,by1,bx0,bx1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
            m=m[by0:by1,bx0:bx1]; cl=cl[by0:by1,bx0:bx1]
            t=cl[m]; t=(t-t.mean())/t.std()
            hh,ww=m.shape
            for oy in range(y0,y1-hh):
                for ox in range(x0,x1-ww):
                    p=L[oy:oy+hh,ox:ox+ww][m]
                    s=p.std()
                    if s<1: continue
                    r=float(((p-p.mean())/s*t).mean())
                    if best is None or r>best[0]:
                        # feet position in his coords: our feet (64,120) -> (64*sx -bx0 + ox, 120*sy - by0 + oy)
                        best=(r,sx,sy,ox-bx0+64*sx,oy-by0+120*sy, ox-bx0+27*sx, oy-by0+27*sy)
    return best
regions={'blast':(505,180,600,320),'wall':(280,385,350,511),'aura':(355,380,445,511),'wall_diag':(690,460,760,600),'wall_depth':(115,780,190,920)}
for k in sys.argv[1:]:
    reg=regions[k]
    b=match(reg, np.arange(0.97,1.07,0.01), np.arange(0.97,1.07,0.01))
    print(k, 'r=%.3f sx=%.2f sy=%.2f feet=(%.1f,%.1f)'%b[:5])
