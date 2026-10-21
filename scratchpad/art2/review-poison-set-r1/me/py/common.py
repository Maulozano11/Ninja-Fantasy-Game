from PIL import Image, ImageDraw
import numpy as np, json
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
ST=S+'/art2/staging/vfx_poison_v3/'
OUT=S+'/art2/review-poison-set-r1/me/'
REF=Image.open(S+'/art2/REF-poison-set-owner.jpg').convert('RGB')
MAN=json.load(open(ST+'manifest.json'))['sprites']
BG=(30,32,46)
def frames(name, anim=None):
    sp=MAN[name]; im=Image.open(ST+sp['file']).convert('RGBA')
    fw,fh=sp['frameW'],sp['frameH']
    out={}
    for an,a in sp['anims'].items():
        if anim and an!=anim: continue
        out[an]=[im.crop((i*fw,a['row']*fh,(i+1)*fw,(a['row']+1)*fh)) for i in range(a['frames'])]
    return out if not anim else out[anim]
def his(x0,y0,w,h,sx=1.0,sy=1/0.98):
    # output pixel (i,j) center -> input x0 + (i+0.5)*sx - 0.5 ; affine maps output coords to input
    return REF.transform((w,h),Image.AFFINE,(sx,0,x0,0,sy,y0),resample=Image.BILINEAR)
def on(bg,fr):
    b=Image.new('RGBA',fr.size,bg+(255,)); b.alpha_composite(fr); return b.convert('RGB')
def up(im,s=3): return im.resize((im.width*s,im.height*s),Image.NEAREST)
def light(fr):
    a=np.asarray(fr).astype(float)/255.
    br=a[...,:3].max(-1)  # brightness
    return (a[...,3]*br).mean()*1000
