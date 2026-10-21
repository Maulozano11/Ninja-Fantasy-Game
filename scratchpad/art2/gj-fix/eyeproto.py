import sys, pickle, math, numpy as np
from PIL import Image
S=sys.argv[1]
IM=np.asarray(Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')).astype(float)
d=pickle.load(open(S+'/gj-fix/dump.pkl','rb'))
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
def lab(c):
    c = np.asarray(c, np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    X = (c[..., 0] * 0.4124 + c[..., 1] * 0.3576 + c[..., 2] * 0.1805) / 0.95047
    Y = c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722
    Z = (c[..., 0] * 0.0193 + c[..., 1] * 0.1192 + c[..., 2] * 0.9505) / 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], -1)
SM=gauss(IM,0.45)
LL=lab(SM)[...,0]
def eye(name, ell, dk=0.35, lt=0.5):
    dd=d[name]; ox,oy=dd['origin']; k=dd['k']; H,W=dd['h'],dd['w']
    out=dd['rgb'].copy(); cls=np.zeros((H,W),int)
    for (cx,cy,rx,ry) in ell:
        gx0=int((cx-rx-ox)*k)-1; gx1=int((cx+rx-ox)*k)+2; gy0=int((cy-ry-oy)*k)-1; gy1=int((cy+ry-oy)*k)+2
        # local range
        reg=LL[int(cy-ry):int(cy+ry)+1,int(cx-rx):int(cx+rx)+1]
        lo,hi=np.percentile(reg,3),np.percentile(reg,97)
        for gy in range(gy0,gy1):
            for gx in range(gx0,gx1):
                hx0=ox+gx/k; hy0=oy+gy/k; hx1=ox+(gx+1)/k; hy1=oy+(gy+1)/k
                ccx=(hx0+hx1)/2; ccy=(hy0+hy1)/2
                if ((ccx-cx)/rx)**2+((ccy-cy)/ry)**2>1: continue
                xs=range(int(math.floor(hx0+0.2)),int(math.ceil(hx1-0.2)))
                ys=range(int(math.floor(hy0+0.2)),int(math.ceil(hy1-0.2)))
                px=[(LL[y,x],SM[y,x]) for y in ys for x in xs]
                Ls=np.array([p[0] for p in px]); cs=np.array([p[1] for p in px])
                t=(Ls-lo)/max(1,hi-lo)
                if (t<dk).mean()>=0.34: out[gy,gx]=cs[Ls.argmin()]; cls[gy,gx]=1
                elif (t>1-lt*0.5).mean()>=0.5: out[gy,gx]=cs[Ls.argmax()]; cls[gy,gx]=2
                else: out[gy,gx]=cs.mean(0); cls[gy,gx]=3
    return out,cls
cfgs={'sphere':[(900,97.5,17,11)],'bolt':[(71,97,9,9)],
 'breath':[(748,82,8,6),(781,98,7,6),(818,83,7,6),(745,161,8,6),(778,153,7,6),(820,165,8,6)]}
for name,ell in cfgs.items():
    out,cls=eye(name,ell)
    dd=d[name]
    a=Image.fromarray(dd['rgb'].clip(0,255).astype(np.uint8)); b=Image.fromarray(out.clip(0,255).astype(np.uint8))
    ox,oy=dd['origin']; k=dd['k']
    his=Image.fromarray(IM.astype(np.uint8)).resize((dd['w'],dd['h']),Image.BOX,box=(ox,oy,ox+dd['w']/k,oy+dd['h']/k))
    z=8; Wd=dd['w']*z
    sheet=Image.new('RGB',(Wd*3+20,dd['h']*z))
    for i,im in enumerate([his,a,b]): sheet.paste(im.resize((Wd,dd['h']*z),Image.NEAREST),(i*(Wd+10),0))
    sheet.save(S+'/gj-fix/eyeproto_'+name+'.png')
import json,re
txt=open(S+'/gj-fix/refdata-r1.ts').read()
pal=json.loads(re.search(r'GJ_PAL: GjPal\[\] = (\[.*?\]);',txt).group(1))
P=np.array([[int(p['rgba'][i:i+2],16) for i in (1,3,5)] for p in pal if p['kind'] in ('body','outline')],float)
P=np.concatenate([P,[[240,228,248],[252,244,255]]])
PL=lab(P)
def q(rgb,w):
    L=lab(rgb)*w; dist=((L[...,None,:]-(PL*w)[None,None])**2).sum(-1); return P[dist.argmin(-1)]
for name,ell in cfgs.items():
    dd=d[name]; out,cls=eye(name,ell)
    m=cls>0
    variants=[dd['rgb'],out]
    sheets=[]
    ox,oy=dd['origin']; k=dd['k']
    for v in variants:
        for w in (np.array([1,1.6,1.6]),np.array([2.0,1,1])):
            r=v.copy(); r[m]=q(v[m][None],w)[0]; sheets.append(r)
    ys,xs=np.nonzero(m); x0,x1,y0,y1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
    his=np.asarray(Image.fromarray(IM.astype(np.uint8)).resize((dd['w'],dd['h']),Image.BOX,box=(ox,oy,ox+dd['w']/k,oy+dd['h']/k))).astype(float)
    ims=[his]+sheets
    z=10 if name!='breath' else 6
    tiles=[Image.fromarray(im[y0:y1,x0:x1].clip(0,255).astype(np.uint8)).resize(((x1-x0)*z,(y1-y0)*z),Image.NEAREST) for im in ims]
    s=Image.new('RGB',(sum(t.width+8 for t in tiles),tiles[0].height),(255,0,255))
    x=0
    for t in tiles: s.paste(t,(x,0)); x+=t.width+8
    s.save(S+'/gj-fix/eyeq_'+name+'.png')
# per-eye breath zoom
name='breath'; dd=d[name]; ox,oy=dd['origin']; k=dd['k']
his=np.asarray(Image.fromarray(IM.astype(np.uint8)).resize((dd['w'],dd['h']),Image.BOX,box=(ox,oy,ox+dd['w']/k,oy+dd['h']/k))).astype(float)
out,cls=eye(name,cfgs['breath']); m=cls>0
wL=np.array([2.0,1,1])
A=dd['rgb'].copy(); A[m]=q(dd['rgb'][m][None],wL)[0]
B=out.copy(); B[m]=q(out[m][None],wL)[0]
# lightness-aware with smaller dark share
out2,cls2=eye(name,cfgs['breath'],dk=0.3,lt=0.6); C=out2.copy(); C[m]=q(out2[m][None],wL)[0]
rows=[]
for (cx,cy,rx,ry) in cfgs['breath']:
    gx=int((cx-ox)*k); gy=int((cy-oy)*k)
    tiles=[Image.fromarray(im[gy-7:gy+8,gx-8:gx+9].clip(0,255).astype(np.uint8)).resize((17*14,15*14),Image.NEAREST) for im in (his,A,B,C)]
    r=Image.new('RGB',(4*(17*14+6),15*14),(255,0,255))
    for i,t in enumerate(tiles): r.paste(t,(i*(17*14+6),0))
    rows.append(r)
s=Image.new('RGB',(rows[0].width,len(rows)*(15*14+6)),(255,0,255))
for i,r in enumerate(rows): s.paste(r,(0,i*(15*14+6)))
s.save(S+'/gj-fix/eyeq_breath_each.png')
