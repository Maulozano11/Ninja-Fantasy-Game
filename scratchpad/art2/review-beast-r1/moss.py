import sys, colorsys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
sc=96/228
BG=np.array([34,34,44])
def hiscrop(ox,oy):
    w=275/sc; h=180/sc
    return np.asarray(ref.crop((ox,oy,ox+w,oy+h)).resize((275,180),Image.BOX)).astype(float)
def hsv(a):
    a=a/255.; mx=a.max(-1); mn=a.min(-1)
    s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    return s,mx
for k,(ox,oy) in {0:(438,1560),5:(1104,1540)}.items():
    f=np.asarray(Image.open(R+'/ours-f%d.png'%k).convert('RGBA')).astype(float)
    al=f[:,:,3]
    h=hiscrop(ox,oy); o=f[:,:,:3]
    def green(a): return (a[:,:,1]>a[:,:,0]+6)&(a[:,:,1]>a[:,:,2]+15)
    gh=green(h); go=green(o)&(al==255)
    print(k,'moss px his',gh.sum(),'ours',go.sum())
    print('  his moss mean',h[gh].mean(0).round(1),'ours',o[go].mean(0).round(1))
    print('  his moss 90pct G',np.percentile(h[gh][:,1],90),'ours',np.percentile(o[go][:,1],90))
    sh,vh=hsv(h[gh]); so,vo=hsv(o[go])
    print('  sat his',sh.mean().round(3),'ours',so.mean().round(3),' val his',vh.mean().round(3),'ours',vo.mean().round(3))
    # horns grey: low sat bright
    # eye: yellow bright
    def eye(a): return (a[:,:,0]>170)&(a[:,:,1]>130)&(a[:,:,2]<110)
    eh=eye(h); eo=eye(o)&(al>0)
    print('  eye-yellow px his',eh.sum(),'ours',eo.sum())
    # brightest stone highlights
    lum=lambda a:(a*[0.299,0.587,0.114]).sum(-1)
    m=al==255
    print('  bright (lum>140) px his',(lum(h)[m]>140).sum(),'ours',(lum(o)[m]>140).sum())
    print('  dark (lum<35) px his',(lum(h)[m]<35).sum(),'ours',(lum(o)[m]<35).sum())
