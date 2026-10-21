"""sbs.py <out.png> <id> <N> <z> <x0> <y0> <x1> <y1> <dir> [dir2 ...]: his box at N | ours from each dir, region, scaled z, grid every 5 (ticks labelled every 10)."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image, ImageDraw
import m

out, jid, N, z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
x0, y0, x1, y1 = map(int, sys.argv[5:9])
dirs = sys.argv[9:]
tiles = [('his box', Image.fromarray(m.his(jid, N).astype(np.uint8)))]
for d in dirs:
    tiles.append((d.rstrip('/').split('/')[-1], Image.open(f'{d}/{jid}.png' if N == 44 else f'{d}/{jid}@2x.png').convert('RGB')))
w, h = (x1 - x0) * z, (y1 - y0) * z
G = 30
img = Image.new('RGB', (len(tiles) * (w + G) + G, h + 2 * G), (21, 23, 29))
d = ImageDraw.Draw(img)
for k, (name, t) in enumerate(tiles):
    X = G + k * (w + G)
    img.paste(t.crop((x0, y0, x1, y1)).resize((w, h), Image.NEAREST), (X, G))
    d.text((X, 4), name, fill=(233, 223, 196))
    for x in range(x0, x1 + 1):
        if x % 5 == 0:
            d.line([(X + (x - x0) * z, G), (X + (x - x0) * z, G + h)], fill=(0, 0, 0) if x % 10 else (255, 255, 255), width=1)
            if x % 10 == 0:
                d.text((X + (x - x0) * z + 2, G + h + 2), str(x), fill=(154, 163, 176))
    for y in range(y0, y1 + 1):
        if y % 5 == 0:
            d.line([(X, G + (y - y0) * z), (X + w, G + (y - y0) * z)], fill=(0, 0, 0) if y % 10 else (255, 255, 255), width=1)
            if y % 10 == 0 and k == 0:
                d.text((2, G + (y - y0) * z + 2), str(y), fill=(154, 163, 176))
img.save(out)
print('wrote', out, img.size)
