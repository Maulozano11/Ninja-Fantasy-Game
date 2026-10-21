"""python3 zoom.py <prefix> <side.json> <ref.jpg> <out.png> <frames like 0,5> <x0,y0,x1,y1> [k] [bg: panel|green|magenta]
His picture (frames 0/5 only) box-filtered onto our data canvas next to our frames, cropped and zoomed."""
import json
import sys

import numpy as np
from PIL import Image

pre, sidep, refp, outp, fl, box = sys.argv[1:7]
K = int(sys.argv[7]) if len(sys.argv) > 7 else 4
bgname = sys.argv[8] if len(sys.argv) > 8 else 'panel'
BG = {'panel': (34, 34, 44), 'green': (0x5d, 0x6b, 0x57), 'magenta': (255, 0, 255)}[bgname]
fr = np.load(pre + '-frames.npy')
N, H, W, _ = fr.shape
side = json.load(open(sidep))
S = side['scale']
ref = Image.open(refp).convert('RGB')
import re
ts = None
AX, AY = side['oanchor'] if 'oanchor' in side else (None, None)
x0, y0, x1, y1 = map(int, box.split(','))
tiles = []
for f in map(int, fl.split(',')):
    if str(f) in side['keys']:
        tx, ty = side['keys'][str(f)]['torso']
        his = ref.resize((W, H), Image.BOX, box=(tx - AX / S, ty - AY / S, tx + (W - AX) / S, ty + (H - AY) / S))
        tiles.append(his.crop((x0, y0, x1, y1)))
    o = Image.new('RGBA', (W, H), BG + (255,))
    o.alpha_composite(Image.fromarray(fr[f], 'RGBA'))
    tiles.append(o.convert('RGB').crop((x0, y0, x1, y1)))
w, h = x1 - x0, y1 - y0
sheet = Image.new('RGB', ((w + 2) * len(tiles), h), (0, 0, 0))
for i, t in enumerate(tiles):
    sheet.paste(t, (i * (w + 2), 0))
sheet.resize((sheet.width * K, sheet.height * K), Image.NEAREST).save(outp)
