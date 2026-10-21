import sys
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-beast-r1'
ref=Image.open(S+'/REF-earth-set-owner.jpg').convert('RGB')
sheet=Image.open(S+'/staging/vfx_beasts/earth.png').convert('RGBA')
s=96/228
AX,AY=149,82
FW,FH=275,180
torso={0:(792,1755),5:(1458,1735)}
BG=(34,34,44)
def his(k):
    tx,ty=torso[k]
    rx0=tx-AX/s; ry0=ty-AY/s
    return ref.resize((FW,FH),Image.BOX,box=(rx0,ry0,rx0+FW/s,ry0+FH/s))
def ours(f):
    return sheet.crop((f*FW,0,(f+1)*FW,FH))
def over_bg(im,bg=BG):
    b=Image.new('RGBA',im.size,bg+(255,)); b.alpha_composite(im); return b.convert('RGB')
for k in (0,5):
    h=his(k); o=ours(k); ob=over_bg(o)
    h.save(f'{R}/his{k}-game.png')
    W=FW*3
    out=Image.new('RGB',(W*2+10,FH*3),(10,10,10))
    out.paste(h.resize((W,FH*3),Image.NEAREST),(0,0))
    out.paste(ob.resize((W,FH*3),Image.NEAREST),(W+10,0))
    d=ImageDraw.Draw(out)
    for xo in (0,W+10):
        d.line([(xo+AX*3,0),(xo+AX*3,FH*3)],fill=(255,0,255))
        d.line([(xo,AY*3),(xo+W,AY*3)],fill=(255,0,255))
        d.line([(xo,162*3),(xo+W,162*3)],fill=(0,255,255))
    out.save(f'{R}/side{k}.png')
    # silhouette overlay
    hn=np.asarray(h).astype(int); m_h=np.abs(hn-np.array(BG)).sum(2)>45
    oa=np.asarray(o); m_o=oa[...,3]>0
    ov=np.zeros((FH,FW,3),np.uint8)
    ov[m_h&m_o]=(120,120,120); ov[m_h&~m_o]=(255,60,60); ov[~m_h&m_o]=(60,140,255)
    Image.fromarray(ov).resize((W,FH*3),Image.NEAREST).save(f'{R}/sil{k}.png')
    print(k,'his',m_h.sum(),'ours',m_o.sum(),'both',(m_h&m_o).sum(),'hisonly',(m_h&~m_o).sum(),'oursonly',(~m_h&m_o).sum())
