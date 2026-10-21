import json, sys
import numpy as np
from PIL import Image
W=sys.argv[1]
m=json.load(open(W+'/snap/new/manifest.json'))['sprites']
for n,s in m.items():
    im=Image.open(W+'/snap/new/'+s['file']).convert('RGBA')
    fw,fh=s['frameW'],s['frameH']; nf=s['anims']['fly']['frames']
    # head region: rightmost 60 px of frame (beasts face right)
    x0=fw-64
    rows=[]
    for bg in [(20,24,28,255),(92,104,86,255),(235,235,235,255)]:
        strip=Image.new('RGBA',(64*nf,fh),bg)
        for f in range(nf):
            fr=im.crop((f*fw+x0,0,f*fw+fw,fh))
            tmp=Image.new('RGBA',(64,fh),bg); tmp.alpha_composite(fr); strip.paste(tmp,(f*64,0))
        rows.append(strip)
    out=Image.new('RGBA',(64*nf,fh*3)); 
    for i,r in enumerate(rows): out.paste(r,(0,i*fh))
    z=4 if 64*nf*4<=2100 else 3
    out=out.resize((out.width*z,out.height*z),Image.NEAREST)
    out.convert('RGB').save(f'{W}/head-{n}.png')
    print(n,out.size)
