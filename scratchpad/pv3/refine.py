from PIL import Image
import numpy as np
im=np.asarray(Image.open('../art2/REF-poison-set-owner.jpg').convert('RGB')).astype(float)
L=im.mean(-1)
P={'bolt':(5,40,72,108),'stream':(260,40,522,108),'breath':(535,40,651,150),'sphere':(663,40,729,108),'slash':(5,178,72,245),'multi':(116,178,182,245),'hit':(227,178,293,245),'blast':(338,178,582,345),'wall':(5,374,348,511),'aura':(359,374,442,511),'wall_diag':(479,374,760,658),'wall_depth':(5,686,183,1012),'beast':(206,686,552,798)}
out={}
for k,(x0,y0,x1,y1) in P.items():
    def best_row(yc, xa, xb):
        cands=range(yc-3,yc+4)
        sc=[np.median(L[y,xa:xb]) for y in cands]
        return list(cands)[int(np.argmax(sc))], max(sc)
    def best_col(xc, ya, yb):
        cands=range(xc-3,xc+4)
        sc=[np.median(L[ya:yb,x]) for x in cands]
        return list(cands)[int(np.argmax(sc))], max(sc)
    xm0,xm1=x0+(x1-x0)//4, x1-(x1-x0)//4
    ym0,ym1=y0+(y1-y0)//4, y1-(y1-y0)//4
    t=best_row(y0,xm0,xm1); b=best_row(y1,xm0,xm1); l=best_col(x0,ym0,ym1); r=best_col(x1,ym0,ym1)
    out[k]=(l[0],t[0],r[0],b[0])
    print(k, out[k], 'scores', round(l[1]),round(t[1]),round(r[1]),round(b[1]))
