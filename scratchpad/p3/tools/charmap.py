"""charmap.py crop(x0,y0,x1,y1) img [img...]: per pixel family/kind letters (. clear, n neutral body, N neutral rim, g green body, G green rim, p purple body, P purple rim, l glow, ? other)"""
import json, re, sys
import numpy as np
from PIL import Image
s = open('/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3-refdata.ts').read()
pal = json.loads(re.search(r'PV3_PAL: PoisonPal\[\] = (\[.*?\]);', s).group(1))
lut = {}
for p in pal:
    h = p['rgba']; rgba = tuple(int(h[i:i + 2], 16) for i in (1, 3, 5, 7))
    ch = {'green': 'g', 'purple': 'p', 'neutral': 'n'}[p['fam']]
    if p['kind'] == 'outline': ch = ch.upper()
    if p['kind'] == 'glow': ch = 'l'
    if ch == 'g' and max(rgba[:3]) - min(rgba[:3]) < 45: ch = 's'
    lut[rgba] = ch
c = tuple(int(v) for v in sys.argv[1].split(','))
for path in sys.argv[2:]:
    a = np.asarray(Image.open(path).convert('RGBA'))
    print(path.split('/')[-1], c)
    print('    ' + ''.join(str((x // 10) % 10) if x % 10 == 0 else ' ' for x in range(c[0], c[2])))
    for y in range(c[1], c[3]):
        row = ''
        for x in range(c[0], c[2]):
            px = tuple(int(v) for v in a[y, x])
            row += '.' if px[3] == 0 else lut.get(px, '?')
        print(f'{y:3d} ' + row)
