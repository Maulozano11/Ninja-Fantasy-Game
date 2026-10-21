import sys, numpy as np
from PIL import Image
REF='../art2/REF-lightning-set-owner.jpg'
im=np.asarray(Image.open(REF).convert('RGB')).astype(float)
BG=np.array([32.,32.,42.])
def lum(c): return 0.3*c[...,0]+0.59*c[...,1]+0.11*c[...,2]
def c2a(c):
    d=np.maximum(c-BG,0); a=(d/(255-BG)).max(-1)
    F=BG+d/np.maximum(a,1e-6)[...,None]
    return a,np.clip(F,0,255)
def run(x0,y0,w,h,T,name):
    c=im[y0:y0+h,x0:x0+w]
    L=lum(c); a,F=c2a(c)
    warm=(c[...,0]>c[...,2]+12)&(c[...,0]>90)
    solid=(L>=T)&~warm
    out=np.zeros((h,w,4))
    # glow
    g=(a>0.06)
    aq=np.clip(np.round(a*5)/5,0,1)
    out[g,:3]=F[g]; out[g,3]=aq[g]*255
    # solid
    out[solid,:3]=c[solid]; out[solid,3]=255
    # outline ring
    s=solid.copy(); ring=np.zeros_like(s)
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ring|=np.roll(np.roll(s,dy,0),dx,1)
    ring&=~s&~warm
    out[ring,:3]=[30,70,180]; out[ring,3]=255
    out[warm,:3]=c[warm]; out[warm,3]=255
    def comp(bg):
        A=out[...,3:]/255; return (out[...,:3]*A+np.array(bg)*(1-A)).astype(np.uint8)
    k=6
    imgs=[c.astype(np.uint8),comp(BG),comp([70,100,60])]
    W=w*k*3+20; S=Image.new('RGB',(W,h*k),(0,0,0))
    for i,x in enumerate(imgs): S.paste(Image.fromarray(x).resize((w*k,h*k),Image.NEAREST),(i*(w*k+10),0))
    S.save('proto/'+name+'.png')
run(10,38,74,64,int(sys.argv[1]),'bolt')
run(227,179,77,77,int(sys.argv[1]),'hit')
