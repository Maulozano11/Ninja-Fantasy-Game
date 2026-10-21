import sys
from PIL import Image, ImageDraw
import numpy as np
A='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
O=A+'review-genjutsu-beast-r1/'
ref=Image.open(A+'REF-genjutsu-set-owner.jpg').convert('RGB')
sheet=Image.open(A+'staging/vfx_beasts_crows/genjutsu.png').convert('RGBA')
FW,FH=213,165; AX,AY=116,85
S=96/124
def frame(row,i): return sheet.crop((i*FW,row*FH,(i+1)*FW,(row+1)*FH))
def his(com):
    cx,cy=com
    x0=cx-AX/S; y0=cy-AY/S
    # crop at sheet scale (padded) then box-resize exactly
    import math
    X0=math.floor(x0); Y0=math.floor(y0)
    big=ref.crop((X0,Y0,X0+math.ceil(FW/S)+2,Y0+math.ceil(FH/S)+2))
    c=big.resize((FW,FH),Image.BOX,box=(x0-X0,y0-Y0,x0-X0+FW/S,y0-Y0+FH/S))
    return c
def on(bg,im):
    b=Image.new('RGBA',im.size,bg+(255,)); b.alpha_composite(im); return b.convert('RGB')
BG=(31,31,41); GR=(92,108,84)
K=3
def up(im): return im.resize((im.width*K,im.height*K),Image.NEAREST)
for tag,com,fi in [('L',(384.4269540694337,905.3472996907377),0),('R',(665.1502695565949,902.600258826489),4)]:
    h=his(com); o=frame(0,fi)
    tiles=[h,on(BG,o),on(GR,o)]
    W=sum(t.width for t in tiles)*K+20; 
    out=Image.new('RGB',(W,FH*K),(0,0,0)); x=0
    for t in tiles:
        out.paste(up(t),(x,0)); x+=t.width*K+10
    d=ImageDraw.Draw(out)
    out.save(O+f'cmp-{tag}-3x.png')
    # diff overlay: his vs ours on his bg
    hn=np.array(h).astype(int); on_=np.array(on(BG,o)).astype(int)
    diff=np.abs(hn-on_).sum(2)
    print(tag,'mean abs diff',diff.mean(), 'pct>60',(diff>60).mean())
    dm=Image.fromarray(np.clip(diff,0,255).astype('uint8'))
    up(dm).save(O+f'diff-{tag}-3x.png')
