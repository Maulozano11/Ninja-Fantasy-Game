# strip.py name anim frames(comma) scale out
import json, sys
from PIL import Image
S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_chakra_v3/'
name, anim, idx, k, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
m = json.load(open(S + 'manifest.json'))['sprites'][name]
sh = Image.open(S + m['file']).convert('RGBA')
fw, fh = m['frameW'], m['frameH']
row = m['anims'][anim]['row']
ids = [int(v) for v in idx.split(',')] if idx != 'all' else list(range(m['anims'][anim]['frames']))
bg = tuple(int(v) for v in (sys.argv[6].split(',') if len(sys.argv) > 6 else '32,32,42'.split(','))) + (255,)
o = Image.new('RGBA', (len(ids) * (fw * k + 4), fh * k), (0, 0, 0, 255))
for j, i in enumerate(ids):
    f = sh.crop((i * fw, row * fh, (i + 1) * fw, (row + 1) * fh))
    b = Image.new('RGBA', (fw, fh), bg); b.alpha_composite(f)
    o.paste(b.resize((fw * k, fh * k), Image.NEAREST), (j * (fw * k + 4), 0))
o.save(out)
