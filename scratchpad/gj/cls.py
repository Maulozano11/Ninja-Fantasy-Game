import numpy as np, sys
from PIL import Image
R=np.asarray(Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(float)
BG=np.array([32.,32.,42.])
def gauss(a, s):
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out
lum=lambda c: 0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
cs=gauss(R,0.7)
dl=lum(cs)-lum(BG)
dist=np.sqrt(((cs-BG)**2).sum(-1))
a=(np.maximum(cs-BG,0)/(255-BG)).max(-1)
cls=np.zeros(R.shape[:2],np.int8)
cls[dist>=10]=3  # body
cls[(dist>=10)&(a<0.16)&(dl>=-6)]=1 # glow
cls[(dist>=10)&(dl<-6)]=2  # dark
col=np.array([[32,32,42],[90,200,90],[230,60,60],[230,230,230]],np.uint8)
out=col[cls]
x0,y0,x1,y1=map(int,sys.argv[1:5]); k=int(sys.argv[5])
a1=Image.fromarray(R[y0:y1,x0:x1].astype(np.uint8)).resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST)
a2=Image.fromarray(out[y0:y1,x0:x1]).resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST)
S=Image.new('RGB',(a1.width*2+8,a1.height)); S.paste(a1,(0,0)); S.paste(a2,(a1.width+8,0)); S.save('cls-%s.png'%sys.argv[6])
print('dl stats', np.percentile(dl[y0:y1,x0:x1],[1,5,25,50]))
