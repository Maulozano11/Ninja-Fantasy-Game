import json
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2'; R=A+'/review-poison-set-r1'; G=A+'/staging/vfx_poison_v3'
man=json.load(open(G+'/manifest.json'))['sprites']
rm=json.load(open(A+'/vfx-poison-v3-src/refmap.json'))
ref=Image.open(A+'/REF-poison-set-owner.jpg').convert('RGB')
ch=Image.open(A+'/vfx-poison-v3-character.png').convert('RGBA')
m=man['aura']; fw,fh=m['frameW'],m['frameH']; ax,ay=m['anchor']
back=Image.open(G+'/aura_back.png').convert('RGBA'); front=Image.open(G+'/aura.png').convert('RGBA')
b=rm['aura']['box']
his=ref.crop((round(b[0]),round(b[1]),round(b[2]),round(b[3]))).resize((fw,fh),Image.BICUBIC)
Z=4
def comp(i,bg,withch=True):
    p=Image.new('RGBA',(fw,fh),bg+(255,))
    p.alpha_composite(back.crop((i*fw,0,(i+1)*fw,fh)))
    if withch: p.alpha_composite(ch,(ax-64,ay-120))
    p.alpha_composite(front.crop((i*fw,0,(i+1)*fw,fh)))
    return p.convert('RGB')
pan=[his,comp(0,(24,26,34)),comp(0,(92,128,64)),comp(0,(24,26,34),False)]
# front only on grass, back only
f0=Image.new('RGBA',(fw,fh),(92,128,64,255)); f0.alpha_composite(front.crop((0,0,fw,fh))); pan.append(f0.convert('RGB'))
out=Image.new('RGB',(len(pan)*(fw*Z+8),fh*Z),(255,0,255))
for k,p in enumerate(pan): out.paste(p.resize((fw*Z,fh*Z),Image.NEAREST),(k*(fw*Z+8),0))
out.save(R+'/aura-detail.png')
# 12 frames on dark with character, 2x
Z2=2
out=Image.new('RGB',(12*(fw*Z2+4),fh*Z2),(80,80,80))
for i in range(12): out.paste(comp(i,(24,26,34)).resize((fw*Z2,fh*Z2),Image.NEAREST),(i*(fw*Z2+4),0))
out.save(R+'/aura-frames.png')
