import sys, numpy as np
from PIL import Image
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
BG=np.array([31,31,41])
def his(scale, box):
    c=ref.crop(box)
    w=round(c.width*scale); h=round(c.height*scale)
    return np.asarray(c.resize((w,h),Image.BOX)).astype(float)
def ours(i):
    a=np.asarray(Image.open(f'{R}/v5-fly{i}.png')).astype(float)
    al=a[:,:,3:4]/255
    return a[:,:,:3]*al+BG*(1-al), a[:,:,3]
res={}
for scale in [0.760,0.768,0.774,0.780]:
  for name,box,fi in [('L',(262,796,522,1009),0),('R',(522,796,785,1009),4)]:
    h=his(scale,box)
    o,A=ours(fi)
    best=None
    # place his h (hh x ww) into our frame at offset (dx,dy); compare over his box region
    hh,ww,_=h.shape
    for dy in range(-30,40):
      for dx in range(-40,60):
        # region in our frame
        y0,x0=dy,dx
        ys0=max(0,y0); xs0=max(0,x0); ys1=min(167,y0+hh); xs1=min(212,x0+ww)
        if ys1-ys0<hh-30 or xs1-xs0<ww-40: continue
        a=o[ys0:ys1,xs0:xs1]; b=h[ys0-y0:ys1-y0,xs0-x0:xs1-x0]
        # also penalize our opaque pixels outside his box? skip
        e=np.abs(a-b).mean()
        if best is None or e<best[0]: best=(e,dx,dy)
    print(scale,name,'best err %.3f dx %d dy %d'%best, 'his size',ww,hh)
    res[(scale,name)]=best
np.save(R+'/v5scripts/best.npy',np.array([[k[0],0 if k[1]=='L' else 1,v[1],v[2]] for k,v in res.items()]))
