import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
b=rm['blast']['box']
his=ref.resize((264,173),Image.LANCZOS,box=tuple(b))
im=Image.open(ST+'blast.png').convert('RGBA')
f=im.crop((4*264,0,5*264,173))
bg=(18,20,32)
base=Image.new('RGBA',f.size,bg+(255,)); base.alpha_composite(f); o=base.convert('RGB')
x0,x1=140,264
Z=4
a=his.crop((x0,0,x1,173)).resize(((x1-x0)*Z,173*Z),Image.NEAREST)
c=o.crop((x0,0,x1,173)).resize(((x1-x0)*Z,173*Z),Image.NEAREST)
out=Image.new('RGB',(a.size[0]*2+10,a.size[1]),(255,0,255))
out.paste(a,(0,0)); out.paste(c,(a.size[0]+10,0))
d=ImageDraw.Draw(out)
for y in range(0,173,10): d.text((2,y*Z),str(y),fill=(255,255,0))
out.save(O+'z-blast-light.png')
# per-row green excess his vs ours
H=np.array(his).astype(float); Ou=np.array(o).astype(float)
gh=H[:,:,1]-33; go=Ou[:,:,1]-33
# where is his panel right edge in crop coords? find vertical bright border
col=H[:,:,:].mean(2)
print('his panel edge scan (mean brightness by col 230..264, rows 20..160):')
print([round(col[20:160,x].mean(),1) for x in range(225,264)])
for y in range(10,173,10):
    print(y,'his',[int(gh[y,x]) for x in range(170,264,6)])
    print(y,'our',[int(go[y,x]) for x in range(170,264,6)])
