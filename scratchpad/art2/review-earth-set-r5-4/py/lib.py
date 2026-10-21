import json, numpy as np
from PIL import Image
SP='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
G=SP+'/art2/staging/vfx_earth_v3'
R=SP+'/art2/review-earth-set-r5-4'
M=json.load(open(G+'/manifest.json'))
def frames(name, anim=None):
    s=M['sprites'][name]; im=np.array(Image.open(G+'/'+s['file']).convert('RGBA'))
    if anim is None: anim=list(s['anims'])[0]
    a=s['anims'][anim]; w,h=s['frameW'],s['frameH']; r=a['row']
    return [im[r*h:(r+1)*h, i*w:(i+1)*w].copy() for i in range(a['frames'])]
def over(fr, bg):
    a=fr[...,3:4]/255.0
    out=fr[...,:3]*a+np.array(bg,float)[None,None,:]*(1-a) if not isinstance(bg,np.ndarray) else fr[...,:3]*a+bg*(1-a)
    return out.clip(0,255).astype(np.uint8)
def up(img,k): return np.kron(img, np.ones((k,k,1),dtype=img.dtype)) if img.ndim==3 else np.kron(img,np.ones((k,k),dtype=img.dtype))
PANEL=(28,28,36)
LIGHT=(226,222,210)
def grass(h,w):
    yy,xx=np.mgrid[0:h,0:w]
    g=np.stack([60+8*((xx*7+yy*13)%5==0), 110+15*((xx*3+yy*5)%7==0), 48+0*xx],-1).astype(float)
    return g
def save(arr,path): Image.fromarray(arr).save(path)
