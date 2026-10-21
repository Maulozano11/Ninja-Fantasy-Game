import json, os, sys
from PIL import Image
G, out = sys.argv[1], sys.argv[2]
CH = sys.argv[3]
frs = [int(v) for v in sys.argv[4].split(',')]
k = int(sys.argv[5]) if len(sys.argv) > 5 else 3
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
def fr(n, i):
    m = man[n]; a = m['anims']['idle']
    sh = Image.open(os.path.join(G, m['file'])).convert('RGBA')
    return sh.crop((i * m['frameW'], a['row'] * m['frameH'], (i + 1) * m['frameW'], (a['row'] + 1) * m['frameH']))
ch = Image.open(CH).convert('RGBA')
m = man['aura']; ax, ay = m['anchor']; W, H = m['frameW'], m['frameH']
BGS = [(84, 110, 70), (31, 33, 46), (214, 196, 160)]
can = Image.new('RGBA', ((W + 2) * len(frs) * 2, (H + 2) * len(BGS)), (0, 0, 0, 255))
for b, bg in enumerate(BGS):
    for j, i in enumerate(frs):
        for mode in (0, 1):
            t = Image.new('RGBA', (W, H), bg + (255,))
            t.alpha_composite(fr('aura_back', i))
            if mode == 0:
                t.alpha_composite(ch, (ax - 64, ay - 120))
            t.alpha_composite(fr('aura', i))
            can.alpha_composite(t, ((j * 2 + mode) * (W + 2), b * (H + 2)))
can.resize((can.width * k, can.height * k), Image.NEAREST).save(out)
