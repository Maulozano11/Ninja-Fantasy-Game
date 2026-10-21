from PIL import Image
import numpy as np, sys
exec(open('stats.py').read().split("n=sys.argv[1]")[0])
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
n=sys.argv[1]
his=Image.open('his_'+n+'.png')
S=44
hb=np.asarray(his.resize((S,S),Image.BOX)).astype(float)
# also his lanczos-smoothed (sharper)
hl=np.asarray(his.resize((S,S),Image.LANCZOS)).astype(float)
o=np.asarray(Image.open(D+n+'.png').convert('RGB')).astype(float)
ims=[]
for a in (hb,hl,o):
    L=oklab(np.clip(a,0,255))[...,0]
    g=(np.clip(L,0,1)*255).astype(np.uint8)
    ims.append(Image.fromarray(g).resize((352,352),Image.NEAREST))
s=Image.new('L',(352*3+40,372),20)
for i,im in enumerate(ims): s.paste(im,(10+i*362,10))
s.save(R+n+'-44-valuemap-hisbox-hislanczos-ours.png')
