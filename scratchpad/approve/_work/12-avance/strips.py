import json, sys
from PIL import Image, ImageDraw
W=sys.argv[1]
m=json.load(open(W+'/snap/new/manifest.json'))['sprites']
for n,s in m.items():
    im=Image.open(W+'/snap/new/'+s['file']).convert('RGBA')
    fw,fh=s['frameW'],s['frameH']; nf=s['anims']['fly']['frames']
    out=Image.new('RGBA',((fw+4)*nf,fh+4),(60,60,60,255))
    for f in range(nf):
        t=Image.new('RGBA',(fw,fh),(20,24,28,255)); t.alpha_composite(im.crop((f*fw,0,f*fw+fw,fh)))
        d=ImageDraw.Draw(t); ax,ay=s['anchor']; d.point((ax,ay),fill=(255,0,255,255))
        out.paste(t,(2+f*(fw+4),2))
    out=out.resize((out.width*2,out.height*2),Image.NEAREST)
    out.convert('RGB').save(f'{W}/strip-{n}.png'); print(n,out.size)
