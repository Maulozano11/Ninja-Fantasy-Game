import json
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
ch=Image.open(A+'vfx-poison-v3-character.png').convert('RGBA')
ab=Image.open(ST+'aura_back.png').convert('RGBA'); af=Image.open(ST+'aura.png').convert('RGBA')
his=ref.resize((94,145),Image.LANCZOS,box=tuple(rm['aura']['box']))
c=(0,85,94,145); Z=5
tiles=[('his',his)]
for bg in [(17,19,31),(70,110,50)]:
  for i in (0,6):
    b=Image.new('RGBA',(94,145),bg+(255,))
    b.alpha_composite(ab.crop((i*94,0,(i+1)*94,145))); b.alpha_composite(ch,(47-64,123-120)); b.alpha_composite(af.crop((i*94,0,(i+1)*94,145)))
    tiles.append((f'f{i}',b.convert('RGB')))
cw,chh=(c[2]-c[0])*Z,(c[3]-c[1])*Z
out=Image.new('RGB',(3*(cw+4),2*(chh+14)),(255,0,255)); d=ImageDraw.Draw(out)
for k,(t,x) in enumerate(tiles):
    X=(k%3)*(cw+4); Y=(k//3)*(chh+14)
    out.paste(x.crop(c).resize((cw,chh),Image.NEAREST),(X,Y+14)); d.text((X+2,Y+1),t,fill=(255,255,0))
out.save(O+'z-aura-pool.png')
