import numpy as np
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
R=S+'/art2/review-beast-r4'
ref=Image.open(S+'/art2/REF-earth-set-owner.jpg').convert('RGB')
s=96/228; W,H=284,167
AL={0:(1,2,35,-6,502,1118),5:(2,2,19,-6,1118,1758)}
for key,(px,py,ox,oy,x0,x1) in AL.items():
    c=ref.crop((x0+px,1544+py,x1+px,1975+py))
    g=c.resize((round(c.width*s),round(c.height*s)),Image.BOX)
    his=Image.new('RGB',(W,H),(34,34,44)); his.paste(g,(ox,oy))
    his.save(R+'/his-f%d-game.png'%key)
    f=Image.open(R+'/f%d.png'%key)
    ours=Image.new('RGBA',(W,H),(34,34,44,255)); ours.alpha_composite(f); ours=ours.convert('RGB')
    sb=Image.new('RGB',(W*2+4,H),(255,0,255)); sb.paste(his,(0,0)); sb.paste(ours,(W+4,0))
    sb.resize((sb.width*3,sb.height*3),Image.NEAREST).save(R+'/sbs-f%d-3x.png'%key)
    # mask diff
    hm=np.abs(np.asarray(his).astype(int)-np.array([34,34,44])).sum(2)>30
    om=np.asarray(f)[...,3]>0
    d=np.zeros((H,W,3),np.uint8)
    d[hm&om]=(90,90,90); d[hm&~om]=(255,60,60); d[~hm&om]=(60,200,255)
    Image.fromarray(d).resize((W*3,H*3),Image.NEAREST).save(R+'/maskdiff-f%d.png'%key)
    print(key,'his only',(hm&~om).sum(),'ours only',(~hm&om).sum())
