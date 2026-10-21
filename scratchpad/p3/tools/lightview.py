import re, json, zlib, base64, sys
import numpy as np
from PIL import Image
out = sys.argv[1]; files = sys.argv[2:]
ims = []
for f in files:
    if f.endswith('.png'):
        ims.append(Image.open(f).convert('RGBA')); continue
    s = open(f).read()
    L = json.loads(re.search(r'PV3_LIGHT: Record<string, PoisonLight> = (\{.*?\n\});', s, re.S).group(1))['blast']
    r = re.search(r'"blast": \{\s*"w": (\d+),\s*"h": (\d+)', s); W, H = int(r.group(1)), int(r.group(2))
    a = np.frombuffer(zlib.decompress(base64.b64decode(L['a'])), np.uint8).reshape(L['h'], L['w'])
    A = np.zeros((H, W), np.uint8); A[L['y']:L['y'] + L['h'], L['x']:L['x'] + L['w']] = a
    rgb = [int(L['rgb'][i:i + 2], 16) for i in (1, 3, 5)]
    im = np.zeros((H, W, 4), np.uint8); im[..., :3] = rgb; im[..., 3] = A
    ims.append(Image.fromarray(im))
z = 2
W = sum(i.width * z + 8 for i in ims); H = max(i.height for i in ims) * z * 2 + 8
img = Image.new('RGB', (W, H), (90, 0, 90)); x = 0
for i in ims:
    for r, bg in enumerate([(21, 21, 29), (84, 110, 70)]):
        b = Image.new('RGBA', i.size, bg + (255,)); b.alpha_composite(i)
        img.paste(b.convert('RGB').resize((i.width * z, i.height * z), Image.NEAREST), (x, r * (i.height * z + 8)))
    x += i.width * z + 8
img.save(out); print(img.size)
