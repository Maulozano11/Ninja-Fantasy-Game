import sys, re
import numpy as np
from PIL import Image
ts = open(sys.argv[1]).read()
size = [int(v) for v in re.search(r'SIZE: \[number, number\] = \[(\d+), (\d+)\]', ts).groups()]
alph = re.search(r"ALPHABET = '(.*)';", ts).group(1)
pal = re.findall(r"'(#[0-9a-f]{8})'", ts.split('PALETTE: string[] = [')[1].split('];')[0])
frames_src = ts.split('FRAMES: Record')[1]
blocks = frames_src.split('    [\n')[1:]
frames = []
for bl in blocks:
    rows = re.findall(r"      '([^']*)',", bl.split('    ],')[0])
    img = np.zeros((size[1], size[0], 4), np.uint8)
    for y, row in enumerate(rows):
        x = 0
        for m in re.finditer(r'(\D)(\d*)', row):
            i = alph.index(m.group(1)); n = int(m.group(2) or 1)
            if i > 0:
                c = pal[i]
                img[y, x:x + n] = [int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), int(c[7:9], 16)]
            x += n
    frames.append(img)
which = [int(v) for v in sys.argv[3].split(',')]
k = int(sys.argv[4]) if len(sys.argv) > 4 else 5
import os
BGC = (32, 31, 39, 255) if os.environ.get('DARK') else (0x5d, 0x6b, 0x57, 255)
tiles = []
for i in which:
    bg = Image.new('RGBA', (size[0], size[1]), BGC)
    bg.alpha_composite(Image.fromarray(frames[i], 'RGBA'))
    tiles.append(bg)
if len(sys.argv) > 5:
    his = Image.open(sys.argv[5]).convert('RGBA')
    tiles.insert(0, his)
W = sum(t.width + 2 for t in tiles); H = max(t.height for t in tiles)
o = Image.new('RGBA', (W, H), (20, 20, 20, 255)); x = 0
for t in tiles:
    o.paste(t, (x, 0)); x += t.width + 2
o.resize((W * k, H * k), Image.NEAREST).save(sys.argv[2])
