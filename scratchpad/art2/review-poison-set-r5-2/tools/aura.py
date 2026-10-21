from lib import *
from align import his_crop, refmap, PC
CH=np.array(Image.open(R+'/character.png').convert('RGBA')).astype(float)
def over(dst, src, ox=0, oy=0):
    # dst float RGBA premult-free; src RGBA uint8/float; place at offset
    h,w=dst.shape[:2]; sh,sw=src.shape[:2]
    out=dst.copy()
    for y in range(sh):
        pass
    y0=max(0,oy); y1=min(h,oy+sh); x0=max(0,ox); x1=min(w,ox+sw)
    s=src[y0-oy:y1-oy, x0-ox:x1-ox].astype(float); d=out[y0:y1,x0:x1]
    sa=s[...,3:4]/255; da=d[...,3:4]/255
    oa=sa+da*(1-sa)
    rgb=np.where(oa>0,(s[...,:3]*sa+d[...,:3]*da*(1-sa))/np.maximum(oa,1e-6),0)
    out[y0:y1,x0:x1,:3]=rgb; out[y0:y1,x0:x1,3:4]=oa*255
    return out
def aura_comp(i, with_char=True):
    b=frames('aura_back','idle')[i]; f=frames('aura','idle')[i]
    c=np.zeros(b.shape,float)
    c=over(c,b)
    if with_char: c=over(c,CH,47-64,123-120)
    c=over(c,f)
    return c
