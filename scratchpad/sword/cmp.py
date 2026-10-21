import sys
from PIL import Image, ImageDraw
import numpy as np
ours_path = sys.argv[1]; out = sys.argv[2]
import os
dx, dy = map(int, os.environ.get("OFF", "11,26").split(","))
X0, Y0, X1, Y1 = 19, 46, 47, 74
a = np.frombuffer(open(ours_path,'rb').read(), np.uint8).reshape(128,128,4)
im = Image.fromarray(a.copy(), 'RGBA'); bg = Image.new('RGBA', im.size, (235,230,220,255)); bg.alpha_composite(im)
ours = bg.convert('RGB').crop((X0+dx, Y0+dy, X1+dx, Y1+dy))
his = Image.open('native.png').convert('RGB').crop((X0, Y0, X1, Y1))
k = 18
W, H = (X1-X0)*k, (Y1-Y0)*k
o = Image.new('RGB', (W*2+24, H), (255,255,255))
o.paste(his.resize((W,H), Image.NEAREST), (0,0)); o.paste(ours.resize((W,H), Image.NEAREST), (W+24,0))
d = ImageDraw.Draw(o)
for side in (0, W+24):
    for i in range(X1-X0+1): d.line([(side+i*k,0),(side+i*k,H)], fill=(128,128,128), width=1)
    for j in range(Y1-Y0+1): d.line([(side,j*k),(side+W,j*k)], fill=(128,128,128), width=1)
o.save(out)
