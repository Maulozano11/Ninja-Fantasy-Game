import json
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
man=json.load(open(ST+'manifest.json'))['sprites']
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
b=rm['wall_diag']['box']; his=ref.resize((272,284),Image.LANCZOS,box=tuple(b))
im=Image.open(ST+'wall_diag.png').convert('RGBA')
c=(170,200,230,250); Z=8
tiles=[('his',his)]
for i in (5,6,7,11):
    f=im.crop((i*272,0,(i+1)*272,284)); bb=Image.new('RGBA',f.size,(18,20,32,255)); bb.alpha_composite(f); tiles.append((f'f{i}',bb.convert('RGB')))
cw,ch=(c[2]-c[0])*Z,(c[3]-c[1])*Z
out=Image.new('RGB',(len(tiles)*(cw+4),ch+14),(255,0,255)); d=ImageDraw.Draw(out)
for k,(t,x) in enumerate(tiles):
    out.paste(x.crop(c).resize((cw,ch),Image.NEAREST),(k*(cw+4),14)); d.text((k*(cw+4)+2,1),t,fill=(255,255,0))
out.save(O+'z-diag-streak.png')
