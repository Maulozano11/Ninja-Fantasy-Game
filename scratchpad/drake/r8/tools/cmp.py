"""cmp.py <earth.ts> <out.png> <key 0|5> <frame> x0,y0,x1,y1 (canvas coords) zoom: his picture at game scale | ours."""
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from tsload import load
fr, anc, _ = load(sys.argv[1], crop=False)
k, i = int(sys.argv[3]), int(sys.argv[4])
x0, y0, x1, y1 = [int(v) for v in sys.argv[5].split(',')]
Z = int(sys.argv[6])
S = 96 / 228
OA = (180, 94)
T = {0: (792, 1755), 5: (1448, 1755)}[k]
ref = Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/earth-set-owner-reference.jpg').convert('RGB')
hb = (T[0] + (x0 - OA[0]) / S, T[1] + (y0 - OA[1]) / S, T[0] + (x1 - OA[0]) / S, T[1] + (y1 - OA[1]) / S)
his = ref.resize((x1 - x0, y1 - y0), Image.BOX, box=hb)
bg = Image.new('RGBA', (x1 - x0, y1 - y0), (34, 34, 44, 255))
bg.alpha_composite(Image.fromarray(fr[i][y0:y1, x0:x1], 'RGBA'))
w, h = (x1 - x0) * Z, (y1 - y0) * Z
out = Image.new('RGB', (w * 2 + 6, h), (255, 255, 255))
out.paste(his.resize((w, h), Image.NEAREST), (0, 0))
out.paste(bg.convert('RGB').resize((w, h), Image.NEAREST), (w + 6, 0))
out.save(sys.argv[2])
