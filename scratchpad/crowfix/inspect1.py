import re, sys, ast
import numpy as np
from PIL import Image, ImageDraw
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/crows-from-ref.py').read()
# pull CROWS dict
m = re.search(r"CROWS = (\{.*?\n\})\n", src, re.S)
CROWS = eval(m.group(1))
ref = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/genjutsu-set-owner-reference.jpg').convert('RGB')
PICS = {'L': (262, 798, 522, 1009), 'R': (522, 798, 785, 1009)}
K=4
for key,(x0,y0,x1,y1) in PICS.items():
    im = ref.crop((x0,y0,x1,y1)).resize(((x1-x0)*K,(y1-y0)*K), Image.NEAREST)
    d = ImageDraw.Draw(im)
    cols = [(255,80,80),(80,255,80),(80,160,255),(255,255,80),(255,80,255),(80,255,255)]
    for i,c in enumerate(CROWS[key]):
        pts=[((x-x0)*K,(y-y0)*K) for x,y in c['poly']]
        d.line(pts+[pts[0]], fill=cols[i], width=1)
        if 'cut' in c:
            pts=[((x-x0)*K,(y-y0)*K) for x,y in c['cut']]
            d.line(pts, fill=(255,255,255), width=2)
        ex,ey=c['eye']; d.ellipse([(ex-x0)*K-3,(ey-y0)*K-3,(ex-x0)*K+3,(ey-y0)*K+3], outline=(0,255,0))
        d.text(((c['poly'][0][0]-x0)*K, (c['poly'][0][1]-y0)*K-12), c['name'], fill=cols[i])
        if 'split' in c and c['split']<900:
            sx=(c['split']-x0)*K; d.line([(sx,(c['cut'][0][1]-y0)*K-120),(sx,(c['cut'][0][1]-y0)*K)], fill=(255,128,0))
    im.save(f'dbg/his-{key}-traced.png')
    ref.crop((x0,y0,x1,y1)).resize(((x1-x0)*K,(y1-y0)*K), Image.NEAREST).save(f'dbg/his-{key}-4x.png')
