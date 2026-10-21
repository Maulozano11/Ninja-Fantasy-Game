from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-genjutsu-beast-r2'
im=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
a=np.asarray(im).astype(float)
BG=np.array([31,31,41.])
sh=Image.open(S+'/staging/vfx_beasts_crows/genjutsu.png').convert('RGBA')
FW,FH=212,176; AX,AY=116,91
frames={}
for r,name in enumerate(['fly','summon']):
    for i in range(6):
        frames[(name,i)]=sh.crop((i*FW,r*FH,(i+1)*FW,(r+1)*FH))
        frames[(name,i)].save(R+f'/p3-{name}{i}.png')
sc=96/124
def his(x0,x1):
    c=a[802:1006,x0:x1]
    d=np.abs(c-BG).sum(axis=2)
    w=np.clip((d-12)/40,0,1)
    ys,xs=np.mgrid[0:c.shape[0],0:c.shape[1]]
    cx=(w*xs).sum()/w.sum()+x0; cy=(w*ys).sum()/w.sum()+802
    print('com sheet',x0,x1,round(cx,1),round(cy,1))
    # place: sheet coordinate (cx,cy) -> game (AX,AY). game px g -> sheet = cx + (g+0.5-AX)/sc -0.5 ... resample
    # build an affine resize of the full sheet region
    W=int(round((x1-x0)*sc)); H=int(round((1006-802)*sc))
    crop=im.crop((x0,802,x1,1006)).resize((W,H),Image.BOX)
    canvas=Image.new('RGB',(FW,FH),tuple(int(v) for v in BG))
    ox=AX-(cx-x0)*sc; oy=AY-(cy-802)*sc
    canvas.paste(crop,(int(round(ox)),int(round(oy))))
    return canvas,(ox,oy)
L,offL=his(266,515)
Rt,offR=his(515,780)
L.save(R+'/p3-his-L-game.png'); Rt.save(R+'/p3-his-R-game.png')
print(offL,offR)
def onbg(f,bg=(31,31,41)):
    b=Image.new('RGBA',f.size,bg+(255,)); b.alpha_composite(f); return b.convert('RGB')
def x3(i): return i.resize((i.width*3,i.height*3),Image.NEAREST)
for tag,h,k in [('L',L,0),('R',Rt,4)]:
    o=onbg(frames[('fly',k)])
    g=onbg(frames[('fly',k)],(96,112,80))
    W=Image.new('RGB',(FW*3*3+20,FH*3),(60,60,60))
    W.paste(x3(h),(0,0)); W.paste(x3(o),(FW*3+10,0)); W.paste(x3(g),(FW*6+20,0))
    d=ImageDraw.Draw(W)
    for xo in (0,FW*3+10,FW*6+20):
        d.line((xo+AX*3-6,AY*3,xo+AX*3+6,AY*3),fill=(255,255,0)); d.line((xo+AX*3,AY*3-6,xo+AX*3,AY*3+6),fill=(255,255,0))
    W.save(R+f'/p3-cmp-{tag}-3x.png')
