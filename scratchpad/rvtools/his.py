from PIL import Image
import numpy as np
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
REF=A+'REF-genjutsu-set-owner.jpg'
BG=np.array([31,31,41])
S=96/124
W,H=212,176
AX,AY=116,91
def load():
    return np.array(Image.open(REF).convert('RGB')).astype(float)
def mask(c,thr=30):
    return np.abs(c-BG).sum(2)>thr
def com(x0,y0,x1,y1,thr=30):
    im=load(); c=im[y0:y1,x0:x1]; m=mask(c,thr)
    ys,xs=np.nonzero(m)
    w=np.abs(c-BG).sum(2)[m]
    return x0+xs.mean(), y0+ys.mean(), m.sum()
def game(x0,y0,x1,y1,cx,cy):
    """scale his region so that sheet point (cx,cy) lands on anchor; returns RGB on his bg + mask alpha"""
    im=Image.open(REF).convert('RGB')
    # build affine: game (gx,gy) -> sheet (cx+(gx+0.5-AX)/S -0.5 ...) use transform with box via resize of big region
    # crop a region and resize with BOX at scale S, then paste with offset
    cw,ch=x1-x0,y1-y0
    tw,th=round(cw*S),round(ch*S)
    r=im.crop((x0,y0,x1,y1)).resize((tw,th),Image.BOX)
    # sheet x0 maps to game AX+(x0-cx)*S
    ox=AX+(x0-cx)*S; oy=AY+(y0-cy)*S
    can=Image.new('RGB',(W,H),tuple(BG))
    can.paste(r,(round(ox),round(oy)))
    return can,(ox,oy)
