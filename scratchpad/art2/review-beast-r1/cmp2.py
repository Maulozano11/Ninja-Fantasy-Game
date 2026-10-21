import sys
from PIL import Image
import numpy as np
S=sys.argv[1]; R=sys.argv[2]
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
sc=96/228
BG=np.array([34,34,44])
def hiscrop(ox,oy):
    w=275/sc; h=180/sc
    return np.asarray(ref.crop((ox,oy,ox+w,oy+h)).resize((275,180),Image.BOX)).astype(float)
for k,(ox,oy) in {0:(438,1560),5:(1104,1540)}.items():
    f=np.asarray(Image.open(R+'/ours-f%d.png'%k).convert('RGBA')).astype(float)
    al=f[:,:,3:]/255
    o=f[:,:,:3]*al+BG*(1-al)
    h=hiscrop(ox,oy)
    m=al[:,:,0]>0.99
    print(k,'drake px',m.sum(),'his mean',h[m].mean(0).round(1),'ours mean',o[m].mean(0).round(1))
    lum=lambda a:(a*[0.299,0.587,0.114]).sum(-1)
    print('  his lum std',lum(h[m]).std().round(1),'ours lum std',lum(o[m]).std().round(1))
    print('  his lum pct 5/50/95',np.percentile(lum(h[m]),[5,50,95]).round(1),'ours',np.percentile(lum(o[m]),[5,50,95]).round(1))
    Image.fromarray(h.astype(np.uint8)).save(R+'/his-k%d-aligned.png'%k)
    W,H=275*3,180*3
    out=Image.new('RGB',(W*2+6,H),(255,0,255))
    out.paste(Image.fromarray(h.astype(np.uint8)).resize((W,H),Image.NEAREST),(0,0))
    out.paste(Image.fromarray(o.astype(np.uint8)).resize((W,H),Image.NEAREST),(W+6,0))
    out.save(R+'/cmp-k%d-3x.png'%k)
    # detail crops 5x: head and body
    for name,box in {'head':(175,40,275,140),'body':(30,20,190,175)}.items():
        x0,y0,x1,y1=box; s=5 if name=='head' else 4
        hh=Image.fromarray(h.astype(np.uint8)).crop(box); oo=Image.fromarray(o.astype(np.uint8)).crop(box)
        W2,H2=(x1-x0)*s,(y1-y0)*s
        out=Image.new('RGB',(W2*2+6,H2),(255,0,255))
        out.paste(hh.resize((W2,H2),Image.NEAREST),(0,0)); out.paste(oo.resize((W2,H2),Image.NEAREST),(W2+6,0))
        out.save(R+'/cmp-k%d-%s.png'%(k,name))
