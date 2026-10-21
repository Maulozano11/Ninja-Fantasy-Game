import json, os, sys
from PIL import Image
G = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_poison_v3'
name, anim, fr, k, cols, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
bg = (84, 110, 70) if len(sys.argv) > 7 and sys.argv[7] == 'grass' else (31, 33, 46)
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sheet = Image.open(os.path.join(G, m['file'])).convert('RGBA')
a = m['anims'][anim]
idx = list(range(a['frames'])) if fr == 'all' else [int(v) for v in fr.split(',')]
fw, fh = m['frameW'], m['frameH']
rows = -(-len(idx) // cols)
S = Image.new('RGBA', (cols * (fw * k + 4), rows * (fh * k + 4)), (0, 0, 0, 255))
for n, i in enumerate(idx):
    f = sheet.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh))
    c = Image.new('RGBA', (fw, fh), bg + (255,)); c.alpha_composite(f)
    S.paste(c.resize((fw * k, fh * k), Image.NEAREST), ((n % cols) * (fw * k + 4), (n // cols) * (fh * k + 4)))
S.convert('RGB').save(out)
print(S.size)
