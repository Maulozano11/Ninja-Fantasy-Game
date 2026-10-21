import json
from PIL import Image, ImageDraw
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
A=S+'/art2/'; ST=A+'staging/vfx_poison_v3/'; O=A+'review-poison-set-r3/'
ref=Image.open(A+'REF-poison-set-owner.jpg').convert('RGB')
rm=json.load(open(A+'vfx-poison-v3-src/refmap.json'))
his=ref.resize((272,284),Image.LANCZOS,box=tuple(rm['wall_diag']['box']))
im=Image.open(ST+'wall_diag.png').convert('RGBA')
a=np.array(im)[:, 11*272:12*272, 3]
# locate right cube in key frame: find bbox of opaque pixels in x 180..240, y 0..90
sub=a[0:100,180:250]; ys,xs=np.where(sub>200); print('right post opaque bbox x',xs.min()+180,xs.max()+180,'y',ys.min(),ys.max())
def on(f):
    b=Image.new('RGBA',f.size,(18,20,32,255)); b.alpha_composite(f); return b.convert('RGB')
# find post top for each frame: topmost opaque row in cols 200..230
Z=8
tiles=[('his',his,0)]
for i in (2,5,8,11):
    f=im.crop((i*272,0,(i+1)*272,284)); aa=np.array(f)[:,:,3]
    col=aa[:,205:232]; ys=np.where((col>200).any(1))[0]; top=ys.min()
    k=np.array(im.crop((11*272,0,12*272,284)))[:,:,3][:,205:232]; ktop=np.where((k>200).any(1))[0].min()
    tiles.append((f'f{i} (shifted {top-ktop})',on(f),top-ktop))
x0,x1=196,236; h0,h1=-2,40
cw=(x1-x0)*Z; ch=(h1-h0)*Z
out=Image.new('RGB',(len(tiles)*(cw+4),ch+14),(255,0,255)); d=ImageDraw.Draw(out)
k=np.array(im.crop((11*272,0,12*272,284)))[:,:,3][:,205:232]; ktop=int(np.where((k>200).any(1))[0].min())
for j,(t,x,dy) in enumerate(tiles):
    y0=ktop+h0+dy
    out.paste(x.crop((x0,y0,x1,y0+(h1-h0))).resize((cw,ch),Image.NEAREST),(j*(cw+4),14)); d.text((j*(cw+4)+2,1),t,fill=(255,255,0))
out.save(O+'z-diag-rcube.png')
