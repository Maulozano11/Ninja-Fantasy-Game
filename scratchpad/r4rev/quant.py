from PIL import Image
import numpy as np, json, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
man=json.load(open(D+'manifest.json'))
n=sys.argv[1]
pal=np.array([[int(h[i:i+2],16) for i in (1,3,5)] for h in man['icons'][n]['palette']],float)
pl=oklab(pal)
his=Image.open('his_'+n+'.png')
out=[]
for S in (44,88):
    hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
    lab=oklab(hb)
    d=np.linalg.norm(lab[:,:,None,:]-pl[None,None],axis=-1); idx=d.argmin(-1)
    q=pal[idx].astype(np.uint8)
    Image.fromarray(q).save('q_%s_%d.png'%(n,S))
    o=Image.open(D+n+('.png' if S==44 else '@2x.png')).convert('RGB')
    W=440
    s=Image.new('RGB',(W*3+40,W+20),(16,17,22))
    s.paste(his.resize((W,W),Image.LANCZOS),(10,10))
    s.paste(Image.fromarray(q).resize((W,W),Image.NEAREST),(W+20,10))
    s.paste(o.resize((W,W),Image.NEAREST),(2*W+30,10))
    s.save(R+'%s-%d-his-hisboxOnPalette-ours.png'%(n,S))
