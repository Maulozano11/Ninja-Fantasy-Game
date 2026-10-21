import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=np.asarray(Image.open(f'{S}/art2/REF-earth-set-owner.jpg').convert('RGB')).astype(float)
sh=np.asarray(Image.open(f'{S}/art2/staging/vfx_beasts/earth.png').convert('RGBA')).astype(float)
W,H=276,160; AX,AY=149,77; k=96/228
bg=np.array([34,34,44.])
refimg=Image.open(f'{S}/art2/REF-earth-set-owner.jpg').convert('RGB')
# his coverage mask: pixel differs from panel
d=np.abs(ref-bg).sum(2)
mask=(d>24).astype(np.uint8)*255
mimg=Image.fromarray(mask)
def his(cx,cy,img):
    x0=cx-AX/k; y0=cy-AY/k
    return np.asarray(img.resize((W,H),Image.BOX,box=(x0,y0,x0+W/k,y0+H/k))).astype(float)
for i,(cx,cy) in ((0,(792,1755)),(5,(1448,1755))):
    h=his(cx,cy,refimg); hm=his(cx,cy,mimg)/255.
    o=sh[:, i*W:(i+1)*W]
    oa=o[...,3]>0
    if i==0: hm[:, :int((502-cx)*k+AX)+2]=0  # ignore other panel left of his border
    if i==5: hm[:, :int((1118-cx)*k+AX)]=0
    hs=hm>=0.5
    print(f'frame {i}: ours opaque {oa.sum()}, his>=50% {hs.sum()}, ours-not-his {(oa&~hs).sum()}, his-not-ours {(hs&~oa).sum()}')
    both=oa&hs
    diff=np.abs(o[...,:3]-h)[both].mean(0)
    lum=lambda a: (a[...,0]*.299+a[...,1]*.587+a[...,2]*.114)
    print('  mean abs RGB diff where both',diff.round(1),' mean lum ours',lum(o[...,:3])[both].mean().round(1),'his',lum(h)[both].mean().round(1))
    print('  mean RGB ours',o[...,:3][both].mean(0).round(1),'his',h[both].mean(0).round(1))
    # saturation
    def sat(a):
        mx=a.max(-1); mn=a.min(-1); return np.where(mx>0,(mx-mn)/np.maximum(mx,1),0)
    print('  mean sat ours',sat(o[...,:3])[both].mean().round(3),'his',sat(h)[both].mean().round(3))
    # green moss pixels
    g_o=(o[...,1]>o[...,0]+15)&(o[...,1]>o[...,2]+15)&oa
    g_h=(h[...,1]>h[...,0]+15)&(h[...,1]>h[...,2]+15)&hs
    print('  moss px ours',g_o.sum(),'his',g_h.sum(),' mean ours',o[...,:3][g_o].mean(0).round(1),'his',h[g_h].mean(0).round(1))
    # yellow glow
    y_o=(o[...,0]>170)&(o[...,1]>130)&(o[...,2]<110)&oa
    y_h=(h[...,0]>170)&(h[...,1]>130)&(h[...,2]<110)&hs
    print('  yellow/cream px ours',y_o.sum(),'his',y_h.sum())
    # xor image
    vis=np.zeros((H,W,3),np.uint8); vis[both]=(120,120,120); vis[oa&~hs]=(255,0,0); vis[hs&~oa]=(0,160,255)
    Image.fromarray(vis).resize((W*3,H*3),Image.NEAREST).save(f'{R}/xor-f{i}.png')
    # abs diff heat
    dd=np.abs(o[...,:3]-h).sum(2); dd[~both]=0
    Image.fromarray(np.clip(dd*1.5,0,255).astype(np.uint8)).resize((W*3,H*3),Image.NEAREST).save(f'{R}/diff-f{i}.png')
