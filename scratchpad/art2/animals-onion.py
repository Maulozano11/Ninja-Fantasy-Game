import json,sys
from PIL import Image
root='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/'
man=json.load(open(root+'staging/animals/manifest.json'))
outs=[]
for name,an in [('frog','jump'),('koi','jump'),('dragonfly','dart')]:
    s=man['sprites'][name]; a=s['anims'][an]
    im=Image.open(root+'staging/animals/'+s['file']).convert('RGBA')
    fw,fh=s['frameW'],s['frameH']
    bg=Image.new('RGBA',(fw,fh),(93,107,87,255))
    n=a['frames']
    for f in range(n):
        fr=im.crop((f*fw,a['row']*fh,f*fw+fw,a['row']*fh+fh))
        al=fr.split()[3].point(lambda v: int(v*(0.35+0.65*(f+1)/n)))
        fr.putalpha(al)
        bg=Image.alpha_composite(bg,fr)
    ax,ay=s['anchor']
    bg.putpixel((ax,ay),(255,0,0,255))
    k=8 if fw<60 else 6
    outs.append(bg.resize((fw*k,fh*k),Image.NEAREST))
W=sum(o.size[0]+10 for o in outs); H=max(o.size[1] for o in outs)
O=Image.new('RGBA',(W,H),(30,30,30,255)); x=0
for o in outs: O.paste(o,(x,0)); x+=o.size[0]+10
O.save(root+'animals-onion.png')
