from PIL import Image, ImageDraw
import numpy as np, sys
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2'
R=S+'/review-genjutsu-beast-r2'
ref=Image.open(S+'/REF-genjutsu-set-owner.jpg').convert('RGB')
sheet=np.asarray(Image.open(S+'/staging/vfx_beasts_crows/genjutsu.png').convert('RGBA'))
W,H=221,170; AX,AY=116,90; k=96/124
def frame(r,f): return sheet[r*H:(r+1)*H, f*W:(f+1)*W]
def his(cx,cy,x0,x1):
    # crop his picture region (limited to his panel half x0..x1) mapped to our frame
    big=ref.crop((int(round(cx-AX/k)),int(round(cy-AY/k)),int(round(cx+(W-AX)/k)),int(round(cy+(H-AY)/k))))
    # blank areas outside his half
    a=np.asarray(big).copy()
    ox=int(round(cx-AX/k))
    bg=np.array([31,31,41])
    for x in range(a.shape[1]):
        sx=ox+x
        if sx<x0 or sx>=x1: a[:,x]=bg
    oy=int(round(cy-AY/k))
    for y in range(a.shape[0]):
        sy=oy+y
        if sy<798 or sy>=1009: a[y]=bg
    return Image.fromarray(a.astype(np.uint8)).resize((W,H),Image.BOX)
def over(fr,bg):
    a=fr[...,3:4]/255.0
    return (fr[...,:3]*a+np.array(bg)*(1-a)).astype(np.uint8)
hL=his(384.4,905.3,262,522); hR=his(665.2,902.6,522,785)
hL.save(R+'/his-L-game.png'); hR.save(R+'/his-R-game.png')
bg=(31,31,41)
def pair(h,fr,name):
    o=Image.fromarray(over(fr,bg))
    c=Image.new('RGB',(W*2+4,H),(255,255,255)); c.paste(h,(0,0)); c.paste(o,(W+4,0))
    c=c.resize((c.width*3,c.height*3),Image.NEAREST)
    d=ImageDraw.Draw(c)
    for xo in (0,(W+4)*3):
        d.line([(xo+AX*3-6,AY*3),(xo+AX*3+6,AY*3)],fill=(255,255,0)); d.line([(xo+AX*3,AY*3-6),(xo+AX*3,AY*3+6)],fill=(255,255,0))
    c.save(R+'/'+name)
pair(hL,frame(0,0),'cmp-L-3x.png'); pair(hR,frame(0,4),'cmp-R-3x.png')
# diff
for h,fr,n in ((hL,frame(0,0),'L'),(hR,frame(0,4),'R')):
    o=over(fr,bg).astype(int); hh=np.asarray(h).astype(int)
    d=np.abs(o-hh).sum(2)
    print(n,'mean abs diff',d.mean(),'pix>60',(d>60).sum(),'pix>120',(d>120).sum())
    # coverage: his non-bg vs our opaque
    hm=np.abs(hh-np.array(bg)).sum(2)>18
    om=fr[...,3]>0
    print(n,'his nonbg',hm.sum(),'ours opaque',om.sum(),'his-not-ours',(hm&~om).sum(),'ours-not-his',(om&~hm).sum())
    vis=np.zeros((H,W,3),np.uint8); vis[hm&om]=(90,90,90); vis[hm&~om]=(255,60,60); vis[om&~hm]=(60,160,255)
    Image.fromarray(vis).resize((W*3,H*3),Image.NEAREST).save(R+'/cover-%s-3x.png'%n)
    dv=np.clip(d,0,255).astype(np.uint8)
    Image.fromarray(dv).resize((W*3,H*3),Image.NEAREST).save(R+'/diff-%s-3x.png'%n)
