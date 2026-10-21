import sys; sys.path.insert(0,'py')
from common import *
names=sys.argv[1:]
for n in names:
    h=Image.open('his_'+n+'.png'); o=Image.open('our_'+n+'.png')
    hn=np.asarray(h).astype(float); on_=np.asarray(o).astype(float)
    d=np.clip(np.abs(hn-on_).mean(-1)*3,0,255).astype(np.uint8)
    dimg=Image.fromarray(np.stack([d,d//2,d//2],-1))
    w,hh=h.size; s=3 if w<150 else 2
    W=w*s*3+20
    c=Image.new('RGB',(W,hh*s+14),(60,60,60))
    dr=ImageDraw.Draw(c)
    for k,(im,lab) in enumerate([(h,'HIS (game scale)'),(o,'OURS key'),(dimg,'abs diff x3')]):
        c.paste(up(im,s),(k*(w*s+10),14)); dr.text((k*(w*s+10)+2,2),lab,fill=(255,255,0))
    c.save('sbs_'+n+'.png')
