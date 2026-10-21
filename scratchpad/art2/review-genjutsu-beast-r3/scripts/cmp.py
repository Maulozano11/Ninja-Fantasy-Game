from PIL import Image, ImageDraw
import numpy as np
D='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
R=D+'review-genjutsu-beast-r3/'
ref=Image.open(D+'REF-genjutsu-set-owner.jpg').convert('RGB')
s=96/124.0
def his(box,off):
    c=ref.crop(box)
    c=c.resize((round(c.width*s),round(c.height*s)),Image.BOX)
    can=Image.new('RGB',(212,167),(31,31,41))
    can.paste(c,off)
    return can
def comp(o,bg):
    b=Image.new('RGBA',o.size,bg+(255,)); b.alpha_composite(o); return b.convert('RGB')
for name,box,fn,off in [('L',(262,798,522,1009),0,(21,-1)),('R',(522,798,785,1009),4,(5,1))]:
    h=his(box,off); h.save(R+'his-%s-game.png'%name)
    o=Image.open(R+'fly%d.png'%fn).convert('RGBA')
    ob=comp(o,(31,31,41)); og=comp(o,(96,110,84))
    sheet=Image.new('RGB',(212*3+8,167),(80,80,80))
    sheet.paste(h,(0,0)); sheet.paste(ob,(216,0)); sheet.paste(og,(432,0))
    sheet=sheet.resize((sheet.width*3,sheet.height*3),Image.NEAREST)
    d=ImageDraw.Draw(sheet)
    for k in range(3):
        x=(k*216+116)*3; y=82*3
        d.line([(x-6,y),(x+6,y)],fill=(255,200,0)); d.line([(x,y-6),(x,y+6)],fill=(255,200,0))
    sheet.save(R+'cmp-%s-3x.png'%name)
    # diff
    ha=np.array(h).astype(int); oa=np.array(ob).astype(int)
    df=np.abs(ha-oa).sum(2)
    print(name,'mean abs err per ch',np.abs(ha-oa).mean(),'pixels with err>60',(df>60).sum(),'>120',(df>120).sum())
    dimg=Image.fromarray(np.clip(df*2,0,255).astype(np.uint8)).resize((636,501),Image.NEAREST)
    dimg.save(R+'diff-%s-3x.png'%name)
