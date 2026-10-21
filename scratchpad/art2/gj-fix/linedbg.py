import sys, numpy as np
from PIL import Image
S=sys.argv[1]; box=tuple(map(int,sys.argv[2:6])); minL=float(sys.argv[6]); con=float(sys.argv[7])
IM=np.asarray(Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(float)
def gauss(a, s):
    r = max(1, int(round(s * 3))); k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r); p = np.pad(out, pad, mode='edge'); acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax]); acc += w * p[tuple(sl)]
        out = acc
    return out
def shift(m, dy, dx):
    H, W = m.shape[:2]; out = np.zeros_like(m)
    out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out
x0,y0,x1,y1=box
C=IM[y0:y1,x0:x1]
L=0.3*C[...,0]+0.59*C[...,1]+0.11*C[...,2]; L=gauss(L[...,None],0.5)[...,0]
best=np.zeros(L.shape); crest=np.zeros(L.shape,bool)
for dy,dx in ((0,1),(1,0),(1,1),(1,-1)):
    r=L-np.maximum(shift(L,2*dy,2*dx),shift(L,-2*dy,-2*dx)); c=(L>=shift(L,dy,dx))&(L>=shift(L,-dy,-dx))
    b=r>best; best=np.where(b,r,best); crest=np.where(b,c,crest)
m=(L>minL)&(best>con)&crest
bestd=np.zeros(L.shape); cr2=np.zeros(L.shape,bool)
for dy,dx in ((0,1),(1,0),(1,1),(1,-1)):
    r=np.minimum(shift(L,2*dy,2*dx),shift(L,-2*dy,-2*dx))-L; c=(L<=shift(L,dy,dx))&(L<=shift(L,-dy,-dx))
    b=r>bestd; bestd=np.where(b,r,bestd); cr2=np.where(b,c,cr2)
md=(bestd>con)&cr2&(L>40)
out=C.copy(); out[md]=(255,0,0); out[m]=(0,255,0)
z=5
a=Image.fromarray(C.astype(np.uint8)).resize((C.shape[1]*z,C.shape[0]*z),Image.NEAREST)
b=Image.fromarray(out.astype(np.uint8)).resize((C.shape[1]*z,C.shape[0]*z),Image.NEAREST)
s=Image.new('RGB',(a.width*2+6,a.height)); s.paste(a,(0,0)); s.paste(b,(a.width+6,0)); s.save(S+'/gj-fix/linedbg.png')
print('lum range', np.percentile(L,[50,90,99]))
