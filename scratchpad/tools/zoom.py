# zoom.py <sheet.png> <manifest.json> <sprite> <anim> <frame> <scale> <out.png>
import sys, json
from PIL import Image
sheet, man, name, anim, fr, k, out = sys.argv[1:8]
m = json.load(open(man))['sprites'][name]
fw, fh = m['frameW'], m['frameH']
row = m['anims'][anim]['row']
im = Image.open(sheet).convert('RGBA')
f = int(fr)
crop = im.crop((f*fw, row*fh, (f+1)*fw, (row+1)*fh))
bg = Image.new('RGBA', crop.size, (58,54,70,255))
bg.alpha_composite(crop)
k = int(k)
bg.resize((fw*k, fh*k), Image.NEAREST).save(out)
