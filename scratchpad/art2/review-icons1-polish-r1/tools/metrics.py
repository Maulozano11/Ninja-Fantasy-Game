import sys; sys.path.insert(0,'.')
from common import *
from PIL import ImageFilter
import numpy as np
def lab(im): return oklab(np.asarray(im.convert('RGB')))
def blurdiff(a_im,ref_im,n,sig):
    # blur both at size n
    a=lab(a_im.filter(ImageFilter.GaussianBlur(sig)))
    b=lab(ref_im.filter(ImageFilter.GaussianBlur(sig)))
    return np.sqrt(((a-b)**2).sum(2)).mean()*100
def quant(im,pal_im):
    p=np.unique(np.asarray(pal_im.convert('RGB')).reshape(-1,3),axis=0)
    a=np.asarray(im.convert('RGB')).reshape(-1,3).astype(float)
    pl=oklab(p[None].astype(float))[0]; al=oklab(a[None])[0]
    d=((al[:,None,:]-pl[None])**2).sum(2)
    return Image.fromarray(p[d.argmin(1)].reshape(im.height,im.width,3).astype(np.uint8))
for i,n in enumerate(IDS):
    h=his_crop(i)
    for N,two in ((44,False),(88,True)):
        o=ours(i,two).convert('RGB'); hb=box(h,N)
        # reference: his crop downsampled with lanczos at 4N then blurred... simpler: compare at N
        href=h.resize((N,N),Image.LANCZOS)
        sig=N/44*1.0
        q=quant(hb,o)
        lo=lab(o); lh=lab(hb)
        print(f'{n:26s} {N}: blur-diff to his(lanczos) ours={blurdiff(o,hb,N,sig):.2f} hisbox-on-ourpal={blurdiff(q,hb,N,sig):.2f} | meanL ours {lo[...,0].mean():.3f} his {lh[...,0].mean():.3f} | stdL ours {lo[...,0].std():.3f} his {lh[...,0].std():.3f} | chroma ours {np.hypot(lo[...,1],lo[...,2]).mean():.3f} his {np.hypot(lh[...,1],lh[...,2]).mean():.3f} | rawdiff ours {np.sqrt(((lo-lh)**2).sum(2)).mean()*100:.2f} q {np.sqrt(((lab(q)-lh)**2).sum(2)).mean()*100:.2f}')
