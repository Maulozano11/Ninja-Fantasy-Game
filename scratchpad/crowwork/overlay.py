import re, ast, sys
from PIL import Image, ImageDraw
src = open('/home/user/Ninja-Fantasy-Game/tools/refs/crows-from-ref.py').read()
m = re.search(r"CROWS = (\{.*?\n\})\n", src, re.S)
CROWS = ast.literal_eval(m.group(1))
PICS = {'L': (262, 798, 522, 1009), 'R': (522, 798, 785, 1009)}
im = Image.open('../art2/REF-genjutsu-set-owner.jpg').convert('RGB')
K = 4
cols = [(255,80,80),(80,255,80),(80,160,255),(255,255,80),(255,80,255),(80,255,255)]
for key,(x0,y0,x1,y1) in PICS.items():
    c = im.crop((x0,y0,x1,y1)).resize(((x1-x0)*K,(y1-y0)*K), Image.NEAREST)
    d = ImageDraw.Draw(c)
    for i,sp in enumerate(CROWS[key]):
        col = cols[i%6]
        pts=[((x-x0)*K,(y-y0)*K) for x,y in sp['poly']]
        d.line(pts+[pts[0]], fill=col, width=2)
        if 'cut' in sp:
            d.line([((x-x0)*K,(y-y0)*K) for x,y in sp['cut']], fill=col, width=1)
        ex,ey=sp['eye']; d.ellipse(((ex-x0)*K-6,(ey-y0)*K-6,(ex-x0)*K+6,(ey-y0)*K+6), outline=col)
        d.text(((sp['poly'][0][0]-x0)*K, (sp['poly'][0][1]-y0)*K-12), sp['name'], fill=col)
    c.save(f'ov-{key}.png')
